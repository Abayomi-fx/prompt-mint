/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */
/**
 * WARNING: MOCK CONTRACT IMPLEMENTATION
 * This file currently stubs all on-chain reads/writes with mock data.
 * This should NOT reach production.
 * TODO: Restore real Soroban contract integration before release.
 */
let hasWarnedMock = false;
const warnMockUse = () => {
  if (hasWarnedMock) return;
  console.warn(
    "⚠️ USING MOCK PromptHashClient: Contract calls are currently stubbed and will not hit the Stellar network.",
  );
  hasWarnedMock = true;
};

export interface PromptHashConfig {
  rpcUrl: string;
  networkPassphrase: string;
  allowHttp?: boolean;
  promptHashContractId: string;
  nativeAssetContractId: string;
  simulationAccount?: string;
}

// Added the missing interface required by the UI
export interface PromptRecord {
  id: bigint;
  creator: string;
  priceStroops: bigint;
  title: string;
  category: string;
  previewText: string;
  description?: string;
  tags?: string[];
  imageUrl: string;
  salesCount: number;
  active: boolean;
  contentHash: string;
  encryptedPrompt?: string;
  encryptionIv?: string;
  wrappedKey?: string;
  encryptionVersion?: number;
  // #131 – content classification and safety disclosures
  classification?: string;
  safetyFlags?: string[];
  // Promotional pricing
  activePromotion?: Promotion;
  effectivePrice?: bigint;
  isPromotional?: boolean;
}

/** Archived encryption payload for a prompt at a specific version. */
export interface PromptEncryptedPayload {
  promptId: bigint;
  version: number;
  encryptedPrompt: string;
  encryptionIv: string;
  wrappedKey: string;
  contentHash: string;
  createdAt: number;
}

export interface PurchaseDetails {
  promptId: bigint;
  originalCreator: string;
  owner: string;
  originalPrice: bigint;
  lastTransferPrice: bigint;
  transferCount: number;
  lastTransferredAt: number;
  expiresAt: number;
  encryptionVersion: number;
}

export interface Promotion {
  promptId: bigint;
  creator: string;
  startTime: number;
  endTime: number;
  price: bigint;
  asset: string;
}

export type CreatePromptInput = unknown;

export interface BulkPurchaseItem {
  promptId: string;
  priceStroops: bigint;
}

export interface BulkPurchaseResult {
  txHash: string;
  results: {
    promptId: string;
    success: boolean;
    txHash?: string;
    error?: string;
  }[];
}

export const CONTRACT_ERROR_CODES = {
  CONTRACT_PAUSED: "CONTRACT_PAUSED",
  PROMPT_NOT_FOUND: "PROMPT_NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  INVALID_PRICE: "INVALID_PRICE",
  ALREADY_PURCHASED: "ALREADY_PURCHASED",
  LISTING_EXPIRED: "LISTING_EXPIRED",
  UNKNOWN: "UNKNOWN",
} as const;

export type ContractErrorCode = (typeof CONTRACT_ERROR_CODES)[keyof typeof CONTRACT_ERROR_CODES];

export interface ContractErrorDetails {
  code: ContractErrorCode;
  message: string;
  isUserActionable: boolean;
  raw: string;
}

function normalizeContractErrorText(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "Unknown contract error";
}

export function classifyContractError(error: unknown): ContractErrorDetails {
  const raw = normalizeContractErrorText(error).trim();
  const normalized = raw.toLowerCase();

  if (normalized.includes("paused") || normalized.includes("contractispaused")) {
    return {
      code: CONTRACT_ERROR_CODES.CONTRACT_PAUSED,
      message: "The marketplace is temporarily paused. Please try again shortly.",
      isUserActionable: true,
      raw,
    };
  }

  if (normalized.includes("promptnotfound") || normalized.includes("not found") || normalized.includes("prompt #")) {
    return {
      code: CONTRACT_ERROR_CODES.PROMPT_NOT_FOUND,
      message: "The requested prompt could not be found.",
      isUserActionable: true,
      raw,
    };
  }

  if (normalized.includes("unauthorized") || normalized.includes("not authorized")) {
    return {
      code: CONTRACT_ERROR_CODES.UNAUTHORIZED,
      message: "You are not authorized to perform this action.",
      isUserActionable: true,
      raw,
    };
  }

  if (normalized.includes("alreadypurchased") || normalized.includes("already purchased")) {
    return {
      code: CONTRACT_ERROR_CODES.ALREADY_PURCHASED,
      message: "You already have access to this prompt.",
      isUserActionable: true,
      raw,
    };
  }

  if (normalized.includes("listingexpired") || normalized.includes("expired")) {
    return {
      code: CONTRACT_ERROR_CODES.LISTING_EXPIRED,
      message: "This listing is no longer available for purchase.",
      isUserActionable: true,
      raw,
    };
  }

  if (normalized.includes("invalidprice") || normalized.includes("invalid price")) {
    return {
      code: CONTRACT_ERROR_CODES.INVALID_PRICE,
      message: "The requested price is invalid.",
      isUserActionable: true,
      raw,
    };
  }

  return {
    code: CONTRACT_ERROR_CODES.UNKNOWN,
    message: "The marketplace could not complete that action. Please try again later.",
    isUserActionable: true,
    raw,
  };
}

