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
  const errorMsg = String(
    rawError?.message ||
    rawError?.errorMessage ||
    rawError?.errorCode ||
    rawError ||
    ''
  );
  const errorCode = String(rawError?.code || rawError?.errorCode || '');

  // 1. PostgreSQL 23505 Unique Violation or direct domain error
  if (
    errorCode === '23505' ||
    errorCode === 'SLOT_ALREADY_BOOKED' ||
    errorMsg.includes('23505') ||
    errorMsg.includes('SLOT_ALREADY_BOOKED') ||
    errorMsg.includes('already booked') ||
    errorMsg.includes('taken by another')
  ) {
    return {
      code: 'SLOT_ALREADY_BOOKED',
      title: 'Ca học không khả dụng',
      message: 'Ca học này vừa có sinh viên khác đặt trước.',
    };
  }

  // 2. Soft Hold Conflict
  if (
    errorCode === 'SLOT_HELD_BY_OTHER' ||
    errorMsg.includes('SLOT_HELD_BY_OTHER') ||
    errorMsg.includes('held by other')
  ) {
    return {
      code: 'SLOT_HELD_BY_OTHER',
      title: 'Ca đang được giữ chỗ',
      message: 'Một sinh viên khác đang mở màn hình xác nhận trong 90 giây. Vui lòng thử lại sau giây lát.',
    };
  }

  // 3. Quotas
  if (
    errorCode === 'DAILY_QUOTA_EXCEEDED' ||
    errorMsg.includes('DAILY_QUOTA_EXCEEDED') ||
    errorMsg.includes('daily booking limit') ||
    errorMsg.includes('daily quota')
  ) {
    return {
      code: 'DAILY_QUOTA_EXCEEDED',
      title: 'Hết hạn mức trong ngày',
      message: 'Bạn đã đạt giới hạn mượn phòng trong ngày (tối đa 2 ca/ngày).',
    };
  }

  if (
    errorCode === 'WEEKLY_QUOTA_EXCEEDED' ||
    errorMsg.includes('WEEKLY_QUOTA_EXCEEDED') ||
    errorMsg.includes('weekly booking limit')
  ) {
    return {
      code: 'WEEKLY_QUOTA_EXCEEDED',
      title: 'Hết hạn mức trong tuần',
      message: 'Bạn đã đạt giới hạn mượn phòng trong tuần (tối đa 6 ca/tuần).',
    };
  }

  if (
    errorCode === 'ACTIVE_BOOKING_LIMIT_EXCEEDED' ||
    errorMsg.includes('ACTIVE_BOOKING_LIMIT_EXCEEDED') ||
    errorMsg.includes('maximum allowed active')
  ) {
    return {
      code: 'ACTIVE_BOOKING_LIMIT_EXCEEDED',
      title: 'Đạt giới hạn ca đặt trước',
      message: 'Bạn đã đạt tối đa số ca đặt trước đồng thời (tối đa 3 ca đang chờ).',
    };
  }

  // 4. Horizon
  if (
    errorCode === 'OUTSIDE_BOOKING_HORIZON' ||
    errorMsg.includes('OUTSIDE_BOOKING_HORIZON') ||
    errorMsg.includes('7-day')
  ) {
    return {
      code: 'OUTSIDE_BOOKING_HORIZON',
      title: 'Ngoài phạm vi đặt phòng',
      message: 'Chỉ được phép đặt phòng trong phạm vi 7 ngày tới.',
    };
  }

  // 5. Hold Expired
  if (
    errorCode === 'HOLD_EXPIRED' ||
    errorMsg.includes('HOLD_EXPIRED') ||
    errorMsg.includes('hold expired')
  ) {
    return {
      code: 'HOLD_EXPIRED',
      title: 'Hết thời gian giữ chỗ',
      message: 'Thời gian giữ chỗ tạm thời 90 giây đã kết thúc. Vui lòng chọn lại.',
    };
  }

  // 6. Network
  if (
    errorCode === 'NETWORK_ERROR' ||
    errorMsg.includes('Network') ||
    errorMsg.includes('Failed to fetch')
  ) {
    return {
      code: 'NETWORK_ERROR',
      title: 'Lỗi kết nối mạng',
      message: 'Không thể kết nối đến máy chủ nhà trường. Vui lòng kiểm tra kết nối internet.',
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    title: 'Lỗi đặt phòng',
    message: rawError?.errorMessage || rawError?.message || 'Có lỗi xảy ra khi xử lý đặt phòng. Vui lòng thử lại.',
  };
}
