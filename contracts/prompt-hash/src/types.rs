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
    // Consolidated: title/category/preview/encrypted-prompt/wrapped-key/image-url/iv
    // all used to be distinct discriminants. Soroban's contract spec format caps a
    // single `#[contracterror]` enum at 50 cases, so field-length validation now
    // shares one variant instead of one-per-field.
    InvalidFieldLength = 8,
    FeeWalletNotSet = 9,
    XlmAddressNotSet = 10,
    ArithmeticOverflow = 11,
    ReentrancyGuard = 12,
    ContractIsPaused = 13,
    ReferrerCannotBeBuyerOrCreator = 14,
    InvalidPaymentAmount = 15,
    InvalidVoucher = 16,
    InvalidReferralPercentage = 17,
    InvalidDiscountPercentage = 18,
    MaxSupplyReached = 19,
    InvalidAsset = 20,
    // #50 – revenue splits
    InvalidSplits = 21,
    // #49 – time-bound listing expiry
    ListingExpired = 28,
    LicenseNotFound = 29,
    InvalidLicenseTransfer = 30,
    ReferralCodeNotFound = 31,
    ReferralCodeAlreadyExists = 32,
    ReferralCodeTooShort = 33,
    ReferralReplay = 34,
    CircularReferral = 35,
    // NB: these previously reused discriminants 31–35 (duplicating the
    // Referral* variants above), which is an E0081 compile error. Renumbered to
    // unique values so the enum compiles; kept contiguous after the staking
    // variants below.
    SubscriptionConfigNotFound = 54,
    SubscriptionInactive = 55,
    InvalidSubscriptionDuration = 56,
    InvalidSubscriptionPrice = 57,
    SubscriptionNotFound = 58,
    ListingNotEligible = 36,
    // #131 – content classification
    InvalidClassification = 36,
    InvalidDisclosureFlags = 37,
    InvalidContentFlagsLength = 38,
    ClassificationAlreadyReviewed = 39,
    NotModerator = 40,
    InvalidSafetyFlagsLength = 41,
    // Promotional pricing
    InvalidPromotionTime = 42,
    PromotionOverlap = 43,
    PromotionNotFound = 44,
    UnauthorizedPromotion = 45,
    // Encryption rotation
    EncryptionVersionNotFound = 46,
    InvalidRotation = 47,
    // Also used to guard schema migrations: reused for a stored schema
    // version newer than what the running contract code understands.
    VersionMismatch = 48,
    // #272 – prompt bundling
    BundleNotFound = 49,
    EncryptionVersionNotFound = 47,
    InvalidRotation = 48,
    VersionMismatch = 49,
    // #275 – creator reputation staking
    StakeNotFound = 50,
    StakeLocked = 51,
    InvalidStakeAmount = 52,
    NotStakeOwner = 53,
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
    // #272 – prompt bundles and their id counter
    Bundle(u128),
    BundleCounter,
    Reentrancy,
    ReferralPercentage,
    IsPaused,
    VoucherKey(u128, BytesN<32>),
    ReferralCode(BytesN<32>),
    ReferralParent(Address),
    SubscriptionConfig(Address),
    Subscription(Address, Address),
    SubscriptionEligible(u128),
    // #131 – content classification
    ClassificationOverride(u128),
    ModeratorAddress,
    // Promotional pricing
    ActivePromotion(u128),
    PromotionHistory(u128),
    // Encryption rotation – versioned payloads & version counter per prompt
    PromptEncryptedPayload(u128, u32),
    PromptEncryptionVersion(u128),
    // #275 – creator reputation staking, keyed by prompt id
    CreatorStake(u128),
}

