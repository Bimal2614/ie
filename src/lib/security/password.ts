import bcrypt from "bcryptjs";

/**
 * bcrypt work factor. 12 is the current industry baseline (~250ms/hash on
 * commodity hardware) — high enough to throttle offline cracking, low enough
 * to keep login responsive.
 */
const BCRYPT_COST = 12;

// A valid bcrypt hash of a throwaway value, computed once at module load. We
// compare against this when a login targets a non-existent account, so the
// response timing for "no such user" matches "wrong password" — closing the
// user-enumeration timing side channel.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", BCRYPT_COST);

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Burn equivalent CPU time when no user was found (anti-enumeration). */
export async function fakeVerify(plain: string): Promise<void> {
  await bcrypt.compare(plain, DUMMY_HASH);
}
