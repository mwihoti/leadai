// ============================================================
// Linked Lead AI — Auth Utilities
// In production, replace with Clerk Auth
// ============================================================

import { v4 as uuidv4 } from 'uuid';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

const AUTH_KEY = 'linked_lead_ai_auth';

export function getStoredUser(): AuthUser | null {
  try {
    const data = localStorage.getItem(AUTH_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function storeUser(user: AuthUser): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem(AUTH_KEY);
}

export function createUser(email: string, name: string): AuthUser {
  return {
    id: uuidv4(),
    email,
    name,
  };
}

export function isAuthenticated(): boolean {
  return getStoredUser() !== null;
}