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
  return `${Math.floor(h / 24)}d ago`;
}

const NotificationBell = () => {
  const { unreadCount, notifications, markAsRead, markAllAsRead } = useNotification();
  const { isAuthenticated: isAdmin } = useAdminAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleNotifClick = (notif) => {
    if (!notif.read) markAsRead(notif.id);
    setIsOpen(false);
    if (notif.link?.startsWith('/')) navigate(notif.link);
    else if (notif.link) window.open(notif.link, '_blank', 'noopener');
  };

  const notifPagePath = isAdmin ? '/admin/notifications' : '/notifications';
  const preview = notifications.slice(0, 6);

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Bell button */}
      <button
        className="icon-btn"
        onClick={() => setIsOpen(prev => !prev)}
        style={isOpen ? { background: 'var(--accent-soft)', borderColor: 'var(--accent)', color: 'var(--accent-soft-fg)' } : {}}
      >
        <Bell size={15} style={{ color: unreadCount > 0 ? 'var(--accent-soft-fg)' : undefined }} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -3, right: -3,
            minWidth: 16, height: 16, padding: '0 3px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 700, color: 'white',
            background: 'var(--danger)', borderRadius: 8,
            border: '2px solid var(--panel)',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)',
          width: 320,
          background: 'var(--bg-elev)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          zIndex: 50,
          animation: 'stoq-slide 140ms ease-out',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Bell size={13} style={{ color: 'var(--accent-soft-fg)' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg)' }}>Notifications</span>
              {unreadCount > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, color: 'white', background: 'var(--danger)', borderRadius: 8, padding: '1px 5px' }}>
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--accent-soft-fg)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <CheckCheck size={11} /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {preview.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '28px 0', gap: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-sunk)', display: 'grid', placeItems: 'center' }}>
                  <Bell size={14} style={{ color: 'var(--fg-subtle)' }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-subtle)' }}>All caught up</span>
              </div>
            ) : preview.map(notif => (
              <div
                key={notif.id}
                onClick={() => handleNotifClick(notif)}
                style={{
                  display: 'flex', gap: 10, padding: '10px 14px',
                  borderBottom: '1px solid var(--border)',
                  background: !notif.read ? 'color-mix(in oklch, var(--accent) 4%, var(--panel))' : 'var(--panel)',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-sunk)'}
                onMouseLeave={e => e.currentTarget.style.background = !notif.read ? 'color-mix(in oklch, var(--accent) 4%, var(--panel))' : 'var(--panel)'}
              >
                <div style={{ flexShrink: 0, marginTop: 4 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: notif.read ? 'var(--border-strong)' : 'var(--accent)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: notif.read ? 500 : 600, color: notif.read ? 'var(--fg-muted)' : 'var(--fg)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {notif.title}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                      <Clock size={9} /> {timeAgo(notif.createdAt)}
                    </span>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 2, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {notif.message}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ borderTop: '1px solid var(--border)', padding: '8px 14px' }}>
            <button
              onClick={() => { setIsOpen(false); navigate(notifPagePath); }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: 'var(--accent-soft-fg)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
              View all notifications <ArrowRight size={11} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
