import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Home } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine where "home" is based on the path prefix
  const isAdmin = location.pathname.startsWith('/admin');
  const homeRoute = isAdmin ? '/admin/dashboard' : '/dashboard';
  const loginRoute = isAdmin ? '/admin/login' : '/login';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--bg)',
      padding: 24,
      textAlign: 'center',
      gap: 0,
    }}>
      {/* Big 404 */}
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(80px, 20vw, 160px)',
        fontWeight: 800,
        letterSpacing: '-0.04em',
        color: 'var(--border-strong)',
        lineHeight: 1,
        marginBottom: 8,
        userSelect: 'none',
      }}>
        404
      </div>

      {/* Icon + message */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <AlertCircle size={20} style={{ color: 'var(--danger)', flexShrink: 0 }} />
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: 20,
          fontWeight: 700,
          color: 'var(--fg)',
          letterSpacing: '-0.01em',
        }}>
          Page not found
        </span>
      </div>

      <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 32, maxWidth: 360, lineHeight: 1.6 }}>
        The page{' '}
        <code style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          background: 'var(--bg-sunk)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-xs)',
          padding: '1px 6px',
          color: 'var(--fg)',
        }}>
          {location.pathname}
        </code>
        {' '}doesn't exist or you don't have access to it.
      </p>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          className="stoq-btn"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={13} /> Go back
        </button>
        <button
          className="stoq-btn stoq-btn--primary"
          onClick={() => navigate(homeRoute)}
        >
          <Home size={13} /> Dashboard
        </button>
      </div>
    </div>
  );
}
