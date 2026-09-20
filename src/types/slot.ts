export type SlotIndex = 0 | 1 | 2 | 3;

export interface TimeSlotDefinition {
  slotIndex: SlotIndex;
  startTime: string; // '07:30'
  endTime: string;   // '09:30'
  label: string;     // '07:30–09:30'
}

export const TIME_SLOT_DEFINITIONS: Record<SlotIndex, TimeSlotDefinition> = {
  0: { slotIndex: 0, startTime: '07:30', endTime: '09:30', label: '07:30–09:30' },
  1: { slotIndex: 1, startTime: '09:30', endTime: '11:30', label: '09:30–11:30' },
  2: { slotIndex: 2, startTime: '13:00', endTime: '15:00', label: '13:00–15:00' },
  3: { slotIndex: 3, startTime: '15:00', endTime: '17:00', label: '15:00–17:00' },
};

export type SlotState =
  | 'AVAILABLE'
  | 'BOOKED'
  | 'HELD_BY_OTHER'
  | 'MINE'
  | 'PENDING_SYNC';

export interface SlotAvailability {
  slotIndex: SlotIndex;
  state: SlotState;
  bookedByStudentId?: string;
  holdExpiresAt?: string;
  bookingId?: string;
}

export interface DayRoomAvailability {
  roomId: string;
  date: string; // ISO 'YYYY-MM-DD'
  slots: Record<SlotIndex, SlotAvailability>;
  lastUpdatedAt: string; // ISO string
}
