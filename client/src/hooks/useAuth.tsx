import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User } from '@moneysplit/shared';
import { api, setToken, clearToken } from '../lib/api';

const USER_KEY = 'moneysplit_user';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('moneysplit_token');
    if (!token) {
      setLoading(false);
      return;
    }
    // Validate token by fetching groups; if it fails, clear session.
    api
      .listGroups()
      .then(() => setLoading(false))
      .catch(() => {
        clearToken();
        localStorage.removeItem(USER_KEY);
        setUser(null);
        setLoading(false);
      });
  }, []);

  const persist = (u: User) => {
    setUser(u);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
  };

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    setToken(res.token);
    persist(res.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await api.register(name, email, password);
    setToken(res.token);
    persist(res.user);
  };

  const logout = () => {
    clearToken();
    localStorage.removeItem(USER_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
