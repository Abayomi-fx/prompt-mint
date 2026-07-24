import { getReviews } from "./data";
import { negotiateVersion } from "../../src/lib/api/versionGuard";
import { withVersion } from "../../src/lib/api/payloadVersion";
import { apiError, ErrorCode } from "../../src/lib/api/errorCodes";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const version = negotiateVersion(req, res);
  if (!version) return;

  const { promptId } = req.query;

  if (!promptId) {
    res.status(400).json(apiError(ErrorCode.MISSING_FIELDS, "promptId query parameter is required", undefined, version));
    return;
  }

  try {
    const reviews = getReviews(String(promptId));

    const sortedReviews = [...reviews].sort((a, b) => b.createdAt - a.createdAt);

    const averageRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    res.status(200).json(
      withVersion(
        {
          reviews: sortedReviews.map((r) => ({
            id: r.id,
            promptId: r.promptId,
            userAddress: r.userAddress,
            rating: r.rating,
            text: r.text,
            createdAt: r.createdAt,
            verified: r.verified,
            helpfulVotes: r.helpfulVotes,
            sellerResponse: r.sellerResponse || null,
          })),
          stats: {
            total: reviews.length,
            averageRating: Math.round(averageRating * 10) / 10,
            distribution: {
              5: reviews.filter((r) => r.rating === 5).length,
              4: reviews.filter((r) => r.rating === 4).length,
              3: reviews.filter((r) => r.rating === 3).length,
              2: reviews.filter((r) => r.rating === 2).length,
              1: reviews.filter((r) => r.rating === 1).length,
            },
          },
        },
        version,
      ),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch reviews";
    console.error("Review fetch error:", message);
    res.status(500).json(apiError(ErrorCode.TEMPORARY_FAILURE, message, undefined, version));
  }
}
