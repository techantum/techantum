export const ENGINE_VERSION = '1.0.0';
export const AI_REVIEW_VERSION = '1.0.0';

export const AUDIT_STATUSES = ['queued', 'running', 'completed', 'partially_completed', 'failed'] as const;
export const FINDING_STATUSES = ['open', 'accepted', 'ticket_created', 'fixed', 'ignored', 'false_positive'] as const;
export const SEVERITIES = ['critical', 'high', 'medium', 'low', 'suggestion'] as const;
export const CATEGORIES = ['ui', 'ux', 'responsive', 'content', 'seo', 'accessibility', 'performance', 'forms'] as const;
export const SOURCES = ['SYSTEM', 'LIGHTHOUSE', 'ACCESSIBILITY', 'BROWSER', 'AI'] as const;
export const ENVIRONMENTS = ['development', 'staging', 'production', 'custom'] as const;
export const SCOPES = ['single', 'website', 'selected'] as const;

export type AuditStatus = (typeof AUDIT_STATUSES)[number];
export type FindingStatus = (typeof FINDING_STATUSES)[number];
export type Severity = (typeof SEVERITIES)[number];
export type Category = (typeof CATEGORIES)[number];
export type FindingSource = (typeof SOURCES)[number];

export type ScoreWeights = Record<Category, number>;
export type SeverityPenalties = Record<Severity, number>;

export type AuditSettings = {
  default_max_pages: number;
  max_pages: number;
  ai_review_enabled: boolean;
  ai_max_pages: number;
  desktop_enabled: boolean;
  mobile_enabled: boolean;
  lighthouse_enabled: boolean;
  accessibility_enabled: boolean;
  forms_enabled: boolean;
  score_weights: ScoreWeights;
  severity_penalties: SeverityPenalties;
  ai_confidence_threshold: number;
  crawl_delay_ms: number;
  page_timeout_ms: number;
  max_depth: number;
  max_content_chars: number;
};

export type FindingDraft = {
  rule_code: string;
  category: Category;
  severity: Severity;
  title: string;
  description: string;
  recommendation: string;
  source: FindingSource;
  selector?: string | null;
  viewport?: string | null;
  evidence?: Record<string, unknown>;
  page_url?: string;
  page_id?: string | null;
  ai_confidence?: number | null;
};

export type ExtractedPage = {
  url: string;
  normalizedUrl: string;
  finalUrl: string;
  httpStatus: number | null;
  title: string;
  metaDescription: string;
  canonical: string | null;
  robots: string;
  lang: string;
  h1: string[];
  headings: { level: number; text: string }[];
  images: { src: string; alt: string | null; emptyAlt: boolean }[];
  links: { href: string; text: string; internal: boolean }[];
  forms: ExtractedForm[];
  openGraph: Record<string, string>;
  hasSchema: boolean;
  visibleText: string;
  contentSample: string;
  htmlBytes: number;
  pageType: string;
};

export type ExtractedForm = {
  action: string;
  method: string;
  inputs: {
    name: string;
    type: string;
    required: boolean;
    label: string;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  }[];
  looksPayment: boolean;
  looksAuth: boolean;
  looksDestructive: boolean;
};

export type TypographyProfile = {
  fontFamilies: Record<string, number>;
  fontSizes: Record<string, number>;
  fontWeights: Record<string, number>;
  headingStyles: Record<string, { size: string; family: string; weight: string; count: number }>;
  bodySize: string | null;
  outliers: { selector: string; size: string; family: string }[];
};

export type LayoutSignals = {
  overflowX: boolean;
  bodyWiderThanViewport: boolean;
  clippedCount: number;
  overlappingCount: number;
  buttonHeightVariance: number;
};

export type BrowserSignals = {
  consoleErrors: string[];
  failedRequests: { url: string; status: number }[];
  jsExceptions: string[];
};

export type PerformanceSummary = {
  performanceScore: number | null;
  accessibilityScore: number | null;
  bestPracticesScore: number | null;
  seoScore: number | null;
  lcp: number | null;
  cls: number | null;
  tbt: number | null;
  fcp: number | null;
  speedIndex: number | null;
  largeResources: { url: string; bytes: number; type: string }[];
  renderBlocking: string[];
};
