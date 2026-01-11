import { useQuery } from "@tanstack/react-query";
import { useOptionalBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";
import type { AssetInventory, AssetMovement, AssetCategory } from "../types";

export interface UseInventoryFilters {
  search?: string;
  statusFilter?: string;
  categoryFilter?: string;
  holderFilter?: string;
  locationFilter?: string;
}

const DEFAULT_LIMIT = 1000;

// Shared field lists for consistency
const INVENTORY_FIELDS = `
  id, bu_id, internal_code, name, category_id, description, status,
  home_location_id, current_holder_type, current_location_id, current_user_id,
  assigned_at, last_moved_at, acquired_at, acquisition_value, serial_number,
  brand, model, quantity_total, quantity_available, photos, documents, notes,
  created_at, updated_at,
  category:asset_categories!category_id(id, name)
`;

const MOVEMENT_FIELDS = `
  id, bu_id, asset_id, movement_type, from_holder_type, from_location_id, 
  from_user_id, to_holder_type, to_location_id, to_user_id, 
  authorized_by_user_id, performed_by_user_id, occurred_at, due_at, returned_at, 
  notes, created_at
`;

// Helper to enrich items with location and profile data
async function enrichInventoryItems(
  supabase: ReturnType<typeof useOptionalBuScopedSupabase>,
  items: any[]
): Promise<AssetInventory[]> {
  if (!supabase || items.length === 0) return items as AssetInventory[];

  const locationIds = [...new Set(items.flatMap(i => [i.home_location_id, i.current_location_id].filter(Boolean)))];
  const profileIds = [...new Set(items.map(i => i.current_user_id).filter(Boolean))];

  const [{ data: locations }, { data: profiles }] = await Promise.all([
    locationIds.length > 0 
      ? supabase.from("bu_locations").select("id, name").in("id", locationIds)
      : Promise.resolve({ data: [] }),
    profileIds.length > 0
      ? supabase.from("profiles").select("id, first_name, last_name, display_name, photo_url").in("id", profileIds)
      : Promise.resolve({ data: [] }),
  ]);

  const locationMap = new Map((locations || []).map(l => [l.id, l]));
  const profileMap = new Map((profiles || []).map(p => [p.id, {
    id: p.id,
    full_name: p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Sem nome',
    avatar_url: p.photo_url,
  }]));

  return items.map(i => ({
    ...i,
    home_location: i.home_location_id ? locationMap.get(i.home_location_id) || null : null,
    current_location: i.current_location_id ? locationMap.get(i.current_location_id) || null : null,
    current_user: i.current_user_id ? profileMap.get(i.current_user_id) || null : null,
  })) as AssetInventory[];
}

// Helper to enrich movements with location and profile data
async function enrichMovements(
  supabase: ReturnType<typeof useOptionalBuScopedSupabase>,
  movements: any[]
): Promise<AssetMovement[]> {
  if (!supabase || movements.length === 0) return movements as AssetMovement[];

  const locationIds = [...new Set(movements.flatMap(m => [m.from_location_id, m.to_location_id].filter(Boolean)))];
  const profileIds = [...new Set(movements.flatMap(m => [
    m.from_user_id, m.to_user_id, m.authorized_by_user_id, m.performed_by_user_id
  ].filter(Boolean)))];

  const [{ data: locations }, { data: profiles }] = await Promise.all([
    locationIds.length > 0
      ? supabase.from("bu_locations").select("id, name").in("id", locationIds)
      : Promise.resolve({ data: [] }),
    profileIds.length > 0
      ? supabase.from("profiles").select("id, first_name, last_name, display_name").in("id", profileIds)
      : Promise.resolve({ data: [] }),
  ]);

  const locationMap = new Map((locations || []).map(l => [l.id, l]));
  const profileMap = new Map((profiles || []).map(p => [p.id, {
    id: p.id,
    full_name: p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Sem nome',
  }]));

  return movements.map(m => ({
    ...m,
    from_location: m.from_location_id ? locationMap.get(m.from_location_id) || null : null,
    from_user: m.from_user_id ? profileMap.get(m.from_user_id) || null : null,
    to_location: m.to_location_id ? locationMap.get(m.to_location_id) || null : null,
    to_user: m.to_user_id ? profileMap.get(m.to_user_id) || null : null,
    authorized_by: m.authorized_by_user_id ? profileMap.get(m.authorized_by_user_id) || null : null,
    performed_by: m.performed_by_user_id ? profileMap.get(m.performed_by_user_id) || null : null,
  })) as AssetMovement[];
}

/**
 * Hook for querying asset categories
 */
export function useAssetCategoriesQuery() {
  const { currentBu } = useBu();
  const supabase = useOptionalBuScopedSupabase();
  const buId = currentBu?.id;

  return useQuery({
    queryKey: queryKeys.assets.categories(buId ?? null),
    enabled: !!supabase && !!buId,
    staleTime: 5 * 60 * 1000, // 5 minutes - categories change rarely
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("asset_categories")
        .select("id, bu_id, name, parent_id, description, status, created_at, updated_at, deleted_at")
        .eq("bu_id", buId!)
        .is("deleted_at", null)
        .order("name");

      if (error) throw error;
      return data as AssetCategory[];
    },
  });
}

