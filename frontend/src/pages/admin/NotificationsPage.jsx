import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell, CheckCheck, Search, Settings, Smartphone, Monitor,
  Trash2, X, CheckCircle2, Clock, Loader2, BellOff, BellRing,
  RefreshCw, Shield, AlertCircle, CheckCircle,
} from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';
import notificationService from '../../services/notificationService';
import api from '../../lib/axios';
import { subscribePush, unsubscribePush, checkPushSubscribed } from '../../lib/push';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function NotificationsPage() {
  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead, activeRecipient } = useNotification();
  const { admin } = useAdminAuth();
  const { employee } = useEmployeeAuth();
  const user = admin || employee;
  const userType = admin ? 'ADMIN' : 'EMPLOYEE';

  const [tab, setTab] = useState('all');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [localNotifs, setLocalNotifs] = useState([]);
  const [localTotal, setLocalTotal] = useState(0);
  const [localPage, setLocalPage] = useState(1);
  const [localTotalPages, setLocalTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [subscriptions, setSubscriptions] = useState([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [pushToggling, setPushToggling] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const loadPage = useCallback(async (pg = 1) => {
    if (!activeRecipient) return;
    setLoading(true);
    try {
      const data = await notificationService.getNotifications(activeRecipient.id, activeRecipient.type, pg, 15, search || undefined);
      const items = filter === 'unread' ? data.notifications.filter(n => !n.read) : data.notifications;
      setLocalNotifs(items);
      setLocalTotal(data.total);
      setLocalPage(data.page);
      setLocalTotalPages(data.totalPages);
    } catch {
      showToast('Failed to load notifications', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeRecipient, search, filter]);

  useEffect(() => { if (tab === 'all') loadPage(1); }, [tab, filter, loadPage]);
  useEffect(() => { const t = setTimeout(() => loadPage(1), 400); return () => clearTimeout(t); }, [search]);

  const loadPushSettings = useCallback(async () => {
    if (!user?.id) return;
    setSubsLoading(true);
    try {
      const [isSubbed, { data: subs }] = await Promise.all([
        checkPushSubscribed(user.id, userType),
        api.get('/push-notifications/subscriptions', { params: { userId: user.id, type: userType } }),
      ]);
      setPushSubscribed(isSubbed);
      setSubscriptions(subs);
    } catch {} finally { setSubsLoading(false); }
  }, [user?.id, userType]);

  useEffect(() => { if (tab === 'settings') loadPushSettings(); }, [tab, loadPushSettings]);

  const handleMarkAsRead = async (id) => {
    await markAsRead(id);
    setLocalNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleMarkAll = async () => {
    await markAllAsRead();
    setLocalNotifs(prev => prev.map(n => ({ ...n, read: true })));
    showToast('All notifications marked as read');
  };

  const handlePushToggle = async () => {
    if (!user?.id) return;
    setPushToggling(true);
    try {
      if (pushSubscribed) {
        await unsubscribePush(user.id, userType);
        setPushSubscribed(false);
        showToast('Push notifications disabled');
        await loadPushSettings();
      } else {
        const res = await subscribePush(user.id, userType);
        if (res) { setPushSubscribed(true); showToast('Push notifications enabled'); await loadPushSettings(); }
        else showToast('Could not enable push — check browser permissions', 'error');
      }
    } catch { showToast('Failed to toggle push notifications', 'error'); }
    finally { setPushToggling(false); }
  };

  const handleDeleteSub = async (endpoint) => {
    try {
      await api.delete('/push-notifications/unsubscribe/device', { data: { userId: user.id, type: userType, endpoint } });
      setSubscriptions(prev => prev.filter(s => s.endpoint !== endpoint));
      const reg = await navigator.serviceWorker?.ready;
      const current = await reg?.pushManager?.getSubscription();
      if (current?.endpoint === endpoint) { setPushSubscribed(false); await current.unsubscribe(); }
      showToast('Subscription removed');
    } catch { showToast('Failed to remove subscription', 'error'); }
  };

  const handleDeleteAllSubs = async () => {
    try {
      await api.delete('/push-notifications/unsubscribe/all', { data: { userId: user.id, type: userType } });
      setSubscriptions([]);
      setPushSubscribed(false);
      showToast('All subscriptions removed');
    } catch { showToast('Failed to remove all subscriptions', 'error'); }
  };

  return (
    <div style={{ padding: '20px 24px 40px' }}>
      {toast && (
        <div className={`stoq-toast ${toast.type === 'error' ? 'stoq-toast--error' : 'stoq-toast--success'}`}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {toast.type === 'error' ? <AlertCircle size={13} /> : <CheckCircle size={13} />}
          {toast.msg}
        </div>
      )}

      {/* Page head */}
      <div className="page-head">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={18} style={{ color: 'var(--accent-soft-fg)' }} /> Notifications
          </h1>
          <div className="page-head__sub">{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</div>
        </div>
        {tab === 'all' && unreadCount > 0 && (
          <div className="page-head__actions">
            <button className="stoq-btn" onClick={handleMarkAll}>
              <CheckCheck size={13} /> Mark all read
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="stoq-tabs" style={{ marginBottom: 16 }}>
        {[
          { key: 'all', icon: Bell, label: 'All Notifications' },
          { key: 'settings', icon: Settings, label: 'Settings' },
        ].map(({ key, icon: Icon, label }) => (
          <button key={key} className="stoq-tab" data-active={tab === key ? 'true' : 'false'} onClick={() => setTab(key)}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* ── ALL NOTIFICATIONS ── */}
      {tab === 'all' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Toolbar */}
          <div className="stoq-toolbar">
            <div className="stoq-toolbar__search" style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)', pointerEvents: 'none' }} />
              <input
                className="stoq-input stoq-input--search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search notifications…"
              />
            </div>
            <div className="stoq-segment">
              {[['all', 'All'], ['unread', 'Unread']].map(([val, label]) => (
                <button key={val} data-active={filter === val ? 'true' : 'false'} onClick={() => setFilter(val)}>{label}</button>
              ))}
            </div>
            <button className="icon-btn" onClick={() => loadPage(localPage)} title="Refresh">
              <RefreshCw size={13} />
            </button>
          </div>

          {/* List */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
              <Loader2 size={22} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
            </div>
          ) : localNotifs.length === 0 ? (
            <div className="stoq-empty">
              <Bell size={28} className="stoq-empty__icon" />
              <div className="stoq-empty__title">No notifications</div>
              <div>{filter === 'unread' ? "You're all caught up!" : 'Nothing here yet'}</div>
            </div>
          ) : (
            <div className="stoq-panel">
              {localNotifs.map(notif => (
                <div key={notif.id} style={{
                  display: 'flex', gap: 12, padding: '12px 16px',
                  borderBottom: '1px solid var(--border)',
                  background: !notif.read ? 'color-mix(in oklch, var(--accent) 4%, var(--panel))' : 'var(--panel)',
                  cursor: 'default',
                }}>
                  <div style={{ flexShrink: 0, marginTop: 3 }}>
                    {notif.read
                      ? <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--border-strong)' }} />
                      : <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: notif.read ? 500 : 600, color: notif.read ? 'var(--fg-muted)' : 'var(--fg)', lineHeight: 1.4 }}>
                        {notif.title}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Clock size={9} /> {timeAgo(notif.createdAt)}
                      </span>
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 2, lineHeight: 1.5 }}>{notif.message}</p>
                  </div>
                  {!notif.read && (
                    <button className="icon-btn" style={{ flexShrink: 0, alignSelf: 'center' }}
                      onClick={() => handleMarkAsRead(notif.id)} title="Mark as read">
                      <CheckCheck size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {localTotalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>
                Page {localPage} of {localTotalPages} · {localTotal} total
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="stoq-btn stoq-btn--sm" disabled={localPage <= 1} onClick={() => loadPage(localPage - 1)}>Previous</button>
                <button className="stoq-btn stoq-btn--sm" disabled={localPage >= localTotalPages} onClick={() => loadPage(localPage + 1)}>Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SETTINGS ── */}
      {tab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Push toggle */}
          <div className="stoq-panel">
            <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="kpi__icon" style={{ width: 36, height: 36, background: pushSubscribed ? 'var(--success-soft)' : 'var(--bg-sunk)', color: pushSubscribed ? 'var(--success)' : 'var(--fg-subtle)' }}>
                  {pushSubscribed ? <BellRing size={16} /> : <BellOff size={16} />}
                </span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>Push Notifications</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 2 }}>
                    {pushSubscribed ? "Enabled on this device" : "Disabled — enable to receive background alerts"}
                  </div>
                </div>
              </div>
              <button
                onClick={handlePushToggle}
                disabled={pushToggling}
                style={{
                  position: 'relative', flexShrink: 0,
                  width: 44, height: 24, borderRadius: 12,
                  background: pushSubscribed ? 'var(--success)' : 'var(--border-strong)',
                  border: 'none', cursor: 'pointer', transition: 'background 0.2s',
                  opacity: pushToggling ? 0.6 : 1,
                }}
              >
                <span style={{
                  position: 'absolute', top: 3,
                  left: pushSubscribed ? 23 : 3,
                  width: 18, height: 18, borderRadius: '50%',
                  background: 'white', boxShadow: 'var(--shadow-sm)',
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>
          </div>

          {/* Subscriptions */}
          <div className="stoq-panel">
            <div className="stoq-panel__head">
              <div>
                <span className="stoq-panel__title">Active Subscriptions</span>
                <span className="stoq-panel__sub" style={{ marginLeft: 8 }}>Devices receiving push alerts</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="icon-btn" onClick={loadPushSettings} title="Refresh"><RefreshCw size={12} /></button>
                {subscriptions.length > 1 && (
                  <button className="stoq-btn stoq-btn--sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger-soft)' }}
                    onClick={handleDeleteAllSubs}>
                    <X size={11} /> Remove all
                  </button>
                )}
              </div>
            </div>

            {subsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
              </div>
            ) : subscriptions.length === 0 ? (
              <div className="stoq-empty">
                <Shield size={24} className="stoq-empty__icon" />
                <div className="stoq-empty__title">No active subscriptions</div>
                <div>Enable push notifications above to add one.</div>
              </div>
            ) : (
              subscriptions.map((sub) => {
                const isMobile = sub.label?.toLowerCase().includes('mobile');
                return (
                  <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                    <span className="kpi__icon" style={{ flexShrink: 0 }}>
                      {isMobile ? <Smartphone size={13} /> : <Monitor size={13} />}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>
                        {sub.label || (isMobile ? 'Mobile Device' : 'Desktop Browser')}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)' }}>
                        Added {timeAgo(sub.createdAt)}
                      </div>
                    </div>
                    <button className="icon-btn" onClick={() => handleDeleteSub(sub.endpoint)} title="Remove">
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Info */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: 'var(--accent-soft)', borderRadius: 'var(--r-md)', fontSize: 11, color: 'var(--accent-soft-fg)' }}>
            <Shield size={13} style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ margin: 0, lineHeight: 1.6 }}>
              Push notifications require browser permission and valid VAPID keys. Run{' '}
              <code style={{ fontFamily: 'var(--font-mono)', background: 'var(--bg-sunk)', padding: '1px 4px', borderRadius: 3 }}>
                npx web-push generate-vapid-keys
              </code>{' '}
              and update your <code style={{ fontFamily: 'var(--font-mono)', background: 'var(--bg-sunk)', padding: '1px 4px', borderRadius: 3 }}>.env</code> files if push is not working.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
