import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { formatDate } from '@/utils/helpers';
import { CheckCheck, Loader2, Bell } from 'lucide-react';

export default function SupplierNotifications() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const {
    notifications,
    unreadCount,
    loadingNotifications,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotification();

  const [hideRead, setHideRead]     = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    if (user?.id) fetchNotifications(user.id);
  }, [user?.id]);

  const handleMarkAllAsRead = async () => {
    setMarkingAll(true);
    await markAllAsRead();
    setMarkingAll(false);
  };

  const visibleNotifications = hideRead
    ? notifications.filter(n => !n.read)
    : notifications;

  const typeColors: Record<string, string> = {
    success: 'bg-emerald-400',
    error:   'bg-red-400',
    warning: 'bg-amber-400',
    info:    'bg-blue-400',
  };

  if (loadingNotifications && notifications.length === 0) {
    return (
      <PortalLayout type="supplier" title="Notifications" breadcrumb={['Supplier', 'Notifications']}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout type="supplier" title="Notifications" breadcrumb={['Supplier', 'Notifications']}>
      <div className="animate-fade-in max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Bell size={14} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{unreadCount} unread</span>
            {hideRead && visibleNotifications.length > 0 && (
              <span className="text-xs text-muted-foreground">• {visibleNotifications.length} showing</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setHideRead(!hideRead)}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
            >
              {hideRead ? 'Show All' : 'Hide Read'}
            </button>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={markingAll}
                className="flex items-center gap-1 px-2 py-1 text-xs text-primary hover:underline disabled:opacity-50"
              >
                <CheckCheck size={12} />
                {markingAll ? 'Marking...' : 'Mark all read'}
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="glass-card divide-y divide-border">
          {visibleNotifications.length === 0 ? (
            <div className="p-8 text-center">
              {hideRead && unreadCount === 0 ? (
                <>
                  <CheckCheck size={32} className="mx-auto text-success mb-3" />
                  <p className="text-muted-foreground">All caught up!</p>
                  <p className="text-xs text-muted-foreground mt-2">No unread notifications.</p>
                  {notifications.length > 0 && (
                    <button onClick={() => setHideRead(false)} className="mt-3 text-xs text-primary hover:underline">
                      View read notifications
                    </button>
                  )}
                </>
              ) : (
                <>
                  <Bell size={32} className="mx-auto text-muted-foreground mb-3 opacity-50" />
                  <p className="text-muted-foreground">No notifications yet</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    When you receive notifications, they'll appear here.
                  </p>
                </>
              )}
            </div>
          ) : (
            visibleNotifications.map(n => (
              <div
                key={n.id}
                className={`p-4 flex items-start gap-3 cursor-pointer hover:bg-muted/20 transition-colors ${!n.read ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                onClick={() => {
                  if (!n.read) markAsRead(n.id);
                  if (n.link && n.link !== '#') navigate(n.link);
                }}
              >
                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${typeColors[n.type] || 'bg-blue-400'}`} />
                <div className="flex-1">
                  <p className={`text-sm ${!n.read ? 'font-medium' : 'text-muted-foreground'}`}>{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatDate(n.timestamp)}</p>
                </div>
                {!n.read && <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {hideRead && notifications.filter(n => n.read).length > 0 && (
          <div className="mt-3 text-center">
            <button onClick={() => setHideRead(false)} className="text-xs text-muted-foreground hover:text-primary transition-colors">
              + {notifications.filter(n => n.read).length} read notification(s) hidden
            </button>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}