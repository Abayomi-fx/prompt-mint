import { Request, Response } from "express";
import connectDb from "../db/connectDb";
import Notification from "../models/Notification";
import User from "../models/User";
import { AppError } from "../lib/AppError";
import { asyncRoute } from "../lib/asyncRoute";

function getWalletAddress(req: Request): string | null {
  const candidate =
    String(req.query.walletAddress || req.body.walletAddress || req.headers["x-user-address"] || "").trim();
  return candidate === "" ? null : candidate.toLowerCase();
}

export const GetNotifications = asyncRoute(async (req, res) => {
  await connectDb();
  const walletAddress = getWalletAddress(req);
  if (!walletAddress) {
    throw new AppError("walletAddress is required to fetch notifications.", 401, "UNAUTHENTICATED");
  }

  const user = await User.findOne({ walletAddress });
  if (!user) {
    throw new AppError("User not found.", 404, "NOT_FOUND");
  }
  const notifications = await Notification.find(
    { userId: user._id, read: false },
    undefined,
    { sort: { createdAt: -1 } },
  );

  res.json({ notifications });
});

export const MarkNotificationRead = asyncRoute(async (req, res) => {
  await connectDb();
  const walletAddress = getWalletAddress(req);
  if (!walletAddress) {
    throw new AppError("walletAddress is required to mark notifications read.", 401, "UNAUTHENTICATED");
  }

  const user = await User.findOne({ walletAddress });
  if (!user) {
    throw new AppError("User not found.", 404, "NOT_FOUND");
  }

  const { id } = req.params;
  if (!id) {
    throw new AppError("Notification id is required.", 400, "MISSING_FIELDS");
  }

  const notification = await Notification.findOneAndUpdate(
    { _id: id, userId: user._id },
    { read: true },
    { new: true },
  );

  if (!notification) {
    throw new AppError("Notification not found.", 404, "NOT_FOUND");
  }

  res.json({ notification });
});
