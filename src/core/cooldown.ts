import type { DetectionResult, NormalizedText, RuntimeEnv, ScoreResult } from "./types.js";
import { firstPurchaseLink } from "./linkDetector.js";
import { stableMessageFingerprint } from "./normalizer.js";

export interface CooldownDecision {
  suppressed: boolean;
  skipped: boolean;
  reason?: string;
}

export class CooldownManager {
  private readonly seenLinks = new Map<string, number>();
  private readonly recentFingerprints = new Map<string, number>();

  constructor(private readonly env: RuntimeEnv) {}

  decide(detection: DetectionResult, normalized: NormalizedText, score: ScoreResult): CooldownDecision {
    if (score.level === "ignore" || score.level === "log") {
      return { suppressed: true, skipped: false, reason: "below_alert_threshold" };
    }

    const now = Date.now();
    this.prune(now);

    const purchaseLink = firstPurchaseLink(detection.links);
    if (purchaseLink) {
      if (this.seenLinks.has(purchaseLink)) {
        return { suppressed: true, skipped: false, reason: "same_link_seen" };
      }
      this.seenLinks.set(purchaseLink, now);
      return { suppressed: false, skipped: true, reason: "new_link_skips_cooldown" };
    }

    const fingerprint = stableMessageFingerprint(normalized);
    const lastSeen = this.recentFingerprints.get(fingerprint);
    if (lastSeen && now - lastSeen < this.env.alertCooldownMinutes * 60 * 1000) {
      return { suppressed: true, skipped: false, reason: "similar_message_cooldown" };
    }
    this.recentFingerprints.set(fingerprint, now);
    return { suppressed: false, skipped: false };
  }

  private prune(now: number): void {
    const similarityTtl = this.env.similarityWindowMinutes * 60 * 1000;
    for (const [fingerprint, timestamp] of this.recentFingerprints.entries()) {
      if (now - timestamp > similarityTtl) {
        this.recentFingerprints.delete(fingerprint);
      }
    }
  }
}
