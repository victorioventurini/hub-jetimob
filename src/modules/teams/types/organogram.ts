/**
 * Organogram Types - Hub da Jet
 * Tipos para visualização hierárquica da estrutura organizacional
 */

export type OrganogramNodeType = 
  | 'ceo' 
  | 'area' 
  | 'team' 
  | 'subteam' 
  | 'squad' 
  | 'person';

export interface OrganogramNode {
  id: string;
  type: OrganogramNodeType;
  name: string;
  email?: string;
  photoUrl?: string | null;
  color?: string | null;
  role?: string | null;
  path: string;
  children: OrganogramNode[];
  // Leader info for teams/subteams
  leaderName?: string;
  leaderPhotoUrl?: string | null;
}

export interface OrganogramData {
  ceo: OrganogramNode | null;
  areas: OrganogramNode[];
}

export interface OrganogramFilters {
  showMembers: boolean;
  showSquads: boolean;
  searchTerm: string;
}

export interface OrganogramControlsState {
  zoom: number;
  orientation: 'vertical' | 'horizontal';
  /** Key to force re-render when expansion changes */
  expansionKey: number;
  /** Global expansion state: 'default' = teams expanded, 'all' = all expanded, 'none' = all collapsed */
  expansionMode: 'default' | 'all' | 'none';
}
