# Runbook: Operations & Deployment Guide

## Quick Navigation

- [Deployment & On-Call Runbook](./deployment-runbook.md) — Complete deployment procedures, rollback playbooks, failure triage, migrations, environment variables, and incident response.
- [Automated rollback](./auto-rollback.md) — CI-driven revert to last known-good, Slack/Discord notify, incident tickets.
- [Monitoring (Datadog / Grafana / PagerDuty)](./monitoring.md) — RPC latency, error rates, active users, transaction volume, API health.
- [Unlock Key Recovery](./unlock-key-recovery.md) — Key backup, escrow, operator-approved verification, and rotation.
- [Load Testing Guide](./load-testing.md) — Capacity testing for browse, challenge, unlock, and indexing flows.
- [Disaster Recovery](./disaster-recovery.md) — Infrastructure continuity and backup recovery.
- [Incident Response Protocol](./incident-response.md) — Incident classification and communication guidelines.
- [Contract Upgrades](./contract-upgrades.md) — Two-step timelocked upgrade procedures.

---

## Unlock key loss and recovery

For backup, escrow, rotation duties, operator-approved recovery verification, and compromise / permanent loss / rollback procedures, see [Unlock key recovery](./unlock-key-recovery.md).

## Production-like load tests

Use the [load-testing runbook](./load-testing.md) for browse, challenge, unlock, and indexing capacity tests.

## Monitoring & Metrics

We use structured logging plus Prometheus (`GET /api/metrics`) and Datadog dashboards. Key metrics to monitor:

- `challenge_issued_total`: Volume of unlock requests initiated.
- `unlock_success_total`: Successful prompt decryptions.
- `unlock_failure_total`: Failed attempts (labeled by reason).
- `rate_limit_hit_total`: Blocked requests (labeled by type).
- `api_request_duration_ms`: Latency of the unlock flow.
- `rpc_call_duration_ms`: Soroban RPC latency (PagerDuty on P99 > 2s).
- `active_users_total`: Privacy-safe active-user heartbeats.
- `transaction_volume_total`: Submitted marketplace transactions.
- `api_endpoint_health`: Per-endpoint health gauge.

See [Monitoring and alerting](./monitoring.md) for Grafana, Datadog, and PagerDuty setup.

## Health Checks

The `/api/health` endpoint provides a basic signal of service availability.

## Rate Limiting Configuration

Default limits (defined in `src/lib/observability/rateLimiter.ts`):

- **Challenge**: 10 requests per minute per IP.
- **Unlock**: 5 requests per minute per IP/Wallet.

## Redaction Rules

The following fields are automatically redacted from logs:

- `plaintext`
- `secret`
- `privateKey`
- `signedMessage`
- Authorization headers
