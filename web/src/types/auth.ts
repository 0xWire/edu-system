// User types matching original DTOs
export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  created_at: string;
}

// Auth request types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

// Auth response types
export interface LoginResponse {
  token: string;
  user: User;
}

export interface AuthResponse {
  success: boolean;
  data?: LoginResponse;
  error?: string;
}
