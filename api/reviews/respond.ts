import { findReview, updateReview, getReviews } from "./data";
import { negotiateVersion } from "../../src/lib/api/versionGuard";
import { withVersion } from "../../src/lib/api/payloadVersion";
import { apiError, ErrorCode } from "../../src/lib/api/errorCodes";

interface RespondRequest {
  promptId: string;
  reviewId: string;
  sellerAddress: string;
  text: string;
  signature?: string;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const version = negotiateVersion(req, res);
  if (!version) return;

  const { promptId, reviewId, sellerAddress, text }: RespondRequest = req.body;

  if (!promptId || !reviewId || !sellerAddress || !text) {
    res.status(400).json(apiError(ErrorCode.MISSING_FIELDS, "Missing required fields", undefined, version));
    return;
  }

  if (text.trim().length < 1) {
    res.status(400).json(apiError(ErrorCode.INVALID_INPUT, "Response text is required", undefined, version));
    return;
  }

  if (text.length > 1000) {
    res.status(400).json(apiError(ErrorCode.INVALID_INPUT, "Response text must not exceed 1000 characters", undefined, version));
    return;
  }

  try {
    const review = findReview(promptId, reviewId);

    if (!review) {
      res.status(404).json({ apiVersion: version, error: "Review not found" });
      return;
    }

    const reviews = getReviews(promptId);
    const isSeller = reviews.some(
      (r) => r.userAddress.toLowerCase() === sellerAddress.toLowerCase()
    );

    if (!isSeller) {
      const mockSellerAddress = process.env.MOCK_SELLER_ADDRESS;
      if (!mockSellerAddress || sellerAddress.toLowerCase() !== mockSellerAddress.toLowerCase()) {
        res.status(403).json({
          apiVersion: version,
          error: "Only the verified seller of this prompt can respond to reviews",
        });
        return;
      }
    }

    const now = Date.now();
    const existingResponse = review.sellerResponse;

    const updatedReview = updateReview(promptId, reviewId, {
      sellerResponse: {
        text: text.trim(),
        createdAt: existingResponse?.createdAt ?? now,
        editedAt: existingResponse ? now : undefined,
      },
    });

    console.log(`✓ Seller response submitted for review ${reviewId} by ${sellerAddress.slice(0, 8)}...`);

    res.status(200).json(
      withVersion(
        {
          success: true,
          sellerResponse: {
            text: updatedReview?.sellerResponse?.text,
            createdAt: updatedReview?.sellerResponse?.createdAt,
            editedAt: updatedReview?.sellerResponse?.editedAt,
          },
        },
        version,
      ),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit seller response";
    console.error("Seller response error:", message);
    res.status(500).json(apiError(ErrorCode.TEMPORARY_FAILURE, message, undefined, version));
  }
}
