-- Add branding fields to bu_units
ALTER TABLE public.bu_units
ADD COLUMN IF NOT EXISTS cnpj text,
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS symbol_url text,
ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#0A3D62',
ADD COLUMN IF NOT EXISTS secondary_color text DEFAULT '#EAF2FF';

-- Add index for CNPJ lookups
CREATE INDEX IF NOT EXISTS idx_bu_units_cnpj ON public.bu_units(cnpj) WHERE cnpj IS NOT NULL;

-- Create storage bucket for BU assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('bu-assets', 'bu-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for bu-assets bucket
CREATE POLICY "Public can view BU assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'bu-assets');

CREATE POLICY "Admins can upload BU assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'bu-assets' AND public.is_admin_or_ceo(auth.uid()));

CREATE POLICY "Admins can update BU assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'bu-assets' AND public.is_admin_or_ceo(auth.uid()));

CREATE POLICY "Admins can delete BU assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'bu-assets' AND public.is_admin_or_ceo(auth.uid()));