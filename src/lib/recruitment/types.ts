export type JobRoleStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';

export type AssessmentAreaStatus = 'ACTIVE' | 'INACTIVE';

export type CandidateStatus =
  | 'NEW'
  | 'AI_ASSESSED'
  | 'SCREENING_REQUIRED'
  | 'SCREENING_COMPLETED'
  | 'SHORTLISTED'
  | 'INTERVIEW_SCHEDULED'
  | 'INTERVIEWED'
  | 'SELECTED'
  | 'HOLD'
  | 'REJECTED';

export interface ScoreThresholds {
  excellent: number;
  strong: number;
  moderate: number;
  partial: number;
}

export interface RecruitmentJobRole {
  id: string;
  role_code: string | null;
  title: string;
  department: string;
  experience_required: string | null;
  employment_type: string;
  work_location: string | null;
  job_description: string | null;
  key_responsibilities: string | null;
  required_skills: string | null;
  preferred_skills: string | null;
  minimum_qualification: string | null;
  minimum_screening_score: number;
  score_thresholds: ScoreThresholds;
  status: JobRoleStatus;
  created_at: string;
  updated_at: string;
}

export interface RecruitmentAssessmentArea {
  id: string;
  job_role_id: string;
  name: string;
  description: string;
  weightage: number;
  rating_scale_max: number;
  mandatory: boolean;
  minimum_required_score: number | null;
  ai_instructions: string | null;
  display_order: number;
  status: AssessmentAreaStatus;
}

export interface RecruitmentCandidate {
  id: string;
  job_role_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  total_experience: string | null;
  relevant_experience: string | null;
  current_company: string | null;
  current_job_title: string | null;
  current_ctc: string | null;
  expected_ctc: string | null;
  notice_period: string | null;
  source: string | null;
  resume_url: string | null;
  resume_file_name: string | null;
  resume_text: string | null;
  extracted_profile: Record<string, unknown> | null;
  status: CandidateStatus | string;
  application_date: string;
  overall_fit_percent: number | null;
  ai_classification: string | null;
  ai_recommendation: string | null;
  fit_summary: string | null;
  strengths: string[] | null;
  gaps: string[] | null;
  info_to_validate: unknown[] | null;
  screening_questions: string[] | null;
  manual_screening_score: number | null;
  final_score: number | null;
  hr_comments: string | null;
  latest_assessment_id: string | null;
  recruitment_job_roles?: RecruitmentJobRole;
}

export interface AreaAssessmentResult {
  assessment_area_id: string;
  area_name: string;
  evidence: string;
  assessment: string;
  rating: number;
  rating_max: number;
  weightage: number;
  weighted_score: number;
  missing_information?: string | null;
  recommended_question?: string | null;
}

export interface AIAssessmentPayload {
  extracted_profile: {
    name: string | null;
    email: string | null;
    phone: string | null;
    location: string | null;
    total_experience: string | null;
    relevant_experience: string | null;
    current_company: string | null;
    current_job_title: string | null;
    education: string | null;
    skills: string[];
    summary: string | null;
  };
  area_results: {
    assessment_area_id: string;
    evidence: string;
    assessment: string;
    rating: number;
    missing_information?: string | null;
    recommended_question?: string | null;
  }[];
  fit_summary: string;
  strengths: string[];
  gaps: string[];
  info_to_validate: { topic: string; detail: string; recommended_question?: string }[];
  screening_questions: string[];
  recommendation: string;
}