/// A moderator-overridden classification that takes precedence
/// over the creator's attested classification for display purposes.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ClassificationOverride {
    pub classifier: Address,
    pub classification: String,
    pub safety_flags: Vec<String>,
    pub reason: String,
    pub reviewed_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Settlement {
    pub buyer_amount: i128,
    pub creator_amount: i128,
    pub platform_amount: i128,
    pub referrer: Option<Address>,
    pub referrer_amount: i128,
    pub split_amount: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SubscriptionConfig {
    pub creator: Address,
    pub duration_secs: u64,
    pub price: i128,
    pub asset: Address,
    pub active: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReferralCode {
    pub owner: Address,
    pub reward_bps: u32,
    pub active: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Subscription {
    pub creator: Address,
    pub subscriber: Address,
    /// Exclusive Unix timestamp: access is valid only while `now < expires_at`.
    pub expires_at: u64,
    pub renewal_count: u32,
}

/// Time-bounded promotional pricing for a prompt listing.
/// Only one promotion can be active at a time for a given prompt.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Promotion {
    pub prompt_id: u128,
    pub creator: Address,
    /// Unix timestamp when the promotion starts.
    pub start_time: u64,
    /// Unix timestamp when the promotion ends.
    pub end_time: u64,
    /// Promotional price in stroops.
    pub price: i128,
    /// Token contract address for the promotional price.
    pub asset: Address,
}

/// #272 – A bundle of prompts sold together at a single discounted total price.
/// A buyer who purchases the bundle receives a license/entitlement for every
/// prompt id it contains.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Bundle {
    pub id: u128,
    pub creator: Address,
    pub prompt_ids: Vec<u128>,
    pub price: i128,
    pub asset: Address,
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
    pub settlement: Settlement,
    /// Encryption version at time of purchase. The buyer is entitled to
    /// this version's encrypted payload on unlock.
    pub encryption_version: u32,
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

/// Canonical taxonomy for content classification.
/// Creators attest one of these categories for each listing.
/// Uses `None` variant as default (unnamed).
pub const CLASSIFICATION_GENERAL: &str = "general";
pub const CLASSIFICATION_EDUCATIONAL: &str = "educational";
pub const CLASSIFICATION_PROFESSIONAL: &str = "professional";
pub const CLASSIFICATION_CREATIVE: &str = "creative";
pub const CLASSIFICATION_TECHNICAL: &str = "technical";
pub const CLASSIFICATION_SENSITIVE: &str = "sensitive";
pub const CLASSIFICATION_RESTRICTED: &str = "restricted";

pub const ALL_CLASSIFICATIONS: &[&str] = &[
    CLASSIFICATION_GENERAL,
    CLASSIFICATION_EDUCATIONAL,
    CLASSIFICATION_PROFESSIONAL,
    CLASSIFICATION_CREATIVE,
    CLASSIFICATION_TECHNICAL,
    CLASSIFICATION_SENSITIVE,
    CLASSIFICATION_RESTRICTED,
];

/// Standard safety disclosure flags recognized by the platform.
/// Canonical values: "none", "ai-generated", "financial-advice", "medical", "legal", "political"
pub const VALID_DISCLOSURE_FLAGS: &[&str] = &[
    "none",
    "ai-generated",
    "financial-advice",
    "medical",
    "legal",
    "political",
];

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
    /// #131 – content classification attested by the creator
    pub classification: String,
    /// #131 – safety disclosure flags attested by the creator
    pub safety_flags: Vec<String>,
    /// Encryption version counter. Starts at 1 and increments on each rotation.
    pub encryption_version: u32,
}

/// Archived encryption payload for a prompt at a specific version.
/// Created when `rotate_encryption` stores the previous version before
/// updating to a new encryption key.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PromptEncryptedPayload {
    pub prompt_id: u128,
    pub version: u32,
    pub encrypted_prompt: String,
    pub encryption_iv: String,
    pub wrapped_key: String,
    pub content_hash: BytesN<32>,
    pub created_at: u64,
}

