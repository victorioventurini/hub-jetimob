/**
 * Teams & Areas Test Fixtures
 * 
 * Mock data for teams and areas modules testing.
 */

import type { TeamWithRelations, TeamFormData } from '@/modules/teams/types';
import type { AreaWithRelations, AreaFormData } from '@/modules/areas/types';

// ============================================================
// Areas Fixtures
// ============================================================

export interface MockAreaData {
  id?: string;
  bu_id?: string;
  name?: string;
  description?: string | null;
  status?: 'active' | 'inactive';
  color?: string | null;
  icon?: string | null;
  leader_user_id?: string | null;
  co_leader_user_id?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export function createMockArea(overrides: MockAreaData = {}): AreaWithRelations {
  const id = overrides.id ?? `area-${Date.now()}`;
  const now = new Date().toISOString();
  
  return {
    id,
    bu_id: overrides.bu_id ?? 'bu-test-123',
    name: overrides.name ?? 'Test Area',
    description: overrides.description ?? 'Test area description',
    status: overrides.status ?? 'active',
    color: overrides.color ?? '#3B82F6',
    icon: overrides.icon ?? 'Layers',
    leader_user_id: overrides.leader_user_id ?? null,
    co_leader_user_id: overrides.co_leader_user_id ?? null,
    created_at: overrides.created_at ?? now,
    updated_at: overrides.updated_at ?? now,
    deleted_at: overrides.deleted_at ?? null,
    leader: overrides.leader_user_id ? {
      id: overrides.leader_user_id,
      display_name: 'Area Leader',
      photo_url: null,
    } : null,
    co_leader: overrides.co_leader_user_id ? {
      id: overrides.co_leader_user_id,
      display_name: 'Area Co-Leader',
      photo_url: null,
    } : null,
    team_count: 0,
  };
}

export function createMockAreaFormData(overrides: Partial<AreaFormData> = {}): AreaFormData {
  return {
    name: overrides.name ?? 'New Area',
    description: overrides.description ?? 'New area description',
    status: overrides.status ?? 'active',
    color: overrides.color ?? '#3B82F6',
    icon: overrides.icon ?? null,
    leader_user_id: overrides.leader_user_id ?? null,
    co_leader_user_id: overrides.co_leader_user_id ?? null,
  };
}

// ============================================================
// Teams Fixtures
// ============================================================

export interface MockTeamData {
  id?: string;
  bu_id?: string;
  name?: string;
  description?: string | null;
  status?: 'active' | 'inactive';
  parent_team_id?: string | null;
  leader_user_id?: string | null;
  area_id?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  member_count?: number;
  checkin_frequency?: string;
  checkin_day?: number;
  checkin_deadline_hour?: number;
}

export function createMockTeam(overrides: MockTeamData = {}): TeamWithRelations {
  const id = overrides.id ?? `team-${Date.now()}`;
  const now = new Date().toISOString();
  
  return {
    id,
    bu_id: overrides.bu_id ?? 'bu-test-123',
    name: overrides.name ?? 'Test Team',
    description: overrides.description ?? 'Test team description',
    status: overrides.status ?? 'active',
    parent_team_id: overrides.parent_team_id ?? null,
    leader_user_id: overrides.leader_user_id ?? null,
    area_id: overrides.area_id ?? null,
    created_at: overrides.created_at ?? now,
    updated_at: overrides.updated_at ?? now,
    checkin_frequency: overrides.checkin_frequency ?? 'weekly',
    checkin_day: overrides.checkin_day ?? 1,
    checkin_deadline_hour: overrides.checkin_deadline_hour ?? 18,
    deleted_at: overrides.deleted_at ?? null,
    member_count: overrides.member_count ?? 0,
    leader: overrides.leader_user_id ? {
      id: overrides.leader_user_id,
      display_name: 'Team Leader',
      photo_url: null,
    } : null,
    parent_team: null,
    child_teams: [],
  };
}

export function createMockTeamFormData(overrides: Partial<TeamFormData> = {}): TeamFormData {
  return {
    name: overrides.name ?? 'New Team',
    description: overrides.description ?? 'New team description',
    status: overrides.status ?? 'active',
    parent_team_id: overrides.parent_team_id ?? null,
    leader_user_id: overrides.leader_user_id ?? null,
    area_id: overrides.area_id ?? null,
  };
}

// ============================================================
// Pre-built Fixtures
// ============================================================

export const AREAS_FIXTURES = {
  revenue: createMockArea({
    id: 'area-revenue',
    name: 'Revenue',
    description: 'Área responsável por receita',
    color: '#22C55E',
    icon: 'DollarSign',
  }),
  product: createMockArea({
    id: 'area-product',
    name: 'Produto',
    description: 'Área responsável por produto',
    color: '#3B82F6',
    icon: 'Package',
  }),
  technology: createMockArea({
    id: 'area-technology',
    name: 'Tecnologia',
    description: 'Área responsável por tecnologia',
    color: '#8B5CF6',
    icon: 'Code',
  }),
  inactive: createMockArea({
    id: 'area-inactive',
    name: 'Legacy Area',
    status: 'inactive',
  }),
};

export const TEAMS_FIXTURES = {
  engineering: createMockTeam({
    id: 'team-engineering',
    name: 'Engineering',
    description: 'Software Engineering team',
    area_id: 'area-technology',
    member_count: 12,
  }),
  sales: createMockTeam({
    id: 'team-sales',
    name: 'Sales',
    description: 'Sales team',
    area_id: 'area-revenue',
    member_count: 8,
  }),
  design: createMockTeam({
    id: 'team-design',
    name: 'Design',
    description: 'Product Design team',
    area_id: 'area-product',
    member_count: 5,
  }),
  frontend: createMockTeam({
    id: 'team-frontend',
    name: 'Frontend',
    description: 'Frontend sub-team',
    parent_team_id: 'team-engineering',
    area_id: 'area-technology',
    member_count: 4,
  }),
  inactive: createMockTeam({
    id: 'team-inactive',
    name: 'Legacy Team',
    status: 'inactive',
  }),
};

// Combined fixtures export
export const FIXTURES = {
  areas: AREAS_FIXTURES,
  teams: TEAMS_FIXTURES,
  createMockArea,
  createMockTeam,
  createMockAreaFormData,
  createMockTeamFormData,
};
