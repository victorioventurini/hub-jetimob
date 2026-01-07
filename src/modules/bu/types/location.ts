import { Tables } from "@/integrations/supabase/types";

export type BuLocation = Tables<"bu_locations"> & {
  parent?: { id: string; name: string } | null;
};

export type BuLocationType = "headquarters" | "office" | "warehouse" | "remote_hub" | "room" | "other";
export type BuLocationStatus = "active" | "inactive";

export interface BuLocationFormData {
  name: string;
  type: BuLocationType;
  status: BuLocationStatus;
  is_default: boolean;
  parent_location_id?: string | null;
  formatted_address?: string;
  address_line_1?: string;
  address_line_2?: string;
  district?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  google_place_id?: string;
  timezone?: string;
  notes?: string;
}

export const LOCATION_TYPE_LABELS: Record<BuLocationType, string> = {
  headquarters: "Matriz",
  office: "Escritório",
  warehouse: "Depósito",
  remote_hub: "Hub Remoto",
  room: "Sala",
  other: "Outro",
};

export const LOCATION_STATUS_LABELS: Record<BuLocationStatus, string> = {
  active: "Ativa",
  inactive: "Inativa",
};
