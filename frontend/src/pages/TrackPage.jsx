import React, { useState, useEffect } from 'react';
import { Search, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import StatusTracker from '../components/StatusTracker';
import WasteDetectionCard from '../components/WasteDetectionCard';
import { getComplaint } from '../services/api';

export default function TrackPage({ initialTicketId, showToast }) {
  const [searchInput, setSearchInput] = useState(initialTicketId || 'WM-84476');
  const [complaint, setComplaint] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTicket = async (ticketId) => {
    if (!ticketId || !ticketId.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      const data = await getComplaint(ticketId.trim());
      setComplaint(data);
    } catch (err) {
      console.error(err);
      setError(err.message || `No complaint found with ticket number '${ticketId}'.`);
      setComplaint(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialTicketId) {
      setSearchInput(initialTicketId);
      fetchTicket(initialTicketId);
    } else {
      // Default initial fetch for WM-84476
      fetchTicket('WM-84476');
    }
  }, [initialTicketId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTicket(searchInput);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  // Google Maps or OSM link generator
  const getMapUrl = (locationText, lat, lng) => {
    if (lat && lng) {
      return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationText || '')}`;
  };

  return (
    <div style={{ width: '100%', maxWidth: '665px' }}>
      <div className="page-header">
        <h1 className="page-title">Track your complaint</h1>
        <p className="page-subtitle">
          Enter the complaint number from your confirmation email.
        </p>
      </div>

      {/* Complaint Search Form */}
      <form onSubmit={handleSearchSubmit} style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <input
            type="text"
            className="form-input"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="e.g. WM-84476"
            style={{ fontSize: '1rem', padding: '0.65rem 1rem' }}
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={isLoading}
            style={{ width: 'auto', padding: '0.65rem 1.6rem', fontSize: '0.95rem' }}
          >
            {isLoading ? <Loader2 size={18} className="spin-icon" /> : 'Track'}
          </button>
        </div>
      </form>

      {error && (
        <div
          className="card"
          style={{
            border: '1px solid #FECACA',
            backgroundColor: '#FEF2F2',
            color: '#B91C1C',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1.25rem',
          }}
        >
          <AlertCircle size={22} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {complaint && (
        <div className="card" style={{ padding: '1.75rem' }}>
          {/* Top Row: Public ID and Status Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
            }}
          >
            <h2 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#111827' }}>
              {complaint.public_id}
            </h2>
            <span className={`status-badge ${complaint.status.toLowerCase()}`}>
              {complaint.status}
            </span>
          </div>

          {/* 3-Step Progress Tracker */}
          <StatusTracker status={complaint.status} />

          {/* Reported Waste Image Container */}
          <div
            style={{
              width: '100%',
              borderRadius: '12px',
              overflow: 'hidden',
              backgroundColor: '#505649',
              marginBottom: '1.5rem',
            }}
          >
            <img
              src={complaint.original_image_url}
              alt="Reported waste"
              style={{
                width: '100%',
                maxHeight: '340px',
                objectFit: 'cover',
                display: 'block',
              }}
              onError={(e) => {
                e.target.src = '/uploads/sample_waste_dump.jpg';
              }}
            />
          </div>

          {/* Cleaned Area Proof Image (if completed) */}
          {complaint.status === 'Completed' && complaint.proof_image_url && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div className="detected-section-title" style={{ color: '#059669' }}>
                CLEANED & VERIFIED PROOF
              </div>
              <div
                style={{
                  width: '100%',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '2px solid #10B981',
                  maxHeight: '260px',
                }}
              >
                <img
                  src={complaint.proof_image_url}
                  alt="Cleanup proof"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
            </div>
          )}

          {/* Detected Waste Cards */}
          <div style={{ marginBottom: '1.75rem' }}>
            <div className="detected-section-title">DETECTED WASTE</div>
            <div className="detected-grid">
              {complaint.detections.map((d, i) => (
                <WasteDetectionCard
                  key={i}
                  category={d.category}
                  count={d.count}
                  confidence={d.confidence}
                />
              ))}
            </div>
          </div>

          {/* Complaint Details 2-Column Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.25rem',
              paddingTop: '1rem',
              borderTop: '1px solid #F1F5F9',
            }}
          >
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748B' }}>
                Assigned worker
              </div>
              <div style={{ fontSize: '0.98rem', fontWeight: 500, color: '#111827', marginTop: '2px' }}>
                {complaint.assigned_worker ? complaint.assigned_worker.name : 'Pending assignment'}
              </div>

              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748B', marginTop: '1rem' }}>
                Reported
              </div>
              <div style={{ fontSize: '0.95rem', color: '#111827', marginTop: '2px' }}>
                {formatDate(complaint.created_at)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748B' }}>
                Location
              </div>
              <div style={{ fontSize: '0.98rem', fontWeight: 500, color: '#111827', marginTop: '2px' }}>
                {complaint.location_text}
              </div>

              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748B', marginTop: '1rem' }}>
                Assigned
              </div>
              <div style={{ fontSize: '0.95rem', color: '#111827', marginTop: '2px' }}>
                {formatDate(complaint.assigned_at || complaint.created_at)}
              </div>

              {complaint.status === 'Completed' && complaint.completed_at && (
                <>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#059669', marginTop: '1rem' }}>
                    Completed
                  </div>
                  <div style={{ fontSize: '0.95rem', color: '#059669', marginTop: '2px', fontWeight: 500 }}>
                    {formatDate(complaint.completed_at)}
                  </div>
                </>
              )}

              <div style={{ marginTop: '0.75rem' }}>
                <a
                  href={getMapUrl(complaint.location_text, complaint.latitude, complaint.longitude)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#00845F',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>Open in Maps</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
