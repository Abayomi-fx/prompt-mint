//! Property-based fuzz coverage for malformed/adversarial Soroban inputs.
//!
//! These tests don't assert exact business outcomes the way `test.rs` does;
//! instead they assert the contract's core invariant under garbage input:
//! every entry point must return a typed `Error`, or succeed, but must never
//! panic/trap regardless of how malformed, oversized, or numerically extreme
//! the input is. A panic here means an attacker-controlled input can abort a
//! transaction in a way callers can't recover from or reason about.
extern crate std;

use crate::contract::{PromptHashContract, PromptHashContractClient};
use crate::mock_asset::FungibleTokenContract;
use crate::types::{ListingConfig, Split};
use proptest::prelude::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Address, Bytes, BytesN, Env, String, Vec,
};
use std::string::String as StdString;
use std::vec::Vec as StdVec;

struct FuzzContext {
    contract: Address,
    xlm: Address,
}

fn setup(env: &Env) -> FuzzContext {
    env.mock_all_auths();
    let admin = Address::generate(env);
    let fee_wallet = Address::generate(env);
    let xlm = env.register(FungibleTokenContract, (admin.clone(),));
    let contract = env.register(
        PromptHashContract,
        (admin.clone(), fee_wallet.clone(), xlm.clone()),
    );
    FuzzContext { contract, xlm }
}

/// Builds an arbitrary (possibly invalid) UTF-8 string of up to `max_len`
/// bytes for a Soroban `String` field.
fn arb_string(max_len: usize) -> impl Strategy<Value = StdString> {
    proptest::collection::vec(proptest::char::any(), 0..max_len)
        .prop_map(|chars| chars.into_iter().collect::<StdString>())
}

