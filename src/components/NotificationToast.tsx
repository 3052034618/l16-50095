import { useEffect } from 'react';
import { X, Bell, MapPin, ArrowRightFromLine, ArrowLeftFromLine } from 'lucide-react';
import { useLocationStore } from '@/store/useLocationStore';

export default function NotificationToast() {
  const { notifications, removeNotification } = useLocationStore();

  useEffect(() => {
    notifications.forEach((notification) => {
      const timer = setTimeout(() => {
        removeNotification(notification.id);
      }, 5000);
      return () => clearTimeout(timer);
    });
  }, [notifications, removeNotification]);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-[1000] z-50 space-y-2 pointer-events-none">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="pointer-events-auto bg-slate-900/95 backdrop-blur-xl rounded-xl border border-slate-700/50 shadow-2xl p-4 w-80 animate-slide-in"
          style={{ animation: 'slideIn 0.3s ease-out' }}
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              notification.action === 'enter'
                ? 'bg-emerald-500/20'
                : notification.action === 'leave'
                ? 'bg-red-500/20'
                : 'bg-sky-500/20'
            }`}
            >
              {notification.action === 'enter' ? (
                <ArrowRightFromLine className="w-5 h-5 text-emerald-400" />
              ) : notification.action === 'leave' ? (
                <ArrowLeftFromLine className="w-5 h-5 text-red-400" />
              ) : (
                <Bell className="w-5 h-5 text-sky-400" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`font-semibold text-sm ${
                  notification.action === 'enter'
                    ? 'text-emerald-400'
                    : notification.action === 'leave'
                    ? 'text-red-400'
                    : 'text-sky-400'
                }`}
                >
                  {notification.title}
                </span>
                <button
                  onClick={() => removeNotification(notification.id)}
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-slate-300 mt-1 break-words">
                {notification.message}
              </p>
              <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
                <MapPin className="w-3 h-3" />
                <span>
                  {new Date(notification.timestamp).toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
