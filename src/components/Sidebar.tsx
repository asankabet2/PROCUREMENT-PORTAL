import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getNotifications } from '@/services/api';
import smalllogo from '@/assets/smalllogo.png';

interface ApiNotification {
  id: string;
  userId: string;
  read: boolean;
}
import {
  LayoutDashboard, FileSearch, Send, User, FolderOpen, Bell, LogOut,
  FileText, Users, BarChart3, Settings, Shield, Menu, ChevronLeft,
} from 'lucide-react';

const supplierLinks = [
  { to: '/supplier/dashboard',      label: 'Dashboard',      icon: LayoutDashboard },
  { to: '/supplier/tenders',        label: 'Browse Tenders', icon: FileSearch },
  { to: '/supplier/bids',           label: 'My Bids',        icon: Send },
  { to: '/supplier/profile',        label: 'My Profile',     icon: User },
  { to: '/supplier/documents',      label: 'Documents',      icon: FolderOpen },
  { to: '/supplier/notifications',  label: 'Notifications',  icon: Bell },
];

const adminLinks = [
  { to: '/admin/dashboard',     label: 'Dashboard',          icon: LayoutDashboard },
  { to: '/admin/tenders',       label: 'Tender Management',  icon: FileText },
  { to: '/admin/suppliers',     label: 'Supplier Management',icon: Users },
  { to: '/admin/reports',       label: 'Reports & Analytics',icon: BarChart3 },
  { to: '/admin/users',         label: 'User Management',    icon: Shield },
  { to: '/admin/settings',      label: 'Settings',           icon: Settings },
  { to: '/admin/notifications', label: 'Notifications',      icon: Bell },
];

interface SidebarProps {
  type: 'admin' | 'supplier';
}

export default function Sidebar({ type }: SidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed]     = useState(false);
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const links = type === 'admin' ? adminLinks : supplierLinks;

  useEffect(() => {
    if (!user?.id) return;

    const fetchUnreadCount = async () => {
      try {
        const res = await getNotifications(user.id);
        const data: ApiNotification[] = res.data;
        setUnreadCount(data.filter(n => !n.read).length);
      } catch {
        // silently ignore — non-critical UI element
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30_000);
    return () => clearInterval(interval);
  }, [user?.id]);

  // FIX: removed navigate('/') — ProtectedRoute handles the redirect via
  // loginPath in AuthContext, sending user to the correct login page
  const handleLogout = () => logout();

  const displayName = user?.name ?? user?.companyName ?? '';
  const initials = displayName
    .split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const NavContent = () => (
    <div className="flex flex-col h-full">

      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 h-[60px] shrink-0 ${collapsed ? 'justify-center' : ''}`}>
        <img src={smalllogo} alt="TTH Procurement" className="h-7 w-auto object-contain shrink-0" />
        {!collapsed && (
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-[13px] font-semibold tracking-tight text-foreground truncate">
              TTH Procurement
            </span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-medium">
              {type === 'admin' ? 'Admin Portal' : 'Supplier Portal'}
            </span>
          </div>
        )}
      </div>

      <div className="mx-3 h-px bg-border/50" />

      {/* Nav links */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {links.map(({ to, label, icon: Icon }) => {
          const isActive        = location.pathname === to || location.pathname.startsWith(to + '/');
          const isNotifications = label === 'Notifications';
          const showBadge       = isNotifications && unreadCount > 0;

          return (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? label : undefined}
              className={[
                'group relative flex items-center gap-2.5 px-3 py-[7px] rounded-md',
                'text-[13px] font-medium transition-all duration-150 select-none outline-none',
                collapsed ? 'justify-center' : '',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
              ].join(' ')}
            >
              <Icon size={15} strokeWidth={isActive ? 2.25 : 1.8} className="shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 truncate">{label}</span>
                  {showBadge && <Badge count={unreadCount} />}
                </>
              )}
              {collapsed && showBadge && (
                <span className="absolute top-1 right-1 w-[7px] h-[7px] rounded-full bg-destructive ring-2 ring-background" />
              )}
              {collapsed && (
                <Tooltip>
                  {label}
                  {showBadge && (
                    <span className="ml-1.5 font-semibold text-destructive">({unreadCount})</span>
                  )}
                </Tooltip>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mx-3 h-px bg-border/50" />

      {/* User + logout */}
      <div className="px-2 py-3 space-y-0.5">
        {!collapsed && user && (
          <div className="flex items-center gap-2.5 px-3 py-2">
            <Avatar initials={initials} />
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-foreground truncate leading-tight">{displayName}</p>
              <p className="text-[11px] text-muted-foreground/80 truncate leading-tight">{user.email}</p>
            </div>
          </div>
        )}
        {collapsed && user && (
          <div className="flex justify-center py-1">
            <Avatar initials={initials} />
          </div>
        )}
        <button
          onClick={handleLogout}
          title={collapsed ? 'Log out' : undefined}
          className={[
            'group relative flex items-center gap-2.5 w-full px-3 py-[7px] rounded-md',
            'text-[13px] font-medium text-muted-foreground',
            'hover:text-destructive hover:bg-destructive/10',
            'transition-all duration-150 select-none',
            collapsed ? 'justify-center' : '',
          ].join(' ')}
        >
          <LogOut size={15} strokeWidth={1.8} className="shrink-0" />
          {!collapsed && <span>Log out</span>}
          {collapsed && <Tooltip>Log out</Tooltip>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 rounded-lg bg-card border border-border shadow-sm hover:bg-muted transition-colors"
        aria-label="Open menu"
      >
        <Menu size={17} />
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="fixed left-0 top-0 bottom-0 w-60 bg-background border-r border-border shadow-xl animate-slide-in">
            <NavContent />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={[
          'hidden lg:flex flex-col shrink-0 relative',
          collapsed ? 'w-[58px]' : 'w-[220px]',
          'border-r border-border bg-background',
          'transition-[width] duration-200 ease-in-out',
          'h-screen sticky top-0 overflow-hidden',
        ].join(' ')}
      >
        <NavContent />
        <button
          onClick={() => setCollapsed(c => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={[
            'absolute -right-3 top-[56px] z-10',
            'w-6 h-6 rounded-full bg-background border border-border shadow-sm',
            'flex items-center justify-center',
            'hover:bg-muted transition-colors duration-150',
          ].join(' ')}
        >
          <ChevronLeft
            size={11}
            strokeWidth={2.5}
            className={`transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
          />
        </button>
      </aside>
    </>
  );
}

function Badge({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold leading-none tabular-nums">
      {count > 99 ? '99+' : count}
    </span>
  );
}

function Avatar({ initials }: { initials: string }) {
  return (
    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-[11px] font-semibold shrink-0 ring-1 ring-primary/20">
      {initials || <User size={12} />}
    </div>
  );
}

function Tooltip({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute left-full ml-2.5 z-50 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[12px] text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-100">
      {children}
    </span>
  );
}