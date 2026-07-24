import { withObservability } from "../src/lib/observability/wrapper";
import { IndexerState } from "../server/src/models/IndexerState";
import connectDb from "../server/src/db/connectDb";
import { negotiateVersion } from "../src/lib/api/versionGuard";
import { withVersion } from "../src/lib/api/payloadVersion";

async function handler(_req: any, res: any) {
  const version = negotiateVersion(_req, res);
  if (!version) return;

  await connectDb();
  const state = await IndexerState.findOne({ key: "prompt_hash_contract" });

  res.status(200).json(
    withVersion(
      {
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        indexer: {
          lastProcessedLedger: state?.lastIndexedLedger || 0,
        },
      },
      version,
    ),
  );
}

export default withObservability(handler, "health");
