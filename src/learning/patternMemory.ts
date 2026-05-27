import fs from "node:fs/promises";
import path from "node:path";
import type { DetectionResult, IncomingMessageContext, ProcessedMessage } from "../core/types.js";

interface LearnedPatternState {
  groups: Record<string, { messages: number; alerts: number; last_seen: string }>;
  artists: Record<string, { hits: number; last_seen: string }>;
  links: Record<string, { hits: number; first_seen: string; last_seen: string }>;
}

function emptyState(): LearnedPatternState {
  return { groups: {}, artists: {}, links: {} };
}

export class PatternMemory {
  private readonly filePath: string;
  private state: LearnedPatternState = emptyState();

  constructor(dataDir: string) {
    this.filePath = path.join(dataDir, "learned-patterns.json");
  }

  async init(): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      this.state = JSON.parse(await fs.readFile(this.filePath, "utf8")) as LearnedPatternState;
    } catch {
      this.state = emptyState();
      await this.flush();
    }
  }

  async observe(processed: ProcessedMessage): Promise<void> {
    const now = processed.context.timestamp;
    this.observeGroup(processed.context, processed.alerted);
    this.observeArtists(processed.detection, now);
    this.observeLinks(processed.detection, now);
    await this.flush();
  }

  snapshot(): LearnedPatternState {
    return this.state;
  }

  private observeGroup(context: IncomingMessageContext, alerted: boolean): void {
    const group = context.groupName ?? context.source;
    const current = this.state.groups[group] ?? { messages: 0, alerts: 0, last_seen: context.timestamp };
    current.messages += 1;
    current.alerts += alerted ? 1 : 0;
    current.last_seen = context.timestamp;
    this.state.groups[group] = current;
  }

  private observeArtists(detection: DetectionResult, now: string): void {
    for (const artist of detection.artists) {
      const current = this.state.artists[artist.name] ?? { hits: 0, last_seen: now };
      current.hits += 1;
      current.last_seen = now;
      this.state.artists[artist.name] = current;
    }
  }

  private observeLinks(detection: DetectionResult, now: string): void {
    for (const link of detection.links) {
      const current = this.state.links[link.url] ?? { hits: 0, first_seen: now, last_seen: now };
      current.hits += 1;
      current.last_seen = now;
      this.state.links[link.url] = current;
    }
  }

  private async flush(): Promise<void> {
    await fs.writeFile(this.filePath, `${JSON.stringify(this.state, null, 2)}\n`, "utf8");
  }
}
