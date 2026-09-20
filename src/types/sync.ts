import { BookingRequest } from './booking';

export type OutboxOperationType = 'CREATE_BOOKING' | 'CANCEL_BOOKING';

export type OutboxItemStatus =
  | 'PENDING_SYNC'
  | 'SYNCING'
  | 'CONFIRMED'
  | 'CONFLICTED'
  | 'FAILED';

export interface BookingOutboxItem {
  id: string; // client uuid
  type: OutboxOperationType;
  payload: BookingRequest | { bookingId: string; studentId: string };
  roomId: string;
  bookingDate: string;
  slotIndex: number;
  idempotencyKey: string;
  status: OutboxItemStatus;
  attemptCount: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  lastOnlineAt: string | null;
}

export interface SyncState {
  isSyncing: boolean;
  lastSyncedAt: string | null;
  pendingCount: number;
}
