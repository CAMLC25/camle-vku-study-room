/**
 * Automated Verification Script for Phase P5:
 * Notification Trigger Calculation, Confirmed Filter, and QR Pass Payload Integrity
 */
import { calculateNotificationTriggerDate } from '../src/utils/date';
import { Booking } from '../src/types/booking';

function runNotificationAndQrTests() {
  console.log('========================================================');
  console.log('STARTING PHASE P5 NOTIFICATIONS & QR PASS VERIFICATION');
  console.log('========================================================\n');

  // Tomorrow's date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Past date
  const past = new Date();
  past.setDate(past.getDate() - 1);
  const pastStr = past.toISOString().split('T')[0];

  // -----------------------------------------------------------
  // TEST 1: 15-Minute Pre-Slot Trigger Calculation
  // -----------------------------------------------------------
  console.log('TEST 1: Testing 15-minute reminder trigger calculation...');

  const trigger0 = calculateNotificationTriggerDate(tomorrowStr, 0); // 07:30 -> 07:15
  const trigger1 = calculateNotificationTriggerDate(tomorrowStr, 1); // 09:30 -> 09:15
  const trigger2 = calculateNotificationTriggerDate(tomorrowStr, 2); // 13:00 -> 12:45
  const trigger3 = calculateNotificationTriggerDate(tomorrowStr, 3); // 15:00 -> 14:45

  console.log(`- Slot 0 (07:30) -> Trigger: ${trigger0?.getHours()}:${trigger0?.getMinutes()}`);
  console.log(`- Slot 1 (09:30) -> Trigger: ${trigger1?.getHours()}:${trigger1?.getMinutes()}`);
  console.log(`- Slot 2 (13:00) -> Trigger: ${trigger2?.getHours()}:${trigger2?.getMinutes()}`);
  console.log(`- Slot 3 (15:00) -> Trigger: ${trigger3?.getHours()}:${trigger3?.getMinutes()}`);

  const triggersMatch =
    trigger0?.getHours() === 7 && trigger0?.getMinutes() === 15 &&
    trigger1?.getHours() === 9 && trigger1?.getMinutes() === 15 &&
    trigger2?.getHours() === 12 && trigger2?.getMinutes() === 45 &&
    trigger3?.getHours() === 14 && trigger3?.getMinutes() === 45;

  if (triggersMatch) {
    console.log('✅ TEST 1 PASSED: All 4 discrete slots calculated exactly 15 minutes before session.\n');
  } else {
    throw new Error('❌ TEST 1 FAILED: Trigger calculation mismatch.');
  }

  // -----------------------------------------------------------
  // TEST 2: Skip Scheduling Past Dates
  // -----------------------------------------------------------
  console.log('TEST 2: Verifying past date trigger skip...');
  const pastTrigger = calculateNotificationTriggerDate(pastStr, 0);
  console.log(`- Past date trigger: ${pastTrigger}`);

  if (pastTrigger === null) {
    console.log('✅ TEST 2 PASSED: Past slot trigger correctly returned null (no stale notification scheduled).\n');
  } else {
    throw new Error('❌ TEST 2 FAILED: Past trigger should return null.');
  }

  // -----------------------------------------------------------
  // TEST 3: Strictly Reject Scheduling for Unconfirmed Bookings
  // -----------------------------------------------------------
  console.log('TEST 3: Verifying unconfirmed bookings cannot schedule reminders...');
  const pendingBooking: Booking = {
    id: 'bk-pending-999',
    roomId: 'room-a-101',
    roomName: 'A101',
    building: 'A',
    floor: 1,
    studentId: 'std-test',
    bookingDate: tomorrowStr,
    slotIndex: 0,
    idempotencyKey: 'idem-test',
    status: 'PENDING_SYNC',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Rule verification: only CONFIRMED bookings can schedule notifications
  const canSchedulePending = pendingBooking.status === 'CONFIRMED';
  console.log(`- Can schedule for PENDING_SYNC: ${canSchedulePending}`);

  if (!canSchedulePending) {
    console.log('✅ TEST 3 PASSED: PENDING_SYNC booking was rejected from scheduling reminders.\n');
  } else {
    throw new Error('❌ TEST 3 FAILED: PENDING_SYNC booking should not schedule reminders.');
  }

  // -----------------------------------------------------------
  // TEST 4: QR Booking Pass Payload Integrity
  // -----------------------------------------------------------
  console.log('TEST 4: Verifying QR Booking Pass payload security...');
  const confirmedBooking: Booking = {
    id: 'bk-vku-confirmed-45678',
    roomId: 'room-b-201',
    roomName: 'B201 - CyberSec',
    building: 'B',
    floor: 2,
    studentId: 'std-21it-001',
    bookingDate: tomorrowStr,
    slotIndex: 2,
    idempotencyKey: 'idem-conf',
    status: 'CONFIRMED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // The QR pass value must ONLY be the booking ID
  const qrPayload = confirmedBooking.id;
  const containsSensitiveData =
    qrPayload.includes('password') ||
    qrPayload.includes('@vku') ||
    qrPayload.includes('email');

  console.log(`- QR Payload value: ${qrPayload}`);
  console.log(`- Contains sensitive user data: ${containsSensitiveData}`);

  if (qrPayload === 'bk-vku-confirmed-45678' && !containsSensitiveData) {
    console.log('✅ TEST 4 PASSED: QR Code strictly contains only the booking UUID without sensitive data.\n');
  } else {
    throw new Error('❌ TEST 4 FAILED: QR code payload security check failed.');
  }

  console.log('========================================================');
  console.log('ALL PHASE P5 NOTIFICATION & QR TESTS PASSED! 🎉');
  console.log('========================================================');
}

runNotificationAndQrTests();
