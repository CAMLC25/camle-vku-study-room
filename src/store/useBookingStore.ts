import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Room, RoomFilterState } from '../types/room';
import { Booking, BookingHold } from '../types/booking';
import { DayRoomAvailability, SlotIndex } from '../types/slot';
import { BookingOutboxItem } from '../types/sync';
import { StudentQuotaUsage, VKU_QUOTA_LIMITS } from '../types/quota';
import { roomService } from '../services/roomService';
import { bookingService } from '../services/bookingService';
import { ENV } from '../config/environment';

interface BookingStoreState {
  // Student Context
  currentStudentId: string;
  currentStudentName: string;
  currentStudentCode: string;

  // Rooms & Filters
  rooms: Room[];
  isRoomsLoading: boolean;
  roomsError: string | null;
  roomsLastUpdatedAt: string | null;
  filters: RoomFilterState;

  // Selection
  selectedDate: string; // ISO 'YYYY-MM-DD'
  selectedRoomId: string | null;
  selectedSlotIndex: SlotIndex | null;

  // Cached Availability: key is "roomId:date"
  availabilityCache: Record<string, DayRoomAvailability>;

  // Bookings & Outbox
  myBookings: Booking[];
  activeHold: BookingHold | null;
  outbox: BookingOutboxItem[];

  // Quota
  quotaUsage: StudentQuotaUsage;

  // Actions
  fetchRooms: () => Promise<void>;
  setFilters: (filters: Partial<RoomFilterState>) => void;
  resetFilters: () => void;
  setSelectedDate: (date: string) => void;
  setSelectedRoomId: (roomId: string | null) => void;
  setSelectedSlotIndex: (slotIndex: SlotIndex | null) => void;
  setCachedAvailability: (roomId: string, date: string, availability: DayRoomAvailability) => void;
  setActiveHold: (hold: BookingHold | null) => void;
  addBooking: (booking: Booking) => void;
  updateBooking: (id: string, updates: Partial<Booking>) => void;
  setMyBookings: (bookings: Booking[]) => void;
  addToOutbox: (item: BookingOutboxItem) => void;
  updateOutboxItem: (id: string, updates: Partial<BookingOutboxItem>) => void;
  removeFromOutbox: (id: string) => void;
  setQuotaUsage: (usage: StudentQuotaUsage) => void;
  clearAllStorageAndReset: () => Promise<void>;
}

const memoryStorage = new Map<string, string>();

const safeAsyncStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      if (typeof window === 'undefined' && typeof (globalThis as any).nativeCallSyncHook === 'undefined') {
        return memoryStorage.get(name) || null;
      }
      return await AsyncStorage.getItem(name);
    } catch {
      return memoryStorage.get(name) || null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      if (typeof window === 'undefined' && typeof (globalThis as any).nativeCallSyncHook === 'undefined') {
        memoryStorage.set(name, value);
        return;
      }
      await AsyncStorage.setItem(name, value);
    } catch {
      memoryStorage.set(name, value);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      if (typeof window === 'undefined' && typeof (globalThis as any).nativeCallSyncHook === 'undefined') {
        memoryStorage.delete(name);
        return;
      }
      await AsyncStorage.removeItem(name);
    } catch {
      memoryStorage.delete(name);
    }
  },
};

const initialFilters: RoomFilterState = {
  searchQuery: '',
  building: 'ALL',
  capacityMin: 2,
  capacityMax: 20,
  selectedEquipment: [],
};

const getTodayIso = () => new Date().toISOString().split('T')[0];

