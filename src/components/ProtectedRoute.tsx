import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  role?: 'admin' | 'supplier';
}

const ProtectedRoute = ({ children, role }: ProtectedRouteProps) => {
  const { user, isAuthenticated, loading, loginPath } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated — go to the login page for the role that was last
  // active, or the role this route requires. Never flash the landing page.
  if (!isAuthenticated) {
    const redirect = loginPath
      ?? (role === 'admin' ? '/admin/login' : '/supplier/login');
    return <Navigate to={redirect} replace />;
  }

  // Authenticated but wrong role — redirect to their own dashboard
  if (role && user?.role !== role) {
    if (user?.role === 'admin')    return <Navigate to="/admin/dashboard"    replace />;
    if (user?.role === 'supplier') return <Navigate to="/supplier/dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;