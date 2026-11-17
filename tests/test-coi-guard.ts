import { checkConflictOfInterest, validateReviewerAssignments } from '@/lib/rbac/coiGuard';

async function testCoiGuard() {
  console.log('🛡️ Memulai Pengujian Conflict of Interest (COI) Guard...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  // Uji validasi input kosong/default deny
  const emptyCheck = await checkConflictOfInterest('', '');
  assert(emptyCheck.hasConflict === true, 'COI Guard menolak masukan kosong (Default Deny)');

  // Uji validasi reviewer assignments (slot range & duplikasi)
  const invalidSlotTest = await validateReviewerAssignments('dummy-prop-id', [
    { reviewer_id: 'rev-uuid-1', reviewer_slot: 4 }, // slot 4 > 3
  ]);
  assert(!invalidSlotTest.isValid && invalidSlotTest.errors.some(e => e.toLowerCase().includes('slot')), 'Slot > 3 ditolak');

  const duplicateSlotTest = await validateReviewerAssignments('dummy-prop-id', [
    { reviewer_id: 'rev-uuid-1', reviewer_slot: 1 },
    { reviewer_id: 'rev-uuid-2', reviewer_slot: 1 }, // duplikat slot 1
  ]);
  assert(!duplicateSlotTest.isValid && duplicateSlotTest.errors.some(e => e.includes('lebih dari satu kali')), 'Duplikasi slot reviewer ditolak');

  const duplicateReviewerTest = await validateReviewerAssignments('dummy-prop-id', [
    { reviewer_id: 'rev-uuid-same', reviewer_slot: 1 },
    { reviewer_id: 'rev-uuid-same', reviewer_slot: 2 }, // reviewer sama di dua slot
  ]);
  assert(!duplicateReviewerTest.isValid && duplicateReviewerTest.errors.some(e => e.includes('lebih dari satu slot')), 'Penelaah yang sama pada multiple slot ditolak');

  console.log(`\n========================================`);
  console.log(`Hasil Pengujian COI Guard: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

testCoiGuard().catch(console.error);
