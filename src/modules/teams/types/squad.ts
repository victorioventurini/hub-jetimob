import { Tables } from "@/integrations/supabase/types";

export type SquadProduct = "crm" | "cms" | "erp";
export type SquadRole = "product_owner" | "tech_lead" | "ux_ui_lead" | "member";

export interface Squad {
  id: string;
  name: string;
  description: string | null;
  bu_id: string;
  products: SquadProduct[];
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface SquadMembership {
  id: string;
  squad_id: string;
  user_id: string;
  role: SquadRole;
  created_at: string;
  updated_at: string;
}

export interface SquadTeam {
  id: string;
  squad_id: string;
  team_id: string;
  created_at: string;
}

export interface SquadWithRelations extends Squad {
  teams?: {
    id: string;
    name: string;
  }[];
  members?: {
    id: string;
    user_id: string;
    role: SquadRole;
    user: {
      id: string;
      display_name: string;
      photo_url: string | null;
      job_title: string;
    };
  }[];
  member_count?: number;
}

export interface SquadFormData {
  name: string;
  description: string;
  products: SquadProduct[];
  team_ids: string[];
  status: "active" | "inactive";
}

export interface SquadMemberFormData {
  user_id: string;
  role: SquadRole;
}

export const SQUAD_PRODUCT_LABELS: Record<SquadProduct, string> = {
  crm: "CRM",
  cms: "CMS",
  erp: "ERP",
};

export const SQUAD_PRODUCT_COLORS: Record<SquadProduct, string> = {
  crm: "bg-info/10 text-info border-info/20",
  cms: "bg-success/10 text-success border-success/20",
  erp: "bg-status-purple/10 text-status-purple border-status-purple/20",
};

export const SQUAD_ROLE_LABELS: Record<SquadRole, string> = {
  product_owner: "Product Owner",
  tech_lead: "Tech Lead",
  ux_ui_lead: "UX / UI Lead",
  member: "Membro",
};

export const SQUAD_ROLE_ABBREVIATIONS: Record<SquadRole, string> = {
  product_owner: "PO",
  tech_lead: "TL",
  ux_ui_lead: "UX",
  member: "",
};
