/**
 * Unit tests for class occupancy calculation logic
 * Run: node tests/occupancy.test.js
 */

// ── Pure helper functions (mirrored from components) ─────────────────────────

function getCount(classId, reservations, visits) {
  return (
    reservations.filter((r) => r.class_id === classId).length +
    visits.filter((v) => v.class_id === classId).length
  );
}

function isFull(classId, capacity, reservations, visits) {
  return getCount(classId, reservations, visits) >= capacity;
}

function buildAttendanceSummary(classId, capacity, reservations, visits) {
  const rezCount = reservations.filter((r) => r.class_id === classId).length;
  const visitCount = visits.filter((v) => v.class_id === classId).length;
  const total = rezCount + visitCount;
  const parts = [];
  if (rezCount > 0) parts.push(`${rezCount} rez.`);
  if (visitCount > 0) parts.push(`${visitCount} günlük`);
  return {
    total,
    rezCount,
    visitCount,
    label: parts.length > 0 ? parts.join(" + ") : "kişi yok",
    isFull: total >= capacity,
  };
}

// ── Test runner ───────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(description, condition) {
  if (condition) {
    console.log(`  ✅  ${description}`);
    passed++;
  } else {
    console.error(`  ❌  ${description}`);
    failed++;
  }
}

function assertEqual(description, actual, expected) {
  const ok = actual === expected;
  if (ok) {
    console.log(`  ✅  ${description}`);
    passed++;
  } else {
    console.error(`  ❌  ${description}  →  expected: ${expected}, got: ${actual}`);
    failed++;
  }
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CLASS_A = "class-001";
const CLASS_B = "class-002";

const reservations = [
  { class_id: CLASS_A, status: "confirmed" },
  { class_id: CLASS_A, status: "confirmed" },
  { class_id: CLASS_A, status: "cancelled" }, // cancelled — should not count
  { class_id: CLASS_B, status: "confirmed" },
];

// Only confirmed reservations are pre-filtered before reaching these helpers
const confirmedReservations = reservations.filter((r) => r.status === "confirmed");

const visits = [
  { class_id: CLASS_A },
  { class_id: CLASS_B },
  { class_id: CLASS_B },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log("\n🧪  getCount");
assertEqual("CLASS_A: 2 rez + 1 visit = 3", getCount(CLASS_A, confirmedReservations, visits), 3);
assertEqual("CLASS_B: 1 rez + 2 visits = 3", getCount(CLASS_B, confirmedReservations, visits), 3);
assertEqual("Unknown class returns 0", getCount("class-999", confirmedReservations, visits), 0);
assertEqual("Empty arrays return 0", getCount(CLASS_A, [], []), 0);

console.log("\n🧪  isFull");
assert("CLASS_A full when capacity=3", isFull(CLASS_A, 3, confirmedReservations, visits));
assert("CLASS_A not full when capacity=4", !isFull(CLASS_A, 4, confirmedReservations, visits));
assert("CLASS_B full when capacity=3", isFull(CLASS_B, 3, confirmedReservations, visits));
assert("CLASS_B not full when capacity=10", !isFull(CLASS_B, 10, confirmedReservations, visits));
assert("Empty class never full", !isFull("class-999", 1, confirmedReservations, visits));

console.log("\n🧪  buildAttendanceSummary");

const summaryA = buildAttendanceSummary(CLASS_A, 3, confirmedReservations, visits);
assertEqual("CLASS_A total = 3", summaryA.total, 3);
assertEqual("CLASS_A rezCount = 2", summaryA.rezCount, 2);
assertEqual("CLASS_A visitCount = 1", summaryA.visitCount, 1);
assertEqual("CLASS_A label = '2 rez. + 1 günlük'", summaryA.label, "2 rez. + 1 günlük");
assert("CLASS_A isFull (cap=3)", summaryA.isFull);

const summaryB = buildAttendanceSummary(CLASS_B, 10, confirmedReservations, visits);
assertEqual("CLASS_B total = 3", summaryB.total, 3);
assertEqual("CLASS_B rezCount = 1", summaryB.rezCount, 1);
assertEqual("CLASS_B visitCount = 2", summaryB.visitCount, 2);
assertEqual("CLASS_B label = '1 rez. + 2 günlük'", summaryB.label, "1 rez. + 2 günlük");
assert("CLASS_B NOT full (cap=10)", !summaryB.isFull);

const summaryEmpty = buildAttendanceSummary("class-999", 5, confirmedReservations, visits);
assertEqual("Unknown class total = 0", summaryEmpty.total, 0);
assertEqual("Unknown class label = 'kişi yok'", summaryEmpty.label, "kişi yok");
assert("Unknown class NOT full", !summaryEmpty.isFull);

// Only visits, no reservations
const onlyVisits = buildAttendanceSummary(CLASS_A, 5, [], visits);
assertEqual("Only visits: label shows günlük only", onlyVisits.label, "1 günlük");
assertEqual("Only visits: total = 1", onlyVisits.total, 1);

// Only reservations, no visits
const onlyRez = buildAttendanceSummary(CLASS_A, 5, confirmedReservations, []);
assertEqual("Only rez: label shows rez. only", onlyRez.label, "2 rez.");
assertEqual("Only rez: total = 2", onlyRez.total, 2);

// ── Result ────────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(45)}`);
console.log(`  Total: ${passed + failed}  ✅ ${passed} passed  ❌ ${failed} failed`);
console.log(`${"─".repeat(45)}\n`);

if (failed > 0) throw new Error(`${failed} test(s) failed`);