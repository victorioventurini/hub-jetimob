/**
 * OKR Test Fixtures
 * 
 * Centralized test fixtures for OKR module tests.
 * Provides type-safe mock data for objectives, KRs, check-ins, and more.
 */

import type {
  OkrStatus,
  OkrRagStatus,
  OkrDirection,
  OkrConfidence,
  OkrKrType,
  OkrDependencyStatus,
} from '../types';

// ============================================================
// Base Fixtures
// ============================================================

export const mockOwner = {
  id: 'user-001',
  display_name: 'João Silva',
  photo_url: 'https://example.com/avatar.jpg',
};

export const mockTeam = {
  id: 'team-001',
  name: 'Produto',
};

export const mockCycle = {
  id: 'cycle-q1-2025',
  name: 'Q1 2025',
  start_date: '2025-01-01',
  end_date: '2025-03-31',
  bu_id: 'bu-001',
  is_active: true,
  created_at: '2024-12-01T00:00:00Z',
  updated_at: '2024-12-01T00:00:00Z',
};

// ============================================================
// Org Objective Fixtures
// ============================================================

export const mockOrgObjective = {
  id: 'org-obj-001',
  bu_id: 'bu-001',
  title: 'Aumentar receita recorrente em 40%',
  description: 'Foco em expansão de clientes existentes e aquisição de novos.',
  year: 2025,
  owner_user_id: 'user-001',
  status: 'active' as OkrStatus,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-15T00:00:00Z',
  deleted_at: null,
  owner: mockOwner,
};

export const mockOrgObjectives = [
  mockOrgObjective,
  {
    ...mockOrgObjective,
    id: 'org-obj-002',
    title: 'Lançar produto internacional',
    description: 'Expandir para mercado LATAM.',
    status: 'draft' as OkrStatus,
  },
  {
    ...mockOrgObjective,
    id: 'org-obj-003',
    title: 'Melhorar satisfação do cliente',
    status: 'completed' as OkrStatus,
  },
];

// ============================================================
// Org Key Result Fixtures
// ============================================================

export const mockOrgKr = {
  id: 'org-kr-001',
  bu_id: 'bu-001',
  org_objective_id: 'org-obj-001',
  title: 'Alcançar R$ 10M em ARR',
  baseline: 7000000,
  current_value: 8500000,
  target: 10000000,
  direction: 'up' as OkrDirection,
  unit: 'R$',
  owner_user_id: 'user-001',
  status: 'green' as OkrRagStatus,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-15T00:00:00Z',
  deleted_at: null,
  cancelled_at: null,
  owner: mockOwner,
};

export const mockOrgKrs = [
  mockOrgKr,
  {
    ...mockOrgKr,
    id: 'org-kr-002',
    title: 'Aumentar ticket médio para R$ 5.000',
    baseline: 3500,
    current_value: 4200,
    target: 5000,
    unit: 'R$',
    status: 'yellow' as OkrRagStatus,
  },
  {
    ...mockOrgKr,
    id: 'org-kr-003',
    title: 'Reduzir churn para 3%',
    baseline: 6,
    current_value: 5,
    target: 3,
    direction: 'down' as OkrDirection,
    unit: '%',
    status: 'red' as OkrRagStatus,
  },
];

// ============================================================
// Team Objective Fixtures
// ============================================================

export const mockTeamObjective = {
  id: 'team-obj-001',
  bu_id: 'bu-001',
  team_id: 'team-001',
  org_objective_id: 'org-obj-001',
  title: 'Aumentar conversão de trials em 50%',
  description: 'Melhorar onboarding e ativação de usuários trial.',
  year: 2025,
  owner_user_id: 'user-002',
  status: 'active' as OkrStatus,
  is_shared: false,
  responsibility_model: 'single',
  created_at: '2025-01-02T00:00:00Z',
  updated_at: '2025-01-15T00:00:00Z',
  deleted_at: null,
  team: mockTeam,
  owner: { ...mockOwner, id: 'user-002', display_name: 'Maria Santos' },
};

export const mockTeamObjectives = [
  mockTeamObjective,
  {
    ...mockTeamObjective,
    id: 'team-obj-002',
    title: 'Reduzir tempo de onboarding para 7 dias',
    team_id: 'team-002',
    team: { id: 'team-002', name: 'Customer Success' },
    is_shared: true,
  },
];

// ============================================================
// Team Key Result Fixtures
// ============================================================

export const mockTeamKr = {
  id: 'team-kr-001',
  bu_id: 'bu-001',
  team_id: 'team-001',
  team_objective_id: 'team-obj-001',
  linked_org_kr_id: 'org-kr-001',
  parent_kr_id: null,
  metric_id: null,
  title: 'Aumentar taxa de conversão de trial para 30%',
  type: 'contribution' as OkrKrType,
  baseline: 15,
  current_value: 22,
  target: 30,
  direction: 'up' as OkrDirection,
  unit: '%',
  owner_user_id: 'user-003',
  co_responsibles: ['user-004', 'user-005'],
  status: 'yellow' as OkrRagStatus,
  last_checkin_at: '2025-01-14T10:00:00Z',
  evidence_url: 'https://example.com/dashboard',
  created_at: '2025-01-02T00:00:00Z',
  updated_at: '2025-01-14T10:00:00Z',
  deleted_at: null,
  cancelled_at: null,
  team: mockTeam,
  owner: { ...mockOwner, id: 'user-003', display_name: 'Pedro Costa' },
};

