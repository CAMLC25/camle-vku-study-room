import { ENV } from '../config/environment';
import { IAuthService } from './auth/types';
import { mockAuthService } from './mock/mockAuthService';
import { supabaseAuthService } from './supabase/supabaseAuthService';

export const authService: IAuthService =
  ENV.appDataMode === 'supabase' ? supabaseAuthService : mockAuthService;

export * from './auth/types';
export * from '../types/auth';
