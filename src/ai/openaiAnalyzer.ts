import OpenAI from "openai";
import type {
  AiAnalysis,
  DetectionResult,
  IncomingMessageContext,
  RuntimeEnv,
  ScoreResult,
  Urgency
} from "../core/types.js";
import { firstPurchaseLink } from "../core/linkDetector.js";
import { Logger } from "../utils/logger.js";

const JSON_INSTRUCTIONS = `Devolve exclusivamente JSON valido con esta forma:
{
  "is_relevant": true,
  "urgency": "HIGH",
  "confidence": 92,
  "event_type": "sale_active",
  "artists": [],
  "venues": [],
  "platforms": [],
  "detected_time": null,
  "detected_date": null,
  "links": [],
  "purchase_link": null,
  "summary": "",
  "recommendation": "",
  "raw_reasoning_short": ""
}
No incluyas reasoning largo. raw_reasoning_short debe tener maximo 160 caracteres.`;

function clampConfidence(value: unknown, fallback: number): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function urgencyFromValue(value: unknown, fallback: Urgency): Urgency {
  if (value === "LOW" || value === "MEDIUM" || value === "HIGH" || value === "CRITICAL") {
    return value;
  }
  return fallback;
}

function arrayOfStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function safeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function eventTypeFromValue(value: unknown): AiAnalysis["event_type"] {
  const allowed: AiAnalysis["event_type"][] = [
    "sale_active",
    "presale",
    "announcement",
    "rumor",
    "hype",
    "not_relevant",
    "unknown"
  ];
  return allowed.includes(value as AiAnalysis["event_type"])
    ? (value as AiAnalysis["event_type"])
    : "unknown";
}

export class OpenAiAnalyzer {
  private readonly client: OpenAI | null;

  constructor(
    private readonly env: RuntimeEnv,
    private readonly logger: Logger
  ) {
    this.client =
      env.openAiEnabled && env.openAiApiKey ? new OpenAI({ apiKey: env.openAiApiKey }) : null;
  }

  async analyze(
    context: IncomingMessageContext,
    detection: DetectionResult,
    score: ScoreResult
  ): Promise<AiAnalysis> {
    if (!this.client) {
      return this.fallbackAnalysis(context, detection, score);
    }

    try {
      const response = await this.client.chat.completions.create({
        model: this.env.openAiModel,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Sos BOT Jodita, un analista operativo de preventas de musica electronica en Argentina y LATAM. Priorizas links reales, BOMBO mobile/deep links, RRPPs, grupos de WhatsApp, hints y urgencia. No asumas que BOMBO tiene web publica scrapeable estable."
          },
          {
            role: "user",
            content: [
              JSON_INSTRUCTIONS,
              "",
              "Contexto deterministico:",
              JSON.stringify({
                source: context.source,
                group: context.groupName,
                sender: context.senderName,
                score: score.score,
                score_level: score.level,
                score_urgency: score.urgency,
                links: detection.links,
                artists: detection.artists,
                venues: detection.venues,
                times: detection.times,
                keyword_matches: detection.keywordMatches
              }),
              "",
              "Mensaje original:",
              context.rawMessage
            ].join("\n")
          }
        ]
      });

      const content = response.choices[0]?.message.content;
      if (!content) return this.fallbackAnalysis(context, detection, score);
      return this.normalizeAi(JSON.parse(content), detection, score);
    } catch (error) {
      this.logger.warn("OpenAI analysis failed; using fallback", {
        error: error instanceof Error ? error.message : String(error)
      });
      return this.fallbackAnalysis(context, detection, score);
    }
  }

  private normalizeAi(value: Record<string, unknown>, detection: DetectionResult, score: ScoreResult): AiAnalysis {
    const fallback = this.fallbackAnalysisFromDetection(detection, score);
    const links = arrayOfStrings(value.links);
    const purchaseLink = safeString(value.purchase_link, "") || firstPurchaseLink(detection.links);

    return {
      is_relevant: typeof value.is_relevant === "boolean" ? value.is_relevant : fallback.is_relevant,
      urgency: urgencyFromValue(value.urgency, fallback.urgency),
      confidence: clampConfidence(value.confidence, fallback.confidence),
      event_type: eventTypeFromValue(value.event_type),
      artists: arrayOfStrings(value.artists).length > 0 ? arrayOfStrings(value.artists) : fallback.artists,
      venues: arrayOfStrings(value.venues).length > 0 ? arrayOfStrings(value.venues) : fallback.venues,
      platforms:
        arrayOfStrings(value.platforms).length > 0 ? arrayOfStrings(value.platforms) : fallback.platforms,
      detected_time: safeString(value.detected_time, "") || fallback.detected_time,
      detected_date: safeString(value.detected_date, "") || fallback.detected_date,
      links: links.length > 0 ? links : fallback.links,
      purchase_link: purchaseLink,
      summary: safeString(value.summary, fallback.summary),
      recommendation: safeString(value.recommendation, fallback.recommendation),
      raw_reasoning_short: safeString(value.raw_reasoning_short, fallback.raw_reasoning_short).slice(0, 180)
    };
  }

  private fallbackAnalysis(
    context: IncomingMessageContext,
    detection: DetectionResult,
    score: ScoreResult
  ): AiAnalysis {
    const fallback = this.fallbackAnalysisFromDetection(detection, score);
    return {
      ...fallback,
      summary: fallback.summary || `Mensaje relevante detectado en ${context.groupName ?? context.source}.`,
      raw_reasoning_short:
        fallback.raw_reasoning_short || "Analisis local por scoring, entidades, links y horarios."
    };
  }

  private fallbackAnalysisFromDetection(detection: DetectionResult, score: ScoreResult): AiAnalysis {
    const purchaseLink = firstPurchaseLink(detection.links);
    const artists = detection.artists.filter((artist) => artist.isActivePrimary !== false).map((artist) => artist.name);
    const venues = detection.venues.map((venue) => venue.name);
    const firstTime = detection.times[0];
    const hasSale = detection.keywordMatches.sales.length > 0 || Boolean(purchaseLink);
    const eventType: AiAnalysis["event_type"] = purchaseLink
      ? "sale_active"
      : hasSale
        ? "presale"
        : detection.keywordMatches.urgency.length > 0
          ? "announcement"
          : score.level === "ignore"
            ? "not_relevant"
            : "hype";

    return {
      is_relevant: score.level !== "ignore",
      urgency: score.urgency,
      confidence: Math.min(95, Math.max(45, score.score * 4)),
      event_type: eventType,
      artists,
      venues,
      platforms: detection.links.map((link) => link.domain ?? link.kind),
      detected_time: firstTime?.detected_time ?? null,
      detected_date: firstTime?.detected_date ?? null,
      links: detection.links.map((link) => link.url),
      purchase_link: purchaseLink,
      summary: purchaseLink
        ? "Hay un link posiblemente accionable. Conviene abrirlo rapido."
        : hasSale
          ? "El mensaje parece relacionado con venta o preventa."
          : "El mensaje parece relevante por hype, horario, artista o venue.",
      recommendation: purchaseLink
        ? "Abrir el link ahora y verificar compra en BOMBO/app correspondiente."
        : score.urgency === "CRITICAL" || score.urgency === "HIGH"
          ? "Estar atento y preparar app/cuenta/metodo de pago."
          : "Guardar contexto y esperar confirmacion o link directo.",
      raw_reasoning_short: "Heuristica local: score, links, keywords, horarios, artistas y venues."
    };
  }
}