/**
 * Hook for querying inventory list with filters (no pagination, high limit)
 */
export function useInventoryListQuery(filters: UseInventoryFilters = {}) {
  const { currentBu } = useBu();
  const supabase = useOptionalBuScopedSupabase();
  const buId = currentBu?.id;
  
  const { 
    search, statusFilter, categoryFilter, holderFilter, locationFilter 
  } = filters;

  return useQuery({
    queryKey: queryKeys.assets.inventory.list(buId ?? null, { 
      search, statusFilter, categoryFilter, holderFilter, locationFilter 
    }),
    enabled: !!supabase && !!buId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    queryFn: async (): Promise<AssetInventory[]> => {
      if (!supabase) return [];
      
      let query = supabase
        .from("asset_inventory")
        .select(INVENTORY_FIELDS)
        .eq("bu_id", buId!)
        .is("deleted_at", null)
        .order("name")
        .limit(DEFAULT_LIMIT);

      // Server-side filters
      if (search?.trim()) {
        const term = `%${search.trim()}%`;
        query = query.or(`name.ilike.${term},internal_code.ilike.${term}`);
      }

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter as 'available' | 'loaned' | 'maintenance' | 'written_off');
      }

      if (categoryFilter && categoryFilter !== 'all') {
        query = query.eq('category_id', categoryFilter);
      }

      if (holderFilter && holderFilter !== 'all') {
        query = query.eq('current_user_id', holderFilter);
      }

      if (locationFilter && locationFilter !== 'all') {
        query = query.or(`home_location_id.eq.${locationFilter},current_location_id.eq.${locationFilter}`);
      }

      const { data, error } = await query;

      if (error) throw error;

      return enrichInventoryItems(supabase, data || []);
    },
  });
}

/**
 * Imperative function to get a single inventory item by ID
 */
export async function getInventoryItem(
  supabase: ReturnType<typeof useOptionalBuScopedSupabase>,
  itemId: string
): Promise<AssetInventory | null> {
  if (!supabase) {
    console.warn("[getInventoryItem] supabase client not available");
    return null;
  }
  
  const { data, error } = await supabase
    .from("asset_inventory")
    .select(INVENTORY_FIELDS)
    .eq("id", itemId)
    .maybeSingle();

  if (error) {
    console.error("[getInventoryItem] error:", error);
    return null;
  }
  
  if (!data) return null;
  
  const enriched = await enrichInventoryItems(supabase, [data]);
  return enriched[0] || null;
}

/**
 * Imperative function to get a single inventory item by internal code
 */
export async function getInventoryItemByCode(
  supabase: ReturnType<typeof useOptionalBuScopedSupabase>,
  buId: string,
  internalCode: string
): Promise<AssetInventory | null> {
  if (!supabase || !buId) return null;
  
  const { data, error } = await supabase
    .from("asset_inventory")
    .select(INVENTORY_FIELDS)
    .eq("bu_id", buId)
    .eq("internal_code", internalCode)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) return null;
  
  const enriched = await enrichInventoryItems(supabase, [data]);
  return enriched[0] || null;
}

/**
 * Imperative function to get movements for an asset
 */
export async function getAssetMovements(
  supabase: ReturnType<typeof useOptionalBuScopedSupabase>,
  assetId: string
): Promise<AssetMovement[]> {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from("asset_movements")
    .select(MOVEMENT_FIELDS)
    .eq("asset_id", assetId)
    .order("occurred_at", { ascending: false });

  if (error) return [];

  return enrichMovements(supabase, data || []);
}
