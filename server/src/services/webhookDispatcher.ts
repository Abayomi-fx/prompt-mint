import { createHmac, randomUUID } from "crypto";
import WebhookSubscription from "../models/WebhookSubscription";
import { WEBHOOK_SCHEMA_VERSION } from "../../../src/lib/api/payloadVersion";

const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [2_000, 10_000, 30_000];
const MAX_FAILURES_BEFORE_DISABLE = 10;

/**
 * Shape of every outbound webhook POST body.
 *
 * `schemaVersion` is a stable date-string (matching WEBHOOK_SCHEMA_VERSION)
 * that receiver implementations can use to branch on payload shape without
 * relying on field-presence checks.  It is separate from the REST API version
 * because webhook deliveries are push-based and not subject to Accept-Version
 * negotiation — receivers must handle the version they subscribed under.
 *
 * Current version: 2025-01-01
 *   - event        — event type name (e.g. "PromptPurchased")
 *   - deliveryId   — UUID, unique per delivery attempt
 *   - timestamp    — ISO-8601 string, UTC
 *   - schemaVersion — WEBHOOK_SCHEMA_VERSION constant
 *   - data         — event-specific payload (see docs/payload-versioning.md)
 */
export interface WebhookPayload {
  /** Stable date-string identifying the webhook payload schema. */
  schemaVersion: typeof WEBHOOK_SCHEMA_VERSION;
  event: string;
  deliveryId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

function signPayload(secret: string, body: string): string {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

async function deliverOnce(url: string, secret: string, payload: WebhookPayload): Promise<void> {
  const body = JSON.stringify(payload);
  const signature = signPayload(secret, body);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-PromptHash-Signature": signature,
      "X-PromptHash-Delivery": payload.deliveryId,
      "X-PromptHash-Event": payload.event,
      "X-PromptHash-Schema-Version": payload.schemaVersion,
    },
    body,
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) throw new Error(`Webhook delivery failed with status ${res.status}`);
}

async function deliverWithRetry(
  subscriptionId: string,
  url: string,
  secret: string,
  payload: WebhookPayload,
): Promise<void> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      await deliverOnce(url, secret, payload);
      await WebhookSubscription.findByIdAndUpdate(subscriptionId, {
        lastDeliveredAt: new Date(),
        $set: { failureCount: 0 },
      });
      return;
    } catch {
      const isLastAttempt = attempt === MAX_RETRIES;
      if (!isLastAttempt) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
        continue;
      }

      const updated = await WebhookSubscription.findByIdAndUpdate(
        subscriptionId,
        { $inc: { failureCount: 1 } },
        { new: true },
      );

      if (updated && updated.failureCount >= MAX_FAILURES_BEFORE_DISABLE) {
        await WebhookSubscription.findByIdAndUpdate(subscriptionId, { active: false });
      }
    }
  }
}

export async function dispatchEvent(
  creatorWallet: string,
  event: string,
  data: Record<string, unknown>,
): Promise<void> {
  const subscriptions = await WebhookSubscription.find({
    walletAddress: creatorWallet.toLowerCase(),
    active: true,
    events: event,
  });

  const payload: WebhookPayload = {
    schemaVersion: WEBHOOK_SCHEMA_VERSION,
    event,
    deliveryId: randomUUID(),
    timestamp: new Date().toISOString(),
    data,
  };

  await Promise.allSettled(
    subscriptions.map((sub) =>
      deliverWithRetry(String(sub._id), sub.url, sub.secret, payload),
    ),
  );
}
