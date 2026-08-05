import { createHmac, timingSafeEqual } from "crypto";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured — PayMongo billing is unavailable.`);
  return value;
}

export function isPaymongoConfigured(): boolean {
  return !!process.env.PAYMONGO_SECRET_KEY;
}

const API_BASE = "https://api.paymongo.com/v1";

function authHeader(): string {
  const secretKey = requireEnv("PAYMONGO_SECRET_KEY");
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

async function paymongoFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!res.ok) throw new Error(`PayMongo API error (${path}): ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

export interface CheckoutSession {
  id: string;
  attributes: {
    checkout_url: string;
    status: "active" | "expired";
    payment_intent?: { id: string; attributes: { status: string } } | null;
    metadata?: Record<string, string> | null;
  };
}

export async function createCheckoutSession(params: {
  amount: number;
  description: string;
  lineItemName: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
}): Promise<CheckoutSession> {
  const res = await paymongoFetch<{ data: CheckoutSession }>("/checkout_sessions", {
    method: "POST",
    body: JSON.stringify({
      data: {
        attributes: {
          send_email_receipt: false,
          show_description: true,
          show_line_items: true,
          description: params.description,
          line_items: [
            {
              // PayMongo only settles in PHP — amount is already-converted PHP centavos.
              currency: "PHP",
              amount: params.amount,
              name: params.lineItemName,
              quantity: 1,
            },
          ],
          payment_method_types: ["card", "gcash", "paymaya"],
          success_url: params.successUrl,
          cancel_url: params.cancelUrl,
          metadata: params.metadata,
        },
      },
    }),
  });
  return res.data;
}

export async function getCheckoutSession(id: string): Promise<CheckoutSession> {
  const res = await paymongoFetch<{ data: CheckoutSession }>(`/checkout_sessions/${id}`);
  return res.data;
}

// PayMongo signs webhooks as `Paymongo-Signature: t=<timestamp>,te=<test-sig>,li=<live-sig>` —
// the signature is an HMAC-SHA256 of `${timestamp}.${rawBody}` keyed by the endpoint's webhook secret.
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => {
      const [key, value] = p.split("=");
      return [key, value];
    }),
  );
  const timestamp = parts.t;
  const signature = parts.li ?? parts.te;
  if (!timestamp || !signature) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(signature, "hex");
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}
