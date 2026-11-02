import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Toast from './components/Toast';
import ReportPage from './pages/ReportPage';
import SuccessPage from './pages/SuccessPage';
import TrackPage from './pages/TrackPage';
import WorkerDashboard from './pages/WorkerDashboard';

export default function App() {
  const [activePage, setActivePage] = useState('report');
  const [submittedData, setSubmittedData] = useState(null);
  const [trackingId, setTrackingId] = useState('WM-84476');
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const handleReportSuccess = (data) => {
    setSubmittedData(data);
    setTrackingId(data.ticketId);
    setActivePage('success');
    showToast(`Complaint ${data.ticketId} filed successfully!`);
  };

  const handleTrackFromSuccess = (ticketId) => {
    setTrackingId(ticketId);
    setActivePage('track');
  };

  const handleReportAnother = () => {
    setSubmittedData(null);
    setActivePage('report');
  };

  const handleNavClick = (page) => {
    setActivePage(page);
  };

  return (
    <div className="app-container">
      <Navbar activePage={activePage} onNavigate={handleNavClick} />

      <main className="main-content">
        {activePage === 'report' && (
          <ReportPage
            onSubmitSuccess={handleReportSuccess}
            showToast={showToast}
          />
        )}

        {activePage === 'success' && (
          <SuccessPage
            ticketId={submittedData?.ticketId || ''}
            workerName={submittedData?.workerName || ''}
            onTrack={handleTrackFromSuccess}
            onReportAnother={handleReportAnother}
          />
        )}

        {activePage === 'track' && (
          <TrackPage
            initialTicketId={trackingId}
            showToast={showToast}
          />
        )}

        {activePage === 'worker' && (
          <WorkerDashboard showToast={showToast} />
        )}
      </main>

      <footer className="app-footer">
        <p>Keeping our streets clean, one report at a time.</p>
      </footer>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
