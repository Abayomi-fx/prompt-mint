import { randomBytes } from "crypto";
import connectDb from "../db/connectDb";
import WebhookSubscription from "../models/WebhookSubscription";
import { AppError } from "../lib/AppError";
import { asyncRoute } from "../lib/asyncRoute";

export const RegisterWebhook = asyncRoute(async (req, res) => {
  await connectDb();
  const { walletAddress, url, events } = req.body;

  if (!walletAddress || !url) {
    throw new AppError("walletAddress and url are required.", 400, "MISSING_FIELDS");
  }

  try {
    new URL(url);
  } catch {
    throw new AppError("url must be a valid URL.", 400, "INVALID_INPUT");
  }

  const secret = randomBytes(32).toString("hex");
  const allowedEvents = ["PromptPurchased"];
  const resolvedEvents = Array.isArray(events)
    ? events.filter((e: string) => allowedEvents.includes(e))
    : ["PromptPurchased"];

  const existing = await WebhookSubscription.findOne({
    walletAddress: walletAddress.toLowerCase(),
  });

  if (existing) {
    existing.url = url;
    existing.events = resolvedEvents;
    existing.active = true;
    existing.failureCount = 0;
    await existing.save();
    res.status(200).json({ message: "Webhook updated.", id: existing._id, secret });
    return;
  }

  const sub = new WebhookSubscription({
    walletAddress: walletAddress.toLowerCase(),
    url,
    secret,
    events: resolvedEvents,
  });
  await sub.save();

  res.status(201).json({ message: "Webhook registered.", id: sub._id, secret });
});

export const GetWebhook = asyncRoute(async (req, res) => {
  await connectDb();
  const { walletAddress } = req.query;

  if (!walletAddress) {
    throw new AppError("walletAddress query param is required.", 400, "MISSING_FIELDS");
  }

  const sub = await WebhookSubscription.findOne({
    walletAddress: String(walletAddress).toLowerCase(),
  }).select("-secret");

  if (!sub) {
    throw new AppError("No webhook registered for this wallet.", 404, "NOT_FOUND");
  }

  res.json(sub);
});

export const DeleteWebhook = asyncRoute(async (req, res) => {
  await connectDb();
  const { walletAddress } = req.body;

  if (!walletAddress) {
    throw new AppError("walletAddress is required.", 400, "MISSING_FIELDS");
  }

  await WebhookSubscription.deleteOne({ walletAddress: walletAddress.toLowerCase() });
  res.status(200).json({ message: "Webhook removed." });
});
