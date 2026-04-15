import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ArrowRight, Clock } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { useAdminAuth } from '../context/AdminAuthContext';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const NotificationBell = () => {
  const { unreadCount, notifications, markAsRead, markAllAsRead } = useNotification();
  const { isAuthenticated: isAdmin } = useAdminAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotifClick = (notif) => {
    if (!notif.read) markAsRead(notif.id);
    setIsOpen(false);
    if (notif.link) {
      // internal navigation only
      if (notif.link.startsWith('/')) navigate(notif.link);
      else window.open(notif.link, '_blank', 'noopener');
    }
  };

  const notifPagePath = isAdmin ? '/admin/notifications' : '/notifications';

  // Show at most 6 in dropdown
  const preview = notifications.slice(0, 6);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className={`relative p-2.5 rounded-xl transition-all border ${
          isOpen
            ? 'bg-primary/10 border-primary/20 text-primary'
            : 'border-transparent hover:bg-slate-100 hover:border-slate-200 text-slate-500'
        }`}
      >
        <Bell size={19} className={unreadCount > 0 ? 'text-primary' : ''} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-black text-white bg-rose-500 rounded-full border-2 border-white shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-primary" />
              <span className="text-sm font-bold text-slate-800">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-black text-white bg-rose-500 rounded-full px-1.5 py-0.5">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => { markAllAsRead(); }}
                className="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
              >
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
          </div>

          {/* Notification list — capped height */}
          <div className="max-h-[15rem] overflow-y-auto divide-y divide-slate-50">
            {preview.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                  <Bell size={16} className="text-slate-300" />
                </div>
                <p className="text-sm font-semibold text-slate-400">All caught up</p>
                <p className="text-xs text-slate-300">No new notifications</p>
              </div>
            ) : (
              preview.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotifClick(notif)}
                  className={`flex gap-3 px-4 py-3 cursor-pointer transition-colors ${
                    !notif.read ? 'bg-primary/4 hover:bg-primary/8' : 'hover:bg-slate-50'
                  }`}
                >
                  {/* Unread dot */}
                  <div className="flex-shrink-0 mt-1">
                    {notif.read ? (
                      <div className="w-2 h-2 rounded-full bg-slate-200 mt-0.5" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-primary mt-0.5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-semibold leading-tight truncate ${notif.read ? 'text-slate-500' : 'text-slate-800'}`}>
                      {notif.title}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-slate-300 mt-1 flex items-center gap-1">
                      <Clock size={9} /> {timeAgo(notif.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 px-4 py-2.5">
            <button
              onClick={() => { setIsOpen(false); navigate(notifPagePath); }}
              className="w-full flex items-center justify-center gap-1.5 text-[12px] font-bold text-primary hover:underline py-1"
            >
              View all notifications <ArrowRight size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