export const useBookingStore = create<BookingStoreState>()(
  persist(
    (set, get) => ({
      currentStudentId: ENV.defaultStudentId,
      currentStudentName: ENV.defaultStudentName,
      currentStudentCode: ENV.defaultStudentCode,

      rooms: [],
      isRoomsLoading: false,
      roomsError: null,
      roomsLastUpdatedAt: null,
      filters: initialFilters,

      selectedDate: getTodayIso(),
      selectedRoomId: null,
      selectedSlotIndex: null,

      availabilityCache: {},
      myBookings: [],
      activeHold: null,
      outbox: [],

      quotaUsage: {
        studentId: ENV.defaultStudentId,
        dailyUsage: 0,
        weeklyUsage: 0,
        activeFutureCount: 0,
        dailyRemaining: VKU_QUOTA_LIMITS.maxDailySlots,
        weeklyRemaining: VKU_QUOTA_LIMITS.maxWeeklySlots,
        activeFutureRemaining: VKU_QUOTA_LIMITS.maxActiveFutureBookings,
      },

      fetchRooms: async () => {
        set({ isRoomsLoading: true, roomsError: null });
        try {
          const rooms = await roomService.getRooms();
          set({
            rooms,
            isRoomsLoading: false,
            roomsLastUpdatedAt: new Date().toISOString(),
          });
        } catch (error: any) {
          set({
            isRoomsLoading: false,
            roomsError: error?.message || 'Failed to load rooms',
          });
        }
      },

      setFilters: (newFilters) => {
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
        }));
      },

      resetFilters: () => {
        set({ filters: initialFilters });
      },

      setSelectedDate: (date) => {
        set({ selectedDate: date });
      },

      setSelectedRoomId: (roomId) => {
        set({ selectedRoomId: roomId });
      },

      setSelectedSlotIndex: (slotIndex) => {
        set({ selectedSlotIndex: slotIndex });
      },

      setCachedAvailability: (roomId, date, availability) => {
        set((state) => ({
          availabilityCache: {
            ...state.availabilityCache,
            [`${roomId}:${date}`]: availability,
          },
        }));
      },

      setActiveHold: (hold) => {
        set({ activeHold: hold });
      },

      addBooking: (booking) => {
        set((state) => ({
          myBookings: [booking, ...state.myBookings.filter((b) => b.id !== booking.id)],
        }));
      },

      updateBooking: (id, updates) => {
        set((state) => ({
          myBookings: state.myBookings.map((b) =>
            b.id === id ? { ...b, ...updates, updatedAt: new Date().toISOString() } : b
          ),
        }));
      },

      setMyBookings: (bookings) => {
        set({ myBookings: bookings });
      },

      addToOutbox: (item) => {
        set((state) => ({
          outbox: [...state.outbox.filter((o) => o.id !== item.id), item],
        }));
      },

      updateOutboxItem: (id, updates) => {
        set((state) => ({
          outbox: state.outbox.map((item) =>
            item.id === id
              ? { ...item, ...updates, updatedAt: new Date().toISOString() }
              : item
          ),
        }));
      },

      removeFromOutbox: (id) => {
        set((state) => ({
          outbox: state.outbox.filter((item) => item.id !== id),
        }));
      },

      setQuotaUsage: (usage) => {
        set({ quotaUsage: usage });
      },

      clearAllStorageAndReset: async () => {
        set({
          myBookings: [],
          activeHold: null,
          outbox: [],
          availabilityCache: {},
          quotaUsage: {
            studentId: get().currentStudentId,
            dailyUsage: 0,
            weeklyUsage: 0,
            activeFutureCount: 0,
            dailyRemaining: VKU_QUOTA_LIMITS.maxDailySlots,
            weeklyRemaining: VKU_QUOTA_LIMITS.maxWeeklySlots,
            activeFutureRemaining: VKU_QUOTA_LIMITS.maxActiveFutureBookings,
          },
        });
        if (typeof (bookingService as any).reset === 'function') {
          (bookingService as any).reset();
        }
      },
    }),
    {
      name: 'vku-booking-storage',
      storage: createJSONStorage(() => safeAsyncStorage),
      partialize: (state) => ({
        currentStudentId: state.currentStudentId,
        currentStudentName: state.currentStudentName,
        currentStudentCode: state.currentStudentCode,
        rooms: state.rooms,
        roomsLastUpdatedAt: state.roomsLastUpdatedAt,
        availabilityCache: state.availabilityCache,
        myBookings: state.myBookings,
        outbox: state.outbox,
      }),
    }
  )
);
