import { BookingOutboxItem } from '../types/sync';
import { Booking, BookingRequest } from '../types/booking';
import { bookingService } from './bookingService';
import { useBookingStore } from '../store/useBookingStore';
import { useNetworkStore } from '../store/useNetworkStore';
export interface SyncNotificationDelegate {
  scheduleSlotReminder: (booking: Booking) => Promise<string | null>;
  notifyBookingConflict: (roomName: string, date: string, slotLabel: string) => Promise<void>;
}

export class SyncService {
  private isProcessing = false;
  private notificationDelegate: SyncNotificationDelegate | null = null;

  /**
   * Assign notification delegate (e.g. notificationService in mobile runtime)
   */
  setNotificationDelegate(delegate: SyncNotificationDelegate | null) {
    this.notificationDelegate = delegate;
  }

  /**
   * Strictly sequential queue processor.
   * NEVER uses Promise.all() for mutations, preserving deterministic causality.
   */
  async flushOutboxSequentially(): Promise<{
    processed: number;
    confirmed: number;
    conflicted: number;
  }> {
    if (this.isProcessing) {
      return { processed: 0, confirmed: 0, conflicted: 0 };
    }

    const network = useNetworkStore.getState().network;
    if (!network.isConnected) {
      return { processed: 0, confirmed: 0, conflicted: 0 };
    }

    this.isProcessing = true;
    useNetworkStore.getState().setSyncState({ isSyncing: true });

    let confirmedCount = 0;
    let conflictedCount = 0;
    let processedCount = 0;

    try {
      const store = useBookingStore.getState();
      const pendingItems = store.outbox.filter(
        (item) => item.status === 'PENDING_SYNC'
      );

      // Deterministic sequential loop
      for (const item of pendingItems) {
        processedCount++;
        const result = await this.processSingleItem(item);

        if (result === 'CONFIRMED') confirmedCount++;
        else if (result === 'CONFLICTED') conflictedCount++;

        // Brief delay between operations for transactional stability
        await new Promise((resolve) => setTimeout(resolve, 80));
      }

      useNetworkStore.getState().setSyncState({
        isSyncing: false,
        lastSyncedAt: new Date().toISOString(),
        pendingCount: useBookingStore
          .getState()
          .outbox.filter((i) => i.status === 'PENDING_SYNC').length,
      });

      return {
        processed: processedCount,
        confirmed: confirmedCount,
        conflicted: conflictedCount,
      };
    } finally {
      this.isProcessing = false;
      useNetworkStore.getState().setSyncState({ isSyncing: false });
    }
  }

  private async processSingleItem(
    item: BookingOutboxItem
  ): Promise<'CONFIRMED' | 'CONFLICTED' | 'RETRY'> {
    const store = useBookingStore.getState();

    // 1. Set to SYNCING state
    store.updateOutboxItem(item.id, {
      status: 'SYNCING',
      attemptCount: item.attemptCount + 1,
    });

    try {
      if (item.type === 'CREATE_BOOKING') {
        const req = item.payload as BookingRequest;
        const result = await bookingService.bookSlot(req);

        if (result.success && result.booking) {
          // A. Success -> Mark CONFIRMED
          store.updateOutboxItem(item.id, { status: 'CONFIRMED' });

          // Schedule local notification 15m before slot start
          let notificationId: string | null = null;
          if (this.notificationDelegate) {
            try {
              notificationId = await this.notificationDelegate.scheduleSlotReminder(result.booking);
            } catch (e) {
              console.warn('Failed to schedule notification on sync:', e);
            }
          }

          // Replace or update pending booking in store
          const pendingBooking = store.myBookings.find(
            (b) => b.idempotencyKey === item.idempotencyKey
          );

          if (pendingBooking) {
            store.updateBooking(pendingBooking.id, {
              id: result.booking.id,
              status: 'CONFIRMED',
              notificationId: notificationId || undefined,
              updatedAt: new Date().toISOString(),
            });
          } else {
            store.addBooking({
              ...result.booking,
              notificationId: notificationId || undefined,
            });
          }

          return 'CONFIRMED';
        } else {
          // B. Server rejected (SLOT_ALREADY_BOOKED or Quota Error) -> Mark CONFLICTED
          const errorMsg =
            result.errorMessage || result.errorCode || 'Conflict during sync';

          store.updateOutboxItem(item.id, {
            status: 'CONFLICTED',
            lastError: errorMsg,
          });

          // Mark corresponding client booking as CONFLICTED
          const pendingBooking = store.myBookings.find(
            (b) => b.idempotencyKey === item.idempotencyKey
          );
          if (pendingBooking) {
            store.updateBooking(pendingBooking.id, {
              status: 'CONFLICTED',
              updatedAt: new Date().toISOString(),
            });
          }

          // Trigger immediate local conflict notification alert
          if (this.notificationDelegate) {
            try {
              await this.notificationDelegate.notifyBookingConflict(
                pendingBooking?.roomName || 'Study Room',
                item.bookingDate,
                `Slot ${item.slotIndex + 1}`
              );
            } catch (e) {
              console.warn('Failed to fire conflict notification:', e);
            }
          }

          return 'CONFLICTED';
        }
      } else if (item.type === 'CANCEL_BOOKING') {
        const { bookingId, studentId } = item.payload as {
          bookingId: string;
          studentId: string;
        };
        const result = await bookingService.cancelBooking(bookingId, studentId);

        if (result.success) {
          store.updateOutboxItem(item.id, { status: 'CONFIRMED' });
          store.updateBooking(bookingId, { status: 'CANCELLED' });
          return 'CONFIRMED';
        } else {
          store.updateOutboxItem(item.id, {
            status: 'FAILED',
            lastError: result.error || 'Failed to cancel',
          });
          return 'CONFLICTED';
        }
      }

      return 'CONFIRMED';
    } catch (networkError: any) {
      // Revert to PENDING_SYNC for retry on network failure
      console.warn('[SyncService] Network drop during mutation, will retry:', networkError);
      store.updateOutboxItem(item.id, {
        status: 'PENDING_SYNC',
        lastError: networkError?.message || 'Network failure',
      });
      return 'RETRY';
    }
  }
}

export const syncService = new SyncService();
