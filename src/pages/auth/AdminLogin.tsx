import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Shield, Eye, EyeOff } from 'lucide-react';
import ChangePasswordModal from '@/components/ChangePasswordModal';

export default function AdminLogin() {
  const { login, requiresPasswordChange, tempUser, clearTempUser } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRemember(true);
    }
  }, []);

  // Show password change modal if needed
  useEffect(() => {
    if (requiresPasswordChange && tempUser) {
      setShowChangePassword(true);
    }
  }, [requiresPasswordChange, tempUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('All fields are required');
      return;
    }
    
    setLoading(true);
    
    const result = await login(email, password, 'admin');
    
    if (!result.success) {
      setError(result.message);
      setLoading(false);
    } else if (result.requiresPasswordChange) {
      // Password change modal will open via useEffect
      setLoading(false);
    } else {
      // Normal login success
      if (remember) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      navigate('/admin/dashboard');
      setLoading(false);
    }
  };

  const handlePasswordChangeComplete = () => {
    setShowChangePassword(false);
    if (remember) {
      localStorage.setItem('rememberedEmail', email);
    } else {
      localStorage.removeItem('rememberedEmail');
    }
    navigate('/admin/dashboard');
  };

  const handlePasswordChangeCancel = () => {
    setShowChangePassword(false);
    clearTempUser();
    // Clear any stored token
    localStorage.removeItem('token');
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
              <Shield size={28} className="text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">Admin Login</h1>
            <p className="text-muted-foreground text-sm mt-1">TTH Procurement Management Portal</p>
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
                placeholder="admin@hms.gov.gh"
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
            
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <input 
                  type="checkbox" 
                  checked={remember} 
                  onChange={e => setRemember(e.target.checked)} 
                  className="rounded border-border"
                  disabled={loading}
                />
                Remember me
              </label>
              <Link to="/admin/forgot-password" className="text-sm text-primary hover:underline">
                Forgot Password?
              </Link>
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
            
            <p className="text-center text-xs text-muted-foreground">
              Demo: admin@hms.gov.gh / Admin@1234
            </p>
          </form>
          
          <p className="text-center text-sm text-muted-foreground mt-4">
            <Link to="/" className="text-primary hover:underline">← Back to Home</Link>
          </p>
        </div>
      </div>

      {/* Password Change Modal for first login */}
      <ChangePasswordModal 
        isOpen={showChangePassword}
        onClose={handlePasswordChangeCancel}
        onSuccess={handlePasswordChangeComplete}
        isFirstLogin={true}
        userName={tempUser?.name}
      />
    </>
  );
}