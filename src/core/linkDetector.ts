import type { DetectedLink, PlatformConfig } from "./types.js";
import { escapeRegex } from "./normalizer.js";

const URL_REGEX =
  /(?:https?:\/\/|www\.|wearebombo:\/\/|bombo:\/\/|t\.me\/|telegram\.me\/|instagram\.com\/|wa\.me\/)[^\s<>"']+/gi;

const TRAILING_NON_URL = /[^\w/#?=&.%:+~-]+$/u;

function cleanUrl(raw: string): string {
  return raw.replace(TRAILING_NON_URL, "");
}

function withProtocol(raw: string): string {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) return raw;
  if (raw.startsWith("www.")) return `https://${raw}`;
  if (raw.startsWith("t.me/") || raw.startsWith("telegram.me/")) return `https://${raw}`;
  if (raw.startsWith("instagram.com/")) return `https://${raw}`;
  if (raw.startsWith("wa.me/")) return `https://${raw}`;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(?:\/|$)/i.test(raw)) return `https://${raw}`;
  return raw;
}

function safeDomain(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return undefined;
  }
}

function startsWithAny(value: string, prefixes: string[]): boolean {
  const lower = value.toLowerCase();
  return prefixes.some((prefix) => lower.startsWith(prefix.toLowerCase()));
}

export function detectLinks(rawMessage: string, platforms: PlatformConfig): DetectedLink[] {
  const matches = collectLinkCandidates(rawMessage, platforms);
  const seen = new Set<string>();
  const links: DetectedLink[] = [];

  for (const match of matches) {
    const raw = cleanUrl(match);
    const url = withProtocol(raw);
    if (seen.has(url)) continue;
    seen.add(url);

    const domain = safeDomain(url);
    const lowerUrl = url.toLowerCase();
    const isCriticalDeepLink = startsWithAny(url, platforms.critical_deep_link_prefixes);
    const isPurchaseDomain = domain ? platforms.purchase_domains.includes(domain) : false;
    const isShortener = domain ? platforms.shorteners.includes(domain) : false;
    const isSocial = domain ? platforms.social_domains.includes(domain) : false;
    const hasPurchasePathHint = platforms.purchase_path_hints.some((hint) =>
      lowerUrl.includes(hint.toLowerCase())
    );
    const isPurchaseCandidate = isCriticalDeepLink || isPurchaseDomain || hasPurchasePathHint;
    const kind = isCriticalDeepLink
      ? "critical_deep_link"
      : isPurchaseCandidate
        ? "purchase"
        : isShortener
          ? "shortener"
          : isSocial
            ? "social"
            : "unknown";

    links.push({
      raw,
      url,
      domain,
      kind,
      isPurchaseCandidate,
      isCriticalDeepLink
    });
  }

  return links;
}

function collectLinkCandidates(rawMessage: string, platforms: PlatformConfig): string[] {
  const matches = new Set(rawMessage.match(URL_REGEX) ?? []);
  for (const domain of [...platforms.purchase_domains, ...platforms.shorteners, ...platforms.social_domains]) {
    const domainRegex = new RegExp(`(?:https?:\\/\\/)?(?:www\\.)?${escapeRegex(domain)}(?:\\/[^\\s<>"']*)?`, "gi");
    for (const match of rawMessage.match(domainRegex) ?? []) {
      matches.add(match);
    }
  }
  return [...matches];
}

export function firstPurchaseLink(links: DetectedLink[]): string | null {
  return links.find((link) => link.isPurchaseCandidate)?.url ?? links[0]?.url ?? null;
}
