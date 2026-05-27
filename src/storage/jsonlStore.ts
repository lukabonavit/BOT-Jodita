import fs from "node:fs/promises";
import path from "node:path";
import type { StoredLogRecord } from "../core/types.js";

export class JsonlStore {
  private readonly logPath: string;

  constructor(dataDir: string) {
    this.logPath = path.join(dataDir, "events.jsonl");
  }

  async init(): Promise<void> {
    await fs.mkdir(path.dirname(this.logPath), { recursive: true });
    await fs.appendFile(this.logPath, "", "utf8");
  }

  async append(record: StoredLogRecord): Promise<void> {
    await fs.appendFile(this.logPath, `${JSON.stringify(record)}\n`, "utf8");
  }

  async last(limit = 5): Promise<StoredLogRecord[]> {
    try {
      const body = await fs.readFile(this.logPath, "utf8");
      return body
        .split("\n")
        .filter(Boolean)
        .slice(-limit)
        .map((line) => JSON.parse(line) as StoredLogRecord);
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
      throw error;
    }
  }
}
