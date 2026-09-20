import { createClient } from '@supabase/supabase-js';
import { ENV } from '../../config/environment';

export const supabase = createClient(
  ENV.supabaseUrl,
  ENV.supabaseAnonKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
