// Permission Types

export type PermissionScope = 
  | 'self' 
  | 'self_or_owner' 
  | 'team' 
  | 'team_tree' 
  | 'squad' 
  | 'bu' 
  | 'global' 
  | 'public';

export type PermissionStatus = 'active' | 'inactive';

export interface Permission {
  id: string;
  key: string;
  module: string;
  resource: string;
  action: string;
  scope: PermissionScope;
  description: string | null;
  status: PermissionStatus;
  created_at: string;
  updated_at: string;
}

export interface PermissionGroup {
  id: string;
  name: string;
  description: string | null;
  status: PermissionStatus;
  created_at: string;
  updated_at: string;
}

export interface PermissionGroupPermission {
  id: string;
  group_id: string;
  permission_id: string;
}

export interface BuPermissionGroupConfig {
  id: string;
  bu_id: string;
  group_id: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
  permission_groups?: PermissionGroup;
}

export interface BuUserPermissionGroup {
  id: string;
  bu_id: string;
  user_id: string;
  group_id: string;
  created_at: string;
  permission_groups?: PermissionGroup;
}

export interface BuUserPermissionOverride {
  id: string;
  bu_id: string;
  user_id: string;
  permission_id: string;
  effect: 'allow' | 'deny';
  created_at: string;
  permission_catalog?: Permission;
}

export interface EffectivePermission {
  permission_key: string;
  permission_id: string;
  user_id: string;
  bu_id: string;
  module: string;
  resource: string;
  action: string;
  scope: string;
  source: 'group' | 'override';
  source_name: string;
}
