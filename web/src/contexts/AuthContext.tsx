'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@/types/auth';
import { AuthService } from '@/services/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (userData: { email: string; password: string; firstName: string; lastName: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && AuthService.isAuthenticated();

  // Initialize auth state
  useEffect(() => {
    const initAuth = () => {
      if (AuthService.isAuthenticated()) {
        const savedUser = AuthService.getCurrentUser();
        if (savedUser) {
          setUser(savedUser);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await AuthService.login({ email, password });

      if (response.success && response.data?.user) {
        setUser(response.data.user);
        return { success: true };
      } else {
        return {
          success: false,
          error: response.error || 'Login failed'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'Network error. Please try again.'
      };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => {
    setIsLoading(true);
    try {
      const response = await AuthService.register({
        email: userData.email,
        password: userData.password,
        first_name: userData.firstName,
        last_name: userData.lastName
      });

      if (response.success) {
        return { success: true };
      } else {
        return {
          success: false,
          error: response.error || 'Registration failed'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'Network error. Please try again.'
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    AuthService.logout();
  };

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
