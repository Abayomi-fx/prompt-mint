import { describe, expect, it } from "vitest";
import { Keypair } from "@stellar/stellar-sdk";
import {
  BuyerLibraryMutationBody,
  ChallengeRequestBody,
  LISTING_FIELD_LIMITS,
  UnlockRequestBody,
  parseRequestBody,
  validateListingMetadata,
} from "./requestSchemas";

describe("ChallengeRequestBody", () => {
  it("accepts a valid Stellar address and numeric promptId", () => {
    const buyer = Keypair.random();
    const result = parseRequestBody(ChallengeRequestBody, {
      address: buyer.publicKey(),
      promptId: "42",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing fields with stable error mapping", () => {
    const result = parseRequestBody(ChallengeRequestBody, { promptId: "1" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fields.address).toBeDefined();
    }
  });

  it("rejects non-numeric promptId values", () => {
    const buyer = Keypair.random();
    const result = parseRequestBody(ChallengeRequestBody, {
      address: buyer.publicKey(),
      promptId: "abc",
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown extra properties (strict schema)", () => {
    const buyer = Keypair.random();
    const result = parseRequestBody(ChallengeRequestBody, {
      address: buyer.publicKey(),
      promptId: "1",
      token: "unexpected",
    });
    expect(result.success).toBe(false);
  });
});

describe("UnlockRequestBody", () => {
  it("requires all unlock fields", () => {
    const buyer = Keypair.random();
    const result = parseRequestBody(UnlockRequestBody, {
      token: "jwt",
      promptId: "7",
      address: buyer.publicKey(),
    });
    expect(result.success).toBe(false);
  });

  it("accepts a complete unlock payload", () => {
    const buyer = Keypair.random();
    const result = parseRequestBody(UnlockRequestBody, {
      token: "jwt-token",
      promptId: "7",
      address: buyer.publicKey(),
      signedMessage: "c2lnbmVk",
    });
    expect(result.success).toBe(true);
  });
});

describe("BuyerLibraryMutationBody", () => {
  it("validates save/unsave payloads", () => {
    const buyer = Keypair.random();
    const result = parseRequestBody(BuyerLibraryMutationBody, {
      walletAddress: buyer.publicKey(),
      promptId: "6650f1abc",
    });
    expect(result.success).toBe(true);
  });
});

describe("validateListingMetadata", () => {
  it("preserves existing field-level listing errors", () => {
    const { errors } = validateListingMetadata({
      image: "",
      title: "ab",
      content: "short",
      price: 0,
      category: "marketing",
    });

    expect(errors.image).toBe("Image URL is required.");
    expect(errors.title).toContain("3 characters");
    expect(errors.content).toContain("10 characters");
    expect(errors.price).toContain("greater than zero");
  });

  it("exports limits used by the Express listing validator", () => {
    expect(LISTING_FIELD_LIMITS.title).toBe(100);
    expect(LISTING_FIELD_LIMITS.content).toBe(50_000);
  });
});
