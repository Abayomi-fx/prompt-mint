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
}

export type CreatePromptInput = unknown;

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

// ─── Bundle types ─────────────────────────────────────────────────────────────

export interface BundleRecord {
  id: bigint;
  creator: string;
  title: string;
  description: string;
  imageUrl: string;
  /** Current member prompt IDs at time of last fetch. */
  promptIds: bigint[];
  priceStroops: bigint;
  asset: string;
  active: boolean;
  salesCount: number;
  createdAt: number;
}

export interface BundlePurchaseRecord {
  bundleId: bigint;
  owner: string;
  originalCreator: string;
  paidPrice: bigint;
  purchasedAt: number;
  /** Snapshot of prompt IDs that were in the bundle at purchase time. */
  purchasedPromptIds: bigint[];
}

export interface CreateBundleInput {
  title: string;
  description: string;
  imageUrl: string;
  promptIds: bigint[];
  priceStroops: bigint;
}

// ─── Bundle mock helpers ──────────────────────────────────────────────────────

const MOCK_BUNDLES: BundleRecord[] = [
  {
    id: 1n,
    creator: "GD...1234",
    title: "Developer Starter Pack",
    description: "Three high-performance prompts for software engineers covering architecture, code review, and debugging.",
    imageUrl: "",
    promptIds: [1n, 2n],
    priceStroops: 150_000_000n, // 15 XLM
    asset: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
    active: true,
    salesCount: 7,
    createdAt: 1_700_000_000,
  },
];

// ─── Bundle client methods on PromptHashClient ────────────────────────────────

// Extend the existing class with static bundle methods.
// Because promptHashClient.ts is fully mocked, these follow the same pattern.
export class BundleHashClient {
  static async getAllBundles(
    _config: PromptHashConfig,
  ): Promise<BundleRecord[]> {
    warnMockUse();
    return new Promise((resolve) => setTimeout(() => resolve(MOCK_BUNDLES), 800));
  }

  static async getBundle(
    _config: PromptHashConfig,
    bundleId: bigint,
  ): Promise<BundleRecord> {
    warnMockUse();
    const match = MOCK_BUNDLES.find((b) => b.id === bundleId);
    if (!match) throw new Error(`Bundle #${bundleId.toString()} not found.`);
    return match;
  }

  static async getBundlesByBuyer(
    _config: PromptHashConfig,
    _address: string,
  ): Promise<BundleRecord[]> {
    warnMockUse();
    return [];
  }

  static async getBundlesByCreator(
    _config: PromptHashConfig,
    _address: string,
  ): Promise<BundleRecord[]> {
    warnMockUse();
    return MOCK_BUNDLES.filter((b) => b.creator === _address);
  }

  static async hasBundleAccess(
    _config: PromptHashConfig,
    _address: string,
    _bundleId: bigint,
  ): Promise<boolean> {
    warnMockUse();
    return false;
  }

  static async buyBundle(
    _config: PromptHashConfig,
    _walletSigner: any,
    _address: string,
    _bundleId: bigint,
    _paymentStroops: bigint,
    _referrer?: string,
  ): Promise<{ txHash: string; success: boolean }> {
    warnMockUse();
    return new Promise((resolve) =>
      setTimeout(() => {
        const txHash =
          "tx_" + Math.random().toString(16).slice(2, 14).padStart(12, "0");
        resolve({ txHash, success: true });
      }, 2000),
    );
  }

  static async createBundle(
    _config: PromptHashConfig,
    _walletSigner: any,
    _address: string,
    _data: CreateBundleInput,
  ): Promise<{ success: boolean; txHash: string; bundleId: string }> {
    warnMockUse();
    return { success: true, txHash: "tx_mock_bundle", bundleId: "1" };
  }

  static async addBundleItem(
    _config: PromptHashConfig,
    _walletSigner: any,
    _address: string,
    _bundleId: bigint,
    _promptId: bigint,
  ): Promise<{ success: boolean }> {
    warnMockUse();
    return { success: true };
  }

  static async removeBundleItem(
    _config: PromptHashConfig,
    _walletSigner: any,
    _address: string,
    _bundleId: bigint,
    _promptId: bigint,
  ): Promise<{ success: boolean }> {
    warnMockUse();
    return { success: true };
  }

  static async updateBundlePrice(
    _config: PromptHashConfig,
    _walletSigner: any,
    _address: string,
    _bundleId: bigint,
    _priceStroops: bigint,
  ): Promise<{ success: boolean }> {
    warnMockUse();
    return { success: true };
  }

  static async setBundleActive(
    _config: PromptHashConfig,
    _walletSigner: any,
    _address: string,
    _bundleId: bigint,
    _active: boolean,
  ): Promise<{ success: boolean }> {
    warnMockUse();
    return { success: true };
  }
}

// ─── Standalone bundle exports (mirrors the prompt standalone pattern) ─────────

export const getAllBundles = (config: PromptHashConfig) =>
  BundleHashClient.getAllBundles(config);

export const getBundle = (config: PromptHashConfig, bundleId: bigint) =>
  BundleHashClient.getBundle(config, bundleId);

export const getBundlesByBuyer = (config: PromptHashConfig, address: string) =>
  BundleHashClient.getBundlesByBuyer(config, address);

export const getBundlesByCreator = (
  config: PromptHashConfig,
  address: string,
) => BundleHashClient.getBundlesByCreator(config, address);

export const hasBundleAccess = (
  config: PromptHashConfig,
  address: string,
  bundleId: bigint,
) => BundleHashClient.hasBundleAccess(config, address, bundleId);

export const buyBundle = (
  config: PromptHashConfig,
  walletSigner: any,
  address: string,
  bundleId: bigint,
  paymentStroops: bigint,
  referrer?: string,
) =>
  BundleHashClient.buyBundle(
    config,
    walletSigner,
    address,
    bundleId,
    paymentStroops,
    referrer,
  );

export const createBundle = (
  config: PromptHashConfig,
  walletSigner: any,
  address: string,
  data: CreateBundleInput,
) => BundleHashClient.createBundle(config, walletSigner, address, data);

export const addBundleItem = (
  config: PromptHashConfig,
  walletSigner: any,
  address: string,
  bundleId: bigint,
  promptId: bigint,
) => BundleHashClient.addBundleItem(config, walletSigner, address, bundleId, promptId);

export const removeBundleItem = (
  config: PromptHashConfig,
  walletSigner: any,
  address: string,
  bundleId: bigint,
  promptId: bigint,
) => BundleHashClient.removeBundleItem(config, walletSigner, address, bundleId, promptId);

export const updateBundlePrice = (
  config: PromptHashConfig,
  walletSigner: any,
  address: string,
  bundleId: bigint,
  priceStroops: bigint,
) => BundleHashClient.updateBundlePrice(config, walletSigner, address, bundleId, priceStroops);

export const setBundleActive = (
  config: PromptHashConfig,
  walletSigner: any,
  address: string,
  bundleId: bigint,
  active: boolean,
) => BundleHashClient.setBundleActive(config, walletSigner, address, bundleId, active);
