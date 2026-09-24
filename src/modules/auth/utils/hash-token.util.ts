import { createHash } from 'node:crypto';

// SHA-256, not argon2 — this hashes a high-entropy random token for O(1)
// Redis lookup/equality-check, not a low-entropy secret that needs slow KDF.
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
