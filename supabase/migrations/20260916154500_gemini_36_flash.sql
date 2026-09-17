-- Retire Gemini 2.0 / 1.5 defaults in favour of gemini-3.6-flash (Interactions API).

UPDATE public.ai_provider_credentials
SET model = 'gemini-3.6-flash'
WHERE provider = 'gemini'
  AND (
    model IS NULL
    OR model IN (
      'gemini-2.0-flash',
      'models/gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'models/gemini-2.0-flash-lite',
      'gemini-1.5-flash',
      'gemini-1.5-pro'
    )
  );