export function formatContractErrorMessage(error: unknown | ContractErrorDetails): string {
  if (typeof error === "object" && error !== null && "code" in error && "message" in error) {
    const details = error as ContractErrorDetails;
    return details.message;
  }

  return classifyContractError(error).message;
}

export class PromptHashClient {
  /**
   * Checks if the user already has access to the prompt.
   */
  static async checkAccess(
    _config: PromptHashConfig | string,
    _address: string,
    _itemId?: string | bigint,
  ): Promise<boolean> {
    warnMockUse();
    return new Promise((resolve) => {
      setTimeout(() => resolve(false), 1000);
    });
  }

  static async getPrompt(
    _config: PromptHashConfig,
    promptId: bigint,
  ): Promise<PromptRecord> {
    warnMockUse();
    const prompts = await PromptHashClient.getAllPrompts(_config);
    const match = prompts.find((p) => p.id === promptId);
    if (!match) {
      throw new Error(`Prompt #${promptId.toString()} not found.`);
    }
    return match;
  }

  /**
   * Invokes the Soroban contract to purchase a prompt.
   */
  static async purchasePrompt(
    _itemId: string,
    _userAddress: string,
    options?: { forceFailure?: string; delay?: number },
  ): Promise<{ txHash: string; success: boolean }> {
    warnMockUse();
    return new Promise((resolve, reject) => {
      const delay = options?.delay ?? 2000;
      setTimeout(() => {
        if (options?.forceFailure) {
          return reject(new Error(options.forceFailure));
        }

        const mockHash =
          "tx_" + Math.random().toString(16).slice(2, 14).padStart(12, "0");
        resolve({ txHash: mockHash, success: true });
      }, delay);
    });
  }

  /**
   * Invokes the Soroban contract to purchase multiple prompts atomically.
   * The entire transaction reverts if any individual purchase fails.
   */
  static async purchasePromptsBulk(
    _items: BulkPurchaseItem[],
    _userAddress: string,
    options?: { forceFailure?: string; delay?: number },
  ): Promise<BulkPurchaseResult> {
    warnMockUse();
    return new Promise((resolve, reject) => {
      const delay = options?.delay ?? 3000;
      setTimeout(() => {
        if (options?.forceFailure) {
          return reject(new Error(options.forceFailure));
        }

        const txHash =
          "tx_bulk_" + Math.random().toString(16).slice(2, 14).padStart(12, "0");
        
        const results = _items.map((item) => ({
          promptId: item.promptId,
          success: true,
          txHash,
        }));

        resolve({ txHash, results });
      }, delay);
    });
  }

  static async getAllPrompts(
    _config: PromptHashConfig,
  ): Promise<PromptRecord[]> {
    warnMockUse();
    // Returning mock data so the Browse page isn't empty
    return [
      {
        id: 1n,
        creator: "GD...1234",
        priceStroops: 50000000n, // 5 XLM
        title: "GPT-4 Technical Architect",
        category: "Development",
        previewText:
          "A high-performance prompt for generating system design documents...",
        description:
          "A full prompt designed to help architects craft scalable system blueprints and integration plans.",
        tags: ["AI", "Architecture"],
        imageUrl: "",
        salesCount: 12,
        active: true,
        contentHash: "mock_hash_000000000001",
        classification: "technical",
        safetyFlags: ["ai-generated"],
      },
      {
        id: 2n,
        creator: "GB...5678",
        priceStroops: 120000000n, // 12 XLM
        title: "Creative Storyteller Pro",
        category: "Creative",
        previewText:
          "Unlock deep narrative structures and character development...",
        description:
          "A storytelling prompt built to help craft plot outlines, characters, and emotional arcs for long-form fiction.",
        tags: ["Storytelling", "Creative"],
        imageUrl: "",
        salesCount: 45,
        active: true,
        contentHash: "mock_hash_000000000002",
        classification: "creative",
        safetyFlags: [],
      },
    ];
  }

  static async getPromptsByBuyer(_config: PromptHashConfig, _address: string): Promise<PromptRecord[]> {
    warnMockUse();
    return [];
  }

  static async getPromptsByCreator(_config: PromptHashConfig, _address: string): Promise<PromptRecord[]> {
    warnMockUse();
    return [];
  }

  static async createPrompt(
    _config: PromptHashConfig,
    _walletSignerLike: any,
    _address: string,
    _data: CreatePromptInput,
  ) {
    warnMockUse();
    return { success: true, txHash: "tx_mock", promptId: "123" };
  }

  static async setPromptSaleStatus(
    _config: PromptHashConfig,
    _walletSignerLike: any,
    _address: string,
    _promptId: string,
    _isForSale: boolean,
  ) {
    warnMockUse();
    return { success: true };
  }

