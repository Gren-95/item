import crypto from "crypto";

/**
 * Symmetric encryption for stored credentials (it_pc_pw).
 *
 * Algorithm: AES-256-GCM. Output format:
 *   "enc:v1:" + base64( iv(12) || ciphertext || authTag(16) )
 *
 * The "enc:v1:" prefix lets us detect legacy plaintext rows during the
 * one-shot migration and lets us add a v2 in the future without breaking
 * old data.
 *
 * Key source: PC_PW_ENCRYPTION_KEY env var. Either 64 hex chars (raw 32
 * bytes) or any string of length >= 32, which we hash to 32 bytes.
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const ENCRYPTED_PREFIX = "enc:v1:";

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.PC_PW_ENCRYPTION_KEY || "";
  if (!raw) {
    throw new Error(
      "PC_PW_ENCRYPTION_KEY is not set. Generate one with `openssl rand -hex 32` and add it to your .env."
    );
  }
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    cachedKey = Buffer.from(raw, "hex");
  } else if (raw.length >= 32) {
    cachedKey = crypto.createHash("sha256").update(raw).digest();
  } else {
    throw new Error(
      "PC_PW_ENCRYPTION_KEY must be 64 hex chars (32 bytes raw) or a string of at least 32 characters."
    );
  }
  return cachedKey;
}

export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(ENCRYPTED_PREFIX);
}

export function encryptPassword(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const packed = Buffer.concat([iv, ciphertext, authTag]).toString("base64");
  return `${ENCRYPTED_PREFIX}${packed}`;
}

/**
 * Returns the plaintext for either an encrypted "enc:v1:..." string or a
 * legacy plaintext row (returned as-is). The legacy fallback exists so
 * the app keeps working between deploy and the one-shot migration.
 */
export function decryptPassword(stored: string): string {
  if (!isEncrypted(stored)) return stored;

  const key = getKey();
  const packed = Buffer.from(stored.slice(ENCRYPTED_PREFIX.length), "base64");
  if (packed.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error("Encrypted PC password has invalid length");
  }
  const iv = packed.subarray(0, IV_LENGTH);
  const authTag = packed.subarray(packed.length - AUTH_TAG_LENGTH);
  const ciphertext = packed.subarray(IV_LENGTH, packed.length - AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export function isCryptoConfigured(): boolean {
  try {
    getKey();
    return true;
  } catch {
    return false;
  }
}
