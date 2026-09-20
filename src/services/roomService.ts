import { ENV } from '../config/environment';
import { IRoomService } from './types';
import { mockRoomService } from './mock/mockRoomService';
import { supabaseRoomService } from './supabase/supabaseRoomService';

export const roomService: IRoomService =
  ENV.appDataMode === 'supabase' ? supabaseRoomService : mockRoomService;
