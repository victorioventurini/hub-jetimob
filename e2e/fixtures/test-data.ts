/**
 * E2E Test Data Fixtures
 * 
 * Shared test data for Playwright E2E tests
 */

export const TEST_USERS = {
  admin: {
    email: 'admin@test.jetimob.com',
    name: 'Admin Test',
  },
  leader: {
    email: 'leader@test.jetimob.com',
    name: 'Leader Test',
  },
  member: {
    email: 'member@test.jetimob.com',
    name: 'Member Test',
  },
} as const;

export const TEST_TEAM = {
  id: 'test-team-id',
  name: 'Equipe de Teste',
};

export const TEST_CYCLE = {
  id: 'test-cycle-id',
  name: 'Q1 2026',
};

export const TEST_OBJECTIVE = {
  title: 'Aumentar satisfação do cliente em 20%',
  description: 'Objetivo de teste para E2E',
};

export const TEST_KR = {
  title: 'Alcançar NPS de 80 pontos',
  baseline: 60,
  target: 80,
  direction: 'up' as const,
};

export const ROUTES = {
  auth: '/auth',
  home: '/',
  okrs: '/okrs',
  okrsDashboard: '/okrs/dashboard',
  teamCheckin: '/okrs/team-checkin',
  leaderPrep: '/okrs/leader-prep',
  managersCheckin: '/okrs/managers-checkin',
} as const;
