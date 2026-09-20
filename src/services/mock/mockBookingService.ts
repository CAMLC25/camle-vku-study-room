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
import { MOCK_ROOMS } from './mockData';
import { mockRealtimeService } from './mockRealtimeService';
import { isWithinBookingHorizon, getTodayDateString } from '../../utils/date';

export class MockBookingService implements IBookingService {
  private bookings: Booking[] = [];
  private holds: BookingHold[] = [];

  constructor() {
    // Seed initial mock bookings for realistic demo
    const today = getTodayDateString();
    this.bookings = [
      {
        id: 'book-init-001',
        roomId: 'room-a-101',
        roomName: 'A101 - Smart Seminar',
        building: 'A',
        floor: 1,
        studentId: 'student-other-999',
        studentName: 'Tran Van B',
        bookingDate: today,
        slotIndex: 0,
        idempotencyKey: 'idem-init-001',
        status: 'CONFIRMED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  async getAvailability(
    roomId: string,
    date: string,
    studentId: string
  ): Promise<DayRoomAvailability> {
    await new Promise((resolve) => setTimeout(resolve, 60));
    const now = new Date();

    const activeRoomBookings = this.bookings.filter(
      (b) =>
        b.roomId === roomId &&
        b.bookingDate === date &&
        b.status === 'CONFIRMED'
    );

    const activeHolds = this.holds.filter(
      (h) =>
        h.roomId === roomId &&
        h.bookingDate === date &&
        h.status === 'active' &&
        new Date(h.expiresAt) > now
    );

    const slots: Record<SlotIndex, SlotAvailability> = {
      0: { slotIndex: 0, state: 'AVAILABLE' },
      1: { slotIndex: 1, state: 'AVAILABLE' },
      2: { slotIndex: 2, state: 'AVAILABLE' },
      3: { slotIndex: 3, state: 'AVAILABLE' },
    };

    ([0, 1, 2, 3] as SlotIndex[]).forEach((idx) => {
      const booking = activeRoomBookings.find((b) => b.slotIndex === idx);
      if (booking) {
        if (booking.studentId === studentId) {
          slots[idx] = {
            slotIndex: idx,
            state: 'MINE',
            bookingId: booking.id,
            bookedByStudentId: booking.studentId,
          };
        } else {
          slots[idx] = {
            slotIndex: idx,
            state: 'BOOKED',
            bookingId: booking.id,
            bookedByStudentId: booking.studentId,
          };
        }
        return;
      }

      const hold = activeHolds.find((h) => h.slotIndex === idx);
      if (hold) {
        if (hold.studentId === studentId) {
          slots[idx] = {
            slotIndex: idx,
            state: 'MINE',
            holdExpiresAt: hold.expiresAt,
          };
        } else {
          slots[idx] = {
            slotIndex: idx,
            state: 'HELD_BY_OTHER',
            holdExpiresAt: hold.expiresAt,
          };
        }
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
    const now = new Date();

    // Check if already confirmed booked
    const existingBooking = this.bookings.find(
      (b) =>
        b.roomId === roomId &&
        b.bookingDate === date &&
        b.slotIndex === slotIndex &&
        b.status === 'CONFIRMED'
    );
    if (existingBooking) {
      return { success: false, error: 'SLOT_ALREADY_BOOKED' };
    }

    // Check existing unexpired hold by another student
    const existingHold = this.holds.find(
      (h) =>
        h.roomId === roomId &&
        h.bookingDate === date &&
        h.slotIndex === slotIndex &&
        h.status === 'active' &&
        new Date(h.expiresAt) > now &&
        h.studentId !== studentId
    );
    if (existingHold) {
      return { success: false, error: 'SLOT_HELD_BY_OTHER' };
    }

    const expiresAt = new Date(now.getTime() + 90 * 1000).toISOString();
    const hold: BookingHold = {
      id: `hold-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      roomId,
      bookingDate: date,
      slotIndex,
      studentId,
      createdAt: now.toISOString(),
      expiresAt,
      status: 'active',
    };

    this.holds.push(hold);
    mockRealtimeService.emit({
      type: 'HOLD_CREATED',
      roomId,
      date,
      slotIndex,
      studentId,
    });

    return { success: true, hold };
  }

  async releaseHold(holdId: string): Promise<void> {
    const hold = this.holds.find((h) => h.id === holdId);
    if (hold) {
      hold.status = 'expired';
      mockRealtimeService.emit({
        type: 'HOLD_EXPIRED',
        roomId: hold.roomId,
        date: hold.bookingDate,
        slotIndex: hold.slotIndex,
        studentId: hold.studentId,
      });
    }
  }

  async bookSlot(request: BookingRequest): Promise<BookingResult> {
    // 1. Check idempotency first
    const existingByIdem = this.bookings.find(
      (b) => b.idempotencyKey === request.idempotencyKey
    );
    if (existingByIdem) {
      return {
        success: true,
        booking: existingByIdem,
        isReplay: true,
      };
    }

    // 2. Check 7-day booking horizon
    if (!isWithinBookingHorizon(request.bookingDate)) {
      return {
        success: false,
        errorCode: 'OUTSIDE_BOOKING_HORIZON',
        errorMessage: 'Bookings are only permitted within a 7-day rolling window.',
      };
    }

    // 3. Quota checks
    const quota = await this.getStudentQuotaUsage(
      request.studentId,
      request.bookingDate
    );
    if (quota.dailyRemaining <= 0) {
      return {
        success: false,
        errorCode: 'DAILY_QUOTA_EXCEEDED',
        errorMessage: 'You have reached your daily booking limit (maximum 2 slots per day).',
      };
    }
    if (quota.weeklyRemaining <= 0) {
      return {
        success: false,
        errorCode: 'WEEKLY_QUOTA_EXCEEDED',
        errorMessage: 'You have reached your weekly booking limit (maximum 6 slots per week).',
      };
    }
    if (quota.activeFutureRemaining <= 0) {
      return {
        success: false,
        errorCode: 'ACTIVE_BOOKING_LIMIT_EXCEEDED',
        errorMessage: 'You have reached the maximum active future booking limit (3 bookings).',
      };
    }

    // 4. Concurrency check (PostgreSQL 23505 simulation)
    const slotTaken = this.bookings.some(
      (b) =>
        b.roomId === request.roomId &&
        b.bookingDate === request.bookingDate &&
        b.slotIndex === request.slotIndex &&
        b.status === 'CONFIRMED'
    );
    if (slotTaken) {
      return {
        success: false,
        errorCode: 'SLOT_ALREADY_BOOKED',
        errorMessage: 'This slot was just taken by another student.',
      };
    }

    // 5. Success - create booking
    const room = MOCK_ROOMS.find((r) => r.id === request.roomId);
    const newBooking: Booking = {
      id: `bk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      roomId: request.roomId,
      roomName: room ? room.name : request.roomId,
      building: room ? room.building : 'A',
      floor: room ? room.floor : 1,
      studentId: request.studentId,
      bookingDate: request.bookingDate,
      slotIndex: request.slotIndex,
      idempotencyKey: request.idempotencyKey,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.bookings.push(newBooking);

    // Convert hold
    const studentHold = this.holds.find(
      (h) =>
        h.roomId === request.roomId &&
        h.bookingDate === request.bookingDate &&
        h.slotIndex === request.slotIndex &&
        h.studentId === request.studentId &&
        h.status === 'active'
    );
    if (studentHold) {
      studentHold.status = 'converted';
    }

    // Broadcast change
    mockRealtimeService.emit({
      type: 'BOOKING_CREATED',
      roomId: request.roomId,
      date: request.bookingDate,
      slotIndex: request.slotIndex,
      studentId: request.studentId,
    });

    return {
      success: true,
      booking: newBooking,
      isReplay: false,
    };
  }

  async cancelBooking(
    bookingId: string,
    studentId: string
  ): Promise<{ success: boolean; error?: string }> {
    const booking = this.bookings.find(
      (b) => b.id === bookingId && b.studentId === studentId
    );
    if (!booking) {
      return { success: false, error: 'Booking not found or unauthorized' };
    }

    booking.status = 'CANCELLED';
    booking.updatedAt = new Date().toISOString();

    mockRealtimeService.emit({
      type: 'BOOKING_CANCELLED',
      roomId: booking.roomId,
      date: booking.bookingDate,
      slotIndex: booking.slotIndex,
      studentId: booking.studentId,
    });

    return { success: true };
  }

  async getMyBookings(studentId: string): Promise<Booking[]> {
    return this.bookings
      .filter((b) => b.studentId === studentId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }

  async getStudentQuotaUsage(
    studentId: string,
    targetDate?: string
  ): Promise<StudentQuotaUsage> {
    const dateStr = targetDate || new Date().toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    const activeUserBookings = this.bookings.filter(
      (b) => b.studentId === studentId && b.status === 'CONFIRMED'
    );

    // Daily count for targetDate
    const dailyUsage = activeUserBookings.filter(
      (b) => b.bookingDate === dateStr
    ).length;

    // Weekly count (rolling 7 days)
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 3);
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 4);

    const weeklyUsage = activeUserBookings.filter((b) => {
      const bd = new Date(b.bookingDate);
      return bd >= weekStart && bd <= weekEnd;
    }).length;

    // Active future bookings (date >= today)
    const activeFutureCount = activeUserBookings.filter(
      (b) => b.bookingDate >= today
    ).length;

    return {
      studentId,
      dailyUsage,
      weeklyUsage,
      activeFutureCount,
      dailyRemaining: Math.max(0, VKU_QUOTA_LIMITS.maxDailySlots - dailyUsage),
      weeklyRemaining: Math.max(0, VKU_QUOTA_LIMITS.maxWeeklySlots - weeklyUsage),
      activeFutureRemaining: Math.max(
        0,
        VKU_QUOTA_LIMITS.maxActiveFutureBookings - activeFutureCount
      ),
    };
  }

  reset(): void {
    const today = getTodayDateString();
    this.bookings = [
      {
        id: 'book-init-001',
        roomId: 'room-a-101',
        roomName: 'A101 - Smart Seminar',
        building: 'A',
        floor: 1,
        studentId: 'student-other-999',
        studentName: 'Tran Van B',
        bookingDate: today,
        slotIndex: 0,
        idempotencyKey: 'idem-init-001',
        status: 'CONFIRMED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    this.holds = [];
  }
}

export const mockBookingService = new MockBookingService();