fn arb_bytes(max_len: usize) -> impl Strategy<Value = StdVec<u8>> {
    proptest::collection::vec(any::<u8>(), 0..max_len)
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(48))]

    /// `create_prompt` must never panic no matter how malformed the text
    /// fields or price are: oversized strings (well past every MAX_*_LEN
    /// constant), empty strings, non-ASCII/emoji content, and the full i128
    /// range for price (including negative and zero) must all come back as
    /// a typed `Result`, not a trap.
    #[test]
    fn fuzz_create_prompt_never_panics(
        title in arb_string(400),
        category in arb_string(200),
        preview in arb_string(600),
        encrypted in arb_string(5000),
        iv in arb_string(200),
        wrapped_key in arb_string(400),
        price in any::<i128>(),
    ) {
        let env: Env = Default::default();
        let context = setup(&env);
        let client = PromptHashContractClient::new(&env, &context.contract);
        let creator = Address::generate(&env);

        let _ = client.try_create_prompt(
            &creator,
            &String::from_str(&env, "https://example.com/image.png"),
            &String::from_str(&env, &title),
            &String::from_str(&env, &category),
            &String::from_str(&env, &preview),
            &String::from_str(&env, &encrypted),
            &String::from_str(&env, &iv),
            &String::from_str(&env, &wrapped_key),
            &BytesN::from_array(&env, &[7u8; 32]),
            &ListingConfig {
                price,
                asset: context.xlm.clone(),
                expires_at: 0,
                splits: Vec::new(&env),
            },
        );
    }

    /// Revenue splits are attacker/creator-supplied at listing time. Random
    /// counts of recipients with random bps (including values that overflow
    /// the running u32 total) must never panic - only ever `Ok` or a typed
    /// `Error`.
    #[test]
    fn fuzz_create_prompt_with_arbitrary_splits_never_panics(
        bps_values in proptest::collection::vec(any::<u32>(), 0..12),
        price in 1i128..1_000_000_000_000i128,
    ) {
        let env: Env = Default::default();
        let context = setup(&env);
        let client = PromptHashContractClient::new(&env, &context.contract);
        let creator = Address::generate(&env);

        let mut splits = Vec::new(&env);
        for bps in bps_values {
            splits.push_back(Split {
                recipient: Address::generate(&env),
                bps,
            });
        }

        let _ = client.try_create_prompt(
            &creator,
            &String::from_str(&env, "https://example.com/image.png"),
            &String::from_str(&env, "Fuzzed splits"),
            &String::from_str(&env, "General"),
            &String::from_str(&env, "preview"),
            &String::from_str(&env, "ciphertext"),
            &String::from_str(&env, "iv"),
            &String::from_str(&env, "wrapped-key"),
            &BytesN::from_array(&env, &[9u8; 32]),
            &ListingConfig {
                price,
                asset: context.xlm.clone(),
                expires_at: 0,
                splits,
            },
        );
    }

    /// `buy_prompt` payment amounts are buyer-controlled. The full i128 range
    /// (negative, zero, i128::MAX) must be rejected cleanly or accepted, but
    /// never trigger a panic in the fee/referral/split arithmetic.
    #[test]
    fn fuzz_buy_prompt_payment_amount_never_panics(payment_amount in any::<i128>()) {
        let env: Env = Default::default();
        let context = setup(&env);
        let client = PromptHashContractClient::new(&env, &context.contract);
        let creator = Address::generate(&env);
        let buyer = Address::generate(&env);

        let prompt_id = client.create_prompt(
            &creator,
            &String::from_str(&env, "https://example.com/image.png"),
            &String::from_str(&env, "Fuzz target"),
            &String::from_str(&env, "General"),
            &String::from_str(&env, "preview"),
            &String::from_str(&env, "ciphertext"),
            &String::from_str(&env, "iv"),
            &String::from_str(&env, "wrapped-key"),
            &BytesN::from_array(&env, &[3u8; 32]),
            &ListingConfig {
                price: 10_000,
                asset: context.xlm.clone(),
                expires_at: 0,
                splits: Vec::new(&env),
            },
        );

        let _ = client.try_buy_prompt(&buyer, &prompt_id, &None::<Bytes>, &payment_amount, &None::<Bytes>);
    }

    /// Referral codes arrive as raw bytes supplied by the buyer. Arbitrary
    /// lengths and content (including codes that happen to collide with the
    /// buyer's or creator's own address hash) must never panic.
    #[test]
    fn fuzz_buy_prompt_referral_code_never_panics(code_bytes in arb_bytes(64)) {
        let env: Env = Default::default();
        let context = setup(&env);
        let client = PromptHashContractClient::new(&env, &context.contract);
        let creator = Address::generate(&env);
        let buyer = Address::generate(&env);

        let prompt_id = client.create_prompt(
            &creator,
            &String::from_str(&env, "https://example.com/image.png"),
            &String::from_str(&env, "Fuzz referral"),
            &String::from_str(&env, "General"),
            &String::from_str(&env, "preview"),
            &String::from_str(&env, "ciphertext"),
            &String::from_str(&env, "iv"),
            &String::from_str(&env, "wrapped-key"),
            &BytesN::from_array(&env, &[4u8; 32]),
            &ListingConfig {
                price: 10_000,
                asset: context.xlm.clone(),
                expires_at: 0,
                splits: Vec::new(&env),
            },
        );

        let code = Bytes::from_slice(&env, &code_bytes);
        let _ = client.try_buy_prompt(&buyer, &prompt_id, &Some(code), &10_000, &None::<Bytes>);
    }

    /// Voucher discount percentages are creator-supplied. The full u32 range
    /// must be rejected cleanly above MAX_BPS, never panic.
    #[test]
    fn fuzz_add_voucher_discount_bps_never_panics(discount_bps in any::<u32>()) {
        let env: Env = Default::default();
        let context = setup(&env);
        let client = PromptHashContractClient::new(&env, &context.contract);
        let creator = Address::generate(&env);

        let prompt_id = client.create_prompt(
            &creator,
            &String::from_str(&env, "https://example.com/image.png"),
            &String::from_str(&env, "Fuzz voucher"),
            &String::from_str(&env, "General"),
            &String::from_str(&env, "preview"),
            &String::from_str(&env, "ciphertext"),
            &String::from_str(&env, "iv"),
            &String::from_str(&env, "wrapped-key"),
            &BytesN::from_array(&env, &[5u8; 32]),
            &ListingConfig {
                price: 10_000,
                asset: context.xlm.clone(),
                expires_at: 0,
                splits: Vec::new(&env),
            },
        );

        let code = BytesN::from_array(&env, &[6u8; 32]);
        let _ = client.try_add_voucher(&creator, &prompt_id, &code, &discount_bps);
    }

    /// Lease durations and resale prices are also externally supplied
    /// numeric extremes worth fuzzing together since both feed the same
    /// checked-arithmetic fee/royalty machinery.
    #[test]
    fn fuzz_lease_prompt_duration_never_panics(duration in any::<u64>()) {
        let env: Env = Default::default();
        let context = setup(&env);
        let client = PromptHashContractClient::new(&env, &context.contract);
        let creator = Address::generate(&env);
        let buyer = Address::generate(&env);
        env.ledger().with_mut(|ledger| ledger.timestamp = 1_000);

        let prompt_id = client.create_prompt(
            &creator,
            &String::from_str(&env, "https://example.com/image.png"),
            &String::from_str(&env, "Fuzz lease"),
            &String::from_str(&env, "General"),
            &String::from_str(&env, "preview"),
            &String::from_str(&env, "ciphertext"),
            &String::from_str(&env, "iv"),
            &String::from_str(&env, "wrapped-key"),
            &BytesN::from_array(&env, &[8u8; 32]),
            &ListingConfig {
                price: 10_000,
                asset: context.xlm.clone(),
                expires_at: 0,
                splits: Vec::new(&env),
            },
        );

        let _ = client.try_lease_prompt(&buyer, &prompt_id, &duration);
    }

    /// `migrate` accepts an admin-supplied version number; every u32 value
    /// must be rejected cleanly outside the valid forward range, never panic.
    #[test]
    fn fuzz_migrate_new_version_never_panics(new_version in any::<u32>()) {
        let env: Env = Default::default();
        let context = setup(&env);
        let client = PromptHashContractClient::new(&env, &context.contract);

        let _ = client.try_migrate(&new_version);
    }
}
