/**
 * OKR Test Factories
 * 
 * Centralized factory functions for OKR-related test data.
 * Uses deterministic IDs for predictable test assertions.
 * 
 * All factories follow identity convention: owner_user_id = profiles.id (not auth.users.id).
 */

import type { OkrRagStatus, OkrKrType, OkrDirection } from '@/modules/okrs/types';
import type { InitiativeStatus } from '@/modules/okrs/types/initiative';

// ─── Common test IDs ───────────────────────────────────────────────────────────

export const TEST_IDS = {
  BU_ID: 'test-bu-id',
  PROFILE_ID: 'test-profile-001',
  PROFILE_ID_2: 'test-profile-002',
  PROFILE_ID_3: 'test-profile-003',
  TEAM_ID: 'test-team-001',
  TEAM_ID_2: 'test-team-002',
  AREA_ID: 'test-area-001',
  CYCLE_ID: 'test-cycle-001',
  OBJECTIVE_ID: 'test-obj-001',
  KR_ID: 'test-kr-001',
  INITIATIVE_ID: 'test-init-001',
} as const;

// ─── Objective Factory ─────────────────────────────────────────────────────────

export interface TestObjective {
  id: string;
  title: string;
  description: string | null;
  team_id: string;
  cycle_id: string;
  bu_id: string;
  owner_user_id: string;
  status: string;
  deleted_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

let objectiveCounter = 0;

export function createTestObjective(overrides: Partial<TestObjective> = {}): TestObjective {
  objectiveCounter++;
  return {
    id: `obj-${objectiveCounter}`,
    title: `Test Objective ${objectiveCounter}`,
    description: null,
    team_id: TEST_IDS.TEAM_ID,
    cycle_id: TEST_IDS.CYCLE_ID,
    bu_id: TEST_IDS.BU_ID,
    owner_user_id: TEST_IDS.PROFILE_ID,
    status: 'active',
    deleted_at: null,
    cancelled_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// ─── Key Result Factory ────────────────────────────────────────────────────────

export interface TestKeyResult {
  id: string;
  title: string;
  objective_id: string;
  team_id: string;
  cycle_id: string;
  bu_id: string;
  owner_user_id: string;
  co_responsibles: string[];
  type: OkrKrType;
  direction: OkrDirection;
  unit: string;
  baseline: number;
  target: number;
  current_value: number;
  status: OkrRagStatus;
  deleted_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

let krCounter = 0;

export function createTestKeyResult(overrides: Partial<TestKeyResult> = {}): TestKeyResult {
  krCounter++;
  return {
    id: `kr-${krCounter}`,
    title: `Test KR ${krCounter}`,
    objective_id: TEST_IDS.OBJECTIVE_ID,
    team_id: TEST_IDS.TEAM_ID,
    cycle_id: TEST_IDS.CYCLE_ID,
    bu_id: TEST_IDS.BU_ID,
    owner_user_id: TEST_IDS.PROFILE_ID,
    co_responsibles: [],
    type: 'contribution',
    direction: 'up',
    unit: '%',
    baseline: 0,
    target: 100,
    current_value: 0,
    status: 'not_started',
    deleted_at: null,
    cancelled_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// ─── Initiative Factory ────────────────────────────────────────────────────────

export interface TestInitiative {
  id: string;
  title: string;
  kr_id: string;
  bu_id: string;
  owner_user_id: string;
  contributors: string[];
  status: InitiativeStatus;
  expected_start_date: string | null;
  expected_end_date: string | null;
  created_at: string;
  updated_at: string;
}

let initCounter = 0;

export function createTestInitiative(overrides: Partial<TestInitiative> = {}): TestInitiative {
  initCounter++;
  return {
    id: `init-${initCounter}`,
    title: `Test Initiative ${initCounter}`,
    kr_id: TEST_IDS.KR_ID,
    bu_id: TEST_IDS.BU_ID,
    owner_user_id: TEST_IDS.PROFILE_ID,
    contributors: [],
    status: 'in_progress',
    expected_start_date: '2026-01-01',
    expected_end_date: '2026-03-31',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// ─── Checkin Factory ───────────────────────────────────────────────────────────

export interface TestCheckin {
  id: string;
  kr_id: string;
  user_id: string;
  current_value: number;
  previous_value: number;
  confidence: 'high' | 'medium' | 'low';
  comment: string | null;
  created_at: string;
}

let checkinCounter = 0;

export function createTestCheckin(overrides: Partial<TestCheckin> = {}): TestCheckin {
  checkinCounter++;
  return {
    id: `checkin-${checkinCounter}`,
    kr_id: TEST_IDS.KR_ID,
    user_id: TEST_IDS.PROFILE_ID,
    current_value: 50,
    previous_value: 0,
    confidence: 'high',
    comment: null,
    created_at: '2026-01-15T00:00:00Z',
    ...overrides,
  };
}

// ─── Wizard Session Factory ────────────────────────────────────────────────────

export interface TestWizardSession {
  id: string;
  wizard_type: string;
  team_id: string | null;
  cycle_id: string | null;
  bu_id: string;
  user_id: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  reflection_data: Record<string, unknown> | null;
  summary_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

let wizardCounter = 0;

export function createTestWizardSession(overrides: Partial<TestWizardSession> = {}): TestWizardSession {
  wizardCounter++;
  return {
    id: `wizard-${wizardCounter}`,
    wizard_type: 'team-okr',
    team_id: TEST_IDS.TEAM_ID,
    cycle_id: TEST_IDS.CYCLE_ID,
    bu_id: TEST_IDS.BU_ID,
    user_id: TEST_IDS.PROFILE_ID,
    status: 'in_progress',
    reflection_data: null,
    summary_sent_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// ─── KPI Factory ───────────────────────────────────────────────────────────────

export interface TestKpi {
  id: string;
  name: string;
  scope: 'bu' | 'area' | 'team';
  lifecycle_status: 'active' | 'draft' | 'archived';
  bu_id: string;
  owner_user_id: string;
  responsible_area_id: string | null;
  responsible_team_id: string | null;
  unit: string;
  direction: OkrDirection;
  created_at: string;
  updated_at: string;
}

let kpiCounter = 0;

export function createTestKpi(overrides: Partial<TestKpi> = {}): TestKpi {
  kpiCounter++;
  return {
    id: `kpi-${kpiCounter}`,
    name: `Test KPI ${kpiCounter}`,
    scope: 'team',
    lifecycle_status: 'active',
    bu_id: TEST_IDS.BU_ID,
    owner_user_id: TEST_IDS.PROFILE_ID,
    responsible_area_id: TEST_IDS.AREA_ID,
    responsible_team_id: TEST_IDS.TEAM_ID,
    unit: '%',
    direction: 'up',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// ─── Counter Reset (for test isolation) ────────────────────────────────────────

export function resetFactoryCounters() {
  objectiveCounter = 0;
  krCounter = 0;
  initCounter = 0;
  checkinCounter = 0;
  wizardCounter = 0;
  kpiCounter = 0;
}
