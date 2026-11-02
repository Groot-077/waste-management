import React from 'react';
import { Check } from 'lucide-react';

export default function SuccessPage({ ticketId, workerName, onTrack, onReportAnother }) {
  return (
    <div style={{ width: '100%', maxWidth: '540px', marginTop: '1.5rem' }}>
      <div
        className="card"
        style={{
          textAlign: 'center',
          padding: '2.5rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.25rem',
        }}
      >
        {/* Pale green circular check icon */}
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: '#D1FAE5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10B981',
          }}
        >
          <Check size={28} strokeWidth={3} />
        </div>

        <div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 700, color: '#111827', marginBottom: '0.35rem' }}>
            Complaint submitted
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.95rem' }}>
            Your ticket number is
          </p>
        </div>

        {/* Large green ticket number panel */}
        <div
          style={{
            width: '100%',
            backgroundColor: '#ECFDF5',
            borderRadius: '10px',
            padding: '0.85rem 1rem',
            textAlign: 'center',
          }}
        >
          <span
            style={{
              fontSize: '1.85rem',
              fontWeight: 800,
              color: '#00845F',
              letterSpacing: '0.04em',
            }}
          >
            {ticketId || 'WM-84476'}
          </span>
        </div>

        {/* Dynamic worker assignment note */}
        <p style={{ color: '#475569', fontSize: '0.92rem' }}>
          {workerName ? (
            <>Assigned to <strong>{workerName}</strong>. A confirmation email is on its way.</>
          ) : (
            <>Assigned to on-duty sanitation personnel. A confirmation email is on its way.</>
          )}
        </p>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', width: '100%', marginTop: '0.5rem', justifyContent: 'center' }}>
          <button
            className="btn-primary"
            onClick={() => onTrack(ticketId)}
            style={{ width: 'auto', padding: '0.65rem 1.4rem' }}
          >
            Track this complaint
          </button>
          <button
            className="btn-secondary"
            onClick={onReportAnother}
            style={{ width: 'auto', padding: '0.65rem 1.4rem' }}
          >
            Report another
          </button>
        </div>
      </div>
    </div>
  );
}
