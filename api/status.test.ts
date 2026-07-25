import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import handler from "./status";
import { _resetCircuitBreakerRegistry } from "../src/lib/observability/circuitBreaker";

function makeReq(method: string) {
  return {
    method,
    headers: {},
    url: "/api/status",
    socket: { remoteAddress: "127.0.0.1" },
  };
}

function makeRes() {
  const res: { statusCode: number; body: any; status: (code: number) => typeof res; json: (data: any) => typeof res } = {
    statusCode: 0,
    body: undefined,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(data: any) {
      res.body = data;
      return res;
    },
  };
  return res;
}

describe("GET /api/status", () => {
  beforeEach(() => {
    _resetCircuitBreakerRegistry();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports all services up and closed breakers on the success path", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("soroban") || url.includes("stellar")) {
        return new Response(JSON.stringify({ result: { status: "healthy" } }), { status: 200 });
      }
      return new Response("ok", { status: 200 });
    });

    const res = makeRes();
    await handler(makeReq("GET"), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("up");
    expect(res.body.services.every((s: any) => s.status === "up")).toBe(true);
    expect(res.body.circuitBreakers.every((b: any) => b.state === "closed")).toBe(true);
  });

  it("marks a dependency as down and eventually opens its circuit breaker after repeated failures", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network unreachable"));

    const res = makeRes();

    // Failure threshold defaults to 5 consecutive failures — call enough times to trip it.
    for (let i = 0; i < 5; i++) {
      await handler(makeReq("GET"), res);
    }

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("down");
    expect(res.body.services.every((s: any) => s.status === "down")).toBe(true);

    const rpcBreaker = res.body.circuitBreakers.find((b: any) => b.name === "stellar-rpc");
    expect(rpcBreaker.state).toBe("open");
  });

  it("rejects non-GET requests", async () => {
    const res = makeRes();
    await handler(makeReq("POST"), res);
    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBeDefined();
  });
});
