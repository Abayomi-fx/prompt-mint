# API Reference

This reference covers the marketplace and account endpoints used by the PromptHash frontend and the Express backend.

## Common Response Rules

- Successful requests return JSON.
- Validation failures return `422` with a field-level error map when available.
- Missing resources return `404`.
- Auth or ownership failures return `403`.

Shared Zod request contracts and edge-case behavior are documented in
[`docs/api-request-schemas.md`](./api-request-schemas.md).

### Idempotent retries

Any `POST`, `PUT`, `PATCH`, or `DELETE` request may include an
`Idempotency-Key` header (a client-generated unique string, e.g. a UUID)
to make retries safe:

- The first request with a given key runs normally and its response is
  cached against that key for 24 hours.
- A retry sent with the **same key and the same request body** replays the
  cached response instead of re-running the handler — the operation is
  performed at most once.
- A retry sent with the same key but a **different** request body is
  rejected with `409 Conflict`.
- A request with the same key that is still being processed is rejected
  with `409 Conflict` rather than allowed to run concurrently.
- The header is entirely optional and only affects requests that send it —
  omitting it preserves the previous (non-idempotent) behavior.

```
POST /api/prompts/buyer/save
Idempotency-Key: 7b3a6e2e-8f2b-4b8b-9b7a-6f7c9c9b1a1e
```

### Shared validation error shape

```json
{
  "error": "Invalid listing metadata",
  "fields": {
    "title": "Title is required.",
    "price": "Price must be greater than zero."
  }
}
```

## Marketplace Endpoints

### List prompts

`GET /api/prompts`

Returns published, active marketplace prompts.

Optional query parameters:

- `category`
- `walletAddress`

Example response:

```json
[
  {
    "_id": "6650f1...",
    "image": "https://example.com/cover.png",
    "title": "Launch Strategy Pack",
    "content": "Public preview text ...",
    "owner": {
      "username": "faithorji",
      "walletAddress": "g..."
    },
    "price": 2.5,
    "category": "Marketing",
    "listingStatus": "published",
    "isActive": true,
    "salesCount": 12
  }
]
```

### Create a prompt

`POST /api/prompts`

Creates a creator listing after validating and normalizing the listing metadata.

Request body:

```json
{
  "image": "https://example.com/cover.png",
  "title": "Launch Strategy Pack",
  "content": "Long-form prompt content",
  "walletAddress": "g...",
  "price": 2.5,
  "category": "marketing"
}
```

Example response:

```json
{
  "message": "Prompt created successfully",
  "prompt": {
    "_id": "6650f1...",
    "title": "Launch Strategy Pack",
    "price": 2.5,
    "category": "Marketing"
  }
}
```

### Publish a draft

`POST /api/prompts/:id/publish`

Publishes a draft prompt after validating required fields.

Example error response:

```json
{
  "error": "Prompt is not publishable",
  "fields": {
    "content": "Content is required."
  }
}
```

### Archive a prompt

`POST /api/prompts/:id/archive`

Marks a prompt as archived and removes it from active workflow views.

### Publish a prompt version

`POST /api/prompts/:id/versions`

Publishes a new encrypted prompt version for the prompt owned by the caller. The request accepts `walletAddress`, `encryptedPayload`, `encryptedPayloadRef`, and an optional `changelog`.

Example response:

```json
{
  "id": "66b2...",
  "versionNumber": 1,
  "contentHash": "e3b0c44298fc1c149afbf4c8996fb924...",
  "encryptedPayloadRef": "s3://prompt/abc123/v1",
  "changelog": "Initial encrypted prompt",
  "createdAt": "2026-07-26T00:00:00.000Z"
}
```

### Get prompt version history

`GET /api/prompts/:id/versions?walletAddress=G...`

Returns all published versions for a prompt, ordered by version number. Only the prompt creator or a buyer with an entitlement may access this history.

Example response:

```json
[
  {
    "versionNumber": 1,
    "changelog": "Initial encrypted prompt",
    "createdAt": "2026-07-26T00:00:00.000Z",
    "contentHash": "e3b0c44298fc1c149afbf4c8996fb924..."
  }
]
```

### Get prompt version detail

`GET /api/prompts/:id/versions/:versionIndex?walletAddress=G...`

Returns a single version record including `encryptedPayloadRef` for entitled buyers or the prompt creator.

Example response:

```json
{
  "versionNumber": 1,
  "contentHash": "e3b0c44298fc1c149afbf4c8996fb924...",
  "encryptedPayloadRef": "s3://prompt/abc123/v1",
  "changelog": "Initial encrypted prompt",
  "createdAt": "2026-07-26T00:00:00.000Z"
}
```

## Buyer Library Endpoints

### Get owned prompts

`GET /api/prompts/buyer/:walletAddress/owned`

Returns prompts tied to purchases for the buyer wallet.

Example response:

```json
{
  "owned": [
    {
      "purchaseId": "66a1...",
      "prompt": {
        "_id": "6650f1...",
        "title": "Launch Strategy Pack",
        "content": "Public preview text ...",
        "category": "Marketing"
      },
      "txHash": "tx_123",
      "versionIndex": 1,
      "purchasedAt": "2026-05-28T10:15:30.000Z"
    }
  ]
}
```

### Get saved prompts

`GET /api/prompts/buyer/:walletAddress/saved`

Returns the buyer's saved marketplace listings.

Example response:

```json
{
  "saved": [
    {
      "purchaseId": "66a1...",
      "prompt": {
        "_id": "6650f1...",
        "title": "Launch Strategy Pack",
        "content": "Preview text ...",
        "price": 2.5,
        "category": "Marketing",
        "owner": {
          "username": "faithorji"
        }
      },
      "savedAt": "2026-05-28T10:15:30.000Z"
    }
  ]
}
```

### Save a prompt

`POST /api/prompts/buyer/save`

Request body:

```json
{
  "walletAddress": "g...",
  "promptId": "6650f1..."
}
```

Example response:

```json
{ "saved": true, "purchaseId": "66a1..." }
```

### Remove a saved prompt

`POST /api/prompts/buyer/unsave`

Request body:

```json
{
  "walletAddress": "g...",
  "promptId": "6650f1..."
}
```

Example response:

```json
{ "saved": false }
```

## Creator Workspace Endpoints

### Get draft prompts

`GET /api/prompts/creator/:walletAddress/drafts`

Returns draft and ready-to-publish prompts for the connected creator wallet.

### Version updates

`POST /api/prompts/version`

Creates a new version for a prompt owned by the calling wallet.

## Account And Auth Flow

### Challenge token

`POST /api/unlock/challenge`

Issues a short-lived challenge token for wallet verification.

### Unlock prompt

`POST /api/unlock/verify`

Verifies the wallet signature and on-chain entitlement before returning decrypted content.

## Notes For Frontend Contributors

- Listing metadata is normalized server-side before persistence.
- Category casing is canonicalized so the frontend can send user-friendly values.
- The buyer dashboard reads from `/api/prompts/buyer/:walletAddress/saved` and `/api/prompts/buyer/:walletAddress/owned` to populate separate library sections.
- Save and unsave actions are intentionally idempotent from the UI perspective.
