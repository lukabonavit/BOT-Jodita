import fs from "node:fs/promises";
import path from "node:path";
import type { AppConfig, ArtistConfig, RuntimeEnv, ScoringConfig } from "../core/types.js";
import { loadAppConfig } from "./configLoader.js";

type KeywordKind = "sales" | "hype" | "urgency";
type ThresholdKind = keyof ScoringConfig["thresholds"];

function prettyJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export class ConfigService {
  private config: AppConfig | null = null;

  constructor(private readonly env: RuntimeEnv) {}

  async load(): Promise<AppConfig> {
    this.config = await loadAppConfig(this.env.configDir);
    return this.config;
  }

  get(): AppConfig {
    if (!this.config) {
      throw new Error("Config not loaded");
    }
    return this.config;
  }

  async reload(): Promise<AppConfig> {
    return this.load();
  }

  async addKeyword(kind: KeywordKind, keyword: string): Promise<boolean> {
    const cleanKeyword = keyword.trim();
    if (!cleanKeyword) return false;
    const fileName =
      kind === "sales"
        ? "keywords_sales.json"
        : kind === "hype"
          ? "keywords_hype.json"
          : "keywords_urgency.json";
    const filePath = path.join(this.env.configDir, fileName);
    const values = JSON.parse(await fs.readFile(filePath, "utf8")) as string[];
    if (values.some((value) => value.toLowerCase() === cleanKeyword.toLowerCase())) {
      return false;
    }
    values.push(cleanKeyword);
    await fs.writeFile(filePath, prettyJson(values), "utf8");
    await this.reload();
    return true;
  }

  async addArtist(name: string): Promise<boolean> {
    const cleanName = name.trim();
    if (!cleanName) return false;
    const filePath = path.join(this.env.configDir, "artists.json");
    const artists = JSON.parse(await fs.readFile(filePath, "utf8")) as ArtistConfig[];
    if (artists.some((artist) => artist.name.toLowerCase() === cleanName.toLowerCase())) {
      return false;
    }
    artists.push({
      name: cleanName,
      aliases: [],
      typo_aliases: [],
      genre: [],
      priority: "medium",
      popularity_score: 7,
      related_labels: [],
      likely_venues: []
    });
    await fs.writeFile(filePath, prettyJson(artists), "utf8");
    await this.reload();
    return true;
  }

  async setThreshold(kind: ThresholdKind, value: number): Promise<void> {
    const filePath = path.join(this.env.configDir, "scoring.json");
    const scoring = JSON.parse(await fs.readFile(filePath, "utf8")) as ScoringConfig;
    scoring.thresholds[kind] = value;
    await fs.writeFile(filePath, prettyJson(scoring), "utf8");
    await this.reload();
  }

  async muteGroup(groupName: string): Promise<boolean> {
    const config = this.get();
    const cleanGroup = groupName.trim();
    if (!cleanGroup) return false;
    if (config.groups.muted_groups.includes(cleanGroup)) return false;
    config.groups.muted_groups.push(cleanGroup);
    await this.saveGroups();
    return true;
  }

  async unmuteGroup(groupName: string): Promise<boolean> {
    const config = this.get();
    const cleanGroup = groupName.trim();
    const before = config.groups.muted_groups.length;
    config.groups.muted_groups = config.groups.muted_groups.filter((group) => group !== cleanGroup);
    await this.saveGroups();
    return config.groups.muted_groups.length !== before;
  }

  async setWatchAllGroups(value: boolean): Promise<void> {
    const config = this.get();
    config.groups.watch_all_groups = value;
    await this.saveGroups();
  }

  async addPriorityGroup(groupName: string): Promise<boolean> {
    const config = this.get();
    const cleanGroup = groupName.trim();
    if (!cleanGroup) return false;
    if (config.groups.priority_groups.includes(cleanGroup)) return false;
    config.groups.priority_groups.push(cleanGroup);
    await this.saveGroups();
    return true;
  }

  async addPriorityGroups(groupNames: string[]): Promise<{ added: string[]; skipped: string[] }> {
    const added: string[] = [];
    const skipped: string[] = [];
    for (const groupName of groupNames) {
      const didAdd = await this.addPriorityGroup(groupName);
      if (didAdd) {
        added.push(groupName);
      } else {
        skipped.push(groupName);
      }
    }
    return { added, skipped };
  }

  async removePriorityGroup(groupName: string): Promise<boolean> {
    const config = this.get();
    const cleanGroup = groupName.trim();
    const before = config.groups.priority_groups.length;
    config.groups.priority_groups = config.groups.priority_groups.filter((group) => group !== cleanGroup);
    await this.saveGroups();
    return config.groups.priority_groups.length !== before;
  }

  async removePriorityGroups(groupNames: string[]): Promise<{ removed: string[]; skipped: string[] }> {
    const removed: string[] = [];
    const skipped: string[] = [];
    for (const groupName of groupNames) {
      const didRemove = await this.removePriorityGroup(groupName);
      if (didRemove) {
        removed.push(groupName);
      } else {
        skipped.push(groupName);
      }
    }
    return { removed, skipped };
  }

  async prunePriorityGroups(validGroupNames: string[]): Promise<string[]> {
    const config = this.get();
    const valid = new Set(validGroupNames);
    const before = config.groups.priority_groups;
    config.groups.priority_groups = before.filter((groupName) => valid.has(groupName));
    const removed = before.filter((groupName) => !valid.has(groupName));
    if (removed.length > 0) {
      await this.saveGroups();
    }
    return removed;
  }

  private async saveGroups(): Promise<void> {
    const config = this.get();
    const filePath = path.join(this.env.configDir, "groups.json");
    await fs.writeFile(filePath, prettyJson(config.groups), "utf8");
    await this.reload();
  }
}
