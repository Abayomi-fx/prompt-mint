import { withObservability } from "../src/lib/observability/wrapper";
import { IndexerState } from "../server/src/models/IndexerState";
import connectDb from "../server/src/db/connectDb";
import { negotiateVersion } from "../src/lib/api/versionGuard";
import { withVersion } from "../src/lib/api/payloadVersion";
import mongoose from "mongoose";
import { getRedisClient } from "../src/lib/observability/redisClient";
import { rpcUrl, promptHashContractId } from "../src/lib/env";
import { Server } from "@stellar/stellar-sdk/rpc";
import { Contract, xdr } from "@stellar/stellar-sdk";

async function checkDependency(name: string, checkFn: () => Promise<void>) {
  const start = performance.now();
  let status = "down";
  try {
    await checkFn();
    status = "up";
  } catch (error) {
    console.error(`Health check failed for ${name}:`, error);
  }
  return {
    status,
    latencyMs: Math.round(performance.now() - start),
    lastCheck: new Date().toISOString()
  };
}

async function handler(_req: any, res: any) {
  const version = negotiateVersion(_req, res);
  if (!version) return;

  await connectDb();
  
  const [dbState, redisState, stellarRpcState, contractState] = await Promise.all([
    checkDependency("mongodb", async () => {
      if (mongoose.connection.readyState !== 1) throw new Error("MongoDB not connected");
      if (mongoose.connection.db) {
        await mongoose.connection.db.admin().ping();
      }
    }),
    checkDependency("redis", async () => {
      const client = await getRedisClient();
      if (!client) {
        if (process.env.REDIS_URL) {
            throw new Error("Redis client not initialized");
        }
      } else {
        await client.ping();
      }
    }),
    checkDependency("stellar_rpc", async () => {
      const server = new Server(rpcUrl, { allowHttp: true });
      const health = await server.getHealth();
      if (health.status !== "healthy") {
        throw new Error("Stellar RPC is not healthy");
      }
    }),
    checkDependency("contract", async () => {
      if (!promptHashContractId) throw new Error("Contract ID not configured");
      const server = new Server(rpcUrl, { allowHttp: true });
      const contract = new Contract(promptHashContractId);
      const ledgerKey = xdr.LedgerKey.contractData(new xdr.LedgerKeyContractData({
        contract: contract.address().toScAddress(),
        key: xdr.ScVal.scvLedgerKeyContractInstance(),
        durability: xdr.ContractDataDurability.persistent(),
      }));
      const entries = await server.getLedgerEntries([ledgerKey]);
      if (!entries || !entries.entries || entries.entries.length === 0) {
        throw new Error("Contract not found on network");
      }
    })
  ]);

  const state = await IndexerState.findOne({ key: "prompt_hash_contract" });

  res.status(200).json(
    withVersion(
      {
        status: [dbState, redisState, stellarRpcState, contractState].every(d => d.status === "up") ? "ok" : "degraded",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        dependencies: {
          mongodb: dbState,
          redis: redisState,
          stellarRpc: stellarRpcState,
          contract: contractState,
        },
        indexer: {
          lastProcessedLedger: state?.lastIndexedLedger || 0,
        },
      },
      version,
    ),
  );
}

export default withObservability(handler, "health");
