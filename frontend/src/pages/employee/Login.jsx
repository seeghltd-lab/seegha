import React, { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';
import { useNotification } from '../../context/NotificationContext';
import { SITE_NAME, SITE_DESCRIPTION } from '../../config/site';

const EmployeeLogin = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login, isAuthenticated, isLoading: authLoading } = useEmployeeAuth();
  const { setRecipient } = useNotification();
  const navigate = useNavigate();

  // Already authenticated → go straight to dashboard
  if (!authLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      setError('');
      const employee = await login({ identifier, password });
      setRecipient(employee.id, 'EMPLOYEE');
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const shortName = SITE_NAME.split(' ')[0];

  return (
    <div className="stoq-login">
      {/* Left — brand panel */}
      <div className="stoq-login__brand">
        <div className="stoq-login__brand-bg" />
        <div className="stoq-login__grid" />

        <div className="stoq-login__brand-content stoq-login__logo">
          <div className="brand-mark"><span>{shortName.charAt(0)}</span></div>
          <div>
            <div className="brand-name">{SITE_NAME}</div>
            <div className="brand-meta">Staff Portal</div>
          </div>
        </div>

        <div className="stoq-login__tag">
          Efficiency<br />at your<br />
          <em>fingertips.</em>
        </div>

        <div className="stoq-login__stats">
          <div>
            <div className="stoq-login__stat-num num">5</div>
            <div className="stoq-login__stat-lbl">Active Sites</div>
          </div>
          <div>
            <div className="stoq-login__stat-num num">Real-time</div>
            <div className="stoq-login__stat-lbl">Stock Updates</div>
          </div>
          <div>
            <div className="stoq-login__stat-num num">Instant</div>
            <div className="stoq-login__stat-lbl">Approvals</div>
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="stoq-login__form-side">
        <div className="stoq-login__form">
          <div className="stoq-login__chip">
            <span className="pulse" />
            System nominal
          </div>

          <h2>Welcome back</h2>
          <div className="stoq-login__form-sub">
            Enter your credentials to access your staff portal.
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', marginBottom: 16,
              background: 'var(--danger-soft)',
              border: '1px solid var(--danger)',
              borderRadius: 'var(--r-sm)',
              color: 'var(--danger)', fontSize: 12,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="stoq-field">
              <label className="stoq-field__label">Email or Phone</label>
              <input
                className="stoq-input"
                type="text"
                required
                placeholder="e.g. employee@company.com"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
              />
            </div>
            <div className="stoq-field" style={{ marginTop: 14 }}>
              <label className="stoq-field__label">Passcode</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="stoq-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ paddingRight: 36 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 10, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none',
                    color: 'var(--fg-subtle)', cursor: 'pointer',
                    display: 'grid', placeItems: 'center',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {showPassword
                      ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                      : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                    }
                  </svg>
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0 18px', fontSize: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--fg-muted)', cursor: 'pointer' }}>
                <input type="checkbox" className="stoq-checkbox" /> Remember me
              </label>
              <a href="#" style={{ color: 'var(--accent-soft-fg)', fontWeight: 600, textDecoration: 'none', fontSize: 12 }}>
                Forgot passcode?
              </a>
            </div>

            <button
              type="submit"
              className="stoq-btn stoq-btn--primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Signing in…
                </span>
              ) : (
                <>
                  Access Dashboard
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--fg-muted)' }}>
            Are you an administrator?{' '}
            <Link to="/admin/login" style={{ color: 'var(--accent-soft-fg)', fontWeight: 600, textDecoration: 'none' }}>
              Admin Login
            </Link>
          </p>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default EmployeeLogin;
