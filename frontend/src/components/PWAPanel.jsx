import React, { useState } from 'react';
import {
  Download, RefreshCw, Bell, CheckCircle, XCircle,
  Monitor, Smartphone, AlertTriangle, Wifi, WifiOff,
} from 'lucide-react';
import { usePWA } from '../context/PWAContext';
import { SITE_NAME } from '../config/site';

const shortName = SITE_NAME.split(' ')[0];

// ─── Small helpers ────────────────────────────────────────────────────────────

function SwStatusBadge({ status }) {
  const map = {
    active:      { color: 'var(--success)',   bg: 'var(--success-soft)',   label: 'Active' },
    installing:  { color: 'var(--warning)',   bg: 'var(--warning-soft)',   label: 'Installing…' },
    waiting:     { color: 'var(--warning)',   bg: 'var(--warning-soft)',   label: 'Update waiting' },
    error:       { color: 'var(--danger)',    bg: 'var(--danger-soft)',    label: 'Error' },
    unsupported: { color: 'var(--fg-subtle)', bg: 'var(--bg-sunk)',        label: 'Not supported' },
    inactive:    { color: 'var(--fg-subtle)', bg: 'var(--bg-sunk)',        label: 'Inactive' },
    checking:    { color: 'var(--fg-subtle)', bg: 'var(--bg-sunk)',        label: 'Checking…' },
  };
  const { color, bg, label } = map[status] || map.checking;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
      background: bg, color, border: `1px solid ${color}30`,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0,
        boxShadow: status === 'active' ? `0 0 0 3px ${color}30` : 'none',
        animation: status === 'installing' ? 'pwa-pulse-dot 1s ease-in-out infinite' : 'none',
      }} />
      {label}
    </span>
  );
}

