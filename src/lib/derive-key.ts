import { hkdfSync } from "crypto";

// A single AUTH_SECRET env var backs everything — session JWTs, OAuth-state JWTs, and the
// at-rest encryption key for stored provider tokens (Shopify/GitHub/hosting). Deriving each of
// those directly from the raw secret means a leak of any one of them (e.g. a bug that echoes a
// JWT-adjacent value somewhere) compromises all the others too. HKDF with a distinct `info`
// string per purpose gives each consumer its own independent subkey from the same root secret,
// so a compromise of one derived key doesn't imply anything about the others.
if (!process.env.AUTH_SECRET) {
  throw new Error("AUTH_SECRET environment variable must be set.");
}
const rootSecret = process.env.AUTH_SECRET;

export function deriveKey(info: string, length = 32): Buffer {
  return Buffer.from(hkdfSync("sha256", rootSecret, "", info, length));
}
