export type AlertLevel = "ignore" | "log" | "medium" | "high" | "critical";
export type Urgency = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type Priority = "context" | "low" | "medium" | "high" | "critical";

export interface ArtistConfig {
  name: string;
  aliases: string[];
  typo_aliases?: string[];
  genre?: string[];
  priority: Priority;
  popularity_score: number;
  related_labels?: string[];
  likely_venues?: string[];
  is_active_primary?: boolean;
  classification_notes?: string;
}

export interface VenueConfig {
  name: string;
  aliases: string[];
  priority: Priority;
  score_boost: number;
}

export interface AliasConfig {
  slang: Record<string, string[]>;
  common_typos: Record<string, string>;
  platform_aliases: Record<string, string[]>;
}

export interface PlatformConfig {
  purchase_domains: string[];
  critical_deep_link_prefixes: string[];
  shorteners: string[];
  social_domains: string[];
  purchase_path_hints: string[];
}

export interface ScoringConfig {
  weights: Record<
    | "link_detected"
    | "sales_keyword"
    | "time_detected"
    | "important_artist"
    | "important_venue"
    | "hype_urgency"
    | "priority_group"
    | "tier_or_lote"
    | "sale_today"
    | "in_minutes"
    | "purchase_link"
    | "critical_deep_link",
    number
  >;
  thresholds: {
    ignore_below: number;
    log_min: number;
    medium_min: number;
    high_min: number;
    critical_min: number;
  };
}

export interface GroupsConfig {
  watch_all_groups: boolean;
  priority_groups: string[];
  muted_groups: string[];
  group_aliases: Record<string, string>;
}

export interface AppConfig {
  artists: ArtistConfig[];
  venues: VenueConfig[];
  keywords: {
    sales: string[];
    hype: string[];
    urgency: string[];
  };
  aliases: AliasConfig;
  platforms: PlatformConfig;
  scoring: ScoringConfig;
  groups: GroupsConfig;
}

export interface RuntimeEnv {
  nodeEnv: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  telegramPollingEnabled: boolean;
  whatsappEnabled: boolean;
  whatsappSessionName: string;
  whatsappHeadless: boolean;
  puppeteerExecutablePath?: string;
  openAiApiKey?: string;
  openAiEnabled: boolean;
  openAiModel: string;
  configDir: string;
  dataDir: string;
  defaultTimezone: string;
  alertCooldownMinutes: number;
  similarityWindowMinutes: number;
  logLevel: "debug" | "info" | "warn" | "error";
}

export interface IncomingMessageContext {
  id: string;
  source: "whatsapp" | "telegram" | "manual";
  rawMessage: string;
  groupName?: string;
  chatId?: string;
  senderName?: string;
  senderId?: string;
  timestamp: string;
}

export interface NormalizedText {
  raw: string;
  lower: string;
  folded: string;
  reduced: string;
  tokens: string[];
}

export type LinkKind = "critical_deep_link" | "purchase" | "shortener" | "social" | "unknown";

export interface DetectedLink {
  raw: string;
  url: string;
  domain?: string;
  kind: LinkKind;
  isPurchaseCandidate: boolean;
  isCriticalDeepLink: boolean;
}

export interface DetectedTime {
  raw: string;
  detected_time: string | null;
  detected_date: string | null;
  relative_minutes?: number;
  confidence: number;
}

export interface EntityMatch {
  name: string;
  matchedBy: string;
  priority: Priority;
  scoreBoost: number;
  isActivePrimary?: boolean;
  notes?: string;
}

export interface DetectionResult {
  normalized: NormalizedText;
  links: DetectedLink[];
  times: DetectedTime[];
  artists: EntityMatch[];
  venues: EntityMatch[];
  keywordMatches: {
    sales: string[];
    hype: string[];
    urgency: string[];
    tier: string[];
  };
  groupPriority: boolean;
}

export interface ScoreBreakdownItem {
  reason: string;
  points: number;
}

export interface ScoreResult {
  score: number;
  level: AlertLevel;
  urgency: Urgency;
  breakdown: ScoreBreakdownItem[];
}

export interface AiAnalysis {
  is_relevant: boolean;
  urgency: Urgency;
  confidence: number;
  event_type:
    | "sale_active"
    | "presale"
    | "announcement"
    | "rumor"
    | "hype"
    | "not_relevant"
    | "unknown";
  artists: string[];
  venues: string[];
  platforms: string[];
  detected_time: string | null;
  detected_date: string | null;
  links: string[];
  purchase_link: string | null;
  summary: string;
  recommendation: string;
  raw_reasoning_short: string;
}

export interface ProcessedMessage {
  context: IncomingMessageContext;
  detection: DetectionResult;
  score: ScoreResult;
  ai: AiAnalysis;
  shouldAlert: boolean;
  alerted: boolean;
  alertLevel: AlertLevel;
  purchaseLink: string | null;
  cooldownSkipped: boolean;
}

export interface StoredLogRecord {
  timestamp: string;
  source: string;
  group?: string;
  sender?: string;
  raw_message: string;
  normalized_message: string;
  score: number;
  alert_level: AlertLevel;
  ai_analysis: AiAnalysis;
  links: string[];
  alerted: boolean;
  urgency: Urgency;
}
