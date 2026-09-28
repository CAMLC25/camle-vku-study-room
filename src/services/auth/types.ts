import {
  AuthUser,
  AuthSession,
  SignUpParams,
  SignInParams,
  AuthResult,
} from '../../types/auth';

export interface IAuthService {
  signUp(params: SignUpParams): Promise<AuthResult>;
  signIn(params: SignInParams): Promise<AuthResult>;
  signOut(): Promise<{ success: boolean; error?: string }>;
  getCurrentUser(): Promise<AuthUser | null>;
  getSession(): Promise<AuthSession | null>;
  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void;
}
