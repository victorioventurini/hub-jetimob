-- ============================================
-- Migration: Asset Photos Infrastructure
-- ============================================

-- 1. Helper function to check asset permissions
CREATE OR REPLACE FUNCTION public.has_any_asset_permission(p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM bu_user_permission_templates_v2 bupt
    JOIN permission_template_items_v2 pti ON pti.template_id = bupt.template_id
    WHERE bupt.user_id = (SELECT id FROM profiles WHERE user_id = p_user_id)
    AND pti.permission_key LIKE 'assets.%'
  )
  OR public.is_platform_admin(p_user_id);
$$;

COMMENT ON FUNCTION public.has_any_asset_permission(uuid) IS 'Verifica se usuário tem qualquer permissão do módulo assets';

-- 2. Create asset-photos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'asset-photos', 
  'asset-photos', 
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 3. RLS Policies for asset-photos bucket
CREATE POLICY "Asset managers can upload photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'asset-photos' 
  AND public.has_any_asset_permission(auth.uid())
);

CREATE POLICY "Asset managers can update photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'asset-photos' 
  AND public.has_any_asset_permission(auth.uid())
);

CREATE POLICY "Asset managers can delete photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'asset-photos' 
  AND public.has_any_asset_permission(auth.uid())
);

CREATE POLICY "Public can view asset photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'asset-photos');

-- 4. Add photos column to asset_gift_items
ALTER TABLE asset_gift_items
ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';

COMMENT ON COLUMN asset_gift_items.photos IS 'Array de URLs de fotos do item de brinde';

-- 5. Add photos column to asset_keyrings
ALTER TABLE asset_keyrings  
ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';

COMMENT ON COLUMN asset_keyrings.photos IS 'Array de URLs de fotos do chaveiro';