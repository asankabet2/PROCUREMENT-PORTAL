import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

// Events that count as user activity
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousemove',
  'keydown',
  'mousedown',
  'touchstart',
  'scroll',
  'click',
];

export function useIdleTimeout() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const timerRef         = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogout = useCallback(() => {
    logout();
    // Redirect to the correct login page based on their role
    const loginPath = user?.role === 'admin' ? '/admin/login' : '/supplier/login';
    navigate(loginPath, { replace: true });
  }, [logout, navigate, user?.role]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(handleLogout, IDLE_TIMEOUT_MS);
  }, [handleLogout]);

  useEffect(() => {
    // Don't run if not logged in
    if (!user) return;

    // Start the timer
    resetTimer();

    // Attach activity listeners
    ACTIVITY_EVENTS.forEach(event =>
      window.addEventListener(event, resetTimer, { passive: true })
    );

    return () => {
      // Clean up on unmount or logout
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach(event =>
        window.removeEventListener(event, resetTimer)
      );
    };
  }, [user, resetTimer]);
}