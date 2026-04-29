import { test, expect } from "@playwright/test";
import {
  encryptPassword,
  decryptPassword,
  isEncrypted,
} from "../src/utils/crypto";

// These tests assume PC_PW_ENCRYPTION_KEY is set in the environment the
// runner sees — docker-compose passes it through to the app container,
// which is where bun run test executes.

test.describe("PC password encryption (#75)", () => {
  test("round-trip returns the original plaintext", () => {
    const plain = "P@ssw0rd!_with-mixed.case 123";
    const cipher = encryptPassword(plain);
    expect(decryptPassword(cipher)).toBe(plain);
  });

  test("ciphertext is prefixed and detectable as encrypted", () => {
    const cipher = encryptPassword("anything");
    expect(cipher.startsWith("enc:v1:")).toBe(true);
    expect(isEncrypted(cipher)).toBe(true);
    expect(isEncrypted("anything")).toBe(false);
    expect(isEncrypted("")).toBe(false);
    expect(isEncrypted(null)).toBe(false);
    expect(isEncrypted(undefined)).toBe(false);
  });

  test("encrypting the same plaintext twice produces different ciphertext", () => {
    // Random IV per call → ciphertexts must differ even for identical input.
    const plain = "same-input";
    const a = encryptPassword(plain);
    const b = encryptPassword(plain);
    expect(a).not.toBe(b);
    expect(decryptPassword(a)).toBe(plain);
    expect(decryptPassword(b)).toBe(plain);
  });

  test("decryptPassword passes legacy plaintext through unchanged", () => {
    // Rows written before the migration don't have the enc:v1: prefix; we
    // need to keep working with them until encryptLegacyPcPasswords runs.
    expect(decryptPassword("legacy-plain")).toBe("legacy-plain");
    expect(decryptPassword("")).toBe("");
  });

  test("tampered ciphertext fails the GCM auth tag check", () => {
    const cipher = encryptPassword("secret");
    // Flip one base64 character in the body. With AES-GCM the auth tag
    // verification at decryption time must reject this.
    const head = cipher.slice(0, "enc:v1:".length);
    const body = cipher.slice("enc:v1:".length);
    const flipChar = body[10] === "A" ? "B" : "A";
    const tampered = head + body.slice(0, 10) + flipChar + body.slice(11);
    expect(() => decryptPassword(tampered)).toThrow();
  });

  test("decryptPassword rejects a too-short ciphertext", () => {
    // 12 bytes IV + 16 bytes tag is the minimum; anything shorter is
    // malformed and must not silently return garbage.
    const tooShort = "enc:v1:" + Buffer.from("short").toString("base64");
    expect(() => decryptPassword(tooShort)).toThrow();
  });

  test("ciphertext survives long inputs", () => {
    const long = "x".repeat(1024);
    const cipher = encryptPassword(long);
    expect(decryptPassword(cipher)).toBe(long);
  });
});
