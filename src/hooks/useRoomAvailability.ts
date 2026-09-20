import { useEffect, useState, useCallback, useRef } from 'react';
import { useBookingStore } from '../store/useBookingStore';
import { bookingService } from '../services/bookingService';
import { realtimeService } from '../services/realtimeService';
import { DayRoomAvailability, SlotAvailability, SlotIndex } from '../types/slot';

const DEFAULT_SLOTS: Record<SlotIndex, SlotAvailability> = {
  0: { slotIndex: 0, state: 'AVAILABLE' },
  1: { slotIndex: 1, state: 'AVAILABLE' },
  2: { slotIndex: 2, state: 'AVAILABLE' },
  3: { slotIndex: 3, state: 'AVAILABLE' },
};

export function useRoomAvailability(roomId: string, date: string) {
  const currentStudentId = useBookingStore((state) => state.currentStudentId);
  const cacheKey = `${roomId}:${date}`;
  const cachedAvailability = useBookingStore(
    (state) => state.availabilityCache[cacheKey]
  );
  const setCachedAvailability = useBookingStore(
    (state) => state.setCachedAvailability
  );

  const [isLoading, setIsLoading] = useState<boolean>(!cachedAvailability);
  const [error, setError] = useState<string | null>(null);

  // Fallback to cached slots if available, otherwise default
  const [availability, setAvailability] = useState<DayRoomAvailability>(
    cachedAvailability || {
      roomId,
      date,
      slots: DEFAULT_SLOTS,
      lastUpdatedAt: new Date().toISOString(),
    }
  );

  const isMounted = useRef(true);

  const fetchFreshAvailability = useCallback(async () => {
    if (!roomId || !date) return;
    try {
      const fresh = await bookingService.getAvailability(
        roomId,
        date,
        currentStudentId
      );
      if (isMounted.current) {
        setAvailability(fresh);
        setCachedAvailability(roomId, date, fresh);
        setIsLoading(false);
      }
    } catch (err: any) {
      if (isMounted.current) {
        setError(err?.message || 'Failed to fetch availability');
        setIsLoading(false);
      }
    }
  }, [roomId, date, currentStudentId, setCachedAvailability]);

  useEffect(() => {
    isMounted.current = true;
    setIsLoading(!cachedAvailability);
    setError(null);

    // 1. Initial fetch
    fetchFreshAvailability();

    // 2. Scoped Realtime Subscription per (roomId, date)
    const unsubscribe = realtimeService.subscribeToRoomDate(
      roomId,
      date,
      (event) => {
        console.log(`[Realtime] Event received for room ${roomId} on ${date}:`, event);
        // Refresh availability on any slot event
        fetchFreshAvailability();
      }
    );

    return () => {
      isMounted.current = false;
      unsubscribe();
    };
  }, [roomId, date, fetchFreshAvailability]);

  // Method to simulate remote booking (for mock demo & testing)
  const simulateRemoteBooking = useCallback(
    (slotIndex: SlotIndex) => {
      if (realtimeService.simulateRemoteBooking) {
        realtimeService.simulateRemoteBooking(
          roomId,
          date,
          slotIndex,
          'student-evaluator-sim'
        );
      }
    },
    [roomId, date]
  );

  return {
    availability,
    slots: availability.slots,
    isLoading,
    error,
    refresh: fetchFreshAvailability,
    simulateRemoteBooking,
  };
}
