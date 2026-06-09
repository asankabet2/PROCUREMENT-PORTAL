import React, { useState } from 'react';
import { Link} from 'react-router-dom';
import { KeyRound, Mail, Lock, CheckCircle, Loader2 } from 'lucide-react';
import { forgotPassword, resetPassword } from '@/services/api';

interface ForgotPasswordProps {
  role: 'admin' | 'supplier';
}

export default function ForgotPassword({ role }: ForgotPasswordProps) {
  
  const loginPath = role === 'admin' ? '/admin/login' : '/supplier/login';

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const startCountdown = () => {
    setResendDisabled(true);
    let timer = 60;
    setCountdown(timer);
    const interval = setInterval(() => {
      timer--;
      setCountdown(timer);
      if (timer <= 0) {
        clearInterval(interval);
        setResendDisabled(false);
      }
    }, 1000);
  };

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Enter your email');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await forgotPassword(email);

      if (response.data.resetToken) {
        setResetToken(response.data.resetToken);
      }

      setStep(2);
      startCountdown();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendDisabled) return;

    setLoading(true);
    try {
      const response = await forgotPassword(email);
      if (response.data.resetToken) {
        setResetToken(response.data.resetToken);
      }
      startCountdown();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPw) {
      setError('Passwords do not match');
      return;
    }
    if (!resetToken) {
      setError('Invalid reset token. Please request a new reset link.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await resetPassword(resetToken, password);
      setDone(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <CheckCircle size={64} className="text-success mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Password Reset Successfully</h1>
          <p className="text-muted-foreground mb-6">You can now login with your new password.</p>
          <Link
            to={loginPath}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <KeyRound size={28} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Reset Password</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {step === 1 && "Enter your email to receive reset instructions"}
            {step === 2 && "Check your email for the reset link"}
            {step === 3 && "Enter your new password"}
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm mb-4">
              {error}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full pl-10 pr-3 py-2.5 bg-muted/50 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/50"
                    disabled={loading}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/80 transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Send Reset Link'}
              </button>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-primary/10 text-sm text-primary text-center">
                <Mail size={20} className="mx-auto mb-2" />
                <p className="font-medium">Reset link sent to {email}</p>
                <p className="text-xs mt-1 text-muted-foreground">
                  Click the link in the email to reset your password.
                  The link expires in 1 hour.
                </p>
              </div>

              {/* Dev-only token display — stripped in production builds */}
              {resetToken && import.meta.env.DEV && (
                <div className="p-3 rounded-lg bg-muted/30 text-xs">
                  <p className="font-medium mb-1">Development mode - Reset Token:</p>
                  <code className="break-all">{resetToken}</code>
                  <button
                    onClick={() => setStep(3)}
                    className="mt-2 text-primary hover:underline text-sm"
                  >
                    Continue with this token →
                  </button>
                </div>
              )}

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Didn't receive the email?{' '}
                  <button
                    onClick={handleResendCode}
                    disabled={resendDisabled}
                    className="text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Resend {resendDisabled && `(${countdown}s)`}
                  </button>
                </p>
              </div>

              <button
                onClick={() => setStep(1)}
                className="w-full py-2.5 bg-muted text-muted-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors"
              >
                Back to Email
              </button>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">New Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full pl-10 pr-3 py-2.5 bg-muted/50 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/50"
                    disabled={loading}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/50"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/80 transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Reset Password'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-4">
          {/* FIX: uses loginPath derived from role prop instead of hardcoded /login */}
          <Link to={loginPath} className="text-primary hover:underline">← Back to Login</Link>
        </p>
      </div>
    </div>
  );
}