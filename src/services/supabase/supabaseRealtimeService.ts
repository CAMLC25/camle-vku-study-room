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
          const isCancelled =
            payload.eventType === 'DELETE' ||
            (row && (row.status === 'cancelled' || row.status === 'rejected'));

          // On DELETE, row might only contain { id } if replica identity wasn't full.
          // Trigger refresh if booking_date matches OR is undefined on DELETE.
          if (!row || !row.booking_date || row.booking_date === date) {
            callback({
              type: isCancelled ? 'BOOKING_CANCELLED' : 'BOOKING_CREATED',
              roomId,
              date,
              slotIndex: row?.slot_index ?? 0,
              studentId: row?.student_id ?? '',
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
          const isReleased =
            payload.eventType === 'DELETE' ||
            (row && (row.status === 'expired' || row.status === 'cancelled'));

          // Trigger refresh if booking_date matches OR is undefined on DELETE.
          if (!row || !row.booking_date || row.booking_date === date) {
            callback({
              type: isReleased ? 'HOLD_EXPIRED' : 'HOLD_CREATED',
              roomId,
              date,
              slotIndex: row?.slot_index ?? 0,
              studentId: row?.student_id ?? '',
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
