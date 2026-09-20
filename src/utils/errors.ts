export type DomainErrorCode =
  | 'SLOT_ALREADY_BOOKED'
  | 'SLOT_HELD_BY_OTHER'
  | 'DAILY_QUOTA_EXCEEDED'
  | 'WEEKLY_QUOTA_EXCEEDED'
  | 'ACTIVE_BOOKING_LIMIT_EXCEEDED'
  | 'OUTSIDE_BOOKING_HORIZON'
  | 'HOLD_EXPIRED'
  | 'STUDENT_NOT_FOUND'
  | 'NETWORK_ERROR'
  | 'OFFLINE'
  | 'UNKNOWN_ERROR';

export interface DomainError {
  code: DomainErrorCode;
  title: string;
  message: string;
}

export function mapErrorToDomain(rawError: any): DomainError {
  const errorMsg = String(rawError?.message || rawError?.errorCode || rawError || '');
  const errorCode = String(rawError?.code || rawError?.errorCode || '');

  // 1. PostgreSQL 23505 Unique Violation or direct domain error
  if (errorCode === '23505' || errorMsg.includes('23505') || errorMsg.includes('SLOT_ALREADY_BOOKED')) {
    return {
      code: 'SLOT_ALREADY_BOOKED',
      title: 'Slot Unavailable',
      message: 'This slot was just taken by another student.',
    };
  }

  // 2. Soft Hold Conflict
  if (errorMsg.includes('SLOT_HELD_BY_OTHER')) {
    return {
      code: 'SLOT_HELD_BY_OTHER',
      title: 'Slot Held',
      message: 'Another student is currently checking out this slot. Please try again shortly.',
    };
  }

  // 3. Quotas
  if (errorMsg.includes('DAILY_QUOTA_EXCEEDED')) {
    return {
      code: 'DAILY_QUOTA_EXCEEDED',
      title: 'Daily Limit Reached',
      message: 'You have reached your daily booking limit (maximum 2 slots per day).',
    };
  }

  if (errorMsg.includes('WEEKLY_QUOTA_EXCEEDED')) {
    return {
      code: 'WEEKLY_QUOTA_EXCEEDED',
      title: 'Weekly Limit Reached',
      message: 'You have reached your weekly booking limit (maximum 6 slots per week).',
    };
  }

  if (errorMsg.includes('ACTIVE_BOOKING_LIMIT_EXCEEDED')) {
    return {
      code: 'ACTIVE_BOOKING_LIMIT_EXCEEDED',
      title: 'Active Bookings Limit Reached',
      message: 'You have reached the maximum allowed active future bookings (maximum 3 bookings).',
    };
  }

  // 4. Horizon
  if (errorMsg.includes('OUTSIDE_BOOKING_HORIZON')) {
    return {
      code: 'OUTSIDE_BOOKING_HORIZON',
      title: 'Date Out of Range',
      message: 'Reservations are only permitted within the allowed 7-day window.',
    };
  }

  // 5. Hold Expired
  if (errorMsg.includes('HOLD_EXPIRED')) {
    return {
      code: 'HOLD_EXPIRED',
      title: 'Reservation Hold Expired',
      message: 'Your 90-second hold has timed out. Please select the slot again.',
    };
  }

  // 6. Network
  if (errorMsg.includes('Network') || errorMsg.includes('Failed to fetch') || errorCode === 'NETWORK_ERROR') {
    return {
      code: 'NETWORK_ERROR',
      title: 'Connection Issue',
      message: 'Unable to reach the campus server. Please check your internet connection.',
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    title: 'Booking Error',
    message: rawError?.errorMessage || rawError?.message || 'An unexpected error occurred while reserving this slot.',
  };
}
