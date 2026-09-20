import { IBookingService } from '../types';
import {
  Booking,
  BookingHold,
  BookingRequest,
  BookingResult,
} from '../../types/booking';
import {
  DayRoomAvailability,
  SlotAvailability,
  SlotIndex,
} from '../../types/slot';
import { StudentQuotaUsage, VKU_QUOTA_LIMITS } from '../../types/quota';
import { supabase } from './client';
import { getTodayDateString } from '../../utils/date';

export class SupabaseBookingService implements IBookingService {
  async getAvailability(
    roomId: string,
    date: string,
    studentId: string
  ): Promise<DayRoomAvailability> {
    const nowIso = new Date().toISOString();

    // 1. Fetch confirmed bookings for room and date
    const { data: bookingRows, error: bookingErr } = await supabase
      .from('bookings')
      .select('id, slot_index, student_id, status')
      .eq('room_id', roomId)
      .eq('booking_date', date)
      .eq('status', 'active');

    if (bookingErr) {
      console.error('[SupabaseBookingService] getAvailability bookings error:', bookingErr);
      throw bookingErr;
    }

    // 2. Fetch active unexpired holds
    const { data: holdRows, error: holdErr } = await supabase
      .from('booking_holds')
      .select('id, slot_index, student_id, expires_at')
      .eq('room_id', roomId)
      .eq('booking_date', date)
      .gt('expires_at', nowIso);

    if (holdErr) {
      console.error('[SupabaseBookingService] getAvailability holds error:', holdErr);
    }

    const slots: Record<SlotIndex, SlotAvailability> = {
      0: { slotIndex: 0, state: 'AVAILABLE' },
      1: { slotIndex: 1, state: 'AVAILABLE' },
      2: { slotIndex: 2, state: 'AVAILABLE' },
      3: { slotIndex: 3, state: 'AVAILABLE' },
    };

    ([0, 1, 2, 3] as SlotIndex[]).forEach((idx) => {
      const b = (bookingRows || []).find((row: any) => row.slot_index === idx);
      if (b) {
        slots[idx] = {
          slotIndex: idx,
          state: b.student_id === studentId ? 'MINE' : 'BOOKED',
          bookedByStudentId: b.student_id,
          bookingId: b.id,
        };
        return;
      }

      const h = (holdRows || []).find((row: any) => row.slot_index === idx);
      if (h) {
        slots[idx] = {
          slotIndex: idx,
          state: h.student_id === studentId ? 'MINE' : 'HELD_BY_OTHER',
          holdExpiresAt: h.expires_at,
        };
      }
    });

    return {
      roomId,
      date,
      slots,
      lastUpdatedAt: new Date().toISOString(),
    };
  }

  async createHold(
    roomId: string,
    date: string,
    slotIndex: SlotIndex,
    studentId: string
  ): Promise<{ success: boolean; hold?: BookingHold; error?: string }> {
    const { data, error } = await supabase.rpc('create_slot_hold', {
      p_room_id: roomId,
      p_booking_date: date,
      p_slot_index: slotIndex,
      p_student_id: studentId,
      p_duration_seconds: 90,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      hold: {
        id: data.id,
        roomId: data.room_id,
        bookingDate: data.booking_date,
        slotIndex: data.slot_index,
        studentId: data.student_id,
        createdAt: data.created_at,
        expiresAt: data.expires_at,
        status: 'active',
      },
    };
  }

  async releaseHold(holdId: string): Promise<void> {
    await supabase.from('booking_holds').delete().eq('id', holdId);
  }

  async bookSlot(request: BookingRequest): Promise<BookingResult> {
    // Single PostgreSQL stored procedure transaction: book_slot()
    const { data, error } = await supabase.rpc('book_slot', {
      p_student_id: request.studentId,
      p_room_id: request.roomId,
      p_booking_date: request.bookingDate,
      p_slot_index: request.slotIndex,
      p_idempotency_key: request.idempotencyKey,
    });

    if (error) {
      // Check for Postgres unique violation 23505
      if (error.code === '23505' || error.message?.includes('23505')) {
        return {
          success: false,
          errorCode: 'SLOT_ALREADY_BOOKED',
          errorMessage: 'This slot was just taken by another student.',
        };
      }
      return {
        success: false,
        errorCode: error.code || 'BOOKING_FAILED',
        errorMessage: error.message || 'Unable to complete reservation.',
      };
    }

    if (!data.success) {
      return {
        success: false,
        errorCode: data.error_code,
        errorMessage: data.error_message,
      };
    }

    const b = data.booking;
    return {
      success: true,
      isReplay: data.is_replay || false,
      booking: {
        id: b.id,
        roomId: b.room_id,
        roomName: b.room_name || b.room_id,
        building: b.building || 'A',
        floor: b.floor || 1,
        studentId: b.student_id,
        bookingDate: b.booking_date,
        slotIndex: b.slot_index,
        idempotencyKey: b.idempotency_key,
        status: 'CONFIRMED',
        createdAt: b.created_at,
        updatedAt: b.updated_at,
      },
    };
  }

  async cancelBooking(
    bookingId: string,
    studentId: string
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', bookingId)
      .eq('student_id', studentId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  }

  async getMyBookings(studentId: string): Promise<Booking[]> {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        room_id,
        booking_date,
        slot_index,
        idempotency_key,
        status,
        created_at,
        updated_at,
        rooms (
          name,
          building,
          floor
        )
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[SupabaseBookingService] getMyBookings error:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      roomId: row.room_id,
      roomName: row.rooms?.name || 'Room',
      building: row.rooms?.building || 'A',
      floor: row.rooms?.floor || 1,
      studentId,
      bookingDate: row.booking_date,
      slotIndex: row.slot_index,
      idempotencyKey: row.idempotency_key,
      status: row.status === 'active' ? 'CONFIRMED' : 'CANCELLED',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async getStudentQuotaUsage(
    studentId: string,
    targetDate?: string
  ): Promise<StudentQuotaUsage> {
    const dateStr = targetDate || getTodayDateString();
    const { data, error } = await supabase.rpc('get_student_quota', {
      p_student_id: studentId,
      p_booking_date: dateStr,
    });

    if (error || !data) {
      return {
        studentId,
        dailyUsage: 0,
        weeklyUsage: 0,
        activeFutureCount: 0,
        dailyRemaining: VKU_QUOTA_LIMITS.maxDailySlots,
        weeklyRemaining: VKU_QUOTA_LIMITS.maxWeeklySlots,
        activeFutureRemaining: VKU_QUOTA_LIMITS.maxActiveFutureBookings,
      };
    }

    return {
      studentId,
      dailyUsage: data.daily_usage,
      weeklyUsage: data.weekly_usage,
      activeFutureCount: data.active_future_count,
      dailyRemaining: data.daily_remaining,
      weeklyRemaining: data.weekly_remaining,
      activeFutureRemaining: data.active_future_remaining,
    };
  }
}

export const supabaseBookingService = new SupabaseBookingService();
