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
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && AuthService.isAuthenticated();

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      if (AuthService.isAuthenticated()) {
        try {
          const savedUser = AuthService.getCurrentUser();
          if (savedUser) {
            setUser(savedUser);
          } else {
            // Fetch fresh profile data
            const profileResponse = await AuthService.getProfile();
            if (profileResponse.success && profileResponse.user) {
              setUser(profileResponse.user);
              localStorage.setItem('user', JSON.stringify(profileResponse.user));
            } else {
              AuthService.logout();
            }
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
          AuthService.logout();
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

  const refreshProfile = async () => {
    if (!AuthService.isAuthenticated()) return;

    try {
      const response = await AuthService.getProfile();
      if (response.success && response.user) {
        setUser(response.user);
        localStorage.setItem('user', JSON.stringify(response.user));
      }
    } catch (error) {
      console.error('Failed to refresh profile:', error);
    }
  };

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshProfile
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
