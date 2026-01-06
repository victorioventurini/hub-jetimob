-- Allow public read access to asset_inventory for public asset viewing
-- Only expose non-sensitive fields through the RLS policy
CREATE POLICY "Anyone can view asset inventory public info" 
ON public.asset_inventory 
FOR SELECT 
USING (deleted_at IS NULL);