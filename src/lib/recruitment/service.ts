import { createAdminClient } from '@/lib/supabase/admin';
import { deleteUploadedFile } from '@/lib/storage/local';
import { runResumeAssessment } from './ai';
import { recommendAction, classifyFit } from './config';
import { buildAreaResults, overallPercent, summarizeScores, validateWeightages } from './scoring';
import type {
  RecruitmentAssessmentArea,
  RecruitmentCandidate,
  RecruitmentJobRole,
  ScoreThresholds,
} from './types';

export async function getRoleDashboard() {
  const supabase = createAdminClient();
  const { data: roles } = await supabase.from('recruitment_job_roles').select('*').order('updated_at', { ascending: false });

  const rows = await Promise.all(
    (roles || []).map(async (role) => {
      const { data: candidates } = await supabase.from('recruitment_candidates').select('status').eq('job_role_id', role.id);
      const list = candidates || [];
      const count = (s: string) => list.filter((c) => c.status === s).length;
      return {
        ...role,
        candidates_total: list.length,
        shortlisted: count('SHORTLISTED') + count('INTERVIEW_SCHEDULED') + count('INTERVIEWED'),
        interviews: count('INTERVIEW_SCHEDULED') + count('INTERVIEWED'),
        selected: count('SELECTED'),
      };
    }),
  );
  return rows;
}

export async function getRoleWithAreas(roleId: string) {
  const supabase = createAdminClient();
  const { data: role, error } = await supabase.from('recruitment_job_roles').select('*').eq('id', roleId).maybeSingle();
  if (error || !role) throw new Error('Role not found');
  const { data: areas } = await supabase
    .from('recruitment_assessment_areas')
    .select('*')
    .eq('job_role_id', roleId)
    .order('display_order');
  return { role: role as RecruitmentJobRole, areas: (areas || []) as RecruitmentAssessmentArea[] };
}

export async function recordStatusChange(
  candidateId: string,
  previous: string | null,
  next: string,
  userId: string,
  comments?: string,
) {
  const supabase = createAdminClient();
  await supabase.from('recruitment_candidate_status_history').insert({
    candidate_id: candidateId,
    previous_status: previous,
    new_status: next,
    changed_by: userId,
    comments: comments || null,
  });
}

export async function deleteCandidate(candidateId: string) {
  const supabase = createAdminClient();
  const { data: candidate, error } = await supabase
    .from('recruitment_candidates')
    .select('id, resume_url')
    .eq('id', candidateId)
    .maybeSingle();
  if (error || !candidate) throw new Error('Candidate not found');

  await supabase.from('recruitment_candidates').update({ latest_assessment_id: null }).eq('id', candidateId);
  const { error: deleteError } = await supabase.from('recruitment_candidates').delete().eq('id', candidateId);
  if (deleteError) throw new Error(deleteError.message);
  await deleteUploadedFile(candidate.resume_url);
}

export async function assessCandidate(candidateId: string, userId: string) {
  const supabase = createAdminClient();
  const { data: candidate, error } = await supabase.from('recruitment_candidates').select('*').eq('id', candidateId).maybeSingle();
  if (error || !candidate) throw new Error('Candidate not found');
  if (!candidate.resume_text?.trim()) throw new Error('Resume text is missing. Re-upload resume.');

  const { role, areas } = await getRoleWithAreas(candidate.job_role_id);
  const weightCheck = validateWeightages(areas);
  if (!weightCheck.valid) {
    throw new Error(`Assessment areas must total 100% weight (currently ${weightCheck.sum}%).`);
  }

  const ai = await runResumeAssessment({ role, areas, resumeText: candidate.resume_text });
  const areaResults = buildAreaResults(areas, ai.area_results).map((r, i) => {
    const extra = ai.area_results.find((a) => a.assessment_area_id === r.assessment_area_id);
    return {
      ...r,
      missing_information: extra?.missing_information || null,
      recommended_question: extra?.recommended_question || null,
    };
  });

  const thresholds = (role.score_thresholds || {}) as ScoreThresholds;
  const summary = summarizeScores(areaResults, thresholds);
  const recommendation = ai.recommendation || summary.recommendation;

  const { data: assessment, error: assessErr } = await supabase
    .from('recruitment_assessments')
    .insert({
      candidate_id: candidateId,
      job_role_id: role.id,
      overall_fit_percent: summary.overall_fit_percent,
      classification: summary.classification,
      recommendation,
      fit_summary: ai.fit_summary,
      strengths: ai.strengths,
      gaps: ai.gaps,
      info_to_validate: ai.info_to_validate,
      screening_questions: ai.screening_questions,
      area_results: areaResults,
      ai_raw: ai,
      created_by: userId,
    })
    .select('*')
    .single();

  if (assessErr || !assessment) throw new Error(assessErr?.message || 'Failed to save assessment');

  const profile = ai.extracted_profile;
  const prevStatus = candidate.status as string;
  const nextStatus = 'AI_ASSESSED';

  const { data: updated, error: updErr } = await supabase
    .from('recruitment_candidates')
    .update({
      name: profile.name || candidate.name,
      email: profile.email || candidate.email,
      phone: profile.phone || candidate.phone,
      location: profile.location || candidate.location,
      total_experience: profile.total_experience || candidate.total_experience,
      relevant_experience: profile.relevant_experience || candidate.relevant_experience,
      current_company: profile.current_company || candidate.current_company,
      current_job_title: profile.current_job_title || candidate.current_job_title,
      extracted_profile: profile,
      status: nextStatus,
      overall_fit_percent: summary.overall_fit_percent,
      ai_classification: summary.classification,
      ai_recommendation: recommendation,
      fit_summary: ai.fit_summary,
      strengths: ai.strengths,
      gaps: ai.gaps,
      info_to_validate: ai.info_to_validate,
      screening_questions: ai.screening_questions,
      latest_assessment_id: assessment.id,
      final_score: summary.overall_fit_percent,
      updated_by: userId,
    })
    .eq('id', candidateId)
    .select('*')
    .single();

  if (updErr) throw new Error(updErr.message);
  if (prevStatus !== nextStatus) {
    await recordStatusChange(candidateId, prevStatus, nextStatus, userId, 'AI assessment completed');
  }

  return { candidate: updated as RecruitmentCandidate, assessment, areaResults };
}

export function meetsMinimumScreening(percent: number, role: RecruitmentJobRole) {
  return percent >= Number(role.minimum_screening_score || 0);
}

export { classifyFit, recommendAction, overallPercent };
