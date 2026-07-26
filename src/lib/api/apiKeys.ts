/**
 * Client for the API key management endpoints (#287).
 *
 * The backend keys records by `ownerWallet`; the connected wallet address is
 * passed through. Requests target the same-origin `/api-keys` mount (see
 * server/src/routes/apiKeyRoutes.ts).
 */

export type ApiScope = "read" | "write" | "admin";
export type RateLimitTier = "free" | "pro" | "enterprise";

export interface ApiKeySummary {
  id: string;
  label: string;
  maskedKey: string;
  scopes: ApiScope[];
  rateLimitTier: RateLimitTier;
  rateLimit: number;
  requestCount: number;
  lastUsedAt: string | null;
  revoked: boolean;
  createdAt?: string;
}

export interface CreatedApiKey {
  key: ApiKeySummary;
  /** Full key, shown to the user exactly once. */
  plaintext: string;
}

const BASE = "/api-keys";

async function json<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}.`);
  }
  return response.json() as Promise<T>;
}

export function listApiKeys(ownerWallet: string): Promise<{ keys: ApiKeySummary[] }> {
  return json(`${BASE}?ownerWallet=${encodeURIComponent(ownerWallet)}`);
}

export function createApiKey(input: {
  ownerWallet: string;
  label: string;
  scopes: ApiScope[];
  rateLimitTier: RateLimitTier;
}): Promise<CreatedApiKey> {
  return json(BASE, { method: "POST", body: JSON.stringify(input) });
}

export function rotateApiKey(
  id: string,
  ownerWallet: string,
): Promise<CreatedApiKey> {
  return json(`${BASE}/${encodeURIComponent(id)}/rotate`, {
    method: "POST",
    body: JSON.stringify({ ownerWallet }),
  });
}

export function revokeApiKey(
  id: string,
  ownerWallet: string,
): Promise<{ key: ApiKeySummary }> {
  return json(`${BASE}/${encodeURIComponent(id)}`, {
    method: "DELETE",
    body: JSON.stringify({ ownerWallet }),
  });
}
