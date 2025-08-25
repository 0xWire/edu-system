import api from '@/lib/api';
import { LoginRequest, RegisterRequest, User, AuthResponse } from '@/types/auth';

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
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed'
      };
    }
  }

  static async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      await api.post('/api/v1/auth/register', userData);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Registration failed'
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
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get profile'
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
