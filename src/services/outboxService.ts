import { BookingOutboxItem, OutboxOperationType } from '../types/sync';
import { BookingRequest, Booking } from '../types/booking';
import { generateIdempotencyKey } from '../utils/idempotency';
import { useBookingStore } from '../store/useBookingStore';
import { TIME_SLOT_DEFINITIONS, SlotIndex } from '../types/slot';

export class OutboxService {
  /**
   * Queues an offline booking creation in PENDING_SYNC state
   */
  queueBooking(
    room: { id: string; name: string; building: string; floor: number },
    bookingDate: string,
    slotIndex: SlotIndex,
    studentId: string
  ): { outboxItem: BookingOutboxItem; pendingBooking: Booking } {
    const idempotencyKey = generateIdempotencyKey();
    const outboxId = `outbox-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const payload: BookingRequest = {
      roomId: room.id,
      bookingDate,
      slotIndex,
      studentId,
      idempotencyKey,
    };

    const outboxItem: BookingOutboxItem = {
      id: outboxId,
      type: 'CREATE_BOOKING',
      payload,
      roomId: room.id,
      bookingDate,
      slotIndex,
      idempotencyKey,
      status: 'PENDING_SYNC',
      attemptCount: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // Client representation in PENDING_SYNC state (NEVER confirmed yet!)
    const pendingBooking: Booking = {
      id: `pending-${idempotencyKey.substring(0, 8)}`,
      roomId: room.id,
      roomName: room.name,
      building: room.building,
      floor: room.floor,
      studentId,
      bookingDate,
      slotIndex,
      idempotencyKey,
      status: 'PENDING_SYNC',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const store = useBookingStore.getState();
    store.addToOutbox(outboxItem);
    store.addBooking(pendingBooking);

    return { outboxItem, pendingBooking };
  }

  /**
   * Queues a booking cancellation in PENDING_SYNC state
   */
  queueCancellation(
    booking: Booking
  ): BookingOutboxItem {
    const outboxId = `outbox-cancel-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const outboxItem: BookingOutboxItem = {
      id: outboxId,
      type: 'CANCEL_BOOKING',
      payload: { bookingId: booking.id, studentId: booking.studentId },
      roomId: booking.roomId,
      bookingDate: booking.bookingDate,
      slotIndex: booking.slotIndex,
      idempotencyKey: booking.idempotencyKey,
      status: 'PENDING_SYNC',
      attemptCount: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const store = useBookingStore.getState();
    store.addToOutbox(outboxItem);
    store.updateBooking(booking.id, { status: 'PENDING_SYNC' });

    return outboxItem;
  }
}

export const outboxService = new OutboxService();
