import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Truck, Eye, EyeOff } from 'lucide-react';
import ChangePasswordModal from '@/components/ChangePasswordModal';

export default function SupplierLogin() {
  const { login, tempUser, clearTempUser } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('All fields are required');
      return;
    }

    setLoading(true);
    const result = await login(email, password, 'supplier');
    setLoading(false);

    if (result.success) {
      if (result.requiresPasswordChange) {
        // FIX: show password change modal instead of navigating —
        //      AuthContext hasn't set user yet so ProtectedRoute would
        //      reject the navigation and bounce to landing page
        setShowChangePassword(true);
      } else {
        navigate('/supplier/dashboard');
      }
    } else {
      setError(result.message);
    }
  };

  const handlePasswordChangeSuccess = () => {
    // After password change, log them in properly
    setShowChangePassword(false);
    navigate('/supplier/dashboard');
  };

  const handlePasswordChangeClose = () => {
    // If they dismiss without changing, cancel the session
    setShowChangePassword(false);
    clearTempUser();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
            <Truck size={28} className="text-secondary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Supplier Login</h1>
          <p className="text-muted-foreground text-sm mt-1">Access your procurement portal</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="supplier@company.com"
              className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all pr-10"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                disabled={loading}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            {/* FIX: updated path to match the route defined in App.tsx */}
            <Link to="/forgot-password" className="text-sm text-primary hover:underline">
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>

          <p className="text-center text-xs text-muted-foreground">
            Demo: supplier1@medtech.com / Supplier@1234
          </p>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Don't have an account?{' '}
          <Link to="/supplier/register" className="text-primary hover:underline">Register here</Link>
        </p>
        <p className="text-center text-sm text-muted-foreground mt-2">
          <Link to="/" className="text-primary hover:underline">← Back to Home</Link>
        </p>
      </div>

      {/* Password change modal for first-login suppliers */}
      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={handlePasswordChangeClose}
        onSuccess={handlePasswordChangeSuccess}
        isFirstLogin={true}
        userName={tempUser?.name}
      />
    </div>
  );
}