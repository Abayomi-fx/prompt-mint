import { afterEach, describe, expect, it } from "vitest";
import { METRIC_NAMES, metrics } from "./metrics";

describe("metrics helpers", () => {
  afterEach(() => {
    metrics._resetForTests();
  });

  it("records RPC latency, errors, active users, tx volume, and endpoint health", () => {
    metrics.trackRpcCall("simulateTransaction", 42, "ok");
    metrics.trackRpcCall("sendTransaction", 80, "error");
    metrics.trackActiveUser("wallet_connected");
    metrics.trackTransactionVolume("submit", 2);
    metrics.trackEndpointHealth("health", true, 12);
    metrics.trackEndpointHealth("unlock", false, 900);

    const names = metrics.snapshot().map((s) => s.name);
    expect(names).toContain(METRIC_NAMES.rpcDuration);
    expect(names).toContain(METRIC_NAMES.rpcError);
    expect(names).toContain(METRIC_NAMES.activeUsers);
    expect(names).toContain(METRIC_NAMES.transactionVolume);
    expect(names).toContain(METRIC_NAMES.endpointHealth);

    const text = metrics.toPrometheus();
    expect(text).toContain("rpc_call_duration_ms");
    expect(text).toContain("transaction_volume_total");
    expect(text).toContain("api_endpoint_health");
  });

  it("keeps existing unlock helpers working", () => {
    metrics.trackUnlockSuccess("GABC", "1");
    metrics.trackUnlockFailure("GABC", "1", "no_access");
    expect(metrics.snapshot().some((s) => s.name === "unlock_success_total")).toBe(true);
    expect(metrics.snapshot().some((s) => s.labels.reason === "no_access")).toBe(true);
  });
});
