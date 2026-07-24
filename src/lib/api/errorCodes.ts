/**
 * Stable error codes for the challenge and unlock API endpoints.
 *
 * The frontend maps these codes to actionable recovery states.
 * Sensitive backend details are never included in user-facing responses.
 */

import type { ApiVersion } from "./payloadVersion";
import { CURRENT_API_VERSION } from "./payloadVersion";

export const ErrorCode = {
  // ── Request errors (4xx) ──────────────────────────────────────────────────

  /** One or more required request fields are missing or malformed. */
  MISSING_FIELDS: "MISSING_FIELDS",

  /** The HTTP method is not allowed on this endpoint. */
  METHOD_NOT_ALLOWED: "METHOD_NOT_ALLOWED",

  // ── Auth / access errors (4xx) ────────────────────────────────────────────

  /** The challenge token has expired. The client should request a new one. */
  CHALLENGE_EXPIRED: "CHALLENGE_EXPIRED",

  /** The challenge token is invalid (bad signature, wrong address/promptId). */
  CHALLENGE_INVALID: "CHALLENGE_INVALID",

  /** The wallet signature does not match the challenge message. */
  INVALID_SIGNATURE: "INVALID_SIGNATURE",

  /** The wallet has not purchased access to this prompt. */
  ACCESS_NOT_PURCHASED: "ACCESS_NOT_PURCHASED",

  // ── Rate limiting (429) ───────────────────────────────────────────────────

  /** Too many requests from this IP address. */
  RATE_LIMIT_IP: "RATE_LIMIT_IP",

  /** Too many requests from this wallet address. */
  RATE_LIMIT_WALLET: "RATE_LIMIT_WALLET",

  // ── Server errors (5xx) ───────────────────────────────────────────────────

  /** The server is missing required configuration (never expose details). */
  CONFIGURATION_ERROR: "CONFIGURATION_ERROR",

  /** Prompt content integrity check failed (hash mismatch). */
  INTEGRITY_FAILURE: "INTEGRITY_FAILURE",

  /** A temporary backend failure occurred. The client may retry. */
  TEMPORARY_FAILURE: "TEMPORARY_FAILURE",

  /** The version requested via Accept-Version is not supported by this server. */
  UNSUPPORTED_VERSION: "UNSUPPORTED_VERSION",

  /** The input value provided in the request body or query is invalid. */
  INVALID_INPUT: "INVALID_INPUT",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Standard API error response shape.
 *
 * Every error response — regardless of HTTP status code — carries `apiVersion`
 * so clients can always know which schema they are parsing.
 *
 * @example
 * { "apiVersion": "2025-01-01", "error": "The challenge token has expired.", "code": "CHALLENGE_EXPIRED" }
 */
export interface ApiErrorResponse {
  /** Stable date-string identifying the payload schema. Always present. */
  apiVersion: ApiVersion;
  /** Human-readable message safe to display to the user. */
  error: string;
  /** Stable machine-readable code the frontend uses for recovery logic. */
  code: ErrorCode;
  /** Unix ms timestamp of when the rate limit resets (only present on 429). */
  reset?: number;
}

/**
 * Build a standard error response body.
 *
 * @param code    - Stable ErrorCode constant.
 * @param message - Human-readable message safe to show to the user.
 * @param extra   - Optional overrides / extensions (e.g. `{ reset: ... }`).
 * @param version - API version to stamp; defaults to CURRENT_API_VERSION.
 */
export function apiError(
  code: ErrorCode,
  message: string,
  extra?: Partial<Omit<ApiErrorResponse, "apiVersion" | "error" | "code">>,
  version: ApiVersion = CURRENT_API_VERSION,
): ApiErrorResponse {
  return { apiVersion: version, error: message, code, ...extra };
}

/**
 * Frontend-friendly messages keyed by error code.
 * Import this in the frontend unlock client to map codes to UI copy.
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  MISSING_FIELDS: "Some required fields are missing. Please check your request.",
  METHOD_NOT_ALLOWED: "This action is not supported.",
  CHALLENGE_EXPIRED: "Your session has expired. Please try again to get a new challenge.",
  CHALLENGE_INVALID: "The challenge token is invalid. Please start the unlock flow again.",
  INVALID_SIGNATURE: "Wallet signature verification failed. Please try signing again.",
  ACCESS_NOT_PURCHASED: "You have not purchased access to this prompt.",
  RATE_LIMIT_IP: "Too many requests. Please wait a moment and try again.",
  RATE_LIMIT_WALLET: "Too many unlock attempts for this wallet. Please wait and try again.",
  CONFIGURATION_ERROR: "A server configuration error occurred. Please try again later.",
  INTEGRITY_FAILURE: "Prompt content could not be verified. Please contact support.",
  TEMPORARY_FAILURE: "A temporary error occurred. Please try again in a moment.",
  UNSUPPORTED_VERSION:
    "The API version you requested is not supported. Please use a supported version.",
  // NOTE: INVALID_INPUT is used by image validation; keep it in sync with ErrorCode above.
  INVALID_INPUT: "The input provided is invalid.",
};
