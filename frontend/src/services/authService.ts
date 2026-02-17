/**
 * Authentication Service
 *
 * Handles all authentication-related API calls to n8n backend.
 */

import axios, { AxiosError } from 'axios';
import { config } from '../config/env';
import type { User, AuthResponse, LoginCredentials, RegisterCredentials } from '../types';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: config.api.n8nWebhookUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============================================================================
// Authentication API Methods
// ============================================================================

export const authService = {
  /**
   * Register a new user
   */
  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      const { email, password } = credentials;

      // Validate passwords match
      if (password !== credentials.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      const response = await api.post<AuthResponse>('/auth/register', {
        email,
        password,
      });

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  },

  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>('/auth/login', credentials);
      const { token, user, expiresAt } = response.data;

      // Store token and expiration in localStorage
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_token_expires', expiresAt);
      localStorage.setItem('user', JSON.stringify(user));

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      const token = localStorage.getItem('auth_token');

      if (token) {
        // Call logout endpoint to invalidate session in backend
        await api.post('/auth/logout');
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // Always clear local storage
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_token_expires');
      localStorage.removeItem('user');
    }
  },

  /**
   * Get current user data
   */
  async getCurrentUser(): Promise<User> {
    try {
      const response = await api.get<User>('/auth/me');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to get user data');
    }
  },

  /**
   * Verify token validity
   */
  async verifyToken(): Promise<User | null> {
    const token = localStorage.getItem('auth_token');
    const expiresAt = localStorage.getItem('auth_token_expires');

    if (!token || !expiresAt) {
      return null;
    }

    // Check if token is expired
    const expirationDate = new Date(expiresAt);
    if (expirationDate < new Date()) {
      // Token expired
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_token_expires');
      localStorage.removeItem('user');
      return null;
    }

    try {
      // Verify token with backend
      const user = await this.getCurrentUser();
      return user;
    } catch (error) {
      // Token invalid
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_token_expires');
      localStorage.removeItem('user');
      return null;
    }
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = localStorage.getItem('auth_token');
    const expiresAt = localStorage.getItem('auth_token_expires');

    if (!token || !expiresAt) {
      return false;
    }

    // Check if token is expired
    const expirationDate = new Date(expiresAt);
    return expirationDate > new Date();
  },

  /**
   * Get stored user from localStorage
   */
  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },
};

// Export axios instance for use in other services
export { api };
