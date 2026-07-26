use soroban_sdk::{contracterror, contracttype, Address, Bytes, BytesN, Env, String, Vec};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    Unauthorized = 1,
    PromptNotFound = 2,
    CreatorCannotBuy = 3,
    PromptInactive = 4,
    AlreadyPurchased = 5,
    InvalidPrice = 6,
    InvalidFeePercentage = 7,
    InvalidTitleLength = 8,
    InvalidCategoryLength = 9,
    InvalidPreviewLength = 10,
    InvalidEncryptedPromptLength = 11,
    InvalidWrappedKeyLength = 12,
    InvalidImageUrlLength = 13,
    InvalidIvLength = 14,
    FeeWalletNotSet = 15,
    XlmAddressNotSet = 16,
    ArithmeticOverflow = 17,
    ReentrancyGuard = 18,
    ContractIsPaused = 19,
    ReferrerCannotBeBuyerOrCreator = 20,
    InvalidPaymentAmount = 21,
    InvalidVoucher = 22,
    InvalidReferralPercentage = 23,
    InvalidDiscountPercentage = 24,
    MaxSupplyReached = 25,
    InvalidAsset = 26,
    // #50 – revenue splits
    InvalidSplits = 27,
    // #49 – time-bound listing expiry
    ListingExpired = 28,
    LicenseNotFound = 29,
    InvalidLicenseTransfer = 30,
    // Bundle errors
    BundleNotFound = 31,
    BundleInactive = 32,
    BundleAlreadyPurchased = 33,
    BundleEmpty = 34,
    InvalidBundleTitleLength = 35,
    InvalidBundleDescriptionLength = 36,
    PromptAlreadyInBundle = 37,
    PromptNotInBundle = 38,
    InvalidBundleItemCount = 39,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Prompt(u128),
    PromptCounter,
    FeePercentage,
    FeeWallet,
    XlmAddress,
    CreatorPrompts(Address),
    BuyerPrompts(Address),
    Purchase(u128, Address),
    Reentrancy,
    ReferralPercentage,
    IsPaused,
    VoucherKey(u128, BytesN<32>),
    // Bundle storage keys
    Bundle(u128),
    BundleCounter,
    CreatorBundles(Address),
    BuyerBundles(Address),
    BundlePurchase(u128, Address),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Purchase {
    pub prompt_id: u128,
    pub original_creator: Address,
    pub owner: Address,
    pub original_price: i128,
    pub last_transfer_price: i128,
    pub transfer_count: u32,
    pub last_transferred_at: u64,
    pub expires_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PricingConfig {
    pub price: i128,
    pub asset: Address,
}

/// A single revenue-split entry stored inside a prompt.
/// `bps` is the share of the full payment (in basis points) paid to `recipient`
/// before the creator receives the remainder.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Split {
    pub recipient: Address,
    pub bps: u32,
}

/// Full listing configuration passed to create_prompt.
/// Bundles pricing, optional expiry, and optional revenue splits into a single
/// parameter so the function stays within Soroban's 10-parameter limit.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ListingConfig {
    pub price: i128,
    pub asset: Address,
    /// Unix timestamp after which the listing can no longer be purchased.
    /// `0` means the listing never expires.
    pub expires_at: u64,
    /// Optional co-creator revenue splits (empty Vec = no splits).
    pub splits: Vec<Split>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Prompt {
    pub id: u128,
    pub creator: Address,
    pub image_url: String,
    pub title: String,
    pub category: String,
    pub preview_text: String,
    pub encrypted_prompt: String,
    pub encryption_iv: String,
    pub wrapped_key: String,
    pub content_hash: BytesN<32>,
    pub price_stroops: i128,
    pub asset: Address,
    pub active: bool,
    pub sales_count: u64,
    pub max_supply: u64,
    /// Unix timestamp after which the listing can no longer be purchased.
    /// `0` means the listing never expires.
    pub expires_at: u64,
    /// Optional co-creator revenue splits applied against the full payment.
    pub splits: Vec<Split>,
}

