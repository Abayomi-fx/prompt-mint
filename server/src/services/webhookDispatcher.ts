import { createHmac, randomUUID } from "crypto";
import WebhookSubscription from "../models/WebhookSubscription";
import WebhookDelivery from "../models/WebhookDelivery";

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 2_000;
const MAX_RETRY_DELAY_MS = 30_000;
const MAX_FAILURES_BEFORE_DISABLE = 10;

/** Current webhook payload schema version. Bump on any breaking change to the envelope shape. */
export const WEBHOOK_PAYLOAD_VERSION = 1;

export interface WebhookPayload {
  version: number;
  event: string;
  deliveryId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

function signPayload(secret: string, body: string): string {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

/** Bounded exponential backoff: 2s, 4s, 8s, ... capped at MAX_RETRY_DELAY_MS. */
function retryDelayMs(attempt: number): number {
  return Math.min(BASE_RETRY_DELAY_MS * 2 ** attempt, MAX_RETRY_DELAY_MS);
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
      "X-PromptHash-Version": String(payload.version),
    },
    body,
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const err = new Error(`Webhook delivery failed with status ${res.status}`) as Error & {
      statusCode?: number;
    };
    err.statusCode = res.status;
    throw err;
  }
}

async function logDeliveryAttempt(params: {
  subscriptionId: string;
  deliveryId: string;
  event: string;
  attempt: number;
  success: boolean;
  statusCode?: number | null;
  error?: string | null;
}): Promise<void> {
  try {
    await WebhookDelivery.create({
      subscriptionId: params.subscriptionId,
      deliveryId: params.deliveryId,
      event: params.event,
      attempt: params.attempt,
      success: params.success,
      statusCode: params.statusCode ?? null,
      error: params.error ?? null,
    });
  } catch (err) {
    // Delivery logging must never take down the actual delivery attempt.
    console.error("[webhookDispatcher] Failed to record delivery history:", err);
  }
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
      await logDeliveryAttempt({
        subscriptionId,
        deliveryId: payload.deliveryId,
        event: payload.event,
        attempt,
        success: true,
      });
      await WebhookSubscription.findByIdAndUpdate(subscriptionId, {
        lastDeliveredAt: new Date(),
        $set: { failureCount: 0 },
      });
      return;
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode ?? null;
      const message = err instanceof Error ? err.message : String(err);
      await logDeliveryAttempt({
        subscriptionId,
        deliveryId: payload.deliveryId,
        event: payload.event,
        attempt,
        success: false,
        statusCode,
        error: message,
      });

      const isLastAttempt = attempt === MAX_RETRIES;
      if (!isLastAttempt) {
        await new Promise((r) => setTimeout(r, retryDelayMs(attempt)));
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

/**
 * Builds the versioned, uniquely-identified, timestamped envelope for an
 * event. Exposed separately from `dispatchEvent` so `test`-endpoint code
 * can build (and deliver) a payload without going through subscription
 * lookup by wallet.
 */
export function buildWebhookPayload(event: string, data: Record<string, unknown>): WebhookPayload {
  return {
    version: WEBHOOK_PAYLOAD_VERSION,
    event,
    deliveryId: randomUUID(),
    timestamp: new Date().toISOString(),
    data,
  };
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

  const payload = buildWebhookPayload(event, data);

  await Promise.allSettled(
    subscriptions.map((sub) => deliverWithRetry(String(sub._id), sub.url, sub.secret, payload)),
  );
}

/**
 * Delivers a single test event directly to one subscription and returns
 * the outcome inline, instead of the usual fire-and-forget dispatch — so
 * a creator testing their endpoint gets an immediate answer.
 */
export async function sendTestEvent(
  subscription: { _id: unknown; url: string; secret: string },
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  const payload = buildWebhookPayload("WebhookTest", {
    message: "This is a test event from PromptMint.",
  });
  const subscriptionId = String(subscription._id);

  try {
    await deliverOnce(subscription.url, subscription.secret, payload);
    await logDeliveryAttempt({
      subscriptionId,
      deliveryId: payload.deliveryId,
      event: payload.event,
      attempt: 0,
      success: true,
    });
    return { success: true };
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    const message = err instanceof Error ? err.message : String(err);
    await logDeliveryAttempt({
      subscriptionId,
      deliveryId: payload.deliveryId,
      event: payload.event,
      attempt: 0,
      success: false,
      statusCode: statusCode ?? null,
      error: message,
    });
    return { success: false, statusCode, error: message };
  }
}
