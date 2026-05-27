import type {
  AppConfig,
  ArtistConfig,
  EntityMatch,
  GroupsConfig,
  NormalizedText,
  Priority,
  VenueConfig
} from "./types.js";
import { normalizeText, relaxedIncludes } from "./normalizer.js";

function artistScoreBoost(artist: ArtistConfig): number {
  if (artist.is_active_primary === false || artist.priority === "context") return 0;
  if (artist.priority === "critical") return 3;
  if (artist.priority === "high") return 3;
  if (artist.priority === "medium") return 2;
  return 1;
}

function uniqueMatches(matches: EntityMatch[]): EntityMatch[] {
  const byName = new Map<string, EntityMatch>();
  for (const match of matches) {
    const existing = byName.get(match.name);
    if (!existing || match.scoreBoost > existing.scoreBoost) {
      byName.set(match.name, match);
    }
  }
  return [...byName.values()];
}

export function matchArtists(text: NormalizedText, artists: ArtistConfig[]): EntityMatch[] {
  const matches: EntityMatch[] = [];
  for (const artist of artists) {
    const candidates = [artist.name, ...artist.aliases, ...(artist.typo_aliases ?? [])];
    const matchedBy = candidates.find((candidate) => relaxedIncludes(text, candidate));
    if (!matchedBy) continue;
    matches.push({
      name: artist.name,
      matchedBy,
      priority: artist.priority,
      scoreBoost: artistScoreBoost(artist),
      isActivePrimary: artist.is_active_primary !== false,
      notes: artist.classification_notes
    });
  }
  return uniqueMatches(matches);
}

export function matchVenues(text: NormalizedText, venues: VenueConfig[]): EntityMatch[] {
  const matches: EntityMatch[] = [];
  for (const venue of venues) {
    const candidates = [venue.name, ...venue.aliases];
    const matchedBy = candidates.find((candidate) => relaxedIncludes(text, candidate));
    if (!matchedBy) continue;
    matches.push({
      name: venue.name,
      matchedBy,
      priority: venue.priority,
      scoreBoost: venue.score_boost
    });
  }
  return uniqueMatches(matches);
}

export function isPriorityGroup(groupName: string | undefined, groups: GroupsConfig): boolean {
  if (!groupName) return false;
  const normalizedGroup = normalizeText(groupName).reduced;
  return groups.priority_groups.some((group) => {
    const normalizedCandidate = normalizeText(group).reduced;
    return normalizedGroup.includes(normalizedCandidate) || normalizedCandidate.includes(normalizedGroup);
  });
}

export function isMutedGroup(groupName: string | undefined, groups: GroupsConfig): boolean {
  if (!groupName) return false;
  const normalizedGroup = normalizeText(groupName).reduced;
  return groups.muted_groups.some((group) => {
    const normalizedCandidate = normalizeText(group).reduced;
    return normalizedGroup.includes(normalizedCandidate) || normalizedCandidate.includes(normalizedGroup);
  });
}

export function shouldWatchGroup(groupName: string | undefined, groups: GroupsConfig): boolean {
  if (!groupName) return true;
  if (isMutedGroup(groupName, groups)) return false;
  if (groups.watch_all_groups) return true;
  if (groups.priority_groups.length === 0) return true;
  return isPriorityGroup(groupName, groups);
}

export function priorityToUrgency(priority: Priority): number {
  if (priority === "critical") return 4;
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  if (priority === "low") return 1;
  return 0;
}

export function detectEntities(text: NormalizedText, config: AppConfig): {
  artists: EntityMatch[];
  venues: EntityMatch[];
} {
  return {
    artists: matchArtists(text, config.artists),
    venues: matchVenues(text, config.venues)
  };
}
