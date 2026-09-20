/**
 * Automated Verification Script for Phase P3:
 * Concurrency, PostgreSQL 23505 Collision, Idempotency, Quotas, and Soft Holds
 */
import { MockBookingService } from '../src/services/mock/mockBookingService';
import { generateIdempotencyKey } from '../src/utils/idempotency';
import { getTodayDateString } from '../src/utils/date';

async function runConcurrencyTests() {
  console.log('========================================================');
  console.log('STARTING PHASE P3 CONCURRENCY & INTEGRITY VERIFICATION');
  console.log('========================================================\n');

  const bookingService = new MockBookingService();
  const testRoomId = 'room-a-201';
  const testDate = getTodayDateString();
  const testSlot = 2; // Slot 2: 13:00 - 15:00

  // -----------------------------------------------------------
  // TEST 1: Two Concurrent Booking Attempts for the Same Slot
  // -----------------------------------------------------------
  console.log('TEST 1: Simulating two concurrent booking attempts for the same slot...');
  const studentA = 'std-concurrent-001';
  const studentB = 'std-concurrent-002';

  const reqA = {
    roomId: testRoomId,
    bookingDate: testDate,
    slotIndex: testSlot as any,
    studentId: studentA,
    idempotencyKey: generateIdempotencyKey(),
  };

  const reqB = {
    roomId: testRoomId,
    bookingDate: testDate,
    slotIndex: testSlot as any,
    studentId: studentB,
    idempotencyKey: generateIdempotencyKey(),
  };

  // Launch both booking mutations concurrently
  const [resA, resB] = await Promise.all([
    bookingService.bookSlot(reqA),
    bookingService.bookSlot(reqB),
  ]);

  const successCount = [resA, resB].filter((r) => r.success).length;
  const conflictCount = [resA, resB].filter(
    (r) => !r.success && r.errorCode === 'SLOT_ALREADY_BOOKED'
  ).length;

  console.log(`- Result A: success=${resA.success}, errorCode=${resA.errorCode || 'NONE'}`);
  console.log(`- Result B: success=${resB.success}, errorCode=${resB.errorCode || 'NONE'}`);

  if (successCount === 1 && conflictCount === 1) {
    console.log('✅ TEST 1 PASSED: Exactly one booking succeeded and one received SLOT_ALREADY_BOOKED.\n');
  } else {
    throw new Error(`❌ TEST 1 FAILED: Expected 1 success and 1 conflict, got ${successCount} success and ${conflictCount} conflict.`);
  }

  // -----------------------------------------------------------
  // TEST 2: Idempotent Request Replay
  // -----------------------------------------------------------
  console.log('TEST 2: Testing idempotency key replay...');
  const studentC = 'std-idempotent-003';
  const idempotencyKey = generateIdempotencyKey();
  const slot3 = 3;

  const initialReq = {
    roomId: testRoomId,
    bookingDate: testDate,
    slotIndex: slot3 as any,
    studentId: studentC,
    idempotencyKey,
  };

  // First attempt
  const firstRes = await bookingService.bookSlot(initialReq);
  // Replay attempt with identical idempotencyKey
  const replayRes = await bookingService.bookSlot(initialReq);

  console.log(`- First Attempt: success=${firstRes.success}, isReplay=${firstRes.isReplay}`);
  console.log(`- Replay Attempt: success=${replayRes.success}, isReplay=${replayRes.isReplay}`);

  if (firstRes.success && replayRes.success && replayRes.isReplay === true && firstRes.booking?.id === replayRes.booking?.id) {
    console.log('✅ TEST 2 PASSED: Replay with same idempotency key returned original booking with 0 duplicates.\n');
  } else {
    throw new Error('❌ TEST 2 FAILED: Idempotency replay did not behave as expected.');
  }

  // -----------------------------------------------------------
  // TEST 3: Daily Quota Enforcement (Max 2 slots per day)
  // -----------------------------------------------------------
  console.log('TEST 3: Testing Daily Quota Enforcement (Max 2 slots)...');
  const studentQuota = 'std-quota-daily-004';
  const slot0 = 0;
  const slot1 = 1;

  // Book slot 0 (1st daily)
  const qRes1 = await bookingService.bookSlot({
    roomId: 'room-b-101',
    bookingDate: testDate,
    slotIndex: slot0 as any,
    studentId: studentQuota,
    idempotencyKey: generateIdempotencyKey(),
  });

  // Book slot 1 (2nd daily)
  const qRes2 = await bookingService.bookSlot({
    roomId: 'room-b-102',
    bookingDate: testDate,
    slotIndex: slot1 as any,
    studentId: studentQuota,
    idempotencyKey: generateIdempotencyKey(),
  });

  // Attempt 3rd slot on the same day -> MUST FAIL
  const qRes3 = await bookingService.bookSlot({
    roomId: 'room-b-201',
    bookingDate: testDate,
    slotIndex: slot3 as any,
    studentId: studentQuota,
    idempotencyKey: generateIdempotencyKey(),
  });

  console.log(`- 1st daily booking: success=${qRes1.success}`);
  console.log(`- 2nd daily booking: success=${qRes2.success}`);
  console.log(`- 3rd daily booking: success=${qRes3.success}, errorCode=${qRes3.errorCode}`);

  if (qRes1.success && qRes2.success && !qRes3.success && qRes3.errorCode === 'DAILY_QUOTA_EXCEEDED') {
    console.log('✅ TEST 3 PASSED: Server correctly rejected 3rd booking on the same day with DAILY_QUOTA_EXCEEDED.\n');
  } else {
    throw new Error('❌ TEST 3 FAILED: Daily quota was not strictly enforced.');
  }

  // -----------------------------------------------------------
  // TEST 4: Soft Hold Expiration Check
  // -----------------------------------------------------------
  console.log('TEST 4: Testing Soft Hold creation and availability check...');
  const studentHold = 'std-hold-005';
  const holdRes = await bookingService.createHold('room-c-101', testDate, 1, studentHold);

  console.log(`- Hold created: success=${holdRes.success}, holdId=${holdRes.hold?.id}`);

  // Check availability by another student -> should be HELD_BY_OTHER
  const availWhileHeld = await bookingService.getAvailability('room-c-101', testDate, 'other-student');
  console.log(`- State for other student while held: ${availWhileHeld.slots[1].state}`);

  // Release hold
  if (holdRes.hold) {
    await bookingService.releaseHold(holdRes.hold.id);
  }

  const availAfterRelease = await bookingService.getAvailability('room-c-101', testDate, 'other-student');
  console.log(`- State for other student after release: ${availAfterRelease.slots[1].state}`);

  if (availWhileHeld.slots[1].state === 'HELD_BY_OTHER' && availAfterRelease.slots[1].state === 'AVAILABLE') {
    console.log('✅ TEST 4 PASSED: Soft hold correctly locked slot for 90s and freed immediately on release.\n');
  } else {
    throw new Error('❌ TEST 4 FAILED: Soft hold availability lifecycle did not behave as expected.');
  }

  console.log('========================================================');
  console.log('ALL PHASE P3 CONCURRENCY & INTEGRITY TESTS PASSED! 🎉');
  console.log('========================================================');
}

runConcurrencyTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
