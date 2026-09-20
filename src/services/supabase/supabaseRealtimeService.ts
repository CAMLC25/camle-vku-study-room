import { IRealtimeService, RealtimeCallback } from '../types';
import { supabase } from './client';
import { RealtimeChannel } from '@supabase/supabase-js';

export class SupabaseRealtimeService implements IRealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();

  subscribeToRoomDate(
    roomId: string,
    date: string,
    callback: RealtimeCallback
  ): () => void {
    const channelKey = `room:${roomId}:${date}`;

    // Clean up existing channel for the same key if open
    if (this.channels.has(channelKey)) {
      const existing = this.channels.get(channelKey)!;
      supabase.removeChannel(existing);
      this.channels.delete(channelKey);
    }

    const channel = supabase
      .channel(channelKey)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const row: any = payload.new || payload.old;
          if (row && row.booking_date === date) {
            callback({
              type:
                payload.eventType === 'DELETE' || row.status === 'cancelled'
                  ? 'BOOKING_CANCELLED'
                  : 'BOOKING_CREATED',
              roomId,
              date,
              slotIndex: row.slot_index,
              studentId: row.student_id,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booking_holds',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const row: any = payload.new || payload.old;
          if (row && row.booking_date === date) {
            callback({
              type:
                payload.eventType === 'DELETE'
                  ? 'HOLD_EXPIRED'
                  : 'HOLD_CREATED',
              roomId,
              date,
              slotIndex: row.slot_index,
              studentId: row.student_id,
            });
          }
        }
      )
      .subscribe();

    this.channels.set(channelKey, channel);

    return () => {
      supabase.removeChannel(channel);
      this.channels.delete(channelKey);
    };
  }
}

export const supabaseRealtimeService = new SupabaseRealtimeService();