  static async updatePromptPrice(
    _config: PromptHashConfig,
    _walletSignerLike: any,
    _address: string,
    _promptId: string,
    _newPrice: string,
  ) {
    warnMockUse();
    return { success: true };
  }

  /**
   * Creates a time-bounded promotional price for a prompt.
   */
  static async createPromotion(
    _config: PromptHashConfig,
    _walletSignerLike: any,
    _address: string,
    _promptId: string,
    _startTime: number,
    _endTime: number,
    _price: bigint,
    _asset: string,
    options?: { forceFailure?: string; delay?: number },
  ): Promise<{ txHash: string; success: boolean; promotionId: number }> {
    warnMockUse();
    return new Promise((resolve, reject) => {
      const delay = options?.delay ?? 2000;
      setTimeout(() => {
        if (options?.forceFailure) {
          return reject(new Error(options.forceFailure));
        }
        const mockHash = "tx_promo_" + Math.random().toString(16).slice(2, 14).padStart(12, "0");
        resolve({ txHash: mockHash, success: true, promotionId: Math.floor(Math.random() * 1000) });
      }, delay);
    });
  }

  /**
   * Cancels an active promotion for a prompt.
   */
  static async cancelPromotion(
    _config: PromptHashConfig,
    _walletSignerLike: any,
    _address: string,
    _promptId: string,
    options?: { forceFailure?: string; delay?: number },
  ): Promise<{ txHash: string; success: boolean }> {
    warnMockUse();
    return new Promise((resolve, reject) => {
      const delay = options?.delay ?? 2000;
      setTimeout(() => {
        if (options?.forceFailure) {
          return reject(new Error(options.forceFailure));
        }
        const mockHash = "tx_cancel_" + Math.random().toString(16).slice(2, 14).padStart(12, "0");
        resolve({ txHash: mockHash, success: true });
      }, delay);
    });
  }

  /**
   * Gets the active promotion for a prompt.
   */
  static async getActivePromotion(
    _promptId: string,
  ): Promise<Promotion | null> {
    warnMockUse();
    return null;
  }

  /**
   * Gets the effective price for a prompt, considering any active promotion.
   */
  static async getEffectivePrice(
    _promptId: string,
  ): Promise<{ price: bigint; asset: string; isPromotional: boolean }> {
    warnMockUse();
    return { price: 0n, asset: "", isPromotional: false };
  }

  /**
   * Gets the purchase details for a buyer on a specific prompt.
   */
  static async getPurchaseDetails(
    _config: PromptHashConfig,
    _promptId: bigint,
    _buyer: string,
  ): Promise<PurchaseDetails | null> {
    warnMockUse();
    return null;
  }

  /**
   * Retrieves an archived encrypted payload for a specific version.
   */
  static async getPromptEncryptionVersion(
    _config: PromptHashConfig,
    _promptId: bigint,
    _version: number,
  ): Promise<PromptEncryptedPayload> {
    warnMockUse();
    throw new Error("Encryption version not found (mock)");
  }
}

// --- Standalone exports to satisfy existing UI component imports ---
export const hasAccess = async (
  config: PromptHashConfig,
  address: string,
  itemId: string | bigint,
) =>
  PromptHashClient.checkAccess(
    config,
    address,
    typeof itemId === "bigint" ? itemId.toString() : itemId,
  );
export const getPrompt = async (config: PromptHashConfig, promptId: bigint) =>
  PromptHashClient.getPrompt(config, promptId);
export const getAllPrompts = async (config: PromptHashConfig) =>
  PromptHashClient.getAllPrompts(config);
export const getPromptsByBuyer = async (
  config: PromptHashConfig,
  address: string,
) => PromptHashClient.getPromptsByBuyer(config, address);
export const getPromptsByCreator = async (
  config: PromptHashConfig,
  address: string,
) => PromptHashClient.getPromptsByCreator(config, address);
export const createPrompt = async (
  config: PromptHashConfig,
  walletSignerLike: any,
  address: string,
  data: CreatePromptInput,
) => PromptHashClient.createPrompt(config, walletSignerLike, address, data);
export const setPromptSaleStatus = async (
  config: PromptHashConfig,
  walletSignerLike: any,
  address: string,
  promptId: string,
  isForSale: boolean,
) =>
  PromptHashClient.setPromptSaleStatus(
    config,
    walletSignerLike,
    address,
    promptId,
    isForSale,
  );
export const updatePromptPrice = async (
  config: PromptHashConfig,
  walletSignerLike: any,
  address: string,
  promptId: string,
  newPrice: string,
) =>
  PromptHashClient.updatePromptPrice(
    config,
    walletSignerLike,
    address,
    promptId,
    newPrice,
  );
export const getPurchaseDetails = async (
  config: PromptHashConfig,
  promptId: bigint,
  buyer: string,
) => PromptHashClient.getPurchaseDetails(config, promptId, buyer);
export const getPromptEncryptionVersion = async (
  config: PromptHashConfig,
  promptId: bigint,
  version: number,
) => PromptHashClient.getPromptEncryptionVersion(config, promptId, version);
