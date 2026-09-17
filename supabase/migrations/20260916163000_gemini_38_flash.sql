-- Move Gemini default off the overloaded 3.6 Flash model.

UPDATE public.ai_provider_credentials
SET model = 'gemini-3.8-flash'
WHERE provider = 'gemini'
  AND (
    model IS NULL
    OR model IN (
      'gemini-3.6-flash',
      'models/gemini-3.6-flash',
      'gemini-2.0-flash',
      'models/gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-1.5-flash',
      'gemini-1.5-pro'
    )
  );
