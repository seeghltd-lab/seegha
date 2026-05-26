import { useState, useEffect, useCallback, useRef } from 'react';

// Check real internet connectivity against 3 always-available external URLs.
// navigator.onLine stays true on WiFi-with-no-route, so we do real fetches.
// mode:'no-cors' avoids CORS errors on opaque responses but still throws on no internet.
const CHECK_URLS = [
  'https://www.gstatic.com/generate_204',
  'https://connectivitycheck.gstatic.com/generate_204',
  'https://1.1.1.1',
];
const POLL_INTERVAL = 10_000;

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const timerRef = useRef(null);

  const checkConnectivity = useCallback(async () => {
    for (const url of CHECK_URLS) {
      try {
        await fetch(url, {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-store',
          signal: AbortSignal.timeout(4000),
        });
        setOffline(false);
        return;
      } catch {
        // try next URL
      }
    }
    setOffline(true);
  }, []);

  useEffect(() => {
    if (!navigator.onLine) {
      setOffline(true);
    } else {
      checkConnectivity();
    }

    const handleOffline = () => setOffline(true);
    const handleOnline = () => checkConnectivity();

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
