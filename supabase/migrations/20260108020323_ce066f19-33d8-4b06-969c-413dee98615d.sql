-- Temporarily disable the BU scope trigger for this migration
ALTER TABLE public.asset_categories DISABLE TRIGGER trg_enforce_bu_scope_asset_categories;

-- Step 1: Soft delete all existing categories in Jetimob BU
UPDATE public.asset_categories
SET deleted_at = now()
WHERE bu_id = 'a0000000-0000-0000-0000-000000000001'
  AND deleted_at IS NULL;

-- Step 2: Copy parent categories from Jet Experience to Jetimob
INSERT INTO public.asset_categories (bu_id, name, description, parent_id, status)
SELECT 
  'a0000000-0000-0000-0000-000000000001' as bu_id,
  name,
  description,
  NULL as parent_id,
  status
FROM public.asset_categories
WHERE bu_id = 'f3d2d8a5-2143-42f0-8738-9b51fb74b49f'
  AND deleted_at IS NULL
  AND parent_id IS NULL;

-- Step 3: Copy subcategories from Jet Experience to Jetimob
WITH parent_mapping AS (
  SELECT 
    old_cat.id as old_id,
    new_cat.id as new_id,
    old_cat.name
  FROM public.asset_categories old_cat
  JOIN public.asset_categories new_cat 
    ON old_cat.name = new_cat.name 
    AND new_cat.bu_id = 'a0000000-0000-0000-0000-000000000001'
    AND new_cat.deleted_at IS NULL
    AND new_cat.parent_id IS NULL
  WHERE old_cat.bu_id = 'f3d2d8a5-2143-42f0-8738-9b51fb74b49f'
    AND old_cat.deleted_at IS NULL
    AND old_cat.parent_id IS NULL
)
INSERT INTO public.asset_categories (bu_id, name, description, parent_id, status)
SELECT 
  'a0000000-0000-0000-0000-000000000001' as bu_id,
  subcat.name,
  subcat.description,
  pm.new_id as parent_id,
  subcat.status
FROM public.asset_categories subcat
JOIN parent_mapping pm ON subcat.parent_id = pm.old_id
WHERE subcat.bu_id = 'f3d2d8a5-2143-42f0-8738-9b51fb74b49f'
  AND subcat.deleted_at IS NULL
  AND subcat.parent_id IS NOT NULL;

-- Re-enable the trigger
ALTER TABLE public.asset_categories ENABLE TRIGGER trg_enforce_bu_scope_asset_categories;