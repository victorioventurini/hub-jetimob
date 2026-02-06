// =============================================
// MÓDULO ASSETS - TIPOS
// =============================================

// Enums
export type AssetInventoryStatus = 'available' | 'loaned' | 'maintenance' | 'written_off';
export type AssetMovementType = 'checkout' | 'return' | 'transfer' | 'maintenance_start' | 'maintenance_end' | 'write_off';
export type AssetHolderType = 'location' | 'user';
export type KeyringStatus = 'available' | 'loaned' | 'lost' | 'retired';
export type KeyStatus = 'in_claviculary' | 'loaned' | 'lost' | 'retired';
export type KeyAccessType = 'door' | 'padlock' | 'gate' | 'other';
export type KeyMovementType = 'checkout' | 'return' | 'transfer' | 'lost' | 'retired';
export type GiftItemStatus = 'active' | 'inactive';
export type GiftMovementType = 'in' | 'out' | 'adjustment';
export type GiftDestinationType = 'event' | 'campaign' | 'person' | 'other';
export type AssetPermissionRole = 
  | 'assets_admin'
  | 'inventory_admin'
  | 'inventory_manager'
  | 'keys_admin'
  | 'keys_manager'
  | 'gifts_admin'
  | 'gifts_manager'
  | 'viewer';

