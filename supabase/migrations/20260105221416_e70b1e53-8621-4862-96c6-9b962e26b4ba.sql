-- Add status column to asset_categories
ALTER TABLE public.asset_categories 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' 
CHECK (status IN ('active', 'inactive'));

-- Add updated_at column
ALTER TABLE public.asset_categories 
ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_asset_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_asset_categories_updated_at ON public.asset_categories;

CREATE TRIGGER update_asset_categories_updated_at
BEFORE UPDATE ON public.asset_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_asset_categories_updated_at();

-- Create index for faster lookups during import
CREATE INDEX IF NOT EXISTS idx_asset_categories_bu_name 
ON public.asset_categories (bu_id, lower(name)) 
WHERE deleted_at IS NULL;