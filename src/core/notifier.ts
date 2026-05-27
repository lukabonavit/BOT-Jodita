import type {
  AiAnalysis,
  DetectionResult,
  IncomingMessageContext,
  ProcessedMessage,
  ScoreResult
} from "./types.js";

export interface Notifier {
  sendInstantLinkAlert(
    context: IncomingMessageContext,
    detection: DetectionResult,
    score: ScoreResult,
    purchaseLink: string
  ): Promise<void>;
  sendAlert(processed: ProcessedMessage): Promise<void>;
}

export class ConsoleNotifier implements Notifier {
  async sendInstantLinkAlert(
    context: IncomingMessageContext,
    _detection: DetectionResult,
    score: ScoreResult,
    purchaseLink: string
  ): Promise<void> {
    console.log(
      [
        "VENTA / LINK POSIBLEMENTE ACTIVO",
        `Link: ${purchaseLink}`,
        `Score: ${score.score}`,
        `Grupo: ${context.groupName ?? "-"}`,
        `Mensaje: ${context.rawMessage}`
      ].join("\n")
    );
  }

  async sendAlert(processed: ProcessedMessage): Promise<void> {
    console.log(formatPlainAlert(processed.ai, processed));
  }
}

function formatPlainAlert(ai: AiAnalysis, processed: ProcessedMessage): string {
  return [
    `${processed.alertLevel.toUpperCase()} ${ai.event_type}`,
    ai.summary,
    `Urgencia: ${ai.urgency}`,
    `Confianza: ${ai.confidence}%`,
    `Mensaje: ${processed.context.rawMessage}`
  ].join("\n");
}
