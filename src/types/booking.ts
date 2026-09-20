import { SlotIndex } from './slot';

export type DatabaseBookingStatus = 'active' | 'cancelled' | 'conflicted';

export type ClientBookingStatus =
  | 'CONFIRMED'
  | 'PENDING_SYNC'
  | 'CONFLICTED'
  | 'CANCELLED'
  | 'MINE';

export interface Booking {
  id: string;
  roomId: string;
  roomName: string;
  building: string;
  floor: number;
  studentId: string;
  studentName?: string;
  bookingDate: string; // ISO 'YYYY-MM-DD'
  slotIndex: SlotIndex;
  idempotencyKey: string;
  status: ClientBookingStatus;
  notificationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingRequest {
  roomId: string;
  bookingDate: string;
  slotIndex: SlotIndex;
  studentId: string;
  idempotencyKey: string;
}

export interface BookingHold {
  id: string;
  roomId: string;
  bookingDate: string;
  slotIndex: SlotIndex;
  studentId: string;
  createdAt: string;
  expiresAt: string;
  status: 'active' | 'expired' | 'converted';
}

export interface BookingResult {
  success: boolean;
  booking?: Booking;
  isReplay?: boolean;
  errorCode?: string;
  errorMessage?: string;
}
