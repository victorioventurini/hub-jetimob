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
  source: 'template_v2' | 'override' | 'wildcard';
  source_name: string;
}
