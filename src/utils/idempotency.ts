/**
 * Client-side Idempotency Key Generator (RFC 4122 v4 UUID compliant)
 * Generates a stable unique token attached to every booking mutation attempt
 */
export function generateIdempotencyKey(): string {
  // Use crypto.randomUUID if available in environment, fallback to robust v4 generator
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
