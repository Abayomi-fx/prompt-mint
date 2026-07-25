import connectDb from "../db/connectDb";
import Prompt from "../models/Prompt";
import PromptVersion from "../models/PromptVersion";
import Purchase from "../models/Purchase";
import User from "../models/User";
import { AppError } from "../lib/AppError";
import { asyncRoute } from "../lib/asyncRoute";

export const PostPromptUpdate = asyncRoute(async (req, res) => {
  await connectDb();
  const { promptId, walletAddress, content, changeNote } = req.body;

  if (!promptId || !walletAddress || !content) {
    throw new AppError("promptId, walletAddress, and content are required.", 400, "MISSING_FIELDS");
  }

  const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
  if (!user) throw new AppError("User not found.", 404, "NOT_FOUND");

  const prompt = await Prompt.findOne({ _id: promptId, owner: user._id });
  if (!prompt) throw new AppError("Prompt not found or not owned by this wallet.", 403, "FORBIDDEN");

  const nextVersion = (prompt.currentVersionIndex ?? 1) + 1;

  await PromptVersion.create({
    promptId: String(prompt._id),
    versionIndex: nextVersion,
    content,
    changeNote: changeNote ?? "",
    createdBy: walletAddress.toLowerCase(),
  });

  await Prompt.findByIdAndUpdate(prompt._id, { currentVersionIndex: nextVersion });

  res.status(201).json({ message: "Version posted.", versionIndex: nextVersion });
});

export const GetPromptVersions = asyncRoute(async (req, res) => {
  await connectDb();
  const { promptId } = req.params;
  if (!promptId) throw new AppError("promptId is required.", 400, "MISSING_FIELDS");

  const versions = await PromptVersion.find({ promptId })
    .sort({ versionIndex: -1 })
    .select("-content");

  res.json(versions);
});

export const RecordPurchase = asyncRoute(async (req, res) => {
  await connectDb();
  const { promptId, buyerWallet, txHash } = req.body;

  if (!promptId || !buyerWallet) {
    throw new AppError("promptId and buyerWallet are required.", 400, "MISSING_FIELDS");
  }

  const prompt = await Prompt.findById(promptId);
  if (!prompt) throw new AppError("Prompt not found.", 404, "NOT_FOUND");

  const existing = await Purchase.findOne({
    promptId,
    buyerWallet: buyerWallet.toLowerCase(),
  });

  if (existing) {
    res.status(200).json({ message: "Already purchased.", versionIndex: existing.versionIndex });
    return;
  }

  const purchase = await Purchase.create({
    promptId,
    buyerWallet: buyerWallet.toLowerCase(),
    versionIndex: prompt.currentVersionIndex ?? 1,
    txHash: txHash ?? "",
  });

  res.status(201).json({ message: "Purchase recorded.", versionIndex: purchase.versionIndex });
});

export const GetBuyerVersion = asyncRoute(async (req, res) => {
  await connectDb();
  const { promptId, buyerWallet } = req.query;

  if (!promptId || !buyerWallet) {
    throw new AppError("promptId and buyerWallet query params are required.", 400, "MISSING_FIELDS");
  }

  const purchase = await Purchase.findOne({
    promptId: String(promptId),
    buyerWallet: String(buyerWallet).toLowerCase(),
  });

  if (!purchase) {
    throw new AppError("No purchase record found.", 404, "NOT_FOUND");
  }

  const version = await PromptVersion.findOne({
    promptId: String(promptId),
    versionIndex: purchase.versionIndex,
  });

  const prompt = await Prompt.findById(promptId).lean();

  res.json({
    versionIndex: purchase.versionIndex,
    changeNote: version?.changeNote ?? "",
    content: version?.content ?? (prompt as any)?.content ?? null,
    purchasedAt: purchase.createdAt,
  });
});
