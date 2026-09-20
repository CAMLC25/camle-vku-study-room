const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const DEFAULT_STUDENT_UUID = '00000000-0000-0000-0000-000000000001';

/**
 * Validates whether a string is a standard UUID.
 */
export function isValidUuid(str: string | null | undefined): boolean {
  if (!str) return false;
  return UUID_REGEX.test(str.trim());
}

/**
 * Ensures that a student ID passed to PostgreSQL Stored Procedures is always
 * a strictly valid UUID. If a student code (e.g. '21IT001') or corrupted cache is passed,
 * it safely falls back to the seeded student UUID.
 */
export function ensureStudentUuid(studentId: string | null | undefined): string {
  if (studentId && isValidUuid(studentId)) {
    return studentId.trim();
  }
  return DEFAULT_STUDENT_UUID;
}
