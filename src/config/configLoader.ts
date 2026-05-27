import fs from "node:fs/promises";
import path from "node:path";
import type {
  AliasConfig,
  AppConfig,
  ArtistConfig,
  GroupsConfig,
  PlatformConfig,
  ScoringConfig,
  VenueConfig
} from "../core/types.js";

async function readJson<T>(filePath: string): Promise<T> {
  const body = await fs.readFile(filePath, "utf8");
  return JSON.parse(body) as T;
}

export async function loadAppConfig(configDir: string): Promise<AppConfig> {
  const [artists, venues, sales, hype, urgency, aliases, platforms, scoring, groups] =
    await Promise.all([
      readJson<ArtistConfig[]>(path.join(configDir, "artists.json")),
      readJson<VenueConfig[]>(path.join(configDir, "venues.json")),
      readJson<string[]>(path.join(configDir, "keywords_sales.json")),
      readJson<string[]>(path.join(configDir, "keywords_hype.json")),
      readJson<string[]>(path.join(configDir, "keywords_urgency.json")),
      readJson<AliasConfig>(path.join(configDir, "aliases.json")),
      readJson<PlatformConfig>(path.join(configDir, "platforms.json")),
      readJson<ScoringConfig>(path.join(configDir, "scoring.json")),
      readJson<GroupsConfig>(path.join(configDir, "groups.json"))
    ]);

  return {
    artists,
    venues,
    keywords: { sales, hype, urgency },
    aliases,
    platforms,
    scoring,
    groups
  };
}
