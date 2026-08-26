import pino from "pino";

const isTest =
  process.env.NODE_ENV === "test" ||
  process.env.VITEST === "true" ||
  Boolean(import.meta.env?.VITEST) ||
  import.meta.env?.MODE === "test";

// Fields to redact from logs for privacy and security
const redactFields = [
  "req.headers.authorization",
  "req.headers.cookie",
  "plaintext",
  "secret",
  "privateKey",
  "unlockPrivateKey",
  "challengeSecret",
  "signedMessage",
  "body.plaintext",
  "body.secret",
  "body.privateKey",
  "body.signedMessage",
  "res.body.plaintext",
];

export const logger = pino({
  level: process.env.LOG_LEVEL || (isTest ? "silent" : "info"),
  redact: {
    paths: redactFields,
    censor: "[REDACTED]",
  },
  base: {
    env: process.env.NODE_ENV,
    service: "prompt-hash-unlock",
  },
});

export default logger;
