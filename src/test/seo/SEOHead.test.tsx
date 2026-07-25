import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { SEOHead } from "../../components/seo/SEOHead";

describe("SEOHead Component", () => {
  beforeEach(() => {
    // Clean up document head tags before each test
    const existingRobots = document.querySelector("meta[name='robots']");
    if (existingRobots) existingRobots.remove();

    const existingCanonical = document.querySelector("link[rel='canonical']");
    if (existingCanonical) existingCanonical.remove();

    const existingOg = document.querySelector("meta[property='og:url']");
    if (existingOg) existingOg.remove();
  });

  it("injects default robots meta tag and canonical link into document head", () => {
    render(<SEOHead promptId={99} origin="https://promptmint.io" />);

    const robotsMeta = document.querySelector("meta[name='robots']");
    expect(robotsMeta).not.toBeNull();
    expect(robotsMeta?.getAttribute("content")).toBe("index, follow");

    const canonicalLink = document.querySelector("link[rel='canonical']");
    expect(canonicalLink).not.toBeNull();
    expect(canonicalLink?.getAttribute("href")).toBe("https://promptmint.io/prompts/99");
  });

  it("updates meta tags when custom noindex/nofollow config is provided", () => {
    render(
      <SEOHead
        promptId={99}
        origin="https://promptmint.io"
        config={{
          index: false,
          follow: false,
          noarchive: true,
          canonicalUrl: "https://custom.org/p/99",
        }}
      />
    );

    const robotsMeta = document.querySelector("meta[name='robots']");
    expect(robotsMeta?.getAttribute("content")).toBe("noindex, nofollow, noarchive");

    const canonicalLink = document.querySelector("link[rel='canonical']");
    expect(canonicalLink?.getAttribute("href")).toBe("https://custom.org/p/99");
  });
});
