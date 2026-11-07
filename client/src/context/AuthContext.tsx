import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { User } from '../types/user.types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  changePassword: (currentPass: string, newPass: string) => Promise<string>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProfile = async () => {
    try {
      const res = await api.get<{ success: boolean; data: User }>('/auth/me');
      setUser(res.data.data);
    } catch (error) {
      console.warn('Authentication token expired or invalid');
      localStorage.removeItem('access_token');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile();
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (identifier: string, password: string): Promise<User> => {
    const res = await api.post<{
      success: boolean;
      data: { user: User; accessToken: string };
    }>('/auth/login', { identifier, password });

    const { user: loggedInUser, accessToken } = res.data.data;
    localStorage.setItem('access_token', accessToken);
    setToken(accessToken);
    setUser(loggedInUser);
    return loggedInUser;
  };

  const logout = async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Continue client-side logout even if server fails
    } finally {
      localStorage.removeItem('access_token');
      setToken(null);
      setUser(null);
    }
  };

  const changePassword = async (currentPass: string, newPass: string): Promise<string> => {
    const res = await api.put<{ success: boolean; message: string }>('/auth/change-password', {
      currentPassword: currentPass,
      newPassword: newPass,
    });
    return res.data.message;
  };

  const refreshProfile = async () => {
    if (token) {
      await fetchProfile();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        changePassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
