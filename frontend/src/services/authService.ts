/**
 * Authentication Service
 *
 * Local authentication using localStorage.
 * Admin account bypasses registration.
 * When n8n backend is ready, switch to API-based auth.
 */

import axios from 'axios';
import { config } from '../config/env';
import type { User, AuthResponse, LoginCredentials, RegisterCredentials } from '../types';

// ============================================================================
// Admin credentials (hardcoded, bypasses registration)
// ============================================================================

const ADMIN_EMAIL = 'admin@media.com';
const ADMIN_PASSWORD = 'admin123';

// ============================================================================
// Local storage keys
// ============================================================================

const STORAGE_KEYS = {
  token: 'auth_token',
  tokenExpires: 'auth_token_expires',
  user: 'user',
  users: 'registered_users', // store all registered users
};

// ============================================================================
// Helper: hash password (simple hash for local use)
// ============================================================================

const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + '_media_platform_salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};

// ============================================================================
// Helper: generate token
// ============================================================================

const generateToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

// ============================================================================
// Helper: get registered users from localStorage
// ============================================================================

interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

const getStoredUsers = (): StoredUser[] => {
  const data = localStorage.getItem(STORAGE_KEYS.users);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
};

const saveStoredUsers = (users: StoredUser[]): void => {
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
};

// ============================================================================
// Axios instance (for uploadService and other API calls)
// ============================================================================

const api = axios.create({
  baseURL: config.api.n8nWebhookUrl || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

api.interceptors.request.use((reqConfig) => {
  const token = localStorage.getItem(STORAGE_KEYS.token);
  if (token) {
    reqConfig.headers.Authorization = `Bearer ${token}`;
  }
  return reqConfig;
});

// ============================================================================
// Authentication Methods
// ============================================================================

export const authService = {
  /**
   * Register a new user (local)
   */
  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const { email, password, confirmPassword } = credentials;

    if (password !== confirmPassword) {
      throw new Error('Пароли не совпадают');
    }

    if (password.length < 6) {
      throw new Error('Пароль должен содержать минимум 6 символов');
    }

    const users = getStoredUsers();

    // Check if email already exists
    if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('Пользователь с таким email уже зарегистрирован');
    }

    const passwordHash = await hashPassword(password);
    const newUser: StoredUser = {
      id: crypto.randomUUID(),
      email: email.toLowerCase(),
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    saveStoredUsers(users);

    const token = generateToken();
    const expiresAt = new Date(Date.now() + config.app.sessionTimeout).toISOString();
    const user: User = {
      id: newUser.id,
      email: newUser.email,
      createdAt: newUser.createdAt,
    };

    return { success: true, token, expiresAt, user };
  },

  /**
   * Login user (local, with admin bypass)
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { email, password } = credentials;

    // Admin bypass
    if (email.toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const token = generateToken();
      const expiresAt = new Date(Date.now() + config.app.sessionTimeout).toISOString();
      const user: User = {
        id: 'admin-001',
        email: ADMIN_EMAIL,
        createdAt: '2024-01-01T00:00:00.000Z',
        lastLogin: new Date().toISOString(),
      };

      localStorage.setItem(STORAGE_KEYS.token, token);
      localStorage.setItem(STORAGE_KEYS.tokenExpires, expiresAt);
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));

      return { success: true, token, expiresAt, user };
    }

    // Regular user login
    const users = getStoredUsers();
    const storedUser = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!storedUser) {
      throw new Error('Неверный email или пароль');
    }

    const passwordHash = await hashPassword(password);
    if (passwordHash !== storedUser.passwordHash) {
      throw new Error('Неверный email или пароль');
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + config.app.sessionTimeout).toISOString();
    const user: User = {
      id: storedUser.id,
      email: storedUser.email,
      createdAt: storedUser.createdAt,
      lastLogin: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEYS.token, token);
    localStorage.setItem(STORAGE_KEYS.tokenExpires, expiresAt);
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));

    return { success: true, token, expiresAt, user };
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.tokenExpires);
    localStorage.removeItem(STORAGE_KEYS.user);
  },

  /**
   * Get current user data
   */
  async getCurrentUser(): Promise<User> {
    const user = this.getStoredUser();
    if (!user) {
      throw new Error('Not authenticated');
    }
    return user;
  },

  /**
   * Verify token validity
   */
  async verifyToken(): Promise<User | null> {
    const token = localStorage.getItem(STORAGE_KEYS.token);
    const expiresAt = localStorage.getItem(STORAGE_KEYS.tokenExpires);

    if (!token || !expiresAt) {
      return null;
    }

    if (new Date(expiresAt) < new Date()) {
      localStorage.removeItem(STORAGE_KEYS.token);
      localStorage.removeItem(STORAGE_KEYS.tokenExpires);
      localStorage.removeItem(STORAGE_KEYS.user);
      return null;
    }

    return this.getStoredUser();
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = localStorage.getItem(STORAGE_KEYS.token);
    const expiresAt = localStorage.getItem(STORAGE_KEYS.tokenExpires);

    if (!token || !expiresAt) return false;

    return new Date(expiresAt) > new Date();
  },

  /**
   * Get stored user from localStorage
   */
  getStoredUser(): User | null {
    const userStr = localStorage.getItem(STORAGE_KEYS.user);
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },
};

export { api };