// Permissões
export interface AssetPermission {
  id: string;
  bu_id: string;
  user_id: string;
  role: AssetPermissionRole;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

// Categorias
export interface AssetCategory {
  id: string;
  bu_id: string;
  name: string;
  parent_id: string | null;
  description: string | null;
  created_at: string;
  deleted_at: string | null;
}

// Inventário
export interface AssetInventory {
  id: string;
  bu_id: string;
  internal_code: string;
  name: string;
  category_id: string | null;
  description: string | null;
  status: AssetInventoryStatus;
  home_location_id: string | null;
  current_holder_type: AssetHolderType;
  current_location_id: string | null;
  current_user_id: string | null;
  assigned_at: string | null;
  last_moved_at: string | null;
  acquired_at: string | null;
  acquisition_value: number | null;
  serial_number: string | null;
  brand: string | null;
  model: string | null;
  quantity_total: number;
  quantity_available: number;
  photos: string[];
  documents: string[];
  notes: string | null;
  // Recommendation link (v2.93.0)
  recommendation_id: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
  // Joined
  category?: AssetCategory | null;
  home_location?: { id: string; name: string } | null;
  current_location?: { id: string; name: string } | null;
  current_user?: { id: string; full_name: string; avatar_url: string | null } | null;
  recommendation?: { id: string; name: string } | null;
  // Enriched from latest movement
  expected_return_at?: string | null;
}

// Movimentações de Inventário
export interface AssetMovement {
  id: string;
  bu_id: string;
  asset_id: string;
  movement_type: AssetMovementType;
  from_holder_type: AssetHolderType | null;
  from_location_id: string | null;
  from_user_id: string | null;
  to_holder_type: AssetHolderType | null;
  to_location_id: string | null;
  to_user_id: string | null;
  authorized_by_user_id: string | null;
  performed_by_user_id: string;
  occurred_at: string;
  due_at: string | null;
  returned_at: string | null;
  notes: string | null;
  created_at: string;
  // Joined
  from_location?: { id: string; name: string } | null;
  from_user?: { id: string; full_name: string } | null;
  to_location?: { id: string; name: string } | null;
  to_user?: { id: string; full_name: string } | null;
  authorized_by?: { id: string; full_name: string } | null;
  performed_by?: { id: string; full_name: string } | null;
}

// Claviculário
export interface AssetClaviculary {
  id: string;
  bu_id: string;
  location_id: string | null;
  name: string;
  status: 'active' | 'inactive';
  notes: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  deleted_at: string | null;
  // Joined
  location?: { id: string; name: string } | null;
  hooks?: AssetHook[];
}

// Gancho
export interface AssetHook {
  id: string;
  claviculary_id: string;
  hook_number: number;
  occupied: boolean;
  notes: string | null;
  created_at: string;
  // Joined
  keyring?: AssetKeyring | null;
}

// Chaveiro
export interface AssetKeyring {
  id: string;
  bu_id: string;
  claviculary_id: string | null;
  hook_id: string | null;
  name: string;
  tag_number: string;
  status: KeyringStatus;
  current_user_id: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  deleted_at: string | null;
  // Joined
  claviculary?: { id: string; name: string } | null;
  hook?: { id: string; hook_number: number } | null;
  current_user?: { id: string; full_name: string; avatar_url: string | null } | null;
  keys?: AssetKey[];
}

// Chave individual
export interface AssetKey {
  id: string;
  bu_id: string;
  keyring_id: string | null;
  tag_number: string;
  description: string | null;
  access_type: KeyAccessType;
  status: KeyStatus;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  deleted_at: string | null;
  // Joined
  keyring?: { id: string; name: string; tag_number: string } | null;
}

// Movimentação de Chaveiro
export interface AssetKeyMovement {
  id: string;
  bu_id: string;
  keyring_id: string;
  movement_type: KeyMovementType;
  user_id: string | null;
  from_claviculary_id: string | null;
  from_hook_id: string | null;
  to_claviculary_id: string | null;
  to_hook_id: string | null;
  authorized_by_user_id: string | null;
  performed_by_user_id: string;
  occurred_at: string;
  due_at: string | null;
  notes: string | null;
  created_at: string;
  // Joined
  user?: { id: string; full_name: string } | null;
  authorized_by?: { id: string; full_name: string } | null;
  performed_by?: { id: string; full_name: string } | null;
  from_claviculary?: { id: string; name: string } | null;
  to_claviculary?: { id: string; name: string } | null;
}

// Item de Brinde
export interface AssetGiftItem {
  id: string;
  bu_id: string;
  name: string;
  category: string | null;
  status: GiftItemStatus;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  deleted_at: string | null;
  // Computed
  total_quantity?: number;
  available_quantity?: number;
}

// Lote de Brinde
export interface AssetGiftBatch {
  id: string;
  bu_id: string;
  gift_item_id: string;
  batch_code: string | null;
  acquired_at: string | null;
  quantity_in: number;
  quantity_available: number;
  cost_center: string | null;
  campaign: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  deleted_at: string | null;
  // Joined
  gift_item?: { id: string; name: string } | null;
}

// Movimentação de Brinde
export interface AssetGiftMovement {
  id: string;
  bu_id: string;
  gift_item_id: string;
  batch_id: string | null;
  movement_type: GiftMovementType;
  quantity: number;
  destination_type: GiftDestinationType | null;
  destination_description: string | null;
  performed_by_user_id: string;
  occurred_at: string;
  notes: string | null;
  created_at: string;
  // Joined
  gift_item?: { id: string; name: string } | null;
  batch?: { id: string; batch_code: string | null } | null;
  performed_by?: { id: string; full_name: string } | null;
}

// Labels para UI
export const INVENTORY_STATUS_LABELS: Record<AssetInventoryStatus, string> = {
  available: 'Disponível',
  loaned: 'Emprestado',
  maintenance: 'Em Manutenção',
  written_off: 'Baixado',
};

export const MOVEMENT_TYPE_LABELS: Record<AssetMovementType, string> = {
  checkout: 'Retirada',
  return: 'Devolução',
  transfer: 'Transferência',
  maintenance_start: 'Início Manutenção',
  maintenance_end: 'Fim Manutenção',
  write_off: 'Baixa',
};

export const KEYRING_STATUS_LABELS: Record<KeyringStatus, string> = {
  available: 'Disponível',
  loaned: 'Emprestado',
  lost: 'Extraviado',
  retired: 'Desativado',
};

export const KEY_STATUS_LABELS: Record<KeyStatus, string> = {
  in_claviculary: 'No Claviculário',
  loaned: 'Emprestada',
  lost: 'Extraviada',
  retired: 'Desativada',
};

export const KEY_ACCESS_TYPE_LABELS: Record<KeyAccessType, string> = {
  door: 'Porta',
  padlock: 'Cadeado',
  gate: 'Portão',
  other: 'Outro',
};

export const KEY_MOVEMENT_TYPE_LABELS: Record<KeyMovementType, string> = {
  checkout: 'Retirada',
  return: 'Devolução',
  transfer: 'Transferência',
  lost: 'Extravio',
  retired: 'Desativação',
};

export const GIFT_MOVEMENT_TYPE_LABELS: Record<GiftMovementType, string> = {
  in: 'Entrada',
  out: 'Saída',
  adjustment: 'Ajuste',
};

export const GIFT_DESTINATION_TYPE_LABELS: Record<GiftDestinationType, string> = {
  event: 'Evento',
  campaign: 'Campanha',
  person: 'Pessoa',
  other: 'Outro',
};

export const PERMISSION_ROLE_LABELS: Record<AssetPermissionRole, string> = {
  assets_admin: 'Admin Geral',
  inventory_admin: 'Admin Inventário',
  inventory_manager: 'Gestor Inventário',
  keys_admin: 'Admin Chaves',
  keys_manager: 'Gestor Chaves',
  gifts_admin: 'Admin Brindes',
  gifts_manager: 'Gestor Brindes',
  viewer: 'Visualizador',
};

// =============================================
// KITS / GRUPOS DE ATIVOS
// =============================================

export type AssetGroupType = 'kit' | 'bundle';
export type AssetGroupStatus = 'active' | 'inactive';
export type AssetGroupItemRole = 'primary' | 'accessory';

export interface AssetGroup {
  id: string;
  bu_id: string;
  name: string;
  primary_asset_id: string | null;
  type: AssetGroupType;
  notes: string | null;
  status: AssetGroupStatus;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  deleted_at: string | null;
  // Joined
  primary_asset?: AssetInventory | null;
  items?: AssetGroupItem[];
}

export interface AssetGroupItem {
  id: string;
  bu_id: string;
  group_id: string;
  asset_id: string;
  role: AssetGroupItemRole;
  is_required: boolean;
  quantity: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joined
  asset?: AssetInventory | null;
  group?: { id: string; name: string } | null;
}

export const GROUP_TYPE_LABELS: Record<AssetGroupType, string> = {
  kit: 'Kit',
  bundle: 'Conjunto',
};

export const GROUP_STATUS_LABELS: Record<AssetGroupStatus, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
};

