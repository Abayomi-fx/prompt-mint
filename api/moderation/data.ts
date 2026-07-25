import { buildModeratorAuthMessage, verifyChallengeSignature } from "../../src/lib/auth/challenge";

export interface ModerationLogEntry {
  id: string;
  action: "review_removed" | "review_approved" | "user_warned";
  moderatorAddress: string;
  targetId: string;
  targetType: "review" | "user";
  reason: string;
  details?: string;
  createdAt: number;
}

const logs: ModerationLogEntry[] = [];

export function addModerationLog(entry: Omit<ModerationLogEntry, "id" | "createdAt">): ModerationLogEntry {
  const stored = { ...entry, id: `mod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, createdAt: Date.now() };
  logs.push(stored);
  return stored;
}

export function getModerationLogs(): ModerationLogEntry[] {
  return logs;
}

export function isAuthorizedModerator(address: string): boolean {
  const configured = (process.env.MODERATOR_ADDRESSES ?? "")
    .split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  // Failing closed prevents an unconfigured deployment from granting moderation authority.
  return configured.length > 0 && configured.includes(address.toLowerCase());
}

// ── Moderator request authentication ─────────────────────────────────────────
//
// Knowing a moderator's public wallet address is not proof of controlling it —
// Stellar addresses are frequently public (attached to reviews, transactions,
// etc). Every moderation endpoint therefore requires a signature, proving the
// caller holds the matching private key, over a message that is scoped to a
// specific purpose (so a signature captured for one moderation endpoint can't
// be replayed against another) and a timestamp (so it can't be replayed after
// it expires).

const MODERATOR_SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

export interface ModeratorAuthParams {
  address?: string;
  timestamp?: number;
  signature?: string;
  purpose: string;
  now?: number;
}

export interface ModeratorAuthResult {
  ok: boolean;
  status: number;
  error?: string;
}

export function verifyModeratorAuth({
  address,
  timestamp,
  signature,
  purpose,
  now = Date.now(),
}: ModeratorAuthParams): ModeratorAuthResult {
  if (!address) {
    return { ok: false, status: 401, error: "Moderator address is required" };
  }

  if (!isAuthorizedModerator(address)) {
    return { ok: false, status: 403, error: "Unauthorized: Only authorized moderators can perform this action" };
  }

  if (!timestamp || !signature) {
    return { ok: false, status: 401, error: "Moderator signature is required" };
  }

  if (Math.abs(now - timestamp) > MODERATOR_SIGNATURE_MAX_AGE_MS) {
    return { ok: false, status: 401, error: "Moderator signature has expired" };
  }

  const message = buildModeratorAuthMessage(address, purpose, timestamp);
  if (!verifyChallengeSignature(address, message, signature)) {
    return { ok: false, status: 401, error: "Invalid moderator signature" };
  }

  return { ok: true, status: 200 };
}
