-- Seed Business Development Manager role + 12 assessment areas (100% weight).

INSERT INTO public.recruitment_job_roles (
  title,
  department,
  experience_required,
  employment_type,
  work_location,
  job_description,
  key_responsibilities,
  required_skills,
  preferred_skills,
  minimum_qualification,
  minimum_screening_score,
  score_thresholds,
  status
)
SELECT
  'Business Development Manager',
  'Sales',
  '2–5 years',
  'Full-time',
  'Hyderabad / Hybrid',
  'Own new-business growth for Techantum’s websites, web applications, mobile apps, SaaS, CRM and custom software services. Identify prospects, qualify requirements, run a consultative sales cycle and close IT-services deals with B2B decision makers.',
  'Generate and qualify leads; run discovery calls; map requirements to Techantum solutions; prepare proposals; negotiate and close; maintain CRM pipeline; follow up until conversion; coordinate with delivery after win.',
  'B2B sales, lead generation (cold calling, LinkedIn, email), consultative selling, objection handling, CRM/pipeline discipline, clear client communication.',
  'IT / software / digital-services sales (websites, apps, SaaS, ERP, CRM), international sales, measurable target achievement, proposal writing.',
  'Any graduate; MBA or sales certification preferred',
  70,
  '{"excellent":85,"strong":75,"moderate":65,"partial":50}'::jsonb,
  'ACTIVE'
WHERE NOT EXISTS (
  SELECT 1 FROM public.recruitment_job_roles WHERE title = 'Business Development Manager'
);

INSERT INTO public.recruitment_assessment_areas (
  job_role_id, name, description, weightage, rating_scale_max, mandatory, ai_instructions, display_order, status
)
SELECT r.id, v.name, v.description, v.weightage, 5, v.mandatory, v.ai_instructions, v.display_order, 'ACTIVE'
FROM public.recruitment_job_roles r
CROSS JOIN (
  VALUES
    ('Relevant Sales Experience', 'Total relevant sales experience and responsibility level (ownership vs support).', 10.00, TRUE, 'Score higher for 2–5+ years with independent ownership of a sales motion. Do not invent years; use only resume evidence.', 1),
    ('IT / Software Sales', 'Experience selling websites, apps, SaaS, ERP, CRM or other digital solutions.', 15.00, TRUE, 'Require explicit software/digital-services selling. General product or EdTech sales is not IT-services sales. Missing numbers is a gap, not proof.', 2),
    ('Lead Generation', 'Cold calling, LinkedIn outreach, email campaigns, networking and self-sourced pipeline.', 10.00, TRUE, 'Distinguish personally generated leads vs company-provided leads. Score lower if only inbound or assigned leads are mentioned.', 3),
    ('B2B Sales', 'Experience selling to companies and decision makers rather than consumers.', 10.00, TRUE, 'Look for corporate accounts, distributors, CXO/manager buyers. B2C retail selling should score lower.', 4),
    ('Sales Cycle Experience', 'End-to-end cycle from prospecting through closure.', 10.00, FALSE, 'Need evidence of first contact → discovery → proposal → close. Partial funnel work (only follow-ups) scores mid-range.', 5),
    ('Target Achievement', 'Revenue targets, conversions and measurable performance.', 10.00, FALSE, 'If targets are mentioned without amounts or achievement %, note missing information and suggest a screening question. Do not invent figures.', 6),
    ('Client Communication', 'Client-facing exposure and communication responsibilities.', 10.00, FALSE, 'Meetings, presentations, requirement discussions, written proposals. Internal coordination alone is weaker evidence.', 7),
    ('Negotiation & Closing', 'Objection handling, proposals and deal closure.', 5.00, FALSE, 'Look for closed deals, negotiation, commercial discussions. “Supported sales” without close ownership scores lower.', 8),
    ('Technical Understanding', 'Understanding of software and digital services enough to sell Techantum solutions.', 5.00, FALSE, 'Technical education helps but is not software-sales evidence. Score for ability to discuss websites, apps, CMS, SaaS or similar.', 9),
    ('International Sales', 'Exposure to overseas customers or cross-border selling.', 5.00, FALSE, 'Only score if resume mentions international / overseas / export / US-UK-EU clients. Do not assume from company name.', 10),
    ('CRM / Pipeline Management', 'Usage of CRM tools and follow-up systems.', 5.00, FALSE, 'Look for Salesforce, HubSpot, Zoho, Pipedrive or described pipeline/follow-up process. Do not infer CRM from “sales” alone.', 11),
    ('Career Stability', 'Employment duration, progression and unexplained gaps.', 5.00, FALSE, 'Reward progression and reasonable tenure. Flag frequent short stints or unexplained gaps as risks, not as invented facts.', 12)
) AS v(name, description, weightage, mandatory, ai_instructions, display_order)
WHERE r.title = 'Business Development Manager'
  AND NOT EXISTS (
    SELECT 1 FROM public.recruitment_assessment_areas a WHERE a.job_role_id = r.id
  );
