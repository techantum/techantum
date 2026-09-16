import { DEFAULT_THRESHOLDS } from './config';
import type { RecruitmentAssessmentArea, RecruitmentJobRole } from './types';

export type AreaTemplate = Omit<RecruitmentAssessmentArea, 'id' | 'job_role_id' | 'created_at' | 'updated_at'>;

export type RoleTemplate = {
  id: string;
  label: string;
  role: Partial<RecruitmentJobRole> & {
    title: string;
    department: string;
    employment_type: string;
    minimum_screening_score: number;
    status: RecruitmentJobRole['status'];
    score_thresholds: RecruitmentJobRole['score_thresholds'];
  };
  areas: AreaTemplate[];
};

function area(
  name: string,
  description: string,
  weightage: number,
  ai_instructions: string,
  display_order: number,
  mandatory = false,
): AreaTemplate {
  return {
    name,
    description,
    weightage,
    rating_scale_max: 5,
    mandatory,
    minimum_required_score: null,
    ai_instructions,
    display_order,
    status: 'ACTIVE',
  };
}

export const BDM_ROLE_TEMPLATE: RoleTemplate = {
  id: 'bdm',
  label: 'Business Development Manager',
  role: {
    title: 'Business Development Manager',
    department: 'Sales',
    experience_required: '2–5 years',
    employment_type: 'Full-time',
    work_location: 'Hyderabad / Hybrid',
    job_description:
      'Own new-business growth for Techantum’s websites, web applications, mobile apps, SaaS, CRM and custom software services. Identify prospects, qualify requirements, run a consultative sales cycle and close IT-services deals with B2B decision makers.',
    key_responsibilities:
      'Generate and qualify leads; run discovery calls; map requirements to Techantum solutions; prepare proposals; negotiate and close; maintain CRM pipeline; follow up until conversion; coordinate with delivery after win.',
    required_skills:
      'B2B sales, lead generation (cold calling, LinkedIn, email), consultative selling, objection handling, CRM/pipeline discipline, clear client communication.',
    preferred_skills:
      'IT / software / digital-services sales (websites, apps, SaaS, ERP, CRM), international sales, measurable target achievement, proposal writing.',
    minimum_qualification: 'Any graduate; MBA or sales certification preferred',
    minimum_screening_score: 70,
    status: 'ACTIVE',
    score_thresholds: DEFAULT_THRESHOLDS,
  },
  areas: [
    area(
      'Relevant Sales Experience',
      'Total relevant sales experience and responsibility level (ownership vs support).',
      10,
      'Score higher for 2–5+ years with independent ownership of a sales motion. Do not invent years; use only resume evidence.',
      1,
      true,
    ),
    area(
      'IT / Software Sales',
      'Experience selling websites, apps, SaaS, ERP, CRM or other digital solutions.',
      15,
      'Require explicit software/digital-services selling. General product or EdTech sales is not IT-services sales. Missing numbers is a gap, not proof.',
      2,
      true,
    ),
    area(
      'Lead Generation',
      'Cold calling, LinkedIn outreach, email campaigns, networking and self-sourced pipeline.',
      10,
      'Distinguish personally generated leads vs company-provided leads. Score lower if only inbound or assigned leads are mentioned.',
      3,
      true,
    ),
    area(
      'B2B Sales',
      'Experience selling to companies and decision makers rather than consumers.',
      10,
      'Look for corporate accounts, distributors, CXO/manager buyers. B2C retail selling should score lower.',
      4,
      true,
    ),
    area(
      'Sales Cycle Experience',
      'End-to-end cycle from prospecting through closure.',
      10,
      'Need evidence of first contact → discovery → proposal → close. Partial funnel work (only follow-ups) scores mid-range.',
      5,
    ),
    area(
      'Target Achievement',
      'Revenue targets, conversions and measurable performance.',
      10,
      'If targets are mentioned without amounts or achievement %, note missing information and suggest a screening question. Do not invent figures.',
      6,
    ),
    area(
      'Client Communication',
      'Client-facing exposure and communication responsibilities.',
      10,
      'Meetings, presentations, requirement discussions, written proposals. Internal coordination alone is weaker evidence.',
      7,
    ),
    area(
      'Negotiation & Closing',
      'Objection handling, proposals and deal closure.',
      5,
      'Look for closed deals, negotiation, commercial discussions. “Supported sales” without close ownership scores lower.',
      8,
    ),
    area(
      'Technical Understanding',
      'Understanding of software and digital services enough to sell Techantum solutions.',
      5,
      'Technical education helps but is not software-sales evidence. Score for ability to discuss websites, apps, CMS, SaaS or similar.',
      9,
    ),
    area(
      'International Sales',
      'Exposure to overseas customers or cross-border selling.',
      5,
      'Only score if resume mentions international / overseas / export / US-UK-EU clients. Do not assume from company name.',
      10,
    ),
    area(
      'CRM / Pipeline Management',
      'Usage of CRM tools and follow-up systems.',
      5,
      'Look for Salesforce, HubSpot, Zoho, Pipedrive or described pipeline/follow-up process. Do not infer CRM from “sales” alone.',
      11,
    ),
    area(
      'Career Stability',
      'Employment duration, progression and unexplained gaps.',
      5,
      'Reward progression and reasonable tenure. Flag frequent short stints or unexplained gaps as risks, not as invented facts.',
      12,
    ),
  ],
};