/// #275 – Creator reputation stake.
/// A creator stakes native XLM against one of their own prompts to signal
/// quality. Stake is held in contract custody and can be slashed by the
/// contract admin (owner) if the prompt is verified as low-quality/malicious,
/// or reclaimed by the creator after a cooldown period.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Stake {
    pub creator: Address,
    pub prompt_id: u128,
    /// Currently-staked amount in stroops (net of any slashing/withdrawals).
    pub amount: i128,
    /// Ledger timestamp of the most recent stake top-up; the unstake cooldown
    /// is measured from this value.
    pub staked_at: u64,
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
        referral_code: Option<Bytes>,
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
        referral_code: Option<Bytes>,
    ) -> Result<(), Error>;

    // ─── #272: Prompt bundling ────────────────────────────────────────────────
    /// Creator-gated. Bundles multiple prompts (all owned by `creator`) at a
    /// single `price`. Returns the new bundle id.
    fn create_bundle(
        env: Env,
        creator: Address,
        prompt_ids: Vec<u128>,
        price: i128,
        asset: Address,
    ) -> Result<u128, Error>;

    /// Purchases a bundle: transfers `price` from the buyer (split to creator and
    /// platform fee) and grants the buyer a license for every prompt in it.
    fn purchase_bundle(
        env: Env,
        buyer: Address,
        bundle_id: u128,
        payment_amount: i128,
    ) -> Result<(), Error>;

    fn get_bundle(env: Env, bundle_id: u128) -> Result<Bundle, Error>;

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
    fn get_purchase_details(env: Env, prompt_id: u128, buyer: Address) -> Result<Purchase, Error>;
    fn configure_subscription_pass(
        env: Env,
        creator: Address,
        duration_secs: u64,
        price: i128,
        asset: Address,
        active: bool,
    ) -> Result<(), Error>;
    fn set_subscription_eligibility(
        env: Env,
        creator: Address,
        prompt_id: u128,
        eligible: bool,
    ) -> Result<(), Error>;
    fn subscribe_catalog(
        env: Env,
        subscriber: Address,
        creator: Address,
        payment_amount: i128,
    ) -> Result<u64, Error>;
    fn renew_catalog_subscription(
        env: Env,
        subscriber: Address,
        creator: Address,
        payment_amount: i128,
    ) -> Result<u64, Error>;
    fn get_subscription(
        env: Env,
        subscriber: Address,
        creator: Address,
    ) -> Result<Subscription, Error>;
    fn get_subscription_config(env: Env, creator: Address) -> Result<SubscriptionConfig, Error>;
    fn is_subscription_eligible(env: Env, prompt_id: u128) -> Result<bool, Error>;
    fn set_fee_percentage(env: Env, new_fee_percentage: u32) -> Result<(), Error>;
    fn set_fee_wallet(env: Env, new_fee_wallet: Address) -> Result<(), Error>;
    fn get_fee_percentage(env: Env) -> u32;
    fn get_fee_wallet(env: Env) -> Option<Address>;
    fn set_referral_percentage(env: Env, new_referral_percentage: u32) -> Result<(), Error>;
    fn get_referral_percentage(env: Env) -> u32;
    fn register_referral_code(
        env: Env,
        referrer: Address,
        code_hash: BytesN<32>,
    ) -> Result<(), Error>;
    fn revoke_referral_code(
        env: Env,
        referrer: Address,
        code_hash: BytesN<32>,
    ) -> Result<(), Error>;
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
    fn propose_upgrade(env: Env, new_wasm_hash: BytesN<32>) -> Result<(), Error>;
    fn confirm_upgrade(env: Env) -> Result<(), Error>;
    fn cancel_upgrade(env: Env) -> Result<(), Error>;
    fn get_pending_upgrade(env: Env) -> Option<BytesN<32>>;
    fn extend_ttl(env: Env, key: DataKey) -> Result<(), Error>;

    // ─── Contract state versioning ───────────────────────────────────────────
    /// Current schema version applied to this contract's storage. `0` means
    /// the contract predates this versioning scheme (never migrated).
    fn get_schema_version(env: Env) -> u32;
    /// Owner-only. Bumps the stored schema version after an `upgrade` that
    /// changed the shape of on-chain data. Rejects moving backwards and
    /// rejects jumping to a version this contract build doesn't know about.
    fn migrate(env: Env, new_version: u32) -> Result<u32, Error>;

    // #131 – content classification
    fn set_classification(
        env: Env,
        creator: Address,
        prompt_id: u128,
        classification: String,
        safety_flags: Vec<String>,
    ) -> Result<(), Error>;
    fn get_classification(env: Env, prompt_id: u128) -> Result<(String, Vec<String>), Error>;
    fn set_moderator_override(
        env: Env,
        moderator: Address,
        prompt_id: u128,
        classification: String,
        safety_flags: Vec<String>,
        reason: String,
    ) -> Result<(), Error>;
    fn get_active_classification(env: Env, prompt_id: u128) -> Result<(String, Vec<String>), Error>;
    fn get_moderator_override(env: Env, prompt_id: u128) -> Result<ClassificationOverride, Error>;
    fn set_moderator_address(env: Env, admin: Address, moderator: Address) -> Result<(), Error>;

    // Promotional pricing
    fn create_promotion(
        env: Env,
        creator: Address,
        prompt_id: u128,
        start_time: u64,
        end_time: u64,
        price: i128,
        asset: Address,
    ) -> Result<u128, Error>;

    fn cancel_promotion(
        env: Env,
        creator: Address,
        prompt_id: u128,
    ) -> Result<(), Error>;

    fn get_active_promotion(env: Env, prompt_id: u128) -> Result<Option<Promotion>, Error>;

    fn get_promotion_history(env: Env, prompt_id: u128) -> Result<Vec<Promotion>, Error>;

    fn get_effective_price(env: Env, prompt_id: u128) -> Result<(i128, Address, bool), Error>;

    // Encryption rotation
    fn rotate_encryption(
        env: Env,
        creator: Address,
        prompt_id: u128,
        encrypted_prompt: String,
        encryption_iv: String,
        wrapped_key: String,
        content_hash: BytesN<32>,
    ) -> Result<u32, Error>;

    fn get_prompt_encryption_version(
        env: Env,
        prompt_id: u128,
        version: u32,
    ) -> Result<PromptEncryptedPayload, Error>;

    // #275 – creator reputation staking
    /// Stake native XLM against one of the creator's own prompts. Moves
    /// `amount` stroops from the creator into contract custody and returns the
    /// new total staked amount for the prompt.
    fn stake(env: Env, creator: Address, prompt_id: u128, amount: i128) -> Result<i128, Error>;

    /// Admin-gated slashing of a prompt's stake (see #[only_owner]). Reduces
    /// the recorded stake and forwards the slashed stroops to the fee wallet.
    /// `amount` is clamped to the available stake so an over-slash cannot
    /// underflow. Returns the amount actually slashed.
    fn slash(env: Env, prompt_id: u128, amount: i128) -> Result<i128, Error>;

    /// Reclaim non-slashed stake after the cooldown period has elapsed. The
    /// requested `amount` is clamped to the remaining stake. Returns the amount
    /// actually returned to the creator.
    fn unstake(env: Env, creator: Address, prompt_id: u128, amount: i128) -> Result<i128, Error>;

    /// Read the current stake record for a prompt.
    fn get_stake(env: Env, prompt_id: u128) -> Result<Stake, Error>;
}
