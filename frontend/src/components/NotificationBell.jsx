import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCircle2 } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

const NotificationBell = () => {
  const { unreadCount, notifications, markAsRead } = useNotification();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all group"
      >
        <Bell className={`w-5 h-5 text-slate-600 group-hover:text-blue-600 transition-colors ${unreadCount > 0 ? 'animate-pulse' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-rose-500 border-2 border-white rounded-full shadow-sm shadow-rose-500/30">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 w-80 sm:w-96 mt-3 glass-panel rounded-2xl z-50 overflow-hidden transform origin-top-right transition-all animate-in fade-in slide-in-from-top-4">
          <div className="p-4 border-b border-slate-200/50 bg-white/40 flex justify-between items-center">
            <h3 className="font-semibold text-slate-800 tracking-wide font-outfit">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-xs font-semibold bg-blue-100 text-blue-700 py-1 px-2.5 rounded-full border border-blue-200">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="max-h-[28rem] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
                <Bell className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-slate-500 text-sm font-medium">All caught up!</p>
                <p className="text-slate-400 text-xs">No pending insights in the system.</p>
              </div>
            ) : (
              <div className="py-2">
                {notifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    className={`relative p-4 mx-2 my-1 rounded-xl transition-all cursor-pointer border ${!notif.read ? 'bg-blue-50/50 hover:bg-blue-50/80 border-blue-100' : 'hover:bg-slate-50/80 border-transparent'}`}
                    onClick={() => {
                      if (!notif.read) markAsRead(notif.id);
                      if (notif.link) window.open(notif.link, '_blank');
                    }}
                  >
                    {!notif.read && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-md"></div>
                    )}
                    <div className="flex gap-3 pl-2">
                      <div className="mt-0.5 shrink-0">
                        {notif.read ? (
                          <CheckCircle2 className="w-5 h-5 text-slate-400" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className={`text-sm font-medium leading-tight ${!notif.read ? 'text-slate-900' : 'text-slate-500'}`}>
                          {notif.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-2">
                          {notif.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
