/**
 * OKR Test Fixtures
 * 
 * Factory functions and default fixtures for OKR-related tests.
 */

import type { OkrRagStatus, OkrKrType, OkrDirection } from '@/modules/okrs/types';
import type { Cycle } from '@/modules/okrs/hooks/useCycleData';
import type { InitiativeStatus } from '@/modules/okrs/types/initiative';

// KR Data for health calculations
export interface MockKrData {
  id: string;
  status: OkrRagStatus;
  current_value: number;
  baseline: number;
  target: number;
  direction: OkrDirection;
  lastCheckinDate?: string | null;
}

// Initiative data for health calculations
export interface MockInitiativeData {
  id: string;
  status: InitiativeStatus;
  expected_end_date?: string | null;
}

// Factory functions
export function createMockKr(overrides: Partial<MockKrData> = {}): MockKrData {
  return {
    id: `kr-${Math.random().toString(36).substring(7)}`,
    status: 'green',
    current_value: 50,
    baseline: 0,
    target: 100,
    direction: 'up',
    lastCheckinDate: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockInitiative(overrides: Partial<MockInitiativeData> = {}): MockInitiativeData {
  return {
    id: `init-${Math.random().toString(36).substring(7)}`,
    status: 'in_progress',
    expected_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    ...overrides,
  };
}

export function createMockCycle(overrides: Partial<Cycle> = {}): Cycle {
  const now = new Date();
  const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const quarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);
  
  return {
    id: `cycle-${Math.random().toString(36).substring(7)}`,
    name: `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`,
    start_date: quarterStart.toISOString().split('T')[0],
    end_date: quarterEnd.toISOString().split('T')[0],
    parent_cycle_id: null,
    ...overrides,
  };
}

// Pre-defined fixtures for common scenarios
export const FIXTURES = {
  // Healthy KR (green, good progress)
  healthyKr: createMockKr({
    id: 'kr-healthy-001',
    status: 'green',
    current_value: 80,
    baseline: 0,
    target: 100,
    direction: 'up',
  }),
  
  // At-risk KR (yellow)
  atRiskKr: createMockKr({
    id: 'kr-atrisk-001',
    status: 'yellow',
    current_value: 40,
    baseline: 0,
    target: 100,
    direction: 'up',
  }),
  
  // Critical KR (red, low progress)
  criticalKr: createMockKr({
    id: 'kr-critical-001',
    status: 'red',
    current_value: 10,
    baseline: 0,
    target: 100,
    direction: 'up',
  }),
  
  // KR with 'down' direction (e.g., reduce churn)
  reduceMetricKr: createMockKr({
    id: 'kr-reduce-001',
    status: 'green',
    current_value: 3,
    baseline: 10,
    target: 2,
    direction: 'down',
  }),
  
  // KR without recent check-in
  staleKr: createMockKr({
    id: 'kr-stale-001',
    status: 'yellow',
    current_value: 50,
    lastCheckinDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days ago
  }),
  
  // Initiative that is on track
  onTrackInitiative: createMockInitiative({
    id: 'init-ontrack-001',
    status: 'in_progress',
    expected_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }),
  
  // Late initiative
  lateInitiative: createMockInitiative({
    id: 'init-late-001',
    status: 'in_progress',
    expected_end_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
  }),
  
  // Completed initiative
  completedInitiative: createMockInitiative({
    id: 'init-completed-001',
    status: 'completed',
    expected_end_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  }),
  
  // Current quarter cycle
  currentCycle: createMockCycle({
    id: 'cycle-current-001',
    name: 'Q1 2026',
  }),
  
  // Cycle that ended
  pastCycle: createMockCycle({
    id: 'cycle-past-001',
    name: 'Q4 2025',
    start_date: '2025-10-01',
    end_date: '2025-12-31',
  }),
  
  // Cycle that hasn't started
  futureCycle: createMockCycle({
    id: 'cycle-future-001',
    name: 'Q2 2026',
    start_date: '2026-04-01',
    end_date: '2026-06-30',
  }),
};
