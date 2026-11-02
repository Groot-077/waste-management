import React from 'react';
import { Recycle } from 'lucide-react';

export default function Navbar({ activePage, onNavigate }) {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="navbar-brand" onClick={() => onNavigate('report')}>
          <div className="brand-icon-box">
            <Recycle size={18} strokeWidth={2.4} />
          </div>
          <span className="brand-desktop">Smart Waste Management</span>
          <span className="brand-mobile">SmartWaste</span>
        </div>

        <nav className="navbar-nav">
          <button
            className={`nav-link ${activePage === 'report' ? 'active' : ''}`}
            onClick={() => onNavigate('report')}
          >
            Report
          </button>
          <button
            className={`nav-link ${activePage === 'track' ? 'active' : ''}`}
            onClick={() => onNavigate('track')}
          >
            Track
          </button>
          <button
            className={`nav-link ${activePage === 'worker' ? 'active' : ''}`}
            onClick={() => onNavigate('worker')}
          >
            Worker
          </button>
        </nav>
      </div>
      <style>{`
        .brand-mobile {
          display: none;
        }
        @media (max-width: 520px) {
          .brand-desktop {
            display: none;
          }
          .brand-mobile {
            display: inline;
            font-weight: 700;
          }
          .nav-link {
            padding: 0.35rem 0.65rem;
            font-size: 0.85rem;
          }
        }
      `}</style>
    </header>
  );
}
