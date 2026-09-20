import { ENV } from '../config/environment';
import { IBookingService } from './types';
import { mockBookingService } from './mock/mockBookingService';
import { supabaseBookingService } from './supabase/supabaseBookingService';

export const bookingService: IBookingService =
  ENV.appDataMode === 'supabase' ? supabaseBookingService : mockBookingService;
