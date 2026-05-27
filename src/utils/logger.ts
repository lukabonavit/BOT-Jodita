import type { RuntimeEnv } from "../core/types.js";

const ranks: Record<RuntimeEnv["logLevel"], number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

export class Logger {
  constructor(private readonly minLevel: RuntimeEnv["logLevel"] = "info") {}

  debug(message: string, meta?: unknown): void {
    this.write("debug", message, meta);
  }

  info(message: string, meta?: unknown): void {
    this.write("info", message, meta);
  }

  warn(message: string, meta?: unknown): void {
    this.write("warn", message, meta);
  }

  error(message: string, meta?: unknown): void {
    this.write("error", message, meta);
  }

  private write(level: RuntimeEnv["logLevel"], message: string, meta?: unknown): void {
    if (ranks[level] < ranks[this.minLevel]) return;
    const suffix = meta === undefined ? "" : ` ${JSON.stringify(meta)}`;
    const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${message}${suffix}`;
    if (level === "error") {
      console.error(line);
      return;
    }
    if (level === "warn") {
      console.warn(line);
      return;
    }
    console.log(line);
  }
}
