import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import type { RuntimeEnv } from "../core/types.js";

function boolFromEnv(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "y", "on"].includes(value.toLowerCase());
}

function intFromEnv(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function logLevelFromEnv(value: string | undefined): RuntimeEnv["logLevel"] {
  if (value === "debug" || value === "info" || value === "warn" || value === "error") {
    return value;
  }
  return "info";
}

function detectBrowserExecutablePath(): string | undefined {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe")
      : undefined,
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
  ].filter((candidate): candidate is string => Boolean(candidate));

  return candidates.find((candidate) => fs.existsSync(candidate));
}

export function loadEnv(cwd = process.cwd()): RuntimeEnv {
  return {
    nodeEnv: process.env.NODE_ENV ?? "development",
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    telegramChatId: process.env.TELEGRAM_CHAT_ID,
    telegramPollingEnabled: boolFromEnv(process.env.TELEGRAM_POLLING_ENABLED, true),
    whatsappEnabled: boolFromEnv(process.env.WHATSAPP_ENABLED, true),
    whatsappSessionName: process.env.WHATSAPP_SESSION_NAME ?? "bot-jodita",
    whatsappHeadless: boolFromEnv(process.env.WHATSAPP_HEADLESS, false),
    puppeteerExecutablePath: detectBrowserExecutablePath(),
    openAiApiKey: process.env.OPENAI_API_KEY,
    openAiEnabled: boolFromEnv(process.env.OPENAI_ENABLED, true),
    openAiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    configDir: path.resolve(cwd, process.env.CONFIG_DIR ?? "./config"),
    dataDir: path.resolve(cwd, process.env.DATA_DIR ?? "./data"),
    defaultTimezone: process.env.DEFAULT_TIMEZONE ?? "America/Argentina/Buenos_Aires",
    alertCooldownMinutes: intFromEnv(process.env.ALERT_COOLDOWN_MINUTES, 12),
    similarityWindowMinutes: intFromEnv(process.env.SIMILARITY_WINDOW_MINUTES, 30),
    logLevel: logLevelFromEnv(process.env.LOG_LEVEL)
  };
}
