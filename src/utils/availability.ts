import { SlotIndex, SlotState } from '../types/slot';
import { Booking, BookingHold } from '../types/booking';
import { BookingOutboxItem } from '../types/sync';

interface ResolveSlotStateParams {
  roomId: string;
  date: string;
  slotIndex: SlotIndex;
  currentStudentId: string;
  serverBooking?: Booking;
  serverHold?: BookingHold;
  outboxItems: BookingOutboxItem[];
}

/**
 * Resolves the deterministic UI SlotState according to strict domain priority:
 *
 * 1. PENDING_SYNC: Current student has a pending offline mutation in outbox for this slot
 * 2. MINE: Server confirmed booking belongs to current student, OR current student holds valid hold
 * 3. BOOKED: Server confirmed active booking belongs to another student
 * 4. HELD_BY_OTHER: Unexpired soft hold belongs to another student
 * 5. AVAILABLE: No active booking and no unexpired hold (or hold has expired)
 */
export function resolveSlotState({
  roomId,
  date,
  slotIndex,
  currentStudentId,
  serverBooking,
  serverHold,
  outboxItems,
}: ResolveSlotStateParams): SlotState {
  // 1. Check local offline outbox items
  const pendingOutboxBooking = outboxItems.find(
    (item) =>
      item.roomId === roomId &&
      item.bookingDate === date &&
      item.slotIndex === slotIndex &&
      item.status === 'PENDING_SYNC' &&
      item.type === 'CREATE_BOOKING'
  );

  if (pendingOutboxBooking) {
    return 'PENDING_SYNC';
  }

  // 2. Check server-confirmed booking
  if (serverBooking && serverBooking.status === 'CONFIRMED') {
    if (serverBooking.studentId === currentStudentId) {
      return 'MINE';
    }
    return 'BOOKED';
  }

  // 3. Check soft hold (strictly check unexpired)
  if (serverHold && serverHold.status === 'active') {
    const isHoldValid = new Date(serverHold.expiresAt).getTime() > Date.now();
    if (isHoldValid) {
      if (serverHold.studentId === currentStudentId) {
        return 'MINE';
      }
      return 'HELD_BY_OTHER';
    }
  }

  // 4. Default state
  return 'AVAILABLE';
}
