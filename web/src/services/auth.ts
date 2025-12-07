import axios from 'axios';
import api from '@/lib/api';
import { LoginRequest, RegisterRequest, User, AuthResponse } from '@/types/auth';

function extractErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }
  return fallback;
}

export class AuthService {
  static async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await api.post('/api/v1/auth/login', credentials);

      if (response.data.token && response.data.user) {
        localStorage.setItem('auth-token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        return {
          success: true,
          data: response.data
        };
      }
      
      return {
        success: false,
        error: 'Invalid response from server'
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: extractErrorMessage(error, 'Login failed')
      };
    }
  }

  static async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      await api.post('/api/v1/auth/register', userData);
      return { success: true };
    } catch (error: unknown) {
      return {
        success: false,
        error: extractErrorMessage(error, 'Registration failed')
      };
    }
  }

  static async getProfile(): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const response = await api.get('/api/v1/auth/profile');
      return {
        success: true,
        user: response.data
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: extractErrorMessage(error, 'Failed to get profile')
      };
    }
  }

  static isAuthenticated(): boolean {
    const token = localStorage.getItem('auth-token');
    return !!token;
  }

  static getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  static logout(): void {
    localStorage.removeItem('auth-token');
    localStorage.removeItem('user');
  }
}
