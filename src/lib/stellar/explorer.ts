/**
 * Stellar explorer URL helpers (#278).
 *
 * Centralises stellar.expert explorer links so components/pages don't
 * hardcode the URL format. Network segment is derived from the configured
 * Stellar network (TESTNET -> testnet, PUBLIC -> public, etc.).
 */
import { stellarNetwork } from "@/lib/env";

/**
 * Maps the app's configured network name to the stellar.expert path segment.
 */
export function explorerNetworkSegment(
  network: string = stellarNetwork
): "testnet" | "public" | "futurenet" {
  switch (String(network).toUpperCase()) {
    case "PUBLIC":
    case "MAINNET":
      return "public";
    case "FUTURENET":
      return "futurenet";
    case "TESTNET":
    case "STANDALONE":
    default:
      return "testnet";
  }
}

const EXPLORER_BASE = "https://stellar.expert/explorer";

/** Link to a transaction on stellar.expert. */
export function explorerTxUrl(txHash: string, network?: string): string {
  return `${EXPLORER_BASE}/${explorerNetworkSegment(network)}/tx/${txHash}`;
}

/** Link to an account on stellar.expert. */
export function explorerAccountUrl(address: string, network?: string): string {
  return `${EXPLORER_BASE}/${explorerNetworkSegment(network)}/account/${address}`;
}