export const GROUP_ITEM_ROLE_LABELS: Record<AssetGroupItemRole, string> = {
  primary: 'Primário',
  accessory: 'Acessório',
};

// =============================================
// RECOMENDAÇÕES DE EQUIPAMENTOS
// =============================================

export type RecommendationStatus = 'active' | 'archived';
export type RecommendationReviewStatus = 'up_to_date' | 'due_soon' | 'overdue';
export type RecommendationScopeType = 'global' | 'team' | 'job_title';

export interface AssetRecommendation {
  id: string;
  bu_id: string;
  name: string;
  category_id: string | null;
  brand: string;
  model: string | null;
  description: string | null;
  applicable_team_ids: string[];
  applicable_job_title_ids: string[];
  review_interval_months: number;
  last_reviewed_at: string | null;
  owner_user_id: string;
  created_by_user_id: string | null;
  status: RecommendationStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joined
  category?: { id: string; name: string; parent_name?: string } | null;
  owner?: { id: string; display_name: string; photo_url: string | null } | null;
  created_by?: { id: string; display_name: string } | null;
  // Computed
  review_status?: RecommendationReviewStatus;
  scope_type?: RecommendationScopeType;
  last_purchase_value?: number | null;
  last_purchase_date?: string | null;
  // Resolved names (from IDs)
  applicable_team_names?: string[];
  applicable_job_title_names?: string[];
}

export const RECOMMENDATION_STATUS_LABELS: Record<RecommendationStatus, string> = {
  active: 'Ativa',
  archived: 'Arquivada',
};

export const RECOMMENDATION_REVIEW_STATUS_LABELS: Record<RecommendationReviewStatus, string> = {
  up_to_date: 'Em dia',
  due_soon: 'Vence em breve',
  overdue: 'Vencida',
};

export const RECOMMENDATION_SCOPE_TYPE_LABELS: Record<RecommendationScopeType, string> = {
  global: 'Global',
  team: 'Time',
  job_title: 'Cargo',
};

export const REVIEW_INTERVAL_OPTIONS = [
  { value: 3, label: '3 meses' },
  { value: 6, label: '6 meses' },
  { value: 12, label: '12 meses' },
];
