/**
 * Automated Verification Script for Phase P4:
 * Offline Booking Outbox, Sequential Synchronization & Reconnect Conflict Resolution
 */
import { useBookingStore } from '../src/store/useBookingStore';
import { useNetworkStore } from '../src/store/useNetworkStore';
import { outboxService } from '../src/services/outboxService';
import { syncService } from '../src/services/syncService';
import { bookingService } from '../src/services/bookingService';
import { generateIdempotencyKey } from '../src/utils/idempotency';
import { getTodayDateString } from '../src/utils/date';

async function runOfflineOutboxTest() {
  console.log('========================================================');
  console.log('STARTING PHASE P4 OFFLINE OUTBOX & CONFLICT RESOLUTION');
  console.log('========================================================\n');

  const testRoom = {
    id: 'room-v-201',
    name: 'V201 - Cross-Platform Lab',
    building: 'V',
    floor: 2,
  };
  const testDate = getTodayDateString();
  const testSlot = 1; // Slot 1: 09:30 - 11:30

  const studentA = 'std-offline-student-A';
  const studentB = 'std-online-student-B';

  // -----------------------------------------------------------
  // STEP 1: Student A goes offline and queues a booking
  // -----------------------------------------------------------
  console.log('STEP 1: Student A goes offline and attempts to book Slot 1...');
  useNetworkStore.getState().setNetworkState({ isConnected: false, isInternetReachable: false });

  const { outboxItem, pendingBooking } = outboxService.queueBooking(
    testRoom,
    testDate,
    testSlot as any,
    studentA
  );

  console.log(`- Queued outbox item ID: ${outboxItem.id}`);
  console.log(`- Outbox item initial status: ${outboxItem.status}`);
  console.log(`- Local client booking status: ${pendingBooking.status}`);

  if (outboxItem.status !== 'PENDING_SYNC' || pendingBooking.status !== 'PENDING_SYNC') {
    throw new Error('❌ FAILED: Offline booking must strictly start in PENDING_SYNC status!');
  }
  console.log('✅ STEP 1 PASSED: Booking saved to outbox as PENDING_SYNC without local confirmation.\n');

  // -----------------------------------------------------------
  // STEP 2: Another user (Student B) books the same slot online
  // -----------------------------------------------------------
  console.log('STEP 2: While Student A is offline, Student B reserves Slot 1 online...');
  const onlineBookingRes = await bookingService.bookSlot({
    roomId: testRoom.id,
    bookingDate: testDate,
    slotIndex: testSlot as any,
    studentId: studentB,
    idempotencyKey: generateIdempotencyKey(),
  });

  console.log(`- Student B booking result: success=${onlineBookingRes.success}, status=${onlineBookingRes.booking?.status}`);

  if (!onlineBookingRes.success || onlineBookingRes.booking?.status !== 'CONFIRMED') {
    throw new Error('❌ FAILED: Student B should have successfully booked the slot online.');
  }
  console.log('✅ STEP 2 PASSED: Student B confirmed the slot on the server.\n');

  // -----------------------------------------------------------
  // STEP 3: Student A reconnects and outbox flushes sequentially
  // -----------------------------------------------------------
  console.log('STEP 3: Student A reconnects to internet -> Sequential outbox flush triggered...');
  useNetworkStore.getState().setNetworkState({ isConnected: true, isInternetReachable: true });

  const flushResult = await syncService.flushOutboxSequentially();
  console.log(`- Outbox Flush summary: processed=${flushResult.processed}, confirmed=${flushResult.confirmed}, conflicted=${flushResult.conflicted}`);

  // Inspect the resulting state in store
  const store = useBookingStore.getState();
  const updatedOutboxItem = store.outbox.find((i) => i.id === outboxItem.id);
  const updatedBooking = store.myBookings.find((b) => b.idempotencyKey === outboxItem.idempotencyKey);

  console.log(`- Updated outbox status: ${updatedOutboxItem?.status}`);
  console.log(`- Updated outbox last error: ${updatedOutboxItem?.lastError}`);
  console.log(`- Updated local booking status: ${updatedBooking?.status}`);

  if (
    updatedOutboxItem?.status === 'CONFLICTED' &&
    updatedBooking?.status === 'CONFLICTED' &&
    flushResult.conflicted === 1
  ) {
    console.log('✅ STEP 3 PASSED: Sequential flush correctly detected conflict and marked CONFLICTED.\n');
  } else {
    throw new Error(
      `❌ FAILED: Expected CONFLICTED status on outbox & booking, got outbox=${updatedOutboxItem?.status}, booking=${updatedBooking?.status}`
    );
  }

  console.log('========================================================');
  console.log('ALL PHASE P4 OFFLINE & OUTBOX TESTS PASSED! 🎉');
  console.log('========================================================');
}

runOfflineOutboxTest().catch((err) => {
  console.error(err);
  process.exit(1);
});
