import type {
  AlertLevel,
  DetectionResult,
  ScoreBreakdownItem,
  ScoreResult,
  ScoringConfig,
  Urgency
} from "./types.js";

const TIER_TERMS = ["lote", "tier", "early bird", "general", "vip", "nuevo lote"];

function levelFromScore(score: number, config: ScoringConfig): AlertLevel {
  if (score < config.thresholds.ignore_below) return "ignore";
  if (score >= config.thresholds.critical_min) return "critical";
  if (score >= config.thresholds.high_min) return "high";
  if (score >= config.thresholds.medium_min) return "medium";
  return "log";
}

function urgencyFrom(score: number, result: DetectionResult, level: AlertLevel): Urgency {
  if (result.links.some((link) => link.isCriticalDeepLink) || level === "critical") return "CRITICAL";
  if (result.links.some((link) => link.isPurchaseCandidate)) return "CRITICAL";
  if (result.times.some((time) => time.relative_minutes !== undefined && time.relative_minutes <= 30)) {
    return "CRITICAL";
  }
  if (score >= 16 || result.keywordMatches.urgency.length > 0) return "HIGH";
  if (score >= 11) return "MEDIUM";
  return "LOW";
}

function add(breakdown: ScoreBreakdownItem[], reason: string, points: number): void {
  if (points <= 0) return;
  breakdown.push({ reason, points });
}

export function scoreDetection(result: DetectionResult, config: ScoringConfig): ScoreResult {
  const weights = config.weights;
  const breakdown: ScoreBreakdownItem[] = [];

  if (result.links.length > 0) {
    add(breakdown, "link_detected", weights.link_detected);
  }
  if (result.links.some((link) => link.isPurchaseCandidate)) {
    add(breakdown, "purchase_link", weights.purchase_link);
  }
  if (result.links.some((link) => link.isCriticalDeepLink)) {
    add(breakdown, "critical_deep_link", weights.critical_deep_link);
  }
  if (result.keywordMatches.sales.length > 0) {
    add(breakdown, `sales_keyword:${result.keywordMatches.sales.join(",")}`, weights.sales_keyword);
  }
  if (result.times.length > 0) {
    add(breakdown, "time_detected", weights.time_detected);
  }
  if (result.artists.some((artist) => artist.scoreBoost > 0)) {
    add(breakdown, "important_artist", weights.important_artist);
  }
  if (result.venues.length > 0) {
    add(breakdown, "important_venue", weights.important_venue);
  }
  if (result.keywordMatches.hype.length > 0 || result.keywordMatches.urgency.length > 0) {
    add(breakdown, "hype_urgency", weights.hype_urgency);
  }
  if (result.groupPriority) {
    add(breakdown, "priority_group", weights.priority_group);
  }
  if (result.keywordMatches.tier.length > 0) {
    add(breakdown, "tier_or_lote", weights.tier_or_lote);
  }
  if (result.keywordMatches.sales.some((keyword) => keyword.includes("sale hoy"))) {
    add(breakdown, "sale_today", weights.sale_today);
  }
  if (
    result.keywordMatches.hype.some((keyword) => keyword.includes("en minutos")) ||
    result.keywordMatches.urgency.some((keyword) => keyword.includes("en minutos")) ||
    result.times.some((time) => time.relative_minutes !== undefined && time.relative_minutes <= 90)
  ) {
    add(breakdown, "in_minutes", weights.in_minutes);
  }

  const score = breakdown.reduce((total, item) => total + item.points, 0);
  const level = levelFromScore(score, config);
  const urgency = urgencyFrom(score, result, level);

  return { score, level, urgency, breakdown };
}

export function detectTierTerms(salesMatches: string[]): string[] {
  return salesMatches.filter((match) =>
    TIER_TERMS.some((term) => match.toLowerCase().includes(term))
  );
}
