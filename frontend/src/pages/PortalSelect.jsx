import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SITE_NAME } from '../config/site';

const shortName = SITE_NAME.split(' ')[0];

export default function PortalSelect() {
  const navigate = useNavigate();

  return (
    <div className="stoq-portal">
      <div className="stoq-portal__bg" />
      <div className="stoq-portal__grid" />

      <div className="stoq-portal__inner">
        {/* Brand */}
        <div className="stoq-portal__brand">
          <div className="brand-mark"><span>{shortName.charAt(0)}</span></div>
          <div>
            <div className="brand-name">{SITE_NAME}</div>
            <div className="brand-meta">Select your portal to continue</div>
          </div>
        </div>

        {/* Status chip */}
        <div className="stoq-login__chip" style={{ marginBottom: 36 }}>
          <span className="pulse" />
          System nominal · v1.0
        </div>

        {/* Portal cards */}
        <div className="stoq-portal__cards">

          {/* Employee card */}
          <button className="stoq-portal__card" onClick={() => navigate('/login')}>
            <div className="stoq-portal__card-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div className="stoq-portal__card-title">Employee Portal</div>
            <div className="stoq-portal__card-sub">
              Access your dashboard, submit requisitions, view stock and track your activity.
            </div>
            <div className="stoq-portal__card-arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
              Staff Login
            </div>
          </button>

          {/* Admin card */}
          <button className="stoq-portal__card stoq-portal__card--admin" onClick={() => navigate('/admin/login')}>
            <div className="stoq-portal__card-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div className="stoq-portal__card-title">Admin Console</div>
            <div className="stoq-portal__card-sub">
              Full system access — manage inventory, employees, suppliers, sites and reports.
            </div>
            <div className="stoq-portal__card-arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
              Admin Login
            </div>
          </button>

        </div>

        <p className="stoq-portal__footer">
          © {new Date().getFullYear()} {SITE_NAME} · All rights reserved
        </p>
      </div>

      <style>{`
        .stoq-portal {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-base);
          position: relative;
          overflow: hidden;
          padding: 40px 20px;
        }
        .stoq-portal__bg {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 80% 60% at 50% -10%, var(--accent-muted) 0%, transparent 70%);
          opacity: 0.35;
          pointer-events: none;
        }
        .stoq-portal__grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(var(--border) 1px, transparent 1px),
            linear-gradient(90deg, var(--border) 1px, transparent 1px);
          background-size: 48px 48px;
          opacity: 0.35;
          mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black, transparent);
          pointer-events: none;
        }
        .stoq-portal__inner {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          max-width: 680px;
        }
        .stoq-portal__brand {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 28px;
        }
        .stoq-portal__cards {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          width: 100%;
          margin-bottom: 32px;
        }
        .stoq-portal__card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--r-lg);
          padding: 28px 24px;
          text-align: left;
          cursor: pointer;
          transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .stoq-portal__card:hover {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-muted), 0 8px 24px rgba(0,0,0,0.1);
          transform: translateY(-2px);
        }
        .stoq-portal__card--admin:hover {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-muted), 0 8px 24px rgba(0,0,0,0.1);
        }
        .stoq-portal__card-icon {
          width: 52px;
          height: 52px;
          border-radius: var(--r-md);
          background: var(--bg-sunk);
          border: 1px solid var(--border);
          display: grid;
          place-items: center;
          color: var(--accent);
          margin-bottom: 4px;
        }
        .stoq-portal__card--admin .stoq-portal__card-icon {
          background: var(--accent-muted);
          border-color: var(--accent);
          color: var(--accent-soft-fg);
        }
        .stoq-portal__card-title {
          font-size: 17px;
          font-weight: 700;
          color: var(--fg-base);
          letter-spacing: -0.2px;
        }
        .stoq-portal__card-sub {
          font-size: 13px;
          color: var(--fg-muted);
          line-height: 1.6;
          flex: 1;
        }
        .stoq-portal__card-arrow {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          color: var(--accent-soft-fg);
          margin-top: 6px;
        }
        .stoq-portal__footer {
          font-size: 11px;
          color: var(--fg-subtle);
          text-align: center;
        }
        @media (max-width: 520px) {
          .stoq-portal__cards { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
