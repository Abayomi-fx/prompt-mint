import {
  buildChallengeMessage,
  verifyChallengeSignature,
  verifyChallengeToken,
} from "../../src/lib/auth/challenge";
import {
  decryptPromptCiphertext,
  hashPromptPlaintext,
  normalizeContentHash,
  unwrapPromptKey,
} from "../../src/lib/crypto/promptCrypto";
import {
  getPrompt,
  hasAccess,
  type PromptHashConfig,
} from "../../src/lib/stellar/promptHashClient";
import { withObservability } from "../../src/lib/observability/wrapper";
import { withBodySizeLimit } from "../../src/lib/api/bodySizeLimit";
import { checkRateLimit } from "../../src/lib/observability/rateLimiter";
import { checkReplayProtection } from "../../src/lib/observability/replayProtection";
import { metrics } from "../../src/lib/observability/metrics";
import { dispatchEvent } from "../../server/src/services/webhookDispatcher";
import { recordAuditEvent } from "../../server/src/services/auditTrail";
import { apiError, ErrorCode } from "../../src/lib/api/errorCodes";
import { validateUnlockSecrets } from "../../src/lib/validation/envValidator";
import {
  parseRequestBody,
  UnlockRequestBody,
} from "../../src/lib/api/requestSchemas";

// Fail-fast module load validation
try {
  validateUnlockSecrets();
} catch (err: any) {
  console.error(err.message);
}


/**
 * Get active secrets for token verification
 * Supports multiple secrets during rotation grace period
 */
function getActiveSecrets(primarySecret: string): string[] {
  const secrets = [primarySecret];
  
  // Check for previous secret within grace period
  const previousSecret = process.env.CHALLENGE_TOKEN_SECRET_PREVIOUS;
  const rotationTimestamp = parseInt(
    process.env.CHALLENGE_TOKEN_ROTATION_TIMESTAMP || "0",
    10
  );
  const gracePeriodMs = parseInt(
    process.env.CHALLENGE_TOKEN_GRACE_PERIOD_MS || "300000", // 5 minutes default
    10
  );
  
  if (previousSecret && rotationTimestamp) {
    const timeSinceRotation = Date.now() - rotationTimestamp;
    if (timeSinceRotation < gracePeriodMs) {
      secrets.push(previousSecret);
    }
  }
  
  return secrets;
}

function getServerConfig(): PromptHashConfig {
  const rpcUrl =
    process.env.PUBLIC_STELLAR_RPC_URL ?? "https://soroban-testnet.stellar.org";
  const networkPassphrase =
    process.env.PUBLIC_STELLAR_NETWORK_PASSPHRASE ??
    "Test SDF Network ; September 2015";
  const promptHashContractId = process.env.PUBLIC_PROMPT_HASH_CONTRACT_ID ?? "";
  const nativeAssetContractId =
    process.env.PUBLIC_STELLAR_NATIVE_ASSET_CONTRACT_ID ??
    "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
  const simulationAccount =
    process.env.PUBLIC_STELLAR_SIMULATION_ACCOUNT ?? process.env.UNLOCK_PUBLIC_KEY ?? "";

  return {
    rpcUrl,
    networkPassphrase,
    promptHashContractId,
    nativeAssetContractId,
    simulationAccount,
    allowHttp: new URL(rpcUrl).hostname === "localhost",
  };
}