pub trait PromptHashTrait {
    fn __constructor(
        env: Env,
        admin: Address,
        fee_wallet: Address,
        xlm_sac: Address,
    ) -> Result<(), Error>;

    #[allow(clippy::too_many_arguments)]
    fn create_prompt(
        env: Env,
        creator: Address,
        image_url: String,
        title: String,
        category: String,
        preview_text: String,
        encrypted_prompt: String,
        encryption_iv: String,
        wrapped_key: String,
        content_hash: BytesN<32>,
        listing: ListingConfig,
    ) -> Result<u128, Error>;

    fn set_prompt_sale_status(
        env: Env,
        creator: Address,
        prompt_id: u128,
        active: bool,
    ) -> Result<(), Error>;

    fn set_prompt_max_supply(
        env: Env,
        creator: Address,
        prompt_id: u128,
        max_supply: u64,
    ) -> Result<(), Error>;

    fn update_prompt_price(
        env: Env,
        creator: Address,
        prompt_id: u128,
        price_stroops: i128,
    ) -> Result<(), Error>;

    fn buy_prompt(
        env: Env,
        buyer: Address,
        prompt_id: u128,
        referrer: Option<Address>,
        payment_amount_stroops: i128,
        voucher: Option<Bytes>,
    ) -> Result<(), Error>;

    fn lease_prompt(
        env: Env,
        buyer: Address,
        prompt_id: u128,
        lease_duration_secs: u64,
    ) -> Result<(), Error>;

    /// Push the expiry date of a listing forward. `new_expires_at` must be
    /// strictly greater than the current ledger timestamp.
    fn extend_listing(
        env: Env,
        creator: Address,
        prompt_id: u128,
        new_expires_at: u64,
    ) -> Result<(), Error>;

    /// Purchase multiple prompts atomically in a single transaction.
    /// `prompt_ids` and `payment_amounts` must have equal length.
    /// An optional `referrer` applies to every prompt in the batch.
    /// If any individual purchase fails the entire transaction reverts.
    fn buy_prompts_bulk(
        env: Env,
        buyer: Address,
        prompt_ids: Vec<u128>,
        payment_amounts: Vec<i128>,
        referrer: Option<Address>,
    ) -> Result<(), Error>;

    fn transfer_license(
        env: Env,
        seller: Address,
        prompt_id: u128,
        new_buyer: Address,
        resale_price: i128,
    ) -> Result<(), Error>;

    fn has_access(env: Env, user: Address, prompt_id: u128) -> Result<bool, Error>;
    fn get_prompt(env: Env, prompt_id: u128) -> Result<Prompt, Error>;
    fn get_all_prompts(env: Env) -> Result<Vec<Prompt>, Error>;
    fn get_prompts_by_creator(env: Env, creator: Address) -> Result<Vec<Prompt>, Error>;
    fn get_prompts_by_buyer(env: Env, buyer: Address) -> Result<Vec<Prompt>, Error>;
    fn set_fee_percentage(env: Env, new_fee_percentage: u32) -> Result<(), Error>;
    fn set_fee_wallet(env: Env, new_fee_wallet: Address) -> Result<(), Error>;
    fn get_fee_percentage(env: Env) -> u32;
    fn get_fee_wallet(env: Env) -> Option<Address>;
    fn set_referral_percentage(env: Env, new_referral_percentage: u32) -> Result<(), Error>;
    fn get_referral_percentage(env: Env) -> u32;
    fn set_pause_status(env: Env, paused: bool) -> Result<(), Error>;
    fn is_paused(env: Env) -> bool;
    fn add_voucher(
        env: Env,
        creator: Address,
        prompt_id: u128,
        hashed_code: BytesN<32>,
        discount_bps: u32,
    ) -> Result<(), Error>;
    fn remove_voucher(
        env: Env,
        creator: Address,
        prompt_id: u128,
        hashed_code: BytesN<32>,
    ) -> Result<(), Error>;
    fn get_xlm_sac(env: Env) -> Option<Address>;
    fn upgrade(env: Env, new_wasm_hash: BytesN<32>) -> Result<(), Error>;
    fn extend_ttl(env: Env, key: DataKey) -> Result<(), Error>;

