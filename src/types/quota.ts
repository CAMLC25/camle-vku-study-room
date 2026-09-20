export interface QuotaConfig {
  maxDailySlots: number;      // 2 slots
  maxWeeklySlots: number;     // 6 slots
  maxActiveFutureBookings: number; // 3 bookings
}

export const VKU_QUOTA_LIMITS: QuotaConfig = {
  maxDailySlots: 2,
  maxWeeklySlots: 6,
  maxActiveFutureBookings: 3,
};

export interface StudentQuotaUsage {
  studentId: string;
  dailyUsage: number;
  weeklyUsage: number;
  activeFutureCount: number;
  dailyRemaining: number;
  weeklyRemaining: number;
  activeFutureRemaining: number;
}
