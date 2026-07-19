// ============================================================
// TypeScript Interfaces — Dashboard Monitoring Ketenagakerjaan
// ============================================================

// --- Common ---
export interface ScrapedItem {
  id: string;
  source: string;
  title: string;
  date: string; // ISO 8601
  value?: number | Record<string, unknown>;
  summary?: string;
  tags?: string[];
  _source_url: string;
  _scraped_at: string;
}

// --- BPS ---
export interface BPSIndicator {
  id: string;
  indicator: "ihk" | "ekspor" | "impor" | "wisman" | "transportasi";
  title: string;
  date: string;
  period: string;
  value?: number;
  change_mom?: number;
  change_yoy?: number;
  summary: string;
  _source_url: string;
  _scraped_at: string;
}

// --- Kemenaker PHK ---
export interface PHKArticle {
  id: string;
  title: string;
  date: string;
  summary: string;
  workers_affected?: number;
  sector?: string;
  region?: string;
  _source_url: string;
  _scraped_at: string;
}

// --- Bank Indonesia PMI ---
export interface PMIData {
  period: string;
  pmi_value: number;
  sub_indices?: {
    output?: number;
    new_orders?: number;
    employment?: number;
    delivery?: number;
    stocks?: number;
  };
  _source_url: string;
  _scraped_at: string;
}

// --- Setkab ---
export interface SetkabArticle {
  id: string;
  title: string;
  date: string;
  excerpt: string;
  category?: string;
  keywords_matched: string[];
  _source_url: string;
  _scraped_at: string;
}

// --- Google Trends ---
export interface TrendDataPoint {
  date: string;
  value: number;
}

export interface GoogleTrendsData {
  keyword: string;
  source: "node" | "python";
  period: string;
  data: TrendDataPoint[];
  related_queries?: string[];
  regional_interest?: Record<string, number>;
  _scraped_at: string;
}

// --- ASEAN ---
export type DataTier = "official_nso" | "ilo_estimate" | "worldbank_estimate";

export interface ASEANCountryData {
  country_code: string; // ISO 3166-1 alpha-3
  country_name_id: string;
  country_name_en: string;
  flag_emoji: string;
  nso_name: string;
  nso_url: string;
  indicators: {
    unemployment_rate?: {
      value: number;
      period: string;
      _source_url: string;
    };
    lfpr?: {
      value: number;
      period: string;
      _source_url: string;
    };
    employment_by_sector?: {
      data: Record<string, number>;
      period: string;
      _source_url: string;
    };
  };
  last_updated: string;
  data_tier: DataTier;
}

// --- News ---
export interface NewsArticle {
  id: string;
  title: string;
  date: string;
  source: string;
  source_name: string;
  excerpt: string;
  sector_tags: string[];
  keywords_matched: string[];
  _source_url: string;
  _scraped_at: string;
}

// --- Gemini Summaries ---
export type DampakTenagaKerja = "positif" | "negatif" | "netral" | "campuran";
export type TingkatDampak = "tinggi" | "sedang" | "rendah";

export interface ArticleSummary {
  article_id: string;
  source: string;
  original_title: string;
  _source_url: string;
  ringkasan: string;
  dampak_tenaga_kerja: DampakTenagaKerja;
  tingkat_dampak: TingkatDampak;
  angka_penting: string[];
  sektor_terdampak: string[];
  kata_kunci: string[];
  _summarized_at: string;
  _model: string;
  _token_usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

// --- Operational ---
export interface ScraperStatus {
  status: "success" | "partial" | "failed" | "skipped";
  latency_ms: number;
  items_fetched: number;
  items_new: number;
  items_failed: number;
  error_message?: string;
  source_url: string;
  http_status?: number;
  response_size_bytes?: number;
}

export interface ScraperRunLog {
  run_id: string;
  timestamp: string;
  tier: "daily" | "weekly" | "monthly";
  scrapers: Record<string, ScraperStatus>;
  gemini?: {
    articles_summarized: number;
    total_input_tokens: number;
    total_output_tokens: number;
    api_calls: number;
    latency_ms: number;
    rate_limited: boolean;
    errors: number;
  };
  github_actions?: {
    workflow_name: string;
    run_duration_ms: number;
    billable_minutes: number;
  };
}

// --- Metadata ---
export interface SourceMetadata {
  source: string;
  last_fetched: string;
  last_success: string;
  items_total: number;
  status: "ok" | "warning" | "error";
}

export interface MetadataFile {
  last_updated: string;
  sources: Record<string, SourceMetadata>;
}

// --- Survey Period ---
export interface SurveyPeriod {
  id: string;
  survey_month: string;
  release_month: string;
  label: string;
  start_date: string;
  end_date: string;
}
