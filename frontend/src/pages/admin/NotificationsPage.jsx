import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell, CheckCheck, Search, Settings, Smartphone, Monitor,
  Trash2, X, CheckCircle2, Clock, Loader2, BellOff, BellRing,
  RefreshCw, Shield,
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

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`fixed top-6 right-6 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white flex items-center gap-2 ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
      {toast.msg}
    </div>
  );
}

export default function NotificationsPage() {
  const { notifications, unreadCount, pagination, fetchNotifications, markAsRead, markAllAsRead, activeRecipient } = useNotification();
  const { admin } = useAdminAuth();
  const { employee } = useEmployeeAuth();
  const user = admin || employee;
  const userType = admin ? 'ADMIN' : 'EMPLOYEE';

  const [tab, setTab] = useState('all'); // 'all' | 'settings'
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const [search, setSearch] = useState('');
  const [localNotifs, setLocalNotifs] = useState([]);
  const [localTotal, setLocalTotal] = useState(0);
  const [localPage, setLocalPage] = useState(1);
  const [localTotalPages, setLocalTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Push settings state
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [subscriptions, setSubscriptions] = useState([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [pushToggling, setPushToggling] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  // Load notifications with own search/filter (bypasses context's 20-item cap)
  const loadPage = useCallback(async (pg = 1) => {
    if (!activeRecipient) return;
    setLoading(true);
    try {
      const data = await notificationService.getNotifications(
        activeRecipient.id,
        activeRecipient.type,
        pg,
        15,
        search || undefined,
      );
      // Client-side filter for unread
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

  useEffect(() => {
    if (tab === 'all') loadPage(1);
  }, [tab, filter, loadPage]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => loadPage(1), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Push settings
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
    } catch {
      // ignore
    } finally {
      setSubsLoading(false);
    }
  }, [user?.id, userType]);

  useEffect(() => {
    if (tab === 'settings') loadPushSettings();
  }, [tab, loadPushSettings]);

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
        showToast('Push notifications disabled for this device');
        await loadPushSettings();
      } else {
        const res = await subscribePush(user.id, userType);
        if (res) {
          setPushSubscribed(true);
          showToast('Push notifications enabled');
          await loadPushSettings();
        } else {
          showToast('Could not enable push — check browser permissions or VAPID keys', 'error');
        }
      }
    } catch (err) {
      showToast('Failed to toggle push notifications', 'error');
    } finally {
      setPushToggling(false);
    }
  };

  const handleDeleteSub = async (endpoint) => {
    try {
      await api.delete('/push-notifications/unsubscribe/device', {
        data: { userId: user.id, type: userType, endpoint },
      });
      setSubscriptions(prev => prev.filter(s => s.endpoint !== endpoint));
      // If deleted subscription was current device
      const reg = await navigator.serviceWorker?.ready;
      const current = await reg?.pushManager?.getSubscription();
      if (current?.endpoint === endpoint) {
        setPushSubscribed(false);
        await current.unsubscribe();
      }
      showToast('Subscription removed');
    } catch {
      showToast('Failed to remove subscription', 'error');
    }
  };

  const handleDeleteAllSubs = async () => {
    try {
      await api.delete('/push-notifications/unsubscribe/all', {
        data: { userId: user.id, type: userType },
      });
      setSubscriptions([]);
      setPushSubscribed(false);
      showToast('All subscriptions removed');
    } catch {
      showToast('Failed to remove all subscriptions', 'error');
    }
  };

  const unreadLocal = localNotifs.filter(n => !n.read).length;

  return (
    <div className="p-6 space-y-5 max-w-3xl mx-auto">
      <Toast toast={toast} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
            <Bell size={22} className="text-primary" /> Notifications
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {tab === 'all' && unreadCount > 0 && (
          <button
            onClick={handleMarkAll}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
          >
            <CheckCheck size={15} /> Mark all read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {[
          { key: 'all', icon: Bell, label: 'All Notifications' },
          { key: 'settings', icon: Settings, label: 'Settings' },
        ].map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 -mb-px transition-all ${
              tab === key ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* ── ALL NOTIFICATIONS TAB ─────────────────────── */}
      {tab === 'all' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search notifications..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex rounded-xl border border-slate-200 overflow-hidden">
              {[['all', 'All'], ['unread', 'Unread']].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setFilter(val)}
                  className={`px-4 py-2 text-xs font-bold transition-all ${
                    filter === val ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button onClick={() => loadPage(localPage)} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500">
              <RefreshCw size={14} />
            </button>
          </div>

          {/* List */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={24} className="animate-spin text-primary" />
            </div>
          ) : localNotifs.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
              <Bell size={40} className="mx-auto text-slate-200 mb-3" />
              <p className="font-semibold text-slate-400">No notifications</p>
              {filter === 'unread' && (
                <p className="text-sm text-slate-300 mt-1">You're all caught up!</p>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50 overflow-hidden">
              {localNotifs.map(notif => (
                <div
                  key={notif.id}
                  className={`flex gap-4 px-5 py-4 transition-colors ${
                    !notif.read ? 'bg-primary/[0.03] hover:bg-primary/[0.06]' : 'hover:bg-slate-50/50'
                  }`}
                >
                  {/* Status dot */}
                  <div className="flex-shrink-0 mt-1.5">
                    {notif.read ? (
                      <CheckCircle2 size={16} className="text-slate-300" />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-semibold leading-snug ${notif.read ? 'text-slate-500' : 'text-slate-800'}`}>
                        {notif.title}
                      </p>
                      <span className="flex-shrink-0 text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock size={9} /> {timeAgo(notif.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>

                  {!notif.read && (
                    <button
                      onClick={() => handleMarkAsRead(notif.id)}
                      className="flex-shrink-0 p-1.5 rounded-lg hover:bg-primary/10 text-slate-400 hover:text-primary transition-colors self-center"
                      title="Mark as read"
                    >
                      <CheckCheck size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {localTotalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <p className="text-slate-500">Page {localPage} of {localTotalPages} · {localTotal} total</p>
              <div className="flex gap-2">
                <button disabled={localPage <= 1} onClick={() => loadPage(localPage - 1)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold disabled:opacity-40 hover:bg-slate-50">
                  Previous
                </button>
                <button disabled={localPage >= localTotalPages} onClick={() => loadPage(localPage + 1)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold disabled:opacity-40 hover:bg-slate-50">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SETTINGS TAB ─────────────────────────────── */}
      {tab === 'settings' && (
        <div className="space-y-5">

          {/* Push toggle card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${pushSubscribed ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                  {pushSubscribed ? <BellRing size={20} /> : <BellOff size={20} />}
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">Push Notifications</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {pushSubscribed
                      ? 'Enabled on this device — you\'ll get alerts even when the tab is closed.'
                      : 'Disabled — enable to receive alerts in the background.'}
                  </p>
                </div>
              </div>
              <button
                onClick={handlePushToggle}
                disabled={pushToggling}
                className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors ${pushSubscribed ? 'bg-emerald-500' : 'bg-slate-300'} disabled:opacity-60`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${pushSubscribed ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>

          {/* Subscriptions list */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <p className="font-bold text-slate-800 text-sm">Active Subscriptions</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  All devices receiving push notifications for your account
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={loadPushSettings} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                  <RefreshCw size={13} />
                </button>
                {subscriptions.length > 1 && (
                  <button
                    onClick={handleDeleteAllSubs}
                    className="flex items-center gap-1 text-xs font-bold text-red-500 hover:underline"
                  >
                    <X size={12} /> Remove all
                  </button>
                )}
              </div>
            </div>

            {subsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 size={20} className="animate-spin text-primary" />
              </div>
            ) : subscriptions.length === 0 ? (
              <div className="text-center py-10">
                <Shield size={32} className="mx-auto text-slate-200 mb-2" />
                <p className="text-sm font-semibold text-slate-400">No active subscriptions</p>
                <p className="text-xs text-slate-300 mt-1">Enable push notifications above to add one.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {subscriptions.map((sub, i) => {
                  const isMobile = sub.label?.toLowerCase().includes('mobile');
                  const isCurrentEndpoint = async () => {
                    try {
                      const reg = await navigator.serviceWorker?.ready;
                      const cur = await reg?.pushManager?.getSubscription();
                      return cur?.endpoint === sub.endpoint;
                    } catch { return false; }
                  };
                  return (
                    <div key={sub.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0">
                        {isMobile ? <Smartphone size={14} /> : <Monitor size={14} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-700">
                          {sub.label || (isMobile ? 'Mobile Device' : 'Desktop Browser')}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Added {timeAgo(sub.createdAt)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteSub(sub.endpoint)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                        title="Remove subscription"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Info box */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-700">
            <Shield size={14} className="flex-shrink-0 mt-0.5 text-blue-500" />
            <p>
              Push notifications require browser permission and valid VAPID keys.
              If push is not working, run <code className="font-mono bg-blue-100 px-1 rounded">npx web-push generate-vapid-keys</code> and update your <code className="font-mono bg-blue-100 px-1 rounded">.env</code> files.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
