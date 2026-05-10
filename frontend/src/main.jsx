import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

// Register SW — when a new version is detected, fire an app-level event
// so PWAContext can surface the "update available" UI without reloading immediately.
registerSW({
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent('pwa-update-available'));
  },
  onOfflineReady() {
    console.log('[PWA] Service worker installed');
  },
  onRegisterError(err) {
    console.error('[PWA] Service worker registration failed:', err);
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
