import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, User, LogOut, ChevronDown, Loader2, ChevronRight } from 'lucide-react';

interface TopBarProps {
  title: string;
  breadcrumb?: string[];
}

function useOnClickOutside(ref: React.RefObject<HTMLElement>, handler: () => void) {
  useEffect(() => {
    const listener = (e: MouseEvent) => {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      handler();
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref, handler]);
}

function formatRelativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const notifTypeColor: Record<string, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-400',
  error:   'bg-destructive',
  info:    'bg-blue-500',
};

export default function TopBar({ title, breadcrumb }: TopBarProps) {
  const { user, logout }   = useAuth();
  const navigate           = useNavigate();
  const { notifications, unreadCount, loadingNotifications, markAsRead } = useNotification();

  const [showProfile, setShowProfile] = useState(false);
  const [showNotifs,  setShowNotifs]  = useState(false);
  const [search,      setSearch]      = useState('');

  const notifsRef  = useRef<HTMLDivElement>(null!);
  const profileRef = useRef<HTMLDivElement>(null!);
  useOnClickOutside(notifsRef,  () => setShowNotifs(false));
  useOnClickOutside(profileRef, () => setShowProfile(false));

  const previewNotifs = notifications.slice(0, 5);

  const displayName = user?.name || user?.companyName || '';
  const initials    = displayName
    .split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  return (
    <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border px-4 lg:px-6 h-[57px] flex items-center">
      <div className="flex items-center justify-between gap-4 w-full">

        {/* Left: breadcrumb + title */}
        <div className="ml-12 lg:ml-0 min-w-0">
          {breadcrumb && breadcrumb.length > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-0.5">
              {breadcrumb.map((item, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight size={10} className="opacity-50" />}
                  {item}
                </span>
              ))}
            </div>
          )}
          <h1 className="text-[17px] font-semibold tracking-tight leading-none text-foreground truncate">
            {title}
          </h1>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1.5 shrink-0">

          {/* Search — admin only */}
          {user?.role === 'admin' && (
            <div className="hidden md:flex items-center bg-muted/60 hover:bg-muted/80 focus-within:bg-muted transition-colors rounded-lg px-3 h-8 gap-2 w-44 focus-within:ring-1 focus-within:ring-border">
              <Search size={13} className="text-muted-foreground shrink-0" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="bg-transparent text-[13px] outline-none w-full placeholder:text-muted-foreground"
              />
            </div>
          )}

          {/* Notifications */}
          <div className="relative" ref={notifsRef}>
            <button
              onClick={() => { setShowNotifs(v => !v); setShowProfile(false); }}
              className={`relative p-2 rounded-lg transition-colors ${showNotifs ? 'bg-muted' : 'hover:bg-muted/60'}`}
              aria-label="Notifications"
            >
              <Bell size={17} strokeWidth={1.75} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-[7px] h-[7px] bg-destructive rounded-full ring-2 ring-background" />
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 top-full mt-2 w-[340px] bg-card border border-border rounded-xl shadow-2xl shadow-black/10 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <span className="text-[13px] font-semibold">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[11px] bg-destructive/10 text-destructive font-medium px-2 py-0.5 rounded-full">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                <div className="max-h-[280px] overflow-y-auto divide-y divide-border/50">
                  {loadingNotifications && notifications.length === 0 ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 size={18} className="animate-spin text-muted-foreground" />
                    </div>
                  ) : previewNotifs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                      <Bell size={22} strokeWidth={1.5} className="opacity-40" />
                      <p className="text-[13px]">All caught up</p>
                    </div>
                  ) : (
                    previewNotifs.map(n => (
                      <button
                        key={n.id}
                        className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-muted/40 transition-colors ${!n.read ? 'bg-primary/[0.04]' : ''}`}
                        onClick={() => {
                          if (!n.read) markAsRead(n.id);
                          if (n.link && n.link !== '#') { setShowNotifs(false); navigate(n.link); }
                        }}
                      >
                        <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${n.read ? 'bg-muted-foreground/30' : (notifTypeColor[n.type?.toLowerCase()] || 'bg-primary')}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-[13px] leading-snug ${n.read ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>
                            {n.message}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {formatRelativeTime(n.timestamp)}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
                <div className="border-t border-border">
                  <button
                    onClick={() => {
                      setShowNotifs(false);
                      navigate(user?.role === 'admin' ? '/admin/notifications' : '/supplier/notifications');
                    }}
                    className="w-full py-2.5 text-[13px] text-primary hover:bg-muted/40 transition-colors font-medium"
                  >
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="w-px h-5 bg-border mx-0.5" />

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => { setShowProfile(v => !v); setShowNotifs(false); }}
              className={`flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg transition-colors ${showProfile ? 'bg-muted' : 'hover:bg-muted/60'}`}
            >
              <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[11px] font-semibold shrink-0 ring-1 ring-primary/20">
                {initials}
              </div>
              <span className="hidden md:block text-[13px] font-medium max-w-[120px] truncate">
                {displayName}
              </span>
              <ChevronDown
                size={12}
                strokeWidth={2.5}
                className={`hidden md:block text-muted-foreground transition-transform duration-150 ${showProfile ? 'rotate-180' : ''}`}
              />
            </button>

            {showProfile && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-card border border-border rounded-xl shadow-2xl shadow-black/10 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-[13px] font-medium truncate">{displayName}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
                </div>
                <div className="p-1">
                  <button
                    onClick={() => {
                      navigate(user?.role === 'admin' ? '/admin/settings' : '/supplier/profile');
                      setShowProfile(false);
                    }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] rounded-md hover:bg-muted/60 transition-colors"
                  >
                    <User size={14} strokeWidth={1.75} className="text-muted-foreground" />
                    <span>{user?.role === 'admin' ? 'Settings' : 'My Profile'}</span>
                  </button>
                  {/* FIX: removed navigate('/') — ProtectedRoute handles
                      the redirect to the correct login page via loginPath */}
                  <button
                    onClick={() => logout()}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] rounded-md text-destructive hover:bg-destructive/20 transition-colors"
                  >
                    <LogOut size={14} strokeWidth={1.75} />
                    <span>Log out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}