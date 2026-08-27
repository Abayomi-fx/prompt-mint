# Soroban Deployment & Upgrade Scripts

This directory contains scripts to automate the deployment, initialization, and upgrade of the `PromptHash` contract.

## Prerequisites

- [Stellar CLI](https://developers.stellar.org/docs/build/smart-contracts/getting-started/setup#install-the-stellar-cli) installed.
- Rust and Soroban target installed (`rustup target add wasm32-unknown-unknown`).

## Scripts

### 1. `deploy.sh`
Deploys and initializes the contract to a specified network. It also automatically updates your `.env` and `.env.local` files.

**Usage:**
```bash
# Deploy to testnet (default)
./scripts/deploy.sh

# Deploy to local network
./scripts/deploy.sh local
```

**Environment Variables:**
- `NETWORK`: Target network (`testnet`, `local`). Defaults to `testnet`.
- `ADMIN_ALIAS`: Alias for the admin identity. Defaults to `admin`.
- `FEE_WALLET_ALIAS`: Alias for the fee wallet identity. Defaults to `fee_wallet`.

### 2. `upgrade.sh`
Upgrades an existing contract instance with a new Wasm version.

**Usage:**
```bash
# Upgrade on testnet
./scripts/upgrade.sh

# Upgrade on local
./scripts/upgrade.sh local
```

**Note:** Ensure `CONTRACT_ID` is set in your `.env` file or passed as an environment variable.

### 3. Security testing (`scripts/security/`)

- `dast-target.mjs` — local OpenAPI-faithful HTTP API used by OWASP ZAP in `.github/workflows/security-pentest.yml`. Run with `yarn security:dast-target` (listens on `127.0.0.1:5000`).
- `contract-analysis.sh` — Slither (when Solidity is present) plus cargo clippy, cargo-audit, and Soroban detectors. Run with `yarn security:contract-analysis`.

See `docs/security/penetration-testing.md` for cadence and `docs/contract-gas-benchmarks.md` for contract resource-cost gates (`yarn test:gas`).

### 4. `verify.sh`
Performs a comprehensive check of the deployed contract's configuration (owner, fee settings, XLM SAC, etc.).

**Usage:**
```bash
./scripts/verify.sh local
```

## Environment Consistency

The `deploy.sh` script synchronizes the following variables across `.env` and `.env.local`:
- `PUBLIC_STELLAR_NETWORK`
- `PUBLIC_STELLAR_NETWORK_PASSPHRASE`
- `PUBLIC_STELLAR_RPC_URL`
- `PUBLIC_PROMPT_HASH_CONTRACT_ID`
- `PUBLIC_STELLAR_NATIVE_ASSET_CONTRACT_ID`

This ensures that the frontend and backend are always pointing to the correct contract instance.

## Upgrade Flow Assumptions

- The `upgrade` function can only be called by the current contract owner.
- The new Wasm hash must be installed on the network first (handled by the script).
- Contract state is preserved during the upgrade.