async function handler(req: any, res: any) {
  try {
    validateUnlockSecrets();
  } catch (err: any) {
    req.logger.error("Configuration validation failed", { error: err.message });
    res.status(500).json(apiError(ErrorCode.CONFIGURATION_ERROR, "Configuration error."));
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json(apiError(ErrorCode.METHOD_NOT_ALLOWED, "Method not allowed."));
    return;
  }

  const clientIp = (req.headers["x-forwarded-for"] || req.socket.remoteAddress) as string;
  const body = req.body ?? {};
  const { address, promptId } = body as { address?: unknown; promptId?: unknown };

  // Authenticated bucket: wallet address is present.
  const isAuthenticated = Boolean(address);

  // Rate limit by IP (unauthenticated bucket — strictest guard).
  const ipRateLimit = await checkRateLimit("unlock", clientIp, false);
  if (!ipRateLimit.success) {
    req.logger.warn({ clientIp }, "Rate limit exceeded for unlock (IP)");
    metrics.trackRateLimitHit("unlock_ip", clientIp);
    void recordAuditEvent({
      action: "unlock_rate_limited",
      result: "blocked",
      promptId: promptId ? String(promptId) : null,
      walletAddress: address ? String(address) : null,
      requestId: req.requestId ?? null,
      clientIp,
      reason: "ip_rate_limit_exceeded",
    });
    res.setHeader("X-RateLimit-Limit", ipRateLimit.limit);
    res.setHeader("X-RateLimit-Remaining", 0);
    res.setHeader("X-RateLimit-Reset", ipRateLimit.reset);
    res.status(429).json(
      apiError(ErrorCode.RATE_LIMIT_IP, "Too many requests. Please try again later.", {
        reset: ipRateLimit.reset,
      }),
    );
    return;
  }

  // Rate limit by wallet address (authenticated bucket — per-wallet brute-force guard).
  if (address) {
    const walletRateLimit = await checkRateLimit("unlock", String(address), isAuthenticated);
    if (!walletRateLimit.success) {
      req.logger.warn({ address }, "Rate limit exceeded for unlock (Wallet)");
      metrics.trackRateLimitHit("unlock_wallet", String(address));
      void recordAuditEvent({
        action: "unlock_rate_limited",
        result: "blocked",
        promptId: promptId ? String(promptId) : null,
        walletAddress: String(address),
        requestId: req.requestId ?? null,
        clientIp,
        reason: "wallet_rate_limit_exceeded",
      });
      res.setHeader("X-RateLimit-Limit", walletRateLimit.limit);
      res.setHeader("X-RateLimit-Remaining", 0);
      res.setHeader("X-RateLimit-Reset", walletRateLimit.reset);
      res.status(429).json(
        apiError(ErrorCode.RATE_LIMIT_WALLET, "Too many unlock attempts for this wallet.", {
          reset: walletRateLimit.reset,
        }),
      );
      return;
    }
  }

  const challengeSecret = process.env.CHALLENGE_TOKEN_SECRET;
  const unlockPublicKey = process.env.UNLOCK_PUBLIC_KEY;
  const unlockPrivateKey = process.env.UNLOCK_PRIVATE_KEY;

  if (!challengeSecret || !unlockPublicKey || !unlockPrivateKey) {
    req.logger.error("Unlock service is missing configuration secrets.");
    res.status(500).json(apiError(ErrorCode.CONFIGURATION_ERROR, "Configuration error."));
    return;
  }

  const parsed = parseRequestBody(UnlockRequestBody, req.body);
  if (!parsed.success) {
    res.status(400).json(
      apiError(
        ErrorCode.MISSING_FIELDS,
        "token, promptId, address, and signedMessage are required.",
      ),
    );
    return;
  }

  const unlockRequest = parsed.data;

  try {
    // Support multiple active secrets during rotation grace period
    const activeSecrets = getActiveSecrets(challengeSecret);
    
    const payload = verifyChallengeToken(
      activeSecrets,
      unlockRequest.token,
      unlockRequest.address,
      unlockRequest.promptId,
    );
    const challengeMessage = buildChallengeMessage(payload);
    const validSignature = verifyChallengeSignature(
      unlockRequest.address,
      challengeMessage,
      unlockRequest.signedMessage,
    );

    if (!validSignature) {
      req.logger.warn({ address: unlockRequest.address, promptId: unlockRequest.promptId }, "Invalid wallet signature");
      metrics.trackUnlockFailure(unlockRequest.address, unlockRequest.promptId, "invalid_signature");
      void recordAuditEvent({
        action: "unlock_invalid_signature",
        result: "failure",
        promptId: unlockRequest.promptId,
        walletAddress: unlockRequest.address,
        requestId: req.requestId ?? null,
        clientIp,
        reason: "invalid_signature",
      });
      res.status(401).json(apiError(ErrorCode.INVALID_SIGNATURE, "Invalid wallet signature."));
      return;
    }

    const replayCheck = await checkReplayProtection(
      unlockRequest.token,
      unlockRequest.signedMessage,
    );
    if (!replayCheck.valid) {
      req.logger.warn(
        { address: unlockRequest.address, promptId: unlockRequest.promptId },
        "Replay attack detected",
      );
      metrics.trackUnlockFailure(
        unlockRequest.address,
        unlockRequest.promptId,
        "replay_detected",
      );
      void recordAuditEvent({
        action: "unlock_replay_detected",
        result: "blocked",
        promptId: unlockRequest.promptId,
        walletAddress: unlockRequest.address,
        requestId: req.requestId ?? null,
        clientIp,
        reason: "replay_attack",
      });
      res.status(400).json(
        apiError(ErrorCode.TEMPORARY_FAILURE, "This unlock request has already been processed."),
      );
      return;
    }

    const config = getServerConfig();
    const id = BigInt(unlockRequest.promptId);
    const access = await hasAccess(config, unlockRequest.address, id);
    if (!access) {
      req.logger.warn(
        { address: unlockRequest.address, promptId: unlockRequest.promptId },
        "Prompt access denied",
      );
      metrics.trackUnlockFailure(
        unlockRequest.address,
        unlockRequest.promptId,
        "no_access",
      );
      void recordAuditEvent({
        action: "unlock_no_access",
        result: "failure",
        promptId: unlockRequest.promptId,
        walletAddress: unlockRequest.address,
        requestId: req.requestId ?? null,
        clientIp,
        reason: "no_access",
      });
      res.status(403).json(
        apiError(ErrorCode.ACCESS_NOT_PURCHASED, "Prompt access has not been purchased."),
      );
      return;
    }

    const prompt = await getPrompt(config, id);
    const keyBytes = await unwrapPromptKey(
      prompt.wrappedKey,
      unlockPublicKey,
      unlockPrivateKey,
    );
    const plaintext = await decryptPromptCiphertext(
      prompt.encryptedPrompt,
      prompt.encryptionIv,
      keyBytes,
    );
    const contentHash = await hashPromptPlaintext(plaintext);
    const storedHash = normalizeContentHash(prompt.contentHash);
    if (contentHash !== storedHash) {
      req.logger.error(
        { address: unlockRequest.address, promptId: unlockRequest.promptId },
        "Prompt integrity check failed",
      );
      metrics.trackUnlockFailure(
        unlockRequest.address,
        unlockRequest.promptId,
        "integrity_failure",
      );
      void recordAuditEvent({
        action: "unlock_integrity_failure",
        result: "failure",
        promptId: unlockRequest.promptId,
        walletAddress: unlockRequest.address,
        requestId: req.requestId ?? null,
        clientIp,
        reason: "integrity_failure",
      });
      res.status(500).json(
        apiError(ErrorCode.INTEGRITY_FAILURE, "Prompt integrity check failed."),
      );
      return;
    }

    metrics.trackUnlockSuccess(unlockRequest.address, unlockRequest.promptId);
    req.logger.info(
      { address: unlockRequest.address, promptId: unlockRequest.promptId },
      "Prompt unlocked successfully",
    );
    void recordAuditEvent({
      action: "unlock_success",
      result: "success",
      promptId: unlockRequest.promptId,
      walletAddress: unlockRequest.address,
      requestId: req.requestId ?? null,
      clientIp,
      reason: null,
    });

    // Fire-and-forget webhook dispatch so the creator is notified of the sale.
    void Promise.resolve(
      dispatchEvent(prompt.creator ?? "", "PromptPurchased", {
        promptId: prompt.id.toString(),
        buyer: unlockRequest.address,
        title: prompt.title,
      }),
    ).catch(() => {});

    res.status(200).json({
      promptId: prompt.id.toString(),
      title: prompt.title,
      contentHash,
      plaintext,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to unlock prompt.";
    req.logger.error(
      {
        address: unlockRequest.address,
        promptId: unlockRequest.promptId,
        error: message,
      },
      "Unlock attempt failed",
    );
    metrics.trackUnlockFailure(unlockRequest.address, unlockRequest.promptId, "error");

    // Distinguish expired-challenge errors for finer-grained audit reasons and error codes.
    const isExpired = message.toLowerCase().includes("expired");
    void recordAuditEvent({
      action: isExpired ? "unlock_expired_challenge" : "unlock_error",
      result: "failure",
      promptId: unlockRequest.promptId,
      walletAddress: unlockRequest.address,
      requestId: req.requestId ?? null,
      clientIp,
      reason: isExpired ? "expired_challenge" : "error",
    });

    if (isExpired) {
      res.status(400).json(
        apiError(ErrorCode.CHALLENGE_EXPIRED, "The challenge token has expired. Please request a new one."),
      );
    } else {
      res.status(400).json(
        apiError(ErrorCode.TEMPORARY_FAILURE, "Failed to unlock prompt. Please try again."),
      );
    }
  }
}

export default withObservability(withBodySizeLimit(handler), "prompts/unlock");
