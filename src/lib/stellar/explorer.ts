import { stellarNetwork } from "@/lib/env";

/**
 * Builds a Stellar Expert transaction URL for the active network.
 */
export function buildTransactionExplorerUrl(txHash: string): string | null {
  const trimmed = txHash.trim();
  if (!trimmed) {
    return null;
  }

  const segment = stellarNetwork === "PUBLIC" ? "public" : "testnet";
  return `https://stellar.expert/explorer/${segment}/tx/${trimmed}`;
}
