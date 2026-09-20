import { IRealtimeService, RealtimeCallback } from '../types';
import { SlotIndex } from '../../types/slot';

type SubscriptionKey = string; // "roomId:date"

interface RealtimeEvent {
  type: 'BOOKING_CREATED' | 'BOOKING_CANCELLED' | 'HOLD_CREATED' | 'HOLD_EXPIRED';
  roomId: string;
  date: string;
  slotIndex: SlotIndex;
  studentId: string;
}

export class MockRealtimeService implements IRealtimeService {
  private subscribers: Map<SubscriptionKey, Set<RealtimeCallback>> = new Map();

  private getKey(roomId: string, date: string): SubscriptionKey {
    return `${roomId}:${date}`;
  }

  subscribeToRoomDate(
    roomId: string,
    date: string,
    callback: RealtimeCallback
  ): () => void {
    const key = this.getKey(roomId, date);
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(callback);

    return () => {
      const set = this.subscribers.get(key);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.subscribers.delete(key);
        }
      }
    };
  }

  emit(event: RealtimeEvent): void {
    const key = this.getKey(event.roomId, event.date);
    const listeners = this.subscribers.get(key);
    if (listeners) {
      listeners.forEach((cb) => {
        try {
          cb(event);
        } catch (e) {
          console.error('[MockRealtime] Error executing subscriber callback', e);
        }
      });
    }
  }

  simulateRemoteBooking(
    roomId: string,
    date: string,
    slotIndex: SlotIndex,
    otherStudentId: string = 'student-remote-demo'
  ): void {
    this.emit({
      type: 'BOOKING_CREATED',
      roomId,
      date,
      slotIndex,
      studentId: otherStudentId,
    });
  }
}

export const mockRealtimeService = new MockRealtimeService();
