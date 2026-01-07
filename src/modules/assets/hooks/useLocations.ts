import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";

export interface BuLocationOption {
  id: string;
  name: string;
  is_default: boolean;
  parent_location_id: string | null;
  parent?: { id: string; name: string } | null;
}

export function useLocations() {
  const { currentBu } = useBu();
  const supabase = useBuScopedSupabase();
  const buId = currentBu?.id;

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ["bu-locations-options", buId],
    enabled: !!buId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bu_locations")
        .select("id, name, is_default, parent_location_id, parent:parent_location_id(id, name)")
        .eq("bu_id", buId!)
        .eq("status", "active")
        .is("deleted_at", null)
        .order("parent_location_id", { nullsFirst: true })
        .order("is_default", { ascending: false })
        .order("name");

      if (error) throw error;
      return data as BuLocationOption[];
    },
  });

  const defaultLocation = locations.find((l) => l.is_default && !l.parent_location_id) || 
    locations.find((l) => !l.parent_location_id) || null;

  // Helper to get full location path (e.g., "Jetimob → Sala de Reuniões")
  const getLocationPath = (locationId: string): string => {
    const location = locations.find(l => l.id === locationId);
    if (!location) return "";
    
    if (location.parent) {
      return `${location.parent.name} → ${location.name}`;
    }
    return location.name;
  };

  // Get root locations only (headquarters)
  const rootLocations = locations.filter(l => !l.parent_location_id);
  
  // Get rooms for a specific parent
  const getRooms = (parentId: string) => locations.filter(l => l.parent_location_id === parentId);

  return {
    locations,
    rootLocations,
    getRooms,
    defaultLocation,
    getLocationPath,
    isLoading,
  };
}