export const mockTeamKrs = [
  mockTeamKr,
  {
    ...mockTeamKr,
    id: 'team-kr-002',
    title: 'Implementar 5 melhorias no onboarding',
    type: 'enabler' as OkrKrType,
    baseline: 0,
    current_value: 3,
    target: 5,
    unit: 'melhorias',
    status: 'green' as OkrRagStatus,
    linked_org_kr_id: null,
  },
  {
    ...mockTeamKr,
    id: 'team-kr-003',
    title: 'Reduzir tickets de suporte em 40%',
    type: 'foundational' as OkrKrType,
    baseline: 500,
    current_value: 420,
    target: 300,
    direction: 'down' as OkrDirection,
    unit: 'tickets/mês',
    status: 'red' as OkrRagStatus,
  },
];

// ============================================================
// Check-in Fixtures
// ============================================================

export const mockCheckin = {
  id: 'checkin-001',
  kr_id: 'team-kr-001',
  kr_type: 'team' as const,
  user_id: 'user-003',
  date: '2025-01-14',
  previous_value: 20,
  current_value: 22,
  confidence: 'medium' as OkrConfidence,
  comments: 'Implementamos nova landing page que está convertendo melhor.',
  blockers: 'Aguardando aprovação de marketing para campanha.',
  created_at: '2025-01-14T10:00:00Z',
  user: { ...mockOwner, id: 'user-003', display_name: 'Pedro Costa' },
};

export const mockCheckins = [
  mockCheckin,
  {
    ...mockCheckin,
    id: 'checkin-002',
    date: '2025-01-07',
    previous_value: 18,
    current_value: 20,
    confidence: 'high' as OkrConfidence,
    comments: 'Progresso consistente na primeira semana.',
    blockers: null,
    created_at: '2025-01-07T10:00:00Z',
  },
  {
    ...mockCheckin,
    id: 'checkin-003',
    date: '2025-01-21',
    previous_value: 22,
    current_value: 24,
    confidence: 'low' as OkrConfidence,
    comments: 'Progresso mais lento que esperado.',
    blockers: 'Equipe de desenvolvimento está focada em bug crítico.',
    created_at: '2025-01-21T10:00:00Z',
  },
];

// ============================================================
// Dependency Fixtures
// ============================================================

export const mockDependency = {
  id: 'dep-001',
  kr_id: 'team-kr-001',
  depends_on_team_id: 'team-002',
  depends_on_kr_id: 'team-kr-005',
  description: 'Precisamos da API de analytics pronta.',
  status: 'at_risk' as OkrDependencyStatus,
  created_at: '2025-01-02T00:00:00Z',
  updated_at: '2025-01-10T00:00:00Z',
  depends_on_team: { id: 'team-002', name: 'Plataforma' },
};

// ============================================================
// Dashboard Data Fixtures
// ============================================================

export const mockDashboardData = {
  teams: [
    { id: 'team-001', name: 'Produto', description: null, parent_team_id: null, created_at: '2024-01-01T00:00:00Z' },
    { id: 'team-002', name: 'Engenharia', description: null, parent_team_id: null, created_at: '2024-01-01T00:00:00Z' },
  ],
  org_objectives: mockOrgObjectives,
  team_objectives: mockTeamObjectives,
  org_krs: mockOrgKrs.map(kr => ({
    id: kr.id,
    baseline: kr.baseline,
    current_value: kr.current_value,
    target: kr.target,
    direction: kr.direction,
    status: kr.status,
  })),
  team_krs: mockTeamKrs.map(kr => ({
    id: kr.id,
    baseline: kr.baseline,
    current_value: kr.current_value,
    target: kr.target,
    direction: kr.direction,
    status: kr.status,
    linked_org_kr_id: kr.linked_org_kr_id,
  })),
  latest_checkin_date: '2025-01-21',
  pending_checkins_count: 3,
  shared_insights: {
    shared_okrs_count: 2,
    total_team_krs: 6,
    overdue_shared_count: 0,
  },
  meta: {
    bu_id: 'bu-001',
    year: 2025,
    view: 'company' as const,
    team_id: null,
    fetched_at: '2025-01-15T12:00:00Z',
  },
};

// ============================================================
// Utility Functions
// ============================================================

/**
 * Creates a mock KR with specified progress percentage
 */
export function createMockKrWithProgress(
  progressPercent: number,
  direction: OkrDirection = 'up'
): typeof mockTeamKr {
  const baseline = direction === 'up' ? 0 : 100;
  const target = direction === 'up' ? 100 : 0;
  const current_value = direction === 'up' 
    ? progressPercent 
    : 100 - progressPercent;

  return {
    ...mockTeamKr,
    id: `kr-progress-${progressPercent}`,
    baseline,
    current_value,
    target,
    direction,
  };
}

/**
 * Creates a mock check-in for a specific date
 */
export function createMockCheckinForDate(date: string, confidence: OkrConfidence = 'high') {
  return {
    ...mockCheckin,
    id: `checkin-${date}`,
    date,
    confidence,
    created_at: `${date}T10:00:00Z`,
  };
}
