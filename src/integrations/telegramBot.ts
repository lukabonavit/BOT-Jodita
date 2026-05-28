import TelegramBot from "node-telegram-bot-api";
import type {
  DetectionResult,
  IncomingMessageContext,
  ProcessedMessage,
  RuntimeEnv,
  ScoreResult
} from "../core/types.js";
import type { Notifier } from "../core/notifier.js";
import { ConfigService } from "../config/configService.js";
import { normalizeText } from "../core/normalizer.js";
import { PatternMemory } from "../learning/patternMemory.js";
import { GroupRegistry } from "../storage/groupRegistry.js";
import { JsonlStore } from "../storage/jsonlStore.js";
import { Logger } from "../utils/logger.js";

const MAX_TELEGRAM_LENGTH = 3900;

export type WhatsAppGroupsRefresh = () => Promise<number>;

function truncate(value: string, max = 900): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function listOrDash(values: string[]): string {
  return values.length > 0 ? values.join(", ") : "-";
}

function firstTime(detection: DetectionResult): string {
  const time = detection.times[0];
  if (!time) return "-";
  if (time.relative_minutes !== undefined) return `en ${time.relative_minutes} minutos`;
  return [time.detected_date, time.detected_time].filter(Boolean).join(" ") || time.raw;
}

function clampTelegram(text: string): string {
  return text.length <= MAX_TELEGRAM_LENGTH ? text : `${text.slice(0, MAX_TELEGRAM_LENGTH - 1)}…`;
}

function formatIndexedGroups(groupNames: string[]): string {
  return groupNames.map((name, index) => `${index + 1}. ${name}`).join("\n");
}

function parseIndexSelection(value: string, max: number): number[] | null {
  const trimmed = value.trim();
  if (!/^\d+(?:[\s,]+\d+)*$/.test(trimmed)) return null;
  const indexes = trimmed
    .split(/[\s,]+/)
    .map((item) => Number.parseInt(item, 10))
    .filter((item) => Number.isInteger(item) && item >= 1 && item <= max);
  return [...new Set(indexes)];
}

function normalizedForGroupSearch(value: string): string {
  return normalizeText(value).reduced;
}

export class TelegramAlertBot implements Notifier {
  private readonly bot: TelegramBot | null;
  private readonly startedAt = new Date();

  constructor(
    private readonly env: RuntimeEnv,
    private readonly configService: ConfigService,
    private readonly store: JsonlStore,
    private readonly memory: PatternMemory,
    private readonly groupRegistry: GroupRegistry,
    private readonly refreshWhatsAppGroups: WhatsAppGroupsRefresh | null,
    private readonly logger: Logger
  ) {
    this.bot = env.telegramBotToken
      ? new TelegramBot(env.telegramBotToken, {
          polling: env.telegramPollingEnabled
            ? {
                interval: 1000,
                autoStart: true,
                params: { timeout: 20 }
              }
            : false
        })
      : null;
  }

  start(): void {
    if (!this.bot) {
      this.logger.warn("Telegram bot disabled: TELEGRAM_BOT_TOKEN is missing");
      return;
    }

    this.registerCommands();
    this.bot.on("polling_error", (error: Error) => {
      this.logger.warn("Telegram polling error; retrying automatically", {
        error: error.message
      });
    });
    this.logger.info("Telegram bot ready", { polling: this.env.telegramPollingEnabled });
  }

  async sendInstantLinkAlert(
    context: IncomingMessageContext,
    detection: DetectionResult,
    score: ScoreResult,
    purchaseLink: string
  ): Promise<void> {
    const text = clampTelegram(
      [
        "🚨 VENTA / LINK POSIBLEMENTE ACTIVO",
        "",
        "🎟️ Link:",
        purchaseLink,
        "",
        "🧠 Resumen:",
        "Link accionable detectado por heuristica local. Se envia sin esperar IA.",
        "",
        `🔥 Urgencia: ${score.urgency}`,
        `📊 Score local: ${score.score}`,
        `📍 Venue: ${listOrDash(detection.venues.map((venue) => venue.name))}`,
        `🎧 Artistas: ${listOrDash(detection.artists.filter((artist) => artist.isActivePrimary !== false).map((artist) => artist.name))}`,
        `🕒 Hora detectada: ${firstTime(detection)}`,
        `👥 Grupo: ${context.groupName ?? "-"}`,
        "",
        "💬 Mensaje original:",
        truncate(context.rawMessage),
        "",
        "✅ Recomendación:",
        "Abrir el link ya y verificar compra en BOMBO/app correspondiente."
      ].join("\n")
    );
    await this.sendToDefaultChat(text);
  }

