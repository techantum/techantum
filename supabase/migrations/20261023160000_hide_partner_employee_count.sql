-- Business Size already captures company scale; drop the duplicate employee-count field.
DELETE FROM public.partner_question_conditions
WHERE question_id IN (
  SELECT id FROM public.partner_questions WHERE question_key = 'employees'
);

DELETE FROM public.partner_questions
WHERE question_key = 'employees';
