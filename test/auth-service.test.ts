import { mockAuthService } from '../src/services/mock/mockAuthService';
import { useAuthStore } from '../src/store/useAuthStore';
import { useBookingStore } from '../src/store/useBookingStore';

async function runAuthTests() {
  console.log('========================================================');
  console.log('STARTING SUB-PHASE AUTH-1 INTEGRATION & UNIT TESTS');
  console.log('========================================================\n');

  // TEST 1: Login with pre-seeded student account
  console.log('TEST 1: Logging in with valid pre-seeded student account...');
  const loginRes = await mockAuthService.signIn({
    email: 'anv.21it@vku.udn.vn',
    password: '123456',
  });

  if (!loginRes.success || !loginRes.user || !loginRes.session) {
    throw new Error(`❌ TEST 1 FAILED: Could not sign in. Error: ${loginRes.error}`);
  }
  if (loginRes.user.studentCode !== '21IT001' || loginRes.user.fullName !== 'Nguyễn Văn A') {
    throw new Error('❌ TEST 1 FAILED: User details do not match pre-seeded account.');
  }
  console.log(`- Logged in as: ${loginRes.user.fullName} (${loginRes.user.studentCode})`);

  // Also test login by student code (MSSV) instead of email
  const loginByCodeRes = await mockAuthService.signIn({
    email: '21IT001',
    password: '123456',
  });
  if (!loginByCodeRes.success || loginByCodeRes.user?.studentCode !== '21IT001') {
    throw new Error('❌ TEST 1 FAILED: Could not sign in using MSSV directly.');
  }
  console.log('- Logged in using MSSV directly (21IT001)');
  console.log('✅ TEST 1 PASSED: Pre-seeded student login succeeded by both email and MSSV.\n');

  // TEST 2: Reject wrong password & nonexistent accounts
  console.log('TEST 2: Verifying credential rejection...');
  const wrongPassRes = await mockAuthService.signIn({
    email: 'anv.21it@vku.udn.vn',
    password: 'wrong-password',
  });
  if (wrongPassRes.success) {
    throw new Error('❌ TEST 2 FAILED: Wrong password should have been rejected.');
  }

  const nonexistentRes = await mockAuthService.signIn({
    email: 'unknown@vku.udn.vn',
    password: '123456',
  });
  if (nonexistentRes.success) {
    throw new Error('❌ TEST 2 FAILED: Nonexistent email should have been rejected.');
  }
  console.log('- Rejected incorrect password correctly');
  console.log('- Rejected nonexistent email correctly');
  console.log('✅ TEST 2 PASSED: Credential rejection verified.\n');

  // TEST 3: Register a new student account
  console.log('TEST 3: Registering a new student account...');
  const newStudentEmail = `test.student.${Date.now()}@vku.udn.vn`;
  const newStudentCode = `21IT${Math.floor(100 + Math.random() * 899)}`;
  const signUpRes = await mockAuthService.signUp({
    email: newStudentEmail,
    password: 'password123',
    studentCode: newStudentCode,
    fullName: 'Sinh Viên Mới',
    className: '21IT5',
  });

  if (!signUpRes.success || !signUpRes.user) {
    throw new Error(`❌ TEST 3 FAILED: Registration failed. Error: ${signUpRes.error}`);
  }
  if (signUpRes.user.studentCode !== newStudentCode) {
    throw new Error('❌ TEST 3 FAILED: Registered student code mismatch.');
  }
  console.log(`- Registered new student: ${signUpRes.user.fullName} (${signUpRes.user.studentCode})`);
  console.log('✅ TEST 3 PASSED: Registration succeeded with valid credentials.\n');

  // TEST 4: Reject duplicate registration
  console.log('TEST 4: Rejecting duplicate registration...');
  const duplicateRes = await mockAuthService.signUp({
    email: newStudentEmail,
    password: 'password123',
    studentCode: newStudentCode,
    fullName: 'Trùng Lặp',
    className: '21IT5',
  });
  if (duplicateRes.success) {
    throw new Error('❌ TEST 4 FAILED: Duplicate registration should have been rejected.');
  }
  console.log(`- Duplicate rejected with error: "${duplicateRes.error}"`);
  console.log('✅ TEST 4 PASSED: Duplicate account prevention verified.\n');

  // TEST 5: useAuthStore integration & booking store synchronization
  console.log('TEST 5: Testing useAuthStore actions and sync to useBookingStore...');
  const store = useAuthStore.getState();

  // Test store login
  const storeLoginRes = await store.login({
    email: 'btt.21it@vku.udn.vn',
    password: '123456',
  });
  if (!storeLoginRes.success) {
    throw new Error(`❌ TEST 5 FAILED: Store login failed: ${storeLoginRes.error}`);
  }

  const updatedAuthUser = useAuthStore.getState().user;
  if (!updatedAuthUser || updatedAuthUser.studentCode !== '21IT002') {
    throw new Error('❌ TEST 5 FAILED: useAuthStore did not update user state.');
  }

  // Verify sync to booking store
  const bookingState = useBookingStore.getState();
  if (
    bookingState.currentStudentId !== updatedAuthUser.id ||
    bookingState.currentStudentCode !== '21IT002' ||
    bookingState.currentStudentName !== 'Trần Thị B'
  ) {
    throw new Error('❌ TEST 5 FAILED: useBookingStore was not synchronized with logged in user.');
  }
  console.log(`- useAuthStore user: ${updatedAuthUser.fullName}`);
  console.log(`- useBookingStore synced studentId: ${bookingState.currentStudentId}`);
  console.log(`- useBookingStore synced studentCode: ${bookingState.currentStudentCode}`);

  // Test logout
  await useAuthStore.getState().logout();
  if (useAuthStore.getState().user !== null) {
    throw new Error('❌ TEST 5 FAILED: User was not cleared on logout.');
  }
  console.log('- Successfully logged out');
  console.log('✅ TEST 5 PASSED: useAuthStore and useBookingStore sync verified.\n');

  // TEST 6: switchDemoAccount and logout flow verification (AUTH-3)
  console.log('TEST 6: Testing switchDemoAccount and session restoration flow (AUTH-3)...');
  await useAuthStore.getState().switchDemoAccount({
    id: '00000000-0000-0000-0000-000000000003',
    code: '21IT003',
    name: 'Lê Văn C',
    className: '21IT3',
    email: 'clv.21it@vku.udn.vn',
  });

  const demoUser = useAuthStore.getState().user;
  const demoBooking = useBookingStore.getState();
  if (!demoUser || demoUser.studentCode !== '21IT003') {
    throw new Error('❌ TEST 6 FAILED: switchDemoAccount did not set user in useAuthStore.');
  }
  if (demoBooking.currentStudentCode !== '21IT003' || demoBooking.currentStudentName !== 'Lê Văn C') {
    throw new Error('❌ TEST 6 FAILED: switchDemoAccount did not sync to useBookingStore.');
  }
  console.log(`- Switched to demo account: ${demoUser.fullName} (${demoUser.studentCode})`);

  // Sign out
  await useAuthStore.getState().logout();
  if (useAuthStore.getState().user !== null || useAuthStore.getState().session !== null) {
    throw new Error('❌ TEST 6 FAILED: User session remained after sign out.');
  }
  console.log('- Verified user and session reset to null on logout');
  console.log('✅ TEST 6 PASSED: Demo account switching and logout flow verified.\n');

  console.log('========================================================');
  console.log('ALL AUTH INTEGRATION & NAVIGATION TESTS PASSED! 🎉');
  console.log('========================================================');
}

runAuthTests().catch((err) => {
  console.error('\n❌ AUTH-1 TEST SUITE FAILED:\n', err);
  process.exit(1);
});
