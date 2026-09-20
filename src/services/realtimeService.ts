import { ENV } from '../config/environment';
import { IRealtimeService } from './types';
import { mockRealtimeService } from './mock/mockRealtimeService';
import { supabaseRealtimeService } from './supabase/supabaseRealtimeService';

export const realtimeService: IRealtimeService =
  ENV.appDataMode === 'supabase'
    ? supabaseRealtimeService
    : mockRealtimeService;