  async sendAlert(processed: ProcessedMessage): Promise<void> {
    const text =
      processed.alertLevel === "critical" || processed.alertLevel === "high"
        ? this.formatCritical(processed)
        : this.formatMedium(processed);
    await this.sendToDefaultChat(clampTelegram(text));
  }

  private formatCritical(processed: ProcessedMessage): string {
    const ai = processed.ai;
    return [
      "🚨 VENTA / LINK POSIBLEMENTE ACTIVO",
      "",
      "🎟️ Link:",
      ai.purchase_link ?? processed.purchaseLink ?? "-",
      "",
      "🧠 Resumen:",
      ai.summary,
      "",
      `🔥 Urgencia: ${ai.urgency}`,
      `📊 Confianza: ${ai.confidence}%`,
      `📍 Venue: ${listOrDash(ai.venues)}`,
      `🎧 Artistas: ${listOrDash(ai.artists)}`,
      `🕒 Hora detectada: ${ai.detected_time ?? "-"}`,
      `👥 Grupo: ${processed.context.groupName ?? "-"}`,
      "",
      "💬 Mensaje original:",
      truncate(processed.context.rawMessage),
      "",
      "✅ Recomendación:",
      ai.recommendation
    ].join("\n");
  }

  private formatMedium(processed: ProcessedMessage): string {
    const ai = processed.ai;
    return [
      "⚠️ POSIBLE ANUNCIO / PREVENTA",
      "",
      "🧠 Resumen:",
      ai.summary,
      `🕒 Horario mencionado: ${ai.detected_time ?? "-"}`,
      `🎧 Artistas posibles: ${listOrDash(ai.artists)}`,
      `📍 Venue: ${listOrDash(ai.venues)}`,
      `🔥 Urgencia: ${ai.urgency}`,
      `📊 Confianza: ${ai.confidence}%`,
      "",
      "💬 Mensaje:",
      truncate(processed.context.rawMessage)
    ].join("\n");
  }

  private async sendToDefaultChat(text: string): Promise<void> {
    if (!this.bot || !this.env.telegramChatId) {
      this.logger.warn("Telegram alert skipped: missing bot or TELEGRAM_CHAT_ID");
      return;
    }
    await this.bot.sendMessage(this.env.telegramChatId, text, {
      disable_web_page_preview: false
    });
  }

