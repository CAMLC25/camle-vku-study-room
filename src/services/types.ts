import { Room } from '../types/room';
import {
  Booking,
  BookingHold,
  BookingRequest,
  BookingResult,
} from '../types/booking';
import { DayRoomAvailability, SlotIndex } from '../types/slot';
import { StudentQuotaUsage } from '../types/quota';

export interface IRoomService {
  getRooms(): Promise<Room[]>;
  getRoomById(roomId: string): Promise<Room | null>;
}

export interface IBookingService {
  getAvailability(
    roomId: string,
    date: string,
    studentId: string
  ): Promise<DayRoomAvailability>;
  createHold(
    roomId: string,
    date: string,
    slotIndex: SlotIndex,
    studentId: string
  ): Promise<{ success: boolean; hold?: BookingHold; error?: string }>;
  releaseHold(holdId: string): Promise<void>;
  bookSlot(request: BookingRequest): Promise<BookingResult>;
  cancelBooking(
    bookingId: string,
    studentId: string
  ): Promise<{ success: boolean; error?: string }>;
  getMyBookings(studentId: string): Promise<Booking[]>;
  getStudentQuotaUsage(studentId: string, date?: string): Promise<StudentQuotaUsage>;
}

export type RealtimeCallback = (event: {
  type: 'BOOKING_CREATED' | 'BOOKING_CANCELLED' | 'HOLD_CREATED' | 'HOLD_EXPIRED';
  roomId: string;
  date: string;
  slotIndex: SlotIndex;
  studentId: string;
}) => void;

export interface IRealtimeService {
  subscribeToRoomDate(
    roomId: string,
    date: string,
    callback: RealtimeCallback
  ): () => void;
  simulateRemoteBooking?(
    roomId: string,
    date: string,
    slotIndex: SlotIndex,
    otherStudentId: string
  ): void;
}
