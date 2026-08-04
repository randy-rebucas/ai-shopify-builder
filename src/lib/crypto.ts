import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

if (!process.env.AUTH_SECRET) {
  throw new Error("AUTH_SECRET environment variable must be set — it's also used to derive the credentials encryption key.");
}
// Derive a 32-byte AES key from AUTH_SECRET so no separate key needs to be provisioned.
const key = createHash("sha256").update(process.env.AUTH_SECRET).digest();

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
