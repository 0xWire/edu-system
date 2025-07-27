import api from '@/lib/api';
import { 
  LoginRequest, 
  RegisterRequest, 
  LoginResponse,
  ErrorResponse,
  SuccessResponse,
  User
} from '@/types/auth';
import Cookies from 'js-cookie';

export class AuthService {
  // Login through classic API
  static async login(credentials: LoginRequest): Promise<{ success: boolean; data?: LoginResponse; error?: string }> {
    try {
      const response = await api.post<LoginResponse>('/api/v1/auth/login', credentials);

      if (response.data.token) {
        // Store token in cookies
        Cookies.set('auth-token', response.data.token, { 
          expires: 7, // 7 days
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict'
        });
        
        // Store user data in localStorage
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
      }
      
      return { success: true, data: response.data };
    } catch (error: any) {
      const errorData = error.response?.data as ErrorResponse;
      return {
        success: false,
        error: errorData?.error || errorData?.message || 'Login failed'
      };
    }
  }

  // Register through classic API
  static async register(userData: RegisterRequest): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.post<SuccessResponse>('/api/v1/auth/register', userData);
      return { success: true };
    } catch (error: any) {
      const errorData = error.response?.data as ErrorResponse;
      return {
        success: false,
        error: errorData?.error || errorData?.message || 'Registration failed'
      };
    }
  }

  // Get user profile through classic API
  static async getProfile(): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const response = await api.get<User>('/api/v1/auth/profile');
      return { success: true, user: response.data };
    } catch (error: any) {
      const errorData = error.response?.data as ErrorResponse;
      return {
        success: false,
        error: errorData?.error || 'Failed to fetch profile'
      };
    }
  }

  // Logout
  static logout(): void {
    Cookies.remove('auth-token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }

  // Check if user is authenticated
  static isAuthenticated(): boolean {
    return !!Cookies.get('auth-token');
  }

  // Get current user from localStorage
  static getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  // Check API health
  static async checkHealth(): Promise<boolean> {
    try {
      const response = await api.get('/health');
      return response.data.status === 'ok';
    } catch {
      return false;
    }
  }
}