function FeatureChip({ label, supported }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 9px', borderRadius: 99, fontSize: 11, fontWeight: 600,
      background: supported ? 'var(--success-soft)' : 'var(--danger-soft)',
      color: supported ? 'var(--success)' : 'var(--danger)',
      border: `1px solid ${supported ? 'var(--success)' : 'var(--danger)'}25`,
    }}>
      {supported ? <CheckCircle size={10} /> : <XCircle size={10} />}
      {label}
    </span>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{
        fontSize: 10, color: 'var(--fg-subtle)', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>{value}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PWAPanel() {
  const {
    version, isInstalled, isInstallable, updateAvailable, swStatus, notifPermission,
    install, update, checkForUpdate, requestNotifPermission,
    platform, browser, displayMode,
    hasSwSupport, hasNotifSupport, hasPushSupport, hasBadgeSupport,
  } = usePWA();

  const [installing, setInstalling] = useState(false);
  const [installOutcome, setInstallOutcome] = useState(null); // 'accepted' | 'dismissed'
  const [checking, setChecking] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [updatingNow, setUpdatingNow] = useState(false);

  const handleInstall = async () => {
    setInstalling(true);
    const outcome = await install();
    setInstallOutcome(outcome);
    setInstalling(false);
  };

  const handleCheckUpdate = async () => {
    setChecking(true);
    await checkForUpdate();
    setTimeout(() => setChecking(false), 2500);
  };

  const handleUpdate = () => {
    setUpdatingNow(true);
    update();
  };

  const handleEnableNotif = async () => {
    setNotifLoading(true);
    await requestNotifPermission();
    setNotifLoading(false);
  };

  const notifMeta = {
    granted:     { color: 'var(--success)', bg: 'var(--success-soft)', label: 'Enabled',          desc: 'You will receive real-time alerts for activity on this device.' },
    denied:      { color: 'var(--danger)',  bg: 'var(--danger-soft)',  label: 'Blocked',           desc: 'Notifications are blocked. Go to browser site settings to unblock.' },
    default:     { color: 'var(--warning)', bg: 'var(--warning-soft)', label: 'Not yet enabled',   desc: 'Enable to receive real-time alerts, requisition updates, and more.' },
    unsupported: { color: 'var(--fg-subtle)', bg: 'var(--bg-sunk)',   label: 'Not supported',     desc: 'Your browser does not support notifications.' },
  }[notifPermission] || { color: 'var(--fg-subtle)', bg: 'var(--bg-sunk)', label: notifPermission, desc: '' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Update available banner ── */}
      {updateAvailable && (
        <div style={{
          background: 'var(--warning-soft)',
          border: '1px solid var(--warning)',
          borderRadius: 'var(--r-lg)',
          padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <AlertTriangle size={20} color="var(--warning)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>
              New version available
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>
              A new version of {SITE_NAME} is ready. Reload now to apply the update.
            </div>
          </div>
          <button
            onClick={handleUpdate}
            disabled={updatingNow}
            className="stoq-btn stoq-btn--primary"
            style={{ flexShrink: 0, opacity: updatingNow ? 0.7 : 1 }}
          >
            <RefreshCw size={12} style={{ animation: updatingNow ? 'spin 1s linear infinite' : 'none' }} />
            {updatingNow ? 'Reloading…' : 'Reload & Update'}
          </button>
        </div>
      )}

      {/* ── App status card ── */}
      <div className="stoq-panel">
        <div className="stoq-panel__head">
          <span className="stoq-panel__title">App Status</span>
          <button
            onClick={handleCheckUpdate}
            disabled={checking}
            className="stoq-btn"
            style={{ fontSize: 11, padding: '3px 9px', opacity: checking ? 0.65 : 1 }}
            title="Check for a newer version"
          >
            <RefreshCw size={11} style={{ animation: checking ? 'spin 1s linear infinite' : 'none' }} />
            {checking ? 'Checking…' : 'Check for updates'}
          </button>
        </div>

        <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* App icon */}
          <div style={{
            width: 60, height: 60, borderRadius: 16, flexShrink: 0,
            background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
            display: 'grid', placeItems: 'center',
            color: 'var(--accent-fg)',
            fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-display)',
            boxShadow: '0 4px 12px var(--accent-ring)',
          }}>
            {shortName.charAt(0)}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Name + version */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>{SITE_NAME}</span>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                background: 'var(--bg-sunk)', border: '1px solid var(--border)',
                color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)',
              }}>
                v{version}
              </span>
            </div>

            {/* Status rows */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--fg-muted)' }}>
                <span>Service Worker</span>
                <SwStatusBadge status={swStatus} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--fg-muted)' }}>
                {isInstalled
                  ? <><Smartphone size={12} /><span style={{ color: 'var(--success)', fontWeight: 600 }}>Installed app</span></>
                  : <><Monitor size={12} /><span>Browser tab</span></>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Install card ── */}
      {isInstallable && installOutcome !== 'accepted' && (
        <div className="stoq-panel">
          <div className="stoq-panel__head">
            <span className="stoq-panel__title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Download size={13} /> Install App
            </span>
          </div>
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.7, marginBottom: 14 }}>
              Install <strong>{SITE_NAME}</strong> on this device for a faster, app-like experience — no browser chrome, direct from your home screen or taskbar.
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 16 }}>
              {[
                'App icon on home screen / taskbar',
                'Faster startup',
                'Full-screen experience',
                'Real-time push notifications',
                'Offline connectivity banner',
              ].map(b => (
                <span key={b} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: 11, fontWeight: 600,
                  color: 'var(--success)', background: 'var(--success-soft)',
                  padding: '3px 10px', borderRadius: 99,
                }}>
                  <CheckCircle size={10} /> {b}
                </span>
              ))}
            </div>
            {installOutcome === 'dismissed' && (
              <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 10 }}>
                You dismissed the last prompt. Click below to try again.
              </div>
            )}
            <button
              onClick={handleInstall}
              disabled={installing}
              className="stoq-btn stoq-btn--primary"
              style={{ opacity: installing ? 0.7 : 1 }}
            >
              <Download size={13} />
              {installing ? 'Opening install prompt…' : `Install ${SITE_NAME}`}
            </button>
          </div>
        </div>
      )}

      {/* ── Already installed confirmation ── */}
      {isInstalled && (
        <div style={{
          background: 'var(--success-soft)',
          border: '1px solid var(--success)',
          borderRadius: 'var(--r-lg)',
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
          fontSize: 12, fontWeight: 600, color: 'var(--success)',
        }}>
          <CheckCircle size={16} />
          {SITE_NAME} is installed on this device
        </div>
      )}

      {/* ── Notifications card ── */}
      <div className="stoq-panel">
        <div className="stoq-panel__head">
          <span className="stoq-panel__title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Bell size={13} /> Push Notifications
          </span>
        </div>
        <div style={{ padding: 16, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Permission:</span>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 99,
                background: notifMeta.bg, color: notifMeta.color,
                border: `1px solid ${notifMeta.color}30`,
              }}>
                {notifMeta.label}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--fg-subtle)', lineHeight: 1.6 }}>
              {notifMeta.desc}
            </div>
          </div>
          {notifPermission === 'default' && hasNotifSupport && (
            <button
              onClick={handleEnableNotif}
              disabled={notifLoading}
              className="stoq-btn stoq-btn--primary"
              style={{ flexShrink: 0, opacity: notifLoading ? 0.7 : 1 }}
            >
              <Bell size={12} />
              {notifLoading ? 'Requesting…' : 'Enable'}
            </button>
          )}
        </div>
      </div>

      {/* ── Device & browser info ── */}
      <div className="stoq-panel">
        <div className="stoq-panel__head">
          <span className="stoq-panel__title">Device & Browser</span>
        </div>
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
            <InfoRow label="Platform" value={platform} />
            <InfoRow label="Browser"  value={browser} />
            <InfoRow label="Display mode" value={displayMode} />
            <InfoRow label="App version" value={`v${version}`} />
          </div>

          <div style={{ height: 1, background: 'var(--border)' }} />

          <div>
            <div style={{
              fontSize: 10, color: 'var(--fg-subtle)', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8,
            }}>
              Feature support on this device
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <FeatureChip label="Service Worker" supported={hasSwSupport} />
              <FeatureChip label="Push API"        supported={hasPushSupport} />
              <FeatureChip label="Notifications"   supported={hasNotifSupport} />
              <FeatureChip label="Installable"     supported={isInstalled || isInstallable} />
              <FeatureChip label="Badge API"       supported={hasBadgeSupport} />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pwa-pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
