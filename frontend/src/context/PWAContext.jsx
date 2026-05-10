import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

/* global __APP_VERSION__ */
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';

const PWAContext = createContext(null);

export function PWAProvider({ children }) {
  const installPromptRef = useRef(null);
  const swRegistrationRef = useRef(null);

  const [isInstalled, setIsInstalled] = useState(
    () => window.matchMedia('(display-mode: standalone)').matches || !!window.navigator.standalone
  );
  const [isInstallable, setIsInstallable] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [swStatus, setSwStatus] = useState('checking');
  // 'checking' | 'active' | 'installing' | 'waiting' | 'error' | 'unsupported' | 'inactive'
  const [notifPermission, setNotifPermission] = useState(
    'Notification' in window ? Notification.permission : 'unsupported'
  );

  // ── Detect display-mode change (user installs after page load) ──
  useEffect(() => {
    const mql = window.matchMedia('(display-mode: standalone)');
    const handler = (e) => setIsInstalled(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // ── Capture browser install prompt ──
  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault();
      installPromptRef.current = e;
      setIsInstallable(true);
    };
    const onAppInstalled = () => {
      installPromptRef.current = null;
      setIsInstallable(false);
      setIsInstalled(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  // ── Listen for update event dispatched by main.jsx ──
  useEffect(() => {
    const handler = () => setUpdateAvailable(true);
    window.addEventListener('pwa-update-available', handler);
    return () => window.removeEventListener('pwa-update-available', handler);
  }, []);

  // ── Track SW registration state ──
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      setSwStatus('unsupported');
      return;
    }

    const trackRegistration = (reg) => {
      swRegistrationRef.current = reg;

      if (reg.waiting) {
        setSwStatus('waiting');
        setUpdateAvailable(true);
      } else if (reg.installing) {
        setSwStatus('installing');
      } else if (reg.active) {
        setSwStatus('active');
      }

      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        if (!worker) return;
        setSwStatus('installing');
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              setSwStatus('waiting');
              setUpdateAvailable(true);
            } else {
              setSwStatus('active');
            }
          } else if (worker.state === 'activated') {
            setSwStatus('active');
          }
        });
      });
    };

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) {
        setSwStatus('inactive');
        return;
      }
      trackRegistration(reg);
    }).catch(() => setSwStatus('error'));

    navigator.serviceWorker.ready.then((reg) => {
      swRegistrationRef.current = reg;
      setSwStatus((prev) => (prev === 'checking' || prev === 'inactive') ? 'active' : prev);
    }).catch(() => {});
  }, []);

  // ── Actions ──

  const install = useCallback(async () => {
    const prompt = installPromptRef.current;
    if (!prompt) return 'no-prompt';
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') {
        installPromptRef.current = null;
        setIsInstallable(false);
      }
      return outcome;
    } catch {
      return 'error';
    }
  }, []);

  const update = useCallback(async () => {
    const reg = swRegistrationRef.current
      || await navigator.serviceWorker.getRegistration().catch(() => null);
    if (reg?.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  }, []);

  const checkForUpdate = useCallback(async () => {
    const reg = swRegistrationRef.current
      || await navigator.serviceWorker.getRegistration().catch(() => null);
    if (reg) {
      try { await reg.update(); } catch { /* network error, ignore */ }
    }
  }, []);

  const requestNotifPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'unsupported';
    const result = await Notification.requestPermission();
    setNotifPermission(result);
    return result;
  }, []);

  // ── Device info (computed, not state) ──
  const platform = (() => {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
    if (/Android/.test(ua)) return 'Android';
    if (/Win/.test(ua)) return 'Windows';
    if (/Mac/.test(ua)) return 'macOS';
    if (/Linux/.test(ua)) return 'Linux';
    return 'Unknown';
  })();

  const browser = (() => {
    const ua = navigator.userAgent;
    if (/Edg\//.test(ua)) return 'Edge';
    if (/OPR\/|Opera/.test(ua)) return 'Opera';
    if (/Chrome\//.test(ua)) return 'Chrome';
    if (/Firefox\//.test(ua)) return 'Firefox';
    if (/Safari\//.test(ua)) return 'Safari';
    return 'Browser';
  })();

  const displayMode = (() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return 'Standalone App';
    if (window.matchMedia('(display-mode: fullscreen)').matches) return 'Fullscreen';
    if (window.matchMedia('(display-mode: minimal-ui)').matches) return 'Minimal UI';
    return 'Browser Tab';
  })();

  const value = {
    version: APP_VERSION,
    isInstalled,
    isInstallable,
    updateAvailable,
    swStatus,
    notifPermission,
    install,
    update,
    checkForUpdate,
    requestNotifPermission,
    platform,
    browser,
    displayMode,
    hasSwSupport: 'serviceWorker' in navigator,
    hasNotifSupport: 'Notification' in window,
    hasPushSupport: 'PushManager' in window,
    hasBadgeSupport: 'setAppBadge' in navigator,
  };

  return <PWAContext.Provider value={value}>{children}</PWAContext.Provider>;
}

export const usePWA = () => {
  const ctx = useContext(PWAContext);
  if (!ctx) throw new Error('usePWA must be used inside <PWAProvider>');
  return ctx;
};
