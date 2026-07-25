import React, { useEffect } from "react";
import {
  SEOConfig,
  formatRobotsMeta,
  resolveCanonicalUrl,
} from "../../lib/seo/robotsCanonical";

export interface SEOHeadProps {
  promptId?: string | number;
  config?: Partial<SEOConfig> | null;
  origin?: string;
}

export const SEOHead: React.FC<SEOHeadProps> = ({
  promptId,
  config,
  origin,
}) => {
  const robotsContent = formatRobotsMeta(config);

  const effectiveOrigin =
    origin ||
    (typeof window !== "undefined" && window.location ? window.location.origin : "");

  const canonicalUrl = promptId
    ? resolveCanonicalUrl(promptId, config?.canonicalUrl, effectiveOrigin)
    : config?.canonicalUrl
    ? resolveCanonicalUrl("", config.canonicalUrl, effectiveOrigin)
    : effectiveOrigin;

  useEffect(() => {
    if (typeof document === "undefined") return;

    // Update <meta name="robots">
    let robotsMeta = document.querySelector<HTMLMetaElement>("meta[name='robots']");
    if (!robotsMeta) {
      robotsMeta = document.createElement("meta");
      robotsMeta.setAttribute("name", "robots");
      document.head.appendChild(robotsMeta);
    }
    robotsMeta.setAttribute("content", robotsContent);

    // Update <meta name="googlebot">
    let googlebotMeta = document.querySelector<HTMLMetaElement>("meta[name='googlebot']");
    if (!googlebotMeta) {
      googlebotMeta = document.createElement("meta");
      googlebotMeta.setAttribute("name", "googlebot");
      document.head.appendChild(googlebotMeta);
    }
    googlebotMeta.setAttribute("content", robotsContent);

    // Update <link rel="canonical">
    let canonicalLink = document.querySelector<HTMLLinkElement>("link[rel='canonical']");
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute("href", canonicalUrl);

    // Update <meta property="og:url">
    let ogUrlMeta = document.querySelector<HTMLMetaElement>("meta[property='og:url']");
    if (!ogUrlMeta) {
      ogUrlMeta = document.createElement("meta");
      ogUrlMeta.setAttribute("property", "og:url");
      document.head.appendChild(ogUrlMeta);
    }
    ogUrlMeta.setAttribute("content", canonicalUrl);
  }, [robotsContent, canonicalUrl]);

  return null;
};
