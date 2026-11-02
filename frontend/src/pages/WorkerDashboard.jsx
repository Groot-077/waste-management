import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, LogOut, ExternalLink, Loader2, CheckCircle2, ShieldCheck, Lock, UserPlus } from 'lucide-react';
import WasteDetectionCard from '../components/WasteDetectionCard';
import {
  getStoredWorker,
  workerLogin,
  workerRegister,
  workerLogout,
  getWorkerJobs,
  completeJobWithProof,
} from '../services/api';

export default function WorkerDashboard({ showToast }) {
  const [worker, setWorker] = useState(getStoredWorker());
  const [jobs, setJobs] = useState([]);
  const [openJobsCount, setOpenJobsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProofFiles, setSelectedProofFiles] = useState({});
  const [isSubmittingJob, setIsSubmittingJob] = useState({});

  // Auth mode: 'login' | 'register'
  const [authMode, setAuthMode] = useState('login');

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');

  const proofInputRefs = useRef({});

  const loadJobs = async () => {
    setIsLoading(true);
    try {
      const data = await getWorkerJobs();
      setJobs(data.jobs || []);
      setOpenJobsCount(data.open_jobs_count || 0);
      if (data.worker) {
        setWorker(data.worker);
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to load assigned jobs', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (worker) {
      loadJobs();
    }
  }, [worker]);

  const handleLogin = async (e) => {
    e?.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await workerLogin(loginUsername, loginPassword);
      setWorker(res.worker);
      showToast(`Welcome back, ${res.worker.name}!`);
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e?.preventDefault();
    setRegError('');
    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match.');
      return;
    }
    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters.');
      return;
    }
    setRegLoading(true);
    try {
      const res = await workerRegister({
        name: regName.trim(),
        username: regUsername.trim(),
        phone: regPhone.trim(),
        password: regPassword,
      });
      setWorker(res.worker);
      showToast(`Welcome, ${res.worker.name}! Worker account created.`);
    } catch (err) {
      setRegError(err.message || 'Registration failed.');
    } finally {
      setRegLoading(false);
    }
  };

  const handleSignOut = () => {
    workerLogout();
    setWorker(null);
    setJobs([]);
    showToast('Signed out successfully');
  };

  const handleProofChange = (publicId, e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedProofFiles((prev) => ({
        ...prev,
        [publicId]: file,
      }));
    }
  };

  const handleCompleteJob = async (publicId) => {
    const proofFile = selectedProofFiles[publicId];
    if (!proofFile) {
      showToast('Please choose a cleaned area proof photo first.', 'error');
      return;
    }

    setIsSubmittingJob((prev) => ({ ...prev, [publicId]: true }));
    try {
      const result = await completeJobWithProof(publicId, proofFile);
      showToast(`Complaint ${publicId} marked as completed! Citizen notified.`);
      // Reload jobs
      await loadJobs();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to complete job.', 'error');
    } finally {
      setIsSubmittingJob((prev) => ({ ...prev, [publicId]: false }));
    }
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

  // Google Maps link
  const getMapUrl = (locationText, lat, lng) => {
    if (lat && lng) {
      return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationText || '')}`;
  };

  // If worker is not logged in, show worker sign in / registration
  if (!worker) {
    return (
      <div style={{ width: '100%', maxWidth: '480px', marginTop: '2rem' }}>
        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: '#ECFDF5',
                color: '#00845F',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.75rem',
              }}
            >
              {authMode === 'login' ? <ShieldCheck size={28} /> : <UserPlus size={28} />}
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#111827' }}>
              {authMode === 'login' ? 'Worker Portal Sign In' : 'Register New Worker'}
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#64748B', marginTop: '0.25rem' }}>
              {authMode === 'login'
                ? 'Sign in to access and manage assigned cleanup tasks'
                : 'Create an official worker profile to receive cleanup assignments'}
            </p>
          </div>

          {/* Mode Switch Tabs */}
          <div
            style={{
              display: 'flex',
              borderRadius: '8px',
              backgroundColor: '#F1F5F9',
              padding: '4px',
              marginBottom: '1.5rem',
            }}
          >
            <button
              type="button"
              onClick={() => { setAuthMode('login'); setLoginError(''); }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '6px',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.88rem',
                cursor: 'pointer',
                backgroundColor: authMode === 'login' ? '#FFFFFF' : 'transparent',
                color: authMode === 'login' ? '#111827' : '#64748B',
                boxShadow: authMode === 'login' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('register'); setRegError(''); }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '6px',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.88rem',
                cursor: 'pointer',
                backgroundColor: authMode === 'register' ? '#FFFFFF' : 'transparent',
                color: authMode === 'register' ? '#111827' : '#64748B',
                boxShadow: authMode === 'register' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Register New Worker
            </button>
          </div>

          {authMode === 'login' ? (
            <>
              {loginError && (
                <div
                  style={{
                    backgroundColor: '#FEF2F2',
                    color: '#DC2626',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    marginBottom: '1rem',
                  }}
                >
                  {loginError}
                </div>
              )}

              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter your worker username"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loginLoading}
                  style={{ height: '44px' }}
                >
                  {loginLoading ? (
                    <>
                      <Loader2 size={18} className="spin-icon" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <span>Sign In to Portal</span>
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              {regError && (
                <div
                  style={{
                    backgroundColor: '#FEF2F2',
                    color: '#DC2626',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    marginBottom: '1rem',
                  }}
                >
                  {regError}
                </div>
              )}

              <form onSubmit={handleRegister}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Ramesh Patel"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. ramesh"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="e.g. +91 98765 43210"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Password (min 6 characters)</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Create a strong password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Confirm Password</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Confirm your password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={regLoading}
                  style={{ height: '44px' }}
                >
                  {regLoading ? (
                    <>
                      <Loader2 size={18} className="spin-icon" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <span>Register & Sign In</span>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '665px' }}>
      {/* Dashboard Header matching reference screenshot 1 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '1.75rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>
            Hello, {worker.name}
          </h1>
          <div style={{ fontSize: '0.92rem', color: '#64748B', marginTop: '0.15rem' }}>
            {openJobsCount} {openJobsCount === 1 ? 'open job' : 'open jobs'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn-secondary"
            onClick={loadJobs}
            disabled={isLoading}
            style={{ padding: '0.55rem 1rem' }}
          >
            <RefreshCw size={14} className={isLoading ? 'spin-icon' : ''} />
            <span>Refresh</span>
          </button>
          <button
            className="btn-secondary"
            onClick={handleSignOut}
            style={{ padding: '0.55rem 1rem' }}
          >
            <LogOut size={14} />
            <span>Sign out</span>
          </button>
        </div>
      </div>

      {/* Jobs List */}
      {jobs.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '3rem 1.5rem',
            color: '#64748B',
          }}
        >
          <CheckCircle2 size={44} style={{ color: '#10B981', margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontSize: '1.15rem', color: '#111827', fontWeight: 600 }}>All caught up!</h3>
          <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
            No open jobs assigned right now. New complaints will appear automatically.
          </p>
        </div>
      ) : (
        jobs.map((job) => {
          const selectedFile = selectedProofFiles[job.public_id];
          const isCompleting = isSubmittingJob[job.public_id];

          return (
            <div key={job.public_id} className="card" style={{ marginBottom: '1.5rem', padding: '1.75rem' }}>
              {/* Header: Complaint ID & Status */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.25rem',
                }}
              >
                <h2 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#111827' }}>
                  {job.public_id}
                </h2>
                <span className="status-badge assigned">
                  {job.status}
                </span>
              </div>

              {/* Photo & Location Row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '1.25rem',
                  alignItems: 'start',
                  marginBottom: '1.5rem',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '210px',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    backgroundColor: '#505649',
                  }}
                >
                  <img
                    src={job.original_image_url}
                    alt="Reported waste dump"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    onError={(e) => {
                      e.target.src = '/uploads/sample_waste_dump.jpg';
                    }}
                  />
                </div>

                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748B' }}>
                    Location
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 500, color: '#111827', marginTop: '2px' }}>
                    {job.location_text}
                  </div>

                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748B', marginTop: '1rem' }}>
                    Reported
                  </div>
                  <div style={{ fontSize: '0.92rem', color: '#111827', marginTop: '2px' }}>
                    {formatDate(job.created_at)}
                  </div>

                  <div style={{ marginTop: '0.85rem' }}>
                    <a
                      href={getMapUrl(job.location_text, job.latitude, job.longitude)}
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

              {/* DETECTED WASTE */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div className="detected-section-title">DETECTED WASTE</div>
                <div className="detected-grid">
                  {job.detections.map((d, i) => (
                    <WasteDetectionCard
                      key={i}
                      category={d.category}
                      count={d.count}
                      confidence={d.confidence}
                    />
                  ))}
                </div>
              </div>

              {/* SUGGESTED CLEANUP METHOD */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div className="detected-section-title">SUGGESTED CLEANUP METHOD</div>
                <ul
                  style={{
                    listStyleType: 'disc',
                    paddingLeft: '1.25rem',
                    fontSize: '0.88rem',
                    color: '#334155',
                    lineHeight: '1.6',
                  }}
                >
                  {job.suggested_cleanup_methods.map((method, idx) => (
                    <li key={idx} style={{ marginBottom: '0.35rem' }}>
                      {method}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Cleaned Area Proof Image Upload Box */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                }}
              >
                <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#111827' }}>
                  Cleaned area proof image
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => proofInputRefs.current[job.public_id]?.click()}
                    style={{
                      backgroundColor: '#D1FAE5',
                      color: '#00845F',
                      padding: '0.45rem 0.9rem',
                      borderRadius: '6px',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      border: 'none',
                    }}
                  >
                    Choose File
                  </button>

                  <span style={{ fontSize: '0.88rem', color: selectedFile ? '#111827' : '#64748B' }}>
                    {selectedFile ? selectedFile.name : 'No file chosen'}
                  </span>

                  <input
                    type="file"
                    ref={(el) => (proofInputRefs.current[job.public_id] = el)}
                    onChange={(e) => handleProofChange(job.public_id, e)}
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    style={{ display: 'none' }}
                  />
                </div>

                <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                  This photo is emailed to the citizen and is never stored on the server.
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => handleCompleteJob(job.public_id)}
                    disabled={!selectedFile || isCompleting}
                    style={{
                      backgroundColor: selectedFile && !isCompleting ? '#10B981' : '#6EE7B7',
                      color: '#FFFFFF',
                      padding: '0.6rem 1.4rem',
                      borderRadius: '8px',
                      fontSize: '0.92rem',
                      fontWeight: 600,
                      border: 'none',
                      cursor: selectedFile && !isCompleting ? 'pointer' : 'not-allowed',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    {isCompleting ? (
                      <>
                        <Loader2 size={16} className="spin-icon" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <span>Mark as completed</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
