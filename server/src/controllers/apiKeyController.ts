import connectDb from "../db/connectDb";
import ApiKey from "../models/ApiKey";
import { AppError } from "../lib/AppError";
import { asyncRoute } from "../lib/asyncRoute";
import {
  RATE_LIMIT_TIERS,
  RateLimitTier,
  generateApiKey,
  isValidScope,
  maskKey,
  type ApiScope,
} from "../services/apiKeys";

/**
 * API key CRUD controllers (#287).
 *
 * NOTE: These operate on the caller's own keys, keyed by `ownerWallet`. In
 * production they MUST sit behind this codebase's existing wallet challenge
 * auth (see api/auth/challenge.ts) so a caller can only manage their own keys;
 * that gate is intentionally left to the router wiring rather than duplicated
 * here.
 */

function requireOwner(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError("ownerWallet is required.", 400, "MISSING_OWNER");
  }
  return value.trim().toLowerCase();
}

function serialize(doc: {
  _id: unknown;
  label: string;
  prefix: string;
  scopes: ApiScope[];
  rateLimitTier: RateLimitTier;
  requestCount: number;
  lastUsedAt: Date | null;
  revoked: boolean;
  createdAt?: Date;
}) {
  return {
    id: String(doc._id),
    label: doc.label,
    maskedKey: maskKey(doc.prefix),
    scopes: doc.scopes,
    rateLimitTier: doc.rateLimitTier,
    rateLimit: RATE_LIMIT_TIERS[doc.rateLimitTier],
    requestCount: doc.requestCount,
    lastUsedAt: doc.lastUsedAt,
    revoked: doc.revoked,
    createdAt: doc.createdAt,
  };
}

/** GET /api-keys?ownerWallet=... — list the owner's keys (masked). */
export const ListApiKeys = asyncRoute(async (req, res) => {
  await connectDb();
  const owner = requireOwner(req.query.ownerWallet);
  const keys = await ApiKey.find({ ownerWallet: owner }).sort({
    createdAt: -1,
  });
  res.json({ keys: keys.map(serialize) });
});

/** POST /api-keys — generate a new key. Returns plaintext ONCE. */
export const CreateApiKey = asyncRoute(async (req, res) => {
  await connectDb();
  const owner = requireOwner(req.body?.ownerWallet);
  const label = String(req.body?.label ?? "").trim();
  if (!label) throw new AppError("label is required.", 400, "MISSING_LABEL");

  const scopesInput: unknown = req.body?.scopes;
  const scopes: ApiScope[] = Array.isArray(scopesInput)
    ? scopesInput.filter((s): s is ApiScope => isValidScope(String(s)))
    : ["read"];
  if (scopes.length === 0) {
    throw new AppError("At least one valid scope is required.", 400, "BAD_SCOPE");
  }

  const tier: RateLimitTier =
    typeof req.body?.rateLimitTier === "string" &&
    req.body.rateLimitTier in RATE_LIMIT_TIERS
      ? (req.body.rateLimitTier as RateLimitTier)
      : "free";

  const generated = generateApiKey();
  const doc = await ApiKey.create({
    ownerWallet: owner,
    label,
    prefix: generated.prefix,
    hashedKey: generated.hash,
    scopes,
    rateLimitTier: tier,
  });

  res.status(201).json({
    key: serialize(doc),
    // Shown exactly once; never retrievable again.
    plaintext: generated.plaintext,
  });
});

/** POST /api-keys/:id/rotate — issue a new secret, revoke the old record. */
export const RotateApiKey = asyncRoute(async (req, res) => {
  await connectDb();
  const owner = requireOwner(req.body?.ownerWallet);
  const existing = await ApiKey.findOne({ _id: req.params.id, ownerWallet: owner });
  if (!existing || existing.revoked) {
    throw new AppError("Key not found.", 404, "KEY_NOT_FOUND");
  }

  existing.revoked = true;
  await existing.save();

  const generated = generateApiKey();
  const doc = await ApiKey.create({
    ownerWallet: owner,
    label: existing.label,
    prefix: generated.prefix,
    hashedKey: generated.hash,
    scopes: existing.scopes,
    rateLimitTier: existing.rateLimitTier,
    rotatedFrom: existing.prefix,
  });

  res.status(201).json({ key: serialize(doc), plaintext: generated.plaintext });
});

/** DELETE /api-keys/:id — soft-delete (revoke). */
export const RevokeApiKey = asyncRoute(async (req, res) => {
  await connectDb();
  const owner = requireOwner(req.body?.ownerWallet ?? req.query.ownerWallet);
  const existing = await ApiKey.findOne({ _id: req.params.id, ownerWallet: owner });
  if (!existing) throw new AppError("Key not found.", 404, "KEY_NOT_FOUND");

  existing.revoked = true;
  await existing.save();
  res.json({ key: serialize(existing) });
});
