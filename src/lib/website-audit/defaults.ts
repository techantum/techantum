import type { AuditSettings } from './types';
import { DEFAULT_PENALTIES, DEFAULT_WEIGHTS } from './scoring';

export const DEFAULT_SETTINGS: AuditSettings = {
  default_max_pages: 10,
  max_pages: 25,
  ai_review_enabled: true,
  ai_max_pages: 5,
  desktop_enabled: true,
  mobile_enabled: true,
  lighthouse_enabled: true,
  accessibility_enabled: true,
  forms_enabled: true,
  score_weights: DEFAULT_WEIGHTS,
  severity_penalties: DEFAULT_PENALTIES,
  ai_confidence_threshold: 0.6,
  crawl_delay_ms: 250,
  page_timeout_ms: 20000,
  max_depth: 4,
  max_content_chars: 8000,
};

export function clampPages(value: number, settings: AuditSettings) {
  const n = Number(value || settings.default_max_pages);
  return Math.max(1, Math.min(settings.max_pages, Number.isFinite(n) ? n : settings.default_max_pages));
}
