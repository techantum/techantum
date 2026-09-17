-- Gemini 2.5 Flash is blocked for new API keys; use 3.6 Flash.

UPDATE public.ai_provider_credentials
SET model = 'gemini-3.6-flash'
WHERE provider = 'gemini'
  AND (
    model IS NULL
    OR model IN (
      'gemini-2.5-flash',
      'models/gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'models/gemini-2.5-flash-lite',
      'gemini-2.0-flash',
      'models/gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-1.5-flash',
      'gemini-1.5-pro'
    )
  );
