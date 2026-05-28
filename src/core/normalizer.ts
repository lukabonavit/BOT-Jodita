import type { AliasConfig, NormalizedText } from "./types.js";

const COMBINING_MARKS = /[\u0300-\u036f]/g;

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function foldText(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(COMBINING_MARKS, "")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function reduceRepeatedLetters(value: string): string {
  return value.replace(/([a-z])\1{1,}/g, "$1");
}

export function normalizeText(raw: string, aliases?: AliasConfig): NormalizedText {
  const lower = raw.toLowerCase();
  let folded = foldText(raw);

  if (aliases?.common_typos) {
    for (const [typo, replacement] of Object.entries(aliases.common_typos)) {
      const typoFolded = foldText(typo);
      const replacementFolded = foldText(replacement);
      folded = folded.replace(new RegExp(escapeRegex(typoFolded), "g"), replacementFolded);
    }
  }

  const reduced = reduceRepeatedLetters(folded).replace(/\s+/g, " ").trim();
  const tokens = reduced.match(/[a-z0-9&:.-]+/g) ?? [];
  return { raw, lower, folded, reduced, tokens };
}

export function normalizeCandidate(value: string): { folded: string; reduced: string } {
  const folded = foldText(value);
  return { folded, reduced: reduceRepeatedLetters(folded) };
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        (current[j - 1] ?? Number.POSITIVE_INFINITY) + 1,
        (previous[j] ?? Number.POSITIVE_INFINITY) + 1,
        (previous[j - 1] ?? Number.POSITIVE_INFINITY) + cost
      );
    }
    for (let j = 0; j <= b.length; j += 1) {
      previous[j] = current[j] ?? 0;
    }
  }

  return previous[b.length] ?? Number.POSITIVE_INFINITY;
}

export function relaxedIncludes(text: NormalizedText, candidate: string): boolean {
  const normalized = normalizeCandidate(candidate);
  if (!normalized.folded) return false;
  if (text.folded.includes(normalized.folded) || text.reduced.includes(normalized.reduced)) {
    return true;
  }

  const isSingleToken = !normalized.reduced.includes(" ");
  if (!isSingleToken || normalized.reduced.length < 4) return false;

  const maxDistance = normalized.reduced.length >= 8 ? 2 : 1;
  return text.tokens.some((token) => {
    if (Math.abs(token.length - normalized.reduced.length) > maxDistance) return false;
    return levenshtein(token, normalized.reduced) <= maxDistance;
  });
}

export function findKeywordMatches(keywords: string[], text: NormalizedText): string[] {
  const matches = new Set<string>();
  for (const keyword of keywords) {
    if (relaxedIncludes(text, keyword)) {
      matches.add(keyword);
    }
  }
  return [...matches];
}

export function stableMessageFingerprint(text: NormalizedText): string {
  return text.reduced
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\b\d{1,2}[:. ]?\d{0,2}\s*(hs?|h)?\b/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}