export const FULL_STACK_ROLE_TEMPLATE: RoleTemplate = {
  id: 'fullstack',
  label: 'Full Stack Developer',
  role: {
    title: 'Full Stack Developer',
    department: 'Engineering',
    experience_required: '2–5 years',
    employment_type: 'Full-time',
    work_location: 'Hyderabad / Hybrid',
    job_description:
      'Build and maintain production websites and web applications for Techantum clients using React, Next.js, Node.js, APIs and PostgreSQL, with clean architecture, debugging and deployment ownership.',
    key_responsibilities:
      'Implement UI and APIs; integrate databases; write maintainable TypeScript; debug production issues; participate in code reviews; deploy and document handovers.',
    required_skills: 'React, Next.js, Node.js, REST APIs, SQL/PostgreSQL, Git, TypeScript/JavaScript.',
    preferred_skills: 'Supabase, Tailwind, CI/CD, cloud deployment, system design, client communication.',
    minimum_qualification: 'B.Tech / B.E. or equivalent practical experience',
    minimum_screening_score: 70,
    status: 'ACTIVE',
    score_thresholds: DEFAULT_THRESHOLDS,
  },
  areas: [
    area('React / Frontend', 'Production React UI work, component architecture and state management.', 15, 'Require named React projects. Tutorials-only or unspecified frontend scores lower.', 1, true),
    area('Next.js', 'App Router or Pages Router, SSR/SSG, routing and production Next.js delivery.', 10, 'Explicit Next.js mentions only. Do not count generic React as Next.js.', 2, true),
    area('Node.js / Backend', 'API servers, business logic and backend ownership.', 15, 'Look for Express/Nest/Next API routes or similar. Frontend-only work scores lower.', 3, true),
    area('APIs & Integrations', 'REST/GraphQL design, third-party APIs, auth and error handling.', 10, 'Need concrete integrations. “Worked on APIs” without detail is moderate evidence.', 4),
    area('Databases', 'SQL modelling, queries, PostgreSQL/MySQL or equivalent.', 10, 'Name the database. No DB mentioned is a gap.', 5, true),
    area('Git & Collaboration', 'Git workflows, PRs, code review and team delivery.', 5, 'Git/GitHub/GitLab or described branching process.', 6),
    area('Deployment', 'Vercel, AWS, Docker, CI/CD or similar production release.', 10, 'Do not infer deployment from “developed website”. Need hosting/CI evidence.', 7),
    area('Architecture', 'Module design, scalability thinking, folder structure and maintainability.', 10, 'Score for system design, multi-module apps, not only landing pages.', 8),
    area('Debugging & Quality', 'Bug fixing, testing, production incident handling.', 10, 'Look for QA, tests, production support. Absence is a gap, not a fail if other evidence is strong.', 9),
    area('Project Experience', 'End-to-end shipped projects with scope and ownership.', 5, 'Prefer named products with outcomes. Intern/assignment-only work scores lower.', 10, true),
  ],
};

export const ROLE_TEMPLATES: RoleTemplate[] = [BDM_ROLE_TEMPLATE, FULL_STACK_ROLE_TEMPLATE];
