import type { Request, Response } from "express";
import LicenseTerm from "../models/LicenseTerm";
import Prompt from "../models/Prompt";
import { AppError } from "../lib/AppError";
import { asyncRoute } from "../lib/asyncRoute";

export const GetActiveTerms = asyncRoute(async (_req, res) => {
  const terms = await LicenseTerm.find({ isActive: true }).sort({ version: -1 });
  res.json(terms);
});

export const GetTermsByVersion = asyncRoute(async (req, res) => {
  const version = Number(req.params.version);
  if (!Number.isInteger(version) || version < 1) {
    throw new AppError("Invalid version", 400, "INVALID_INPUT");
  }
  const term = await LicenseTerm.findOne({ version });
  if (!term) {
    throw new AppError("License term version not found", 404);
  }
  res.json(term);
});

export const CreateLicenseTerm = asyncRoute(async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    throw new AppError("Title and content are required", 400, "MISSING_FIELDS");
  }
  const latest = await LicenseTerm.findOne().sort({ version: -1 });
  const nextVersion = (latest?.version ?? 0) + 1;

  if (latest) {
    latest.isActive = false;
    latest.supersededAt = new Date();
    await latest.save();
  }

  const term = await LicenseTerm.create({
    version: nextVersion,
    title,
    content,
  });

  res.status(201).json(term);
});

export const GetListingTerms = asyncRoute(async (req, res) => {
  const promptId = req.params.promptId;
  const prompt = await Prompt.findOne({ onChainId: promptId });
  if (!prompt) {
    throw new AppError("Prompt not found", 404);
  }
  const termsVersion = prompt.termsVersion ?? 1;
  const term = await LicenseTerm.findOne({ version: termsVersion });
  if (!term) {
    throw new AppError("License terms not found for this listing", 404);
  }
  res.json(term);
});
