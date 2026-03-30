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
  // Auth
  auth: '/auth',
  home: '/',
  
  // OKRs
  okrs: '/okrs',
  okrsDashboard: '/okrs/dashboard',
  constructionReview: '/okrs/construction-review',
  
  // Rituals
  rituals: '/rituals',
  collaboratorCheckin: '/rituals/collaborator-checkin',
  teamCheckinPre: '/rituals/team-checkin-pre',
  teamCheckin: '/rituals/team-checkin',
  managersCheckin: '/rituals/managers-checkin',
  clevelCheckin: '/rituals/clevel-checkin',
  mbr: '/rituals/mbr',
  qbrPre: '/rituals/qbr-pre',
  qbrClevel: '/rituals/qbr-clevel',
  qbr: '/rituals/qbr',
  qbrPost: '/rituals/qbr-post',
  ritualHistory: '/rituals/history',
  
  // Assets
  assets: '/assets',
  inventory: '/assets/inventory',
  keys: '/assets/keys',
  gifts: '/assets/gifts',
  
  // Tickets
  tickets: '/tickets',
  
  // KPIs
  kpis: '/kpis',
  
  // Settings
  users: '/settings/users',
  permissions: '/settings/permissions',
  teams: '/settings/teams',
  organogram: '/settings/organogram',
  areas: '/settings/areas',
  
  // Integrations
  integrations: '/settings/integrations',
  aiAgents: '/settings/integrations/ai-agents',
  cron: '/settings/integrations/cron',
  notifications: '/settings/integrations/notifications',
} as const;
