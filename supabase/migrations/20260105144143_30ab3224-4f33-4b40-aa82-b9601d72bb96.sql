
-- Corrigir search_path das funções de trigger
ALTER FUNCTION public.update_asset_updated_at() SET search_path = public;
ALTER FUNCTION public.update_inventory_on_movement() SET search_path = public;
ALTER FUNCTION public.update_keyring_on_movement() SET search_path = public;
ALTER FUNCTION public.update_gift_stock_on_movement() SET search_path = public;
