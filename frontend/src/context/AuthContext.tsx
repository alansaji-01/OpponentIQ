import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'ADMIN' | 'HEAD_COACH' | 'ANALYST';
  organization: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const accessToken = localStorage.getItem('access_token');
      if (accessToken) {
        try {
          const res = await api.get('/users/me/');
          setUser(res.data);
        } catch (err) {
          console.error("Failed to load user session", err);
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    fetchUser();
  }, []);

  const login = async (username: string, password: string) => {
    const res = await api.post('/auth/login/', { username, password });
    localStorage.setItem('access_token', res.data.access);
    localStorage.setItem('refresh_token', res.data.refresh);
    setToken(res.data.access);
    setUser(res.data.user);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