    // ─── Bundle methods ──────────────────────────────────────────────────────

    /// Create a bundle of existing active prompts owned by `creator`.
    /// All prompt_ids must be active prompts whose `creator` field matches.
    /// `price_stroops` is the single price a buyer pays for the entire bundle.
    /// `asset` is the payment token (same restriction as individual prompts).
    fn create_bundle(
        env: Env,
        creator: Address,
        title: String,
        description: String,
        image_url: String,
        prompt_ids: Vec<u128>,
        price_stroops: i128,
        asset: Address,
    ) -> Result<u128, Error>;

    /// Add a prompt to an existing bundle. Must be the bundle creator.
    fn add_bundle_item(
        env: Env,
        creator: Address,
        bundle_id: u128,
        prompt_id: u128,
    ) -> Result<(), Error>;

    /// Remove a prompt from a bundle. Must be the bundle creator.
    fn remove_bundle_item(
        env: Env,
        creator: Address,
        bundle_id: u128,
        prompt_id: u128,
    ) -> Result<(), Error>;

    /// Update the bundle price. Must be the bundle creator.
    fn update_bundle_price(
        env: Env,
        creator: Address,
        bundle_id: u128,
        price_stroops: i128,
    ) -> Result<(), Error>;

    /// Toggle the bundle's active state. Must be the bundle creator.
    fn set_bundle_active(
        env: Env,
        creator: Address,
        bundle_id: u128,
        active: bool,
    ) -> Result<(), Error>;

    /// Purchase a bundle atomically. Grants access to every current bundle item.
    /// `payment_amount_stroops` must be >= bundle.price_stroops.
    fn buy_bundle(
        env: Env,
        buyer: Address,
        bundle_id: u128,
        payment_amount_stroops: i128,
        referrer: Option<Address>,
    ) -> Result<(), Error>;

    /// Returns true if the user has purchased the bundle (or is the creator).
    fn has_bundle_access(env: Env, user: Address, bundle_id: u128) -> Result<bool, Error>;

    fn get_bundle(env: Env, bundle_id: u128) -> Result<Bundle, Error>;
    fn get_all_bundles(env: Env) -> Result<Vec<Bundle>, Error>;
    fn get_bundles_by_creator(env: Env, creator: Address) -> Result<Vec<Bundle>, Error>;
    fn get_bundles_by_buyer(env: Env, buyer: Address) -> Result<Vec<Bundle>, Error>;
}

// ─── Bundle on-chain types ───────────────────────────────────────────────────

pub const MAX_BUNDLE_TITLE_LEN: u32 = 120;
pub const MAX_BUNDLE_DESC_LEN: u32 = 512;
pub const MAX_BUNDLE_ITEMS: u32 = 20;

/// On-chain bundle record. prompt_ids stores the current set of member prompts.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Bundle {
    pub id: u128,
    pub creator: Address,
    pub title: String,
    pub description: String,
    pub image_url: String,
    /// Current set of member prompt IDs. Capped at MAX_BUNDLE_ITEMS.
    pub prompt_ids: Vec<u128>,
    pub price_stroops: i128,
    pub asset: Address,
    pub active: bool,
    pub sales_count: u64,
    pub created_at: u64,
}

/// Per-buyer bundle purchase record. Records the snapshot of prompt_ids that
/// were current at time of purchase so the unlock layer can serve each one.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BundlePurchase {
    pub bundle_id: u128,
    pub owner: Address,
    pub original_creator: Address,
    pub paid_price: i128,
    pub purchased_at: u64,
    /// Snapshot of prompt IDs that were in the bundle when purchased.
    pub purchased_prompt_ids: Vec<u128>,
}
