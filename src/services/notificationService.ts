import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Booking } from '../types/booking';
import { SlotIndex, TIME_SLOT_DEFINITIONS } from '../types/slot';
import { calculateNotificationTriggerDate } from '../utils/date';

// Configure how notifications should be handled when app is in foreground
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export class NotificationService {
  private isInitialized = false;

  /**
   * Initializes notification channels for Android
   */
  async init(): Promise<void> {
    if (this.isInitialized || Platform.OS === 'web') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('vku-study-room-reminders', {
        name: 'Study Room Booking Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0284c7',
        sound: 'default',
      });
    }

    this.isInitialized = true;
  }

  /**
   * Requests permission to display notifications gracefully
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      return finalStatus === 'granted';
    } catch (e) {
      console.warn('Failed to check or request notification permissions', e);
      return false;
    }
  }

  /**
   * Calculates trigger date 15 minutes before slot start:
   * Slot 0 (07:30) -> 07:15
   * Slot 1 (09:30) -> 09:15
   * Slot 2 (13:00) -> 12:45
   * Slot 3 (15:00) -> 14:45
   * Returns null if trigger date is already in the past
   */
  calculateTriggerDate(bookingDate: string, slotIndex: SlotIndex): Date | null {
    return calculateNotificationTriggerDate(bookingDate, slotIndex);
  }

  /**
   * Schedules a 15-minute pre-slot reminder for a CONFIRMED booking
   */
  async scheduleSlotReminder(booking: Booking): Promise<string | null> {
    // Strictly do not schedule for unconfirmed bookings
    if (booking.status !== 'CONFIRMED') {
      return null;
    }

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      console.log('[NotificationService] Permission denied, skipping reminder schedule');
      return null;
    }

    await this.init();

    const triggerDate = this.calculateTriggerDate(booking.bookingDate, booking.slotIndex);
    if (!triggerDate) {
      console.log('[NotificationService] Trigger time is in the past, skipping reminder schedule');
      return null;
    }

    const slotDef = TIME_SLOT_DEFINITIONS[booking.slotIndex];

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Study Room Reminder',
          body: `Your booking for ${booking.roomName} (${slotDef?.label}) starts in 15 minutes.`,
          data: { bookingId: booking.id, roomId: booking.roomId },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
          channelId: 'vku-study-room-reminders',
        },
      });

      console.log(`[NotificationService] Scheduled reminder for ${booking.roomName} at ${triggerDate.toISOString()} (ID: ${notificationId})`);
      return notificationId;
    } catch (err) {
      console.warn('[NotificationService] Error scheduling notification:', err);
      return null;
    }
  }

  /**
   * Cancels a previously scheduled reminder
   */
  async cancelScheduledReminder(notificationId?: string): Promise<void> {
    if (!notificationId) return;
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log(`[NotificationService] Cancelled notification ${notificationId}`);
    } catch (e) {
      console.warn('[NotificationService] Error cancelling notification:', e);
    }
  }

  /**
   * Immediately notifies user of a conflict after offline reconnect
   */
  async notifyBookingConflict(roomName: string, date: string, slotLabel: string): Promise<void> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return;

    await this.init();

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Booking Conflict Occurred',
          body: `Your offline reservation for ${roomName} on ${date} (${slotLabel}) was taken by another student before reconnection.`,
          sound: 'default',
        },
        trigger: null, // trigger immediately
      });
    } catch (e) {
      console.warn('Failed to dispatch conflict notification', e);
    }
  }
}

export const notificationService = new NotificationService();