  private registerCommands(): void {
    if (!this.bot) return;

    this.bot.onText(/^\/start$/, async (msg) => {
      await this.bot?.sendMessage(
        msg.chat.id,
        [
          "BOT Jodita esta activo.",
          "",
          `Este chat_id es: ${msg.chat.id}`,
          "",
          "Si estas configurando por primera vez:",
          "1. Copia ese numero.",
          "2. Pegalo en TELEGRAM_CHAT_ID dentro de .env.",
          "3. Guarda .env.",
          "4. Reinicia BOT Jodita.",
          "",
          "Tambien podes usar /status o /chatid."
        ].join("\n")
      );
    });

    this.bot.onText(/^\/status$/, async (msg) => {
      const config = this.configService.get();
      const uptimeMinutes = Math.round((Date.now() - this.startedAt.getTime()) / 60000);
      await this.bot?.sendMessage(
        msg.chat.id,
        [
          "BOT Jodita activo.",
          `Este chat_id: ${msg.chat.id}`,
          `Uptime: ${uptimeMinutes} min`,
          `Artistas: ${config.artists.length}`,
          `Venues: ${config.venues.length}`,
          `Watch all groups: ${config.groups.watch_all_groups ? "si" : "no"}`,
          `Muted groups: ${config.groups.muted_groups.length}`,
          `OpenAI: ${this.env.openAiEnabled && this.env.openAiApiKey ? "on" : "off/fallback"}`
        ].join("\n")
      );
    });

    this.bot.onText(/^\/chatid$/, async (msg) => {
      await this.bot?.sendMessage(msg.chat.id, `Este chat_id es: ${msg.chat.id}`);
    });

    this.bot.onText(/^\/last(?:\s+(\d+))?$/, async (msg, match) => {
      const limit = match?.[1] ? Number.parseInt(match[1], 10) : 5;
      const records = await this.store.last(Math.min(Math.max(limit, 1), 10));
      const text =
        records.length === 0
          ? "Sin eventos guardados todavia."
          : records
              .map((record) =>
                [
                  `${record.timestamp} | ${record.alert_level} | score ${record.score}`,
                  `Grupo: ${record.group ?? "-"}`,
                  `Resumen: ${record.ai_analysis.summary}`,
                  `Links: ${record.links.join(", ") || "-"}`
                ].join("\n")
              )
              .join("\n\n");
      await this.bot?.sendMessage(msg.chat.id, clampTelegram(text));
    });

    this.bot.onText(/^\/keywords$/, async (msg) => {
      const config = this.configService.get();
      await this.bot?.sendMessage(
        msg.chat.id,
        [
          `Sales (${config.keywords.sales.length}): ${config.keywords.sales.slice(0, 12).join(", ")}`,
          `Hype (${config.keywords.hype.length}): ${config.keywords.hype.slice(0, 12).join(", ")}`,
          `Urgency (${config.keywords.urgency.length}): ${config.keywords.urgency.slice(0, 12).join(", ")}`
        ].join("\n")
      );
    });

    this.bot.onText(/^\/addartist\s+(.+)$/, async (msg, match) => {
      const name = match?.[1]?.trim() ?? "";
      const added = await this.configService.addArtist(name);
      await this.bot?.sendMessage(msg.chat.id, added ? `Artista agregado: ${name}` : "No se agrego artista.");
    });

    this.bot.onText(/^\/addkeyword\s+(sales|hype|urgency)\s+(.+)$/, async (msg, match) => {
      const kind = match?.[1] as "sales" | "hype" | "urgency" | undefined;
      const keyword = match?.[2]?.trim() ?? "";
      if (!kind) {
        await this.bot?.sendMessage(msg.chat.id, "Uso: /addkeyword sales|hype|urgency palabra");
        return;
      }
      const added = await this.configService.addKeyword(kind, keyword);
      await this.bot?.sendMessage(msg.chat.id, added ? `Keyword agregada a ${kind}: ${keyword}` : "No se agrego keyword.");
    });

    this.bot.onText(/^\/mute\s+(.+)$/, async (msg, match) => {
      const group = match?.[1]?.trim() ?? "";
      const muted = await this.configService.muteGroup(group);
      await this.bot?.sendMessage(msg.chat.id, muted ? `Grupo muteado: ${group}` : "No se pudo mutear.");
    });

    this.bot.onText(/^\/unmute\s+(.+)$/, async (msg, match) => {
      const group = match?.[1]?.trim() ?? "";
      const unmuted = await this.configService.unmuteGroup(group);
      await this.bot?.sendMessage(msg.chat.id, unmuted ? `Grupo desmuteado: ${group}` : "No se pudo desmutear.");
    });

    this.bot.onText(
      /^\/threshold\s+(ignore_below|log_min|medium_min|high_min|critical_min)\s+(\d+)$/,
      async (msg, match) => {
        const kind = match?.[1] as
          | "ignore_below"
          | "log_min"
          | "medium_min"
          | "high_min"
          | "critical_min"
          | undefined;
        const value = match?.[2] ? Number.parseInt(match[2], 10) : Number.NaN;
        if (!kind || !Number.isFinite(value)) {
          await this.bot?.sendMessage(msg.chat.id, "Uso: /threshold critical_min 23");
          return;
        }
        await this.configService.setThreshold(kind, value);
        await this.bot?.sendMessage(msg.chat.id, `Threshold actualizado: ${kind}=${value}`);
      }
    );

    this.bot.onText(/^\/watchgroups(?:\s+(.*))?$/, async (msg, match) => {
      const args = (match?.[1] ?? "").trim();
      const [action, ...rest] = args.split(/\s+/).filter(Boolean);
      const groupName = rest.join(" ").trim();

      if (action === "all" && (rest[0] === "on" || rest[0] === "off")) {
        await this.configService.setWatchAllGroups(rest[0] === "on");
      } else if (action === "addall") {
        const groups = await this.knownWhatsAppGroupNames();
        if (groups.length === 0) {
          await this.bot?.sendMessage(
            msg.chat.id,
            "No tengo grupos detectados todavia. Usa /whatsappgroups refresh y proba de nuevo."
          );
          return;
        }
        const result = await this.configService.addPriorityGroups(groups);
        await this.bot?.sendMessage(
          msg.chat.id,
          `Grupos agregados: ${result.added.length}. Ya estaban: ${result.skipped.length}.`
        );
      } else if (action === "prune") {
        const groups = await this.knownWhatsAppGroupNames();
        const removed = await this.configService.prunePriorityGroups(groups);
        await this.bot?.sendMessage(
          msg.chat.id,
          removed.length > 0
            ? `Quite ${removed.length} grupos que no estan en WhatsApp:\n${removed.join("\n")}`
            : "Todos los priority_groups existen en la lista detectada de WhatsApp."
        );
      } else if (action === "add" && groupName) {
        const selected = await this.resolveKnownGroups(groupName);
        if (selected.status === "none") {
          await this.bot?.sendMessage(
            msg.chat.id,
            `No encontre ningun grupo de WhatsApp que coincida con "${groupName}". Usa /whatsappgroups refresh y despues agrega por numero.`
          );
          return;
        }
        if (selected.status === "many") {
          await this.bot?.sendMessage(
            msg.chat.id,
            [
              `Encontre varias coincidencias para "${groupName}". Agrega por numero:`,
              formatIndexedGroups(selected.groupNames)
            ].join("\n")
          );
          return;
        }
        const result = await this.configService.addPriorityGroups(selected.groupNames);
        await this.bot?.sendMessage(
          msg.chat.id,
          `Grupos agregados: ${result.added.length}. Ya estaban: ${result.skipped.length}.\n${selected.groupNames.join("\n")}`
        );
      } else if ((action === "remove" || action === "rm") && groupName) {
        const config = this.configService.get();
        const indexes = parseIndexSelection(groupName, config.groups.priority_groups.length);
        const groupNames = indexes
          ? indexes.map((index) => config.groups.priority_groups[index - 1]).filter((name): name is string => Boolean(name))
          : [groupName];
        const result = await this.configService.removePriorityGroups(groupNames);
        await this.bot?.sendMessage(
          msg.chat.id,
          result.removed.length > 0
            ? `Grupos quitados: ${result.removed.length}\n${result.removed.join("\n")}`
            : `No encontre ese grupo en priority_groups.`
        );
      } else if (action && action !== "list") {
        await this.bot?.sendMessage(
          msg.chat.id,
          [
            "Uso:",
            "/watchgroups",
            "/watchgroups list",
            "/watchgroups all on",
            "/watchgroups all off",
            "/watchgroups addall",
            "/watchgroups prune",
            "/watchgroups add 1,2,3",
            "/watchgroups add Nombre del grupo",
            "/watchgroups remove Nombre del grupo"
          ].join("\n")
        );
        return;
      }

      const config = this.configService.get();
      await this.bot?.sendMessage(
        msg.chat.id,
        [
          `Watch all groups: ${config.groups.watch_all_groups ? "on" : "off"}`,
          `Priority groups:\n${config.groups.priority_groups.length > 0 ? formatIndexedGroups(config.groups.priority_groups) : "-"}`,
          `Muted groups: ${config.groups.muted_groups.join(", ") || "-"}`
        ].join("\n")
      );
    });

    this.bot.onText(/^\/whatsappgroups(?:\s+(refresh))?$/, async (msg, match) => {
      const shouldRefresh = match?.[1] === "refresh";
      if ((shouldRefresh || this.groupRegistry.list().length === 0) && this.refreshWhatsAppGroups) {
        const count = await this.refreshWhatsAppGroups();
        if (shouldRefresh) {
          await this.bot?.sendMessage(msg.chat.id, `Refresh WhatsApp terminado. Grupos encontrados: ${count}`);
        }
      }

      const groups = this.groupRegistry.list();
      const text =
        groups.length === 0
          ? "Todavia no tengo grupos de WhatsApp registrados. Inicia WhatsApp, espera a que diga ready y volve a probar."
          : formatIndexedGroups(groups.map((group) => group.name));
      await this.bot?.sendMessage(msg.chat.id, clampTelegram(text));
    });

    this.bot.onText(/^\/memory$/, async (msg) => {
      const snapshot = this.memory.snapshot();
      const topGroups = Object.entries(snapshot.groups)
        .sort(([, a], [, b]) => b.alerts - a.alerts)
        .slice(0, 5)
        .map(([name, stat]) => `${name}: ${stat.alerts}/${stat.messages}`)
        .join("\n");
      await this.bot?.sendMessage(msg.chat.id, topGroups || "Sin memoria acumulada.");
    });
  }

