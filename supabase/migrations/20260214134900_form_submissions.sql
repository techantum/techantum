-- Create form_submissions table
CREATE TABLE IF NOT EXISTS public.form_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    product_category TEXT NOT NULL,
    quantity TEXT NOT NULL,
    message TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_form_submissions_created_at ON public.form_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_form_submissions_email ON public.form_submissions(email);
CREATE INDEX IF NOT EXISTS idx_form_submissions_status ON public.form_submissions(status);

-- Enable RLS
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

-- Allow public to insert form submissions (for contact form)
DROP POLICY IF EXISTS "public_can_insert_form_submissions" ON public.form_submissions;
CREATE POLICY "public_can_insert_form_submissions"
ON public.form_submissions
FOR INSERT
TO public
WITH CHECK (true);

-- Allow public to read their own submissions by email
DROP POLICY IF EXISTS "public_can_read_own_form_submissions" ON public.form_submissions;
CREATE POLICY "public_can_read_own_form_submissions"
ON public.form_submissions
FOR SELECT
TO public
USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_form_submission_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_form_submission_timestamp_trigger ON public.form_submissions;
CREATE TRIGGER update_form_submission_timestamp_trigger
BEFORE UPDATE ON public.form_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_form_submission_timestamp();

-- Insert sample data for demonstration
DO $$
BEGIN
    INSERT INTO public.form_submissions (
        id,
        name,
        country,
        email,
        phone,
        product_category,
        quantity,
        message,
        status
    ) VALUES
        (
            gen_random_uuid(),
            'John Smith',
            'United Kingdom',
            'john.smith@example.com',
            '+44 20 1234 5678',
            'Cooking Oils',
            '50 tons',
            'Looking for bulk sunflower oil for our restaurant chain. Need competitive pricing and regular delivery schedule.',
            'pending'
        ),
        (
            gen_random_uuid(),
            'Maria Garcia',
            'Spain',
            'maria.garcia@example.com',
            '+34 91 123 4567',
            'Fertilizers',
            '100 bags',
            'Interested in organic fertilizers for our agricultural cooperative. Please provide product specifications and pricing.',
            'pending'
        ),
        (
            gen_random_uuid(),
            'Ahmed Hassan',
            'United Arab Emirates',
            'ahmed.hassan@example.com',
            '+971 4 123 4567',
            'Wood Pellets',
            '200 tons',
            'Need wood pellets for heating systems in our commercial properties. Require delivery to Dubai.',
            'pending'
        )
    ON CONFLICT (id) DO NOTHING;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Mock data insertion failed: %', SQLERRM;
END $$;
