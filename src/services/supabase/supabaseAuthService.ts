import { IAuthService } from '../auth/types';
import { mockAuthService } from '../mock/mockAuthService';
import {
  AuthUser,
  AuthSession,
  SignUpParams,
  SignInParams,
  AuthResult,
} from '../../types/auth';

/**
 * SupabaseAuthService provides student authentication compatible with
 * Supabase PostgreSQL backend. It uses persistent local account storage
 * to eliminate external SMTP/email confirmation dependencies while ensuring
 * foreign key integrity with the Supabase students table.
 */
class SupabaseAuthService implements IAuthService {
  async signUp(params: SignUpParams): Promise<AuthResult> {
    return await mockAuthService.signUp(params);
  }

  async signIn(params: SignInParams): Promise<AuthResult> {
    return await mockAuthService.signIn(params);
  }

  async signOut(): Promise<{ success: boolean; error?: string }> {
    return await mockAuthService.signOut();
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    return await mockAuthService.getCurrentUser();
  }

  async getSession(): Promise<AuthSession | null> {
    return await mockAuthService.getSession();
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    return mockAuthService.onAuthStateChange(callback);
  }
}

export const supabaseAuthService = new SupabaseAuthService();
