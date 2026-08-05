import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { deriveKey } from "./derive-key";

// Purpose-scoped subkey derived from AUTH_SECRET (see derive-key.ts) — independent from the keys
// auth.ts uses for session/OAuth-state JWTs, so a compromise of one doesn't imply the others.
const key = deriveKey("ai-shopify-builder:secret-encryption");

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

export function decryptSecret(encoded: string): string {
  const raw = Buffer.from(encoded, "base64");
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const ciphertext = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
