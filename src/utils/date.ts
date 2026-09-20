/**
 * Date utility functions for VKU Study Room Booking
 * Handles 7-day rolling booking horizon and ISO date formatting
 */

export interface DayOption {
  dateString: string; // ISO 'YYYY-MM-DD'
  dayOfWeek: string;  // 'Mon', 'Tue', etc.
  dayOfMonth: number; // 21, 22, etc.
  isToday: boolean;
  label: string;      // 'Today', 'Tomorrow', 'Wed 23', etc.
}

/**
 * Generates the strictly allowed 7-day booking horizon starting from today
 */
export function getBookingHorizonDays(baseDate: Date = new Date()): DayOption[] {
  const days: DayOption[] = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 0; i < 7; i++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${date}`;

    const isToday = i === 0;
    const isTomorrow = i === 1;

    let label = `${dayNames[d.getDay()]} ${d.getDate()}`;
    if (isToday) label = 'Today';
    else if (isTomorrow) label = 'Tomorrow';

    days.push({
      dateString,
      dayOfWeek: dayNames[d.getDay()],
      dayOfMonth: d.getDate(),
      isToday,
      label,
    });
  }

  return days;
}

/**
 * Returns today's ISO date string 'YYYY-MM-DD'
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const date = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

/**
 * Checks if a date string is within the valid 7-day horizon
 */
export function isWithinBookingHorizon(dateStr: string, baseDate: Date = new Date()): boolean {
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  target.setHours(0, 0, 0, 0);

  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  return target >= start && target <= end;
}

/**
 * Formats an ISO date string to a human-friendly format
 * e.g., '2026-09-21' -> 'Thứ Hai, 21/09/2026' (vi) or 'Monday, 21 Sep 2026' (en)
 */
export function formatDisplayDate(dateStr: string, language: 'vi' | 'en' = 'vi'): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    if (language === 'vi') {
      const daysVi = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      return `${daysVi[d.getDay()]}, ${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    }
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return `${days[d.getDay()]}, ${day} ${months[month - 1]} ${year}`;
  } catch {
    return dateStr;
  }
}

/**
 * Calculates local notification trigger date 15 minutes before slot start:
 * Slot 0 (07:30) -> 07:15
 * Slot 1 (09:30) -> 09:15
 * Slot 2 (13:00) -> 12:45
 * Slot 3 (15:00) -> 14:45
 * Returns null if the trigger date is already in the past.
 */
export function calculateNotificationTriggerDate(
  bookingDate: string,
  slotIndex: number,
  nowTime: number = Date.now()
): Date | null {
  const slotTimes: Record<number, { hours: number; minutes: number }> = {
    0: { hours: 7, minutes: 15 },
    1: { hours: 9, minutes: 15 },
    2: { hours: 12, minutes: 45 },
    3: { hours: 14, minutes: 45 },
  };

  const targetTime = slotTimes[slotIndex];
  if (!targetTime) return null;

  const [year, month, day] = bookingDate.split('-').map(Number);
  const triggerDate = new Date(year, month - 1, day, targetTime.hours, targetTime.minutes, 0);

  // If trigger time has already elapsed, skip
  if (triggerDate.getTime() <= nowTime) {
    return null;
  }

  return triggerDate;
}
