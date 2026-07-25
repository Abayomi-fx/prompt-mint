import mongoose from "mongoose";

/**
 * Appeal — a structured appeal against a ModerationDecision.
 *
 * Every state change is recorded as an immutable entry in the `history`
 * embedded array so that a full audit trail exists within the document.
 */

export const APPEAL_STATUSES = [
  "open",
  "under_review",
  "approved",
  "rejected",
  "withdrawn",
] as const;

export type AppealStatus = (typeof APPEAL_STATUSES)[number];

const evidenceRefSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    redactedRef: { type: String, required: true },
  },
  { _id: false },
);

const historyEntrySchema = new mongoose.Schema(
  {
    fromStatus: {
      type: String,
      default: null,
    },
    toStatus: {
      type: String,
      required: true,
    },
    actor: {
      type: String,
      required: true,
      lowercase: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
    reason: {
      type: String,
      required: true,
    },
    evidenceRefs: {
      type: [evidenceRefSchema],
      default: [],
    },
  },
  { _id: false },
);

const appealSchema = new mongoose.Schema(
  {
    decisionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ModerationDecision",
      required: true,
      index: true,
    },
    appellantAddress: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    status: {
      type: String,
      enum: APPEAL_STATUSES,
      default: "open",
      index: true,
    },
    evidenceRefs: {
      type: [evidenceRefSchema],
      default: [],
    },
    statement: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    resolverAddress: {
      type: String,
      default: null,
      lowercase: true,
    },
    resolutionReason: {
      type: String,
      default: null,
    },
    history: {
      type: [historyEntrySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

// One appeal per appellant per decision.
appealSchema.index({ decisionId: 1, appellantAddress: 1 }, { unique: true });

export const Appeal =
  mongoose.models.Appeal || mongoose.model("Appeal", appealSchema);