  private async knownWhatsAppGroupNames(): Promise<string[]> {
    if (this.groupRegistry.list().length === 0 && this.refreshWhatsAppGroups) {
      await this.refreshWhatsAppGroups();
    }
    return this.groupRegistry.list().map((group) => group.name);
  }

  private async resolveKnownGroups(
    query: string
  ): Promise<{ status: "one"; groupNames: string[] } | { status: "many"; groupNames: string[] } | { status: "none"; groupNames: [] }> {
    const groups = await this.knownWhatsAppGroupNames();
    const indexes = parseIndexSelection(query, groups.length);
    if (indexes) {
      const groupNames = indexes.map((index) => groups[index - 1]).filter((name): name is string => Boolean(name));
      return groupNames.length > 0 ? { status: "one", groupNames } : { status: "none", groupNames: [] };
    }

    const normalizedQuery = normalizedForGroupSearch(query);
    const exact = groups.filter((group) => normalizedForGroupSearch(group) === normalizedQuery);
    if (exact.length === 1) return { status: "one", groupNames: exact };
    if (exact.length > 1) return { status: "many", groupNames: exact };

    const partial = groups.filter((group) => normalizedForGroupSearch(group).includes(normalizedQuery));
    if (partial.length === 1) return { status: "one", groupNames: partial };
    if (partial.length > 1) return { status: "many", groupNames: partial };

    return { status: "none", groupNames: [] };
  }
}
