// ── Ingestion input ──────────────────────────────────────────────────────────
export interface TweetInput {
  tweetUrl: string;
  tweetText: string;
  author: string;
  tweetDate: string; // ISO 8601 "YYYY-MM-DD"
}

// ── Claude extraction output ─────────────────────────────────────────────────
export interface ExtractedEvent {
  date: string; // "YYYY-MM-DD"
  category: "MISSILE" | "DRONE" | "OTHER";
  subcategory?: "ballistic" | "cruise" | "UAV" | "unknown" | null;
  countLaunched?: number | null;
  countIntercepted?: number | null;
  countImpact?: number | null;
  location?: string | null;
  interceptionSystem?: string | null;
  notes?: string | null;
  isCumulative?: boolean; // true = authoritative running total since conflict start
}

export interface ClaudeExtractionResult {
  isRelevant: boolean;
  confidence: number; // 0.0–1.0
  needsReview: boolean;
  events: ExtractedEvent[];
}

// ── API response shapes ───────────────────────────────────────────────────────
export interface KpiData {
  // Missile subcategory totals
  ballisticLaunched: number;
  ballisticIntercepted: number;
  cruiseLaunched: number;
  cruiseIntercepted: number;
  // Missile totals (ballistic + cruise combined)
  totalMissilesLaunched: number;
  totalMissilesIntercepted: number;
  missileInterceptionRate: number; // 0–100
  // Drone totals
  totalDronesLaunched: number;
  totalDronesIntercepted: number;
  droneInterceptionRate: number;
  lastUpdated: string | null; // ISO timestamp of latest ingested tweet
}

export interface DailyRow {
  date: string; // "YYYY-MM-DD"
  missilesLaunched: number;
  missilesIntercepted: number;
  dronesLaunched: number;
  dronesIntercepted: number;
  otherLaunched: number;
  otherIntercepted: number;
}

// Authoritative running totals extracted from official statements
export interface CumulativeCheckpoint {
  date: string; // "YYYY-MM-DD"
  missiles: number;
  drones: number;
  other: number;
}

export interface AggregatesResponse {
  kpi: KpiData;
  daily: DailyRow[];
  checkpoints: CumulativeCheckpoint[];
}

export interface TweetWithEvents {
  id: string;
  tweetUrl: string;
  tweetText: string;
  author: string;
  tweetDate: string;
  ingestedAt: string;
  isRelevant: boolean | null;
  confidence: number | null;
  needsReview: boolean;
  events: {
    id: string;
    date: string;
    category: "MISSILE" | "DRONE" | "OTHER";
    subcategory: string | null;
    countLaunched: number | null;
    countIntercepted: number | null;
    countImpact: number | null;
    location: string | null;
    interceptionSystem: string | null;
    notes: string | null;
  }[];
}

export interface TweetsResponse {
  tweets: TweetWithEvents[];
  total: number;
  page: number;
}

// ── Filter state ──────────────────────────────────────────────────────────────
export type ThreatFilter = "ALL" | "MISSILE" | "DRONE" | "OTHER";
export type Granularity = "daily" | "weekly" | "monthly";

export interface DashboardFilters {
  dateFrom: string | null;
  dateTo: string | null;
  threat: ThreatFilter;
  granularity: Granularity;
}

// ── Ingest result ─────────────────────────────────────────────────────────────
export interface IngestResult {
  rawTweetId: string;
  extraction: ClaudeExtractionResult;
  duplicate: false;
}

export interface DuplicateResult {
  duplicate: true;
  existingId: string;
}
