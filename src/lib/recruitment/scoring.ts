import type { AreaAssessmentResult, RecruitmentAssessmentArea, ScoreThresholds } from './types';
import { classifyFit, recommendAction } from './config';

export function computeWeightedScore(rating: number, ratingMax: number, weightage: number) {
  if (ratingMax <= 0) return 0;
  const clamped = Math.max(0, Math.min(rating, ratingMax));
  return Math.round(((clamped / ratingMax) * weightage) * 100) / 100;
}

export function buildAreaResults(
  areas: RecruitmentAssessmentArea[],
  aiAreas: { assessment_area_id: string; evidence: string; assessment: string; rating: number }[],
): AreaAssessmentResult[] {
  const byId = new Map(areas.map((a) => [a.id, a]));
  return aiAreas
    .map((row) => {
      const area = byId.get(row.assessment_area_id);
      if (!area) return null;
      const rating = Math.max(0, Math.min(row.rating, area.rating_scale_max));
      return {
        assessment_area_id: area.id,
        area_name: area.name,
        evidence: row.evidence,
        assessment: row.assessment,
        rating,
        rating_max: area.rating_scale_max,
        weightage: Number(area.weightage),
        weighted_score: computeWeightedScore(rating, area.rating_scale_max, Number(area.weightage)),
      };
    })
    .filter(Boolean) as AreaAssessmentResult[];
}

export function overallPercent(areaResults: AreaAssessmentResult[]) {
  const total = areaResults.reduce((sum, r) => sum + r.weighted_score, 0);
  return Math.round(total * 100) / 100;
}

export function summarizeScores(areaResults: AreaAssessmentResult[], thresholds: ScoreThresholds) {
  const percent = overallPercent(areaResults);
  return {
    overall_fit_percent: percent,
    classification: classifyFit(percent, thresholds),
    recommendation: recommendAction(percent, thresholds),
  };
}

export function validateWeightages(areas: { weightage: number; status?: string }[]) {
  const active = areas.filter((a) => a.status !== 'INACTIVE');
  const sum = active.reduce((s, a) => s + Number(a.weightage || 0), 0);
  return { valid: Math.abs(sum - 100) < 0.01, sum: Math.round(sum * 100) / 100 };
}
