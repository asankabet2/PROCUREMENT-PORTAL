import {
  createContext, useContext, useState, useEffect,
  useRef, useCallback, type ReactNode
} from 'react';
import { supplierLogin, adminLogin } from '@/services/api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'supplier';
  companyName?: string;
}

interface LoginResult {
  success: boolean;
  message: string;
  requiresPasswordChange?: boolean;
  user?: AuthUser;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string, role: 'admin' | 'supplier') => Promise<LoginResult>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
  requiresPasswordChange: boolean;
  tempUser: AuthUser | null;
  clearTempUser: () => void;
  loginPath: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const IDLE_TIMEOUT_MS = 15 * 60 * 1000;

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click',
];

function getLoginPath(role: 'admin' | 'supplier' | null): string {
  if (role === 'admin')    return '/admin/login';
  if (role === 'supplier') return '/supplier/login';
  return '/supplier/login';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = sessionStorage.getItem('auth_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [tempUser, setTempUser]                             = useState<AuthUser | null>(null);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);
  const [loading, setLoading]                               = useState(true);

  // Persists the correct login path even after user is cleared so
  // ProtectedRoute can redirect without ever touching "/"
  const [loginPath, setLoginPath] = useState<string | null>(() => {
    const stored = sessionStorage.getItem('auth_user');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return getLoginPath(parsed?.role ?? null);
  });

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Logout ────────────────────────────────────────────────────────────────
  // No navigation here — ProtectedRoute handles the redirect via loginPath.
  // This way manual logout buttons don't need to navigate either; just call
  // logout() and ProtectedRoute will send the user to the right login page.
  const logout = useCallback((role?: 'admin' | 'supplier') => {
    const currentRole = role ?? user?.role ?? null;

    // Set loginPath BEFORE clearing user so ProtectedRoute's re-render
    // already has the correct destination and never falls back to "/"
    setLoginPath(getLoginPath(currentRole));
    setUser(null);
    setTempUser(null);
    setRequiresPasswordChange(false);
    sessionStorage.removeItem('auth_user');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, [user]);

  // ── Idle timeout ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const roleSnapshot = user.role;

    const resetTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => logout(roleSnapshot), IDLE_TIMEOUT_MS);
    };

    resetTimer();
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [user, logout]);

  // ── Token check on mount ──────────────────────────────────────────────────
  useEffect(() => {
    const token      = localStorage.getItem('token');
    const storedUser = sessionStorage.getItem('auth_user');
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // ── Persist user + sync loginPath ─────────────────────────────────────────
  useEffect(() => {
    if (user) {
      sessionStorage.setItem('auth_user', JSON.stringify(user));
      setLoginPath(getLoginPath(user.role));
    } else {
      sessionStorage.removeItem('auth_user');
      // Do NOT clear loginPath — ProtectedRoute still needs it after logout
    }
  }, [user]);

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = async (
    email: string,
    password: string,
    role: 'admin' | 'supplier'
  ): Promise<LoginResult> => {
    try {
      const response = role === 'admin'
        ? await adminLogin(email, password)
        : await supplierLogin(email, password);

      const { token, user: userData, requiresPasswordChange: needsPasswordChange } = response.data;
      localStorage.setItem('token', token);

      const authUser: AuthUser = {
        id:          userData.id || userData.adminId || userData.supplierId || userData.userId,
        name:        role === 'admin'
                       ? (userData.name || userData.adminName)
                       : (userData.companyName || userData.name),
        email:       userData.email,
        role,
        companyName: role === 'supplier'
                       ? (userData.companyName || userData.name)
                       : undefined,
      };

      if (needsPasswordChange) {
        setTempUser(authUser);
        setRequiresPasswordChange(true);
        return { success: true, message: 'Password change required', requiresPasswordChange: true, user: authUser };
      }

      setUser(authUser);
      setTempUser(null);
      setRequiresPasswordChange(false);
      return { success: true, message: '', requiresPasswordChange: false };

    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed. Please try again.';
      return { success: false, message, requiresPasswordChange: false };
    }
  };

  const clearTempUser = () => {
    setTempUser(null);
    setRequiresPasswordChange(false);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{
      user, login, logout, isAuthenticated: !!user,
      loading, requiresPasswordChange, tempUser, clearTempUser, loginPath,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}