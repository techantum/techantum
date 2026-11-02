import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 } as const;

export function hashPassword(password: string, salt = randomBytes(16).toString('hex')) {
  const derived = scryptSync(password, salt, SCRYPT.keylen, {
    N: SCRYPT.N,
    r: SCRYPT.r,
    p: SCRYPT.p,
  }).toString('hex');
  return `$scrypt$N=${SCRYPT.N},r=${SCRYPT.r},p=${SCRYPT.p}$${salt}$${derived}`;
}

export function verifyPassword(password: string, encoded: string) {
  const parts = encoded.split('$');
  if (parts.length < 5 || parts[1] !== 'scrypt') return false;
  const salt = parts[3];
  const expected = parts[4];
  const derived = scryptSync(password, salt, SCRYPT.keylen, {
    N: SCRYPT.N,
    r: SCRYPT.r,
    p: SCRYPT.p,
  }).toString('hex');
  try {
    return timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

export function sha256(input: string) {
  return createHash('sha256').update(input).digest('hex');
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString('hex');
}
