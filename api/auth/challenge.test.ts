// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { Keypair } from "@stellar/stellar-sdk";
import { ErrorCode } from "../../src/lib/api/errorCodes";

vi.mock("../../src/lib/observability/wrapper", () => ({
  withObservability: (handler: unknown) => handler,
}));

vi.mock("../../src/lib/observability/rateLimiter", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    success: true,
    limit: 10,
    remaining: 9,
    reset: 60_000,
  }),
}));

vi.mock("../../src/lib/observability/metrics", () => ({
  metrics: {
    trackChallengeIssued: vi.fn(),
    trackRateLimitHit: vi.fn(),
  },
}));

vi.mock("../../server/src/services/auditTrail", () => ({
  recordAuditEvent: vi.fn(),
}));

import handler from "./challenge";

function makeReq(body: Record<string, unknown> = {}) {
  return {
    method: "POST",
    headers: {},
    body,
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    requestId: "test-request",
    socket: { remoteAddress: "127.0.0.1" },
  };
}

async function invoke(body: Record<string, unknown>) {
  let statusCode = 0;
  let responseData: Record<string, unknown> = {};
  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(data: Record<string, unknown>) {
      responseData = data;
      return this;
    },
    setHeader: vi.fn(),
  };

  process.env.CHALLENGE_TOKEN_SECRET = "integration-test-challenge-secret";

  // @ts-expect-error test handler invocation
  await handler(makeReq(body), res);
  return { statusCode, responseData };
}

describe("challenge API request validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("issues a token for a valid request body", async () => {
    const buyer = Keypair.random();
    const { statusCode, responseData } = await invoke({
      address: buyer.publicKey(),
      promptId: "99",
    });

    expect(statusCode).toBe(200);
    expect(responseData.token).toBeTruthy();
    expect(responseData.challenge).toContain("prompt-hash unlock:");
  });

  it("returns MISSING_FIELDS for malformed bodies", async () => {
    const { statusCode, responseData } = await invoke({ promptId: "not-a-number" });

    expect(statusCode).toBe(400);
    expect(responseData.code).toBe(ErrorCode.MISSING_FIELDS);
  });
});
