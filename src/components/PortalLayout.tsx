import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';

interface PortalLayoutProps {
  children: React.ReactNode;
  type: 'admin' | 'supplier';
  title: string;
  breadcrumb?: string[];
}

export default function PortalLayout({ children, type, title, breadcrumb }: PortalLayoutProps) {
  const { user, isAuthenticated } = useAuth();
  const { fetchNotifications }    = useNotification();

  // Start polling for notifications as soon as the user enters any portal page
  useEffect(() => {
    if (user?.id) fetchNotifications(user.id);
  }, [user?.id]);

  if (!isAuthenticated) return <Navigate to={type === 'admin' ? '/admin/login' : '/supplier/login'} />;
  if (user?.role !== type) return <Navigate to={user?.role === 'admin' ? '/admin/dashboard' : '/supplier/dashboard'} />;

  return (
    <div className="flex min-h-screen">
      <Sidebar type={type} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar title={title} breadcrumb={breadcrumb} />
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}