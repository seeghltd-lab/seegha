import { useState, useEffect, useCallback, useRef } from 'react';

// Hits our own backend to confirm real internet — navigator.onLine stays true
// even on WiFi with no internet route, so we need an actual network request.
const CHECK_URL = (import.meta.env.VITE_API_URL || '') + '/api/health';
const POLL_INTERVAL = 10_000; // re-check every 10 s while offline

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const timerRef = useRef(null);

  const checkConnectivity = useCallback(async () => {
    try {
      await fetch(CHECK_URL, {
        method: 'HEAD',
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      });
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, []);

  useEffect(() => {
    // On mount: if browser already knows it's offline, show immediately;
    // otherwise do a real fetch to catch the WiFi-but-no-internet case.
    if (!navigator.onLine) {
      setOffline(true);
    } else {
      checkConnectivity();
    }

    const handleOffline = () => setOffline(true);
    const handleOnline = () => checkConnectivity(); // confirm with real fetch

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [checkConnectivity]);

  // Poll while the banner is showing so it auto-hides when connection returns
  useEffect(() => {
    if (offline) {
      timerRef.current = setInterval(checkConnectivity, POLL_INTERVAL);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [offline, checkConnectivity]);

  if (!offline) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      background: 'var(--warning)',
      color: '#1a1000',
      padding: '9px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      fontSize: 13,
      fontWeight: 600,
      fontFamily: 'var(--font-body)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      You are offline — please reconnect to the internet to continue.
    </div>
  );
}
