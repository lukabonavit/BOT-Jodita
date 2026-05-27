import type { AppConfig, DetectionResult, IncomingMessageContext, ProcessedMessage } from "./types.js";
import { OpenAiAnalyzer } from "../ai/openaiAnalyzer.js";
import { ConfigService } from "../config/configService.js";
import { PatternMemory } from "../learning/patternMemory.js";
import { JsonlStore } from "../storage/jsonlStore.js";
import { Logger } from "../utils/logger.js";
import { CooldownManager } from "./cooldown.js";
import { detectEntities, isPriorityGroup, shouldWatchGroup } from "./entityMatcher.js";
import { detectLinks, firstPurchaseLink } from "./linkDetector.js";
import { findKeywordMatches, normalizeText } from "./normalizer.js";
import type { Notifier } from "./notifier.js";
import { detectTierTerms, scoreDetection } from "./scoring.js";
import { detectTimes } from "./timeDetector.js";

export class MessageProcessor {
  constructor(
    private readonly configService: ConfigService,
    private readonly analyzer: OpenAiAnalyzer,
    private readonly store: JsonlStore,
    private readonly memory: PatternMemory,
    private readonly cooldown: CooldownManager,
    private readonly notifier: Notifier,
    private readonly logger: Logger,
    private readonly timezone: string
  ) {}

  async process(context: IncomingMessageContext): Promise<ProcessedMessage | null> {
    const config = this.configService.get();
    if (!shouldWatchGroup(context.groupName, config.groups)) {
      this.logger.debug("Skipping muted/unwatched group", { group: context.groupName });
      return null;
    }

    const detection = this.detect(context, config);
    const score = scoreDetection(detection, config.scoring);
    if (score.level === "ignore") {
      this.logger.debug("Ignoring low-score message", { score: score.score, group: context.groupName });
      return null;
    }

    const purchaseLink = firstPurchaseLink(detection.links);
    const cooldownDecision = this.cooldown.decide(detection, detection.normalized, score);

    let instantAlertSent = false;
    if (purchaseLink && !cooldownDecision.suppressed) {
      await this.notifier.sendInstantLinkAlert(context, detection, score, purchaseLink);
      instantAlertSent = true;
    }

    const ai = await this.analyzer.analyze(context, detection, score);
    const shouldAlert = !cooldownDecision.suppressed && score.level !== "log";

    const processed: ProcessedMessage = {
      context,
      detection,
      score,
      ai,
      shouldAlert,
      alerted: false,
      alertLevel: score.level,
      purchaseLink,
      cooldownSkipped: cooldownDecision.skipped
    };

    if (shouldAlert && !instantAlertSent) {
      await this.notifier.sendAlert(processed);
      processed.alerted = true;
    } else if (instantAlertSent) {
      processed.alerted = true;
    }

    await this.store.append({
      timestamp: context.timestamp,
      source: context.source,
      group: context.groupName,
      sender: context.senderName,
      raw_message: context.rawMessage,
      normalized_message: detection.normalized.reduced,
      score: score.score,
      alert_level: score.level,
      ai_analysis: ai,
      links: detection.links.map((link) => link.url),
      alerted: processed.alerted,
      urgency: ai.urgency
    });

    await this.memory.observe(processed);
    return processed;
  }

  private detect(context: IncomingMessageContext, config: AppConfig): DetectionResult {
    const normalized = normalizeText(context.rawMessage, config.aliases);
    const links = detectLinks(context.rawMessage, config.platforms);
    const times = detectTimes(context.rawMessage, this.timezone);
    const entities = detectEntities(normalized, config);
    const salesMatches = findKeywordMatches(config.keywords.sales, normalized);
    const hypeMatches = findKeywordMatches(config.keywords.hype, normalized);
    const urgencyMatches = findKeywordMatches(config.keywords.urgency, normalized);

    return {
      normalized,
      links,
      times,
      artists: entities.artists,
      venues: entities.venues,
      keywordMatches: {
        sales: salesMatches,
        hype: hypeMatches,
        urgency: urgencyMatches,
        tier: detectTierTerms(salesMatches)
      },
      groupPriority: isPriorityGroup(context.groupName, config.groups)
    };
  }
}
