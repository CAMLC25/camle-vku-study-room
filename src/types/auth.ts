/**
 * Authentication domain types for VKU Study Room
 * Supports both Mock Auth and Supabase Auth
 */

export interface AuthUser {
  id: string; // UUID matching students.id / auth.users.id
  email: string;
  studentCode: string;
  fullName: string;
  className?: string;
  avatarUrl?: string;
  role?: 'student' | 'admin';
}

export interface AuthSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  user: AuthUser;
}

export interface SignUpParams {
  email: string;
  password: string;
  studentCode: string;
  fullName: string;
  className?: string;
}

export interface SignInParams {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  session?: AuthSession;
  error?: string;
}
