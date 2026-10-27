ALTER TABLE public.saas_packages
  ADD COLUMN IF NOT EXISTS short_description TEXT NOT NULL DEFAULT '';

UPDATE public.saas_packages
SET short_description = CASE slug
  WHEN 'starter' THEN 'Start your competitor research journey with essential insights.'
  WHEN 'growth' THEN 'Everything you need to find opportunities and grow faster.'
  WHEN 'business' THEN 'Advanced tools and team collaboration for serious growth.'
  ELSE short_description
END
WHERE short_description = '';
