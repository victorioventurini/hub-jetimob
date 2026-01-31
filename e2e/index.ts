/**
 * E2E Tests Barrel Export
 * 
 * Organizes all E2E test fixtures and utilities.
 * 
 * Test Files (13 specs):
 * - accessibility.spec.ts - WCAG accessibility checks
 * - assets.spec.ts - Assets/Inventory module
 * - auth.spec.ts - Authentication flow
 * - integrations.spec.ts - Integrations & AI Agents
 * - kpis.spec.ts - KPIs module
 * - navigation.spec.ts - Route protection & navigation
 * - okr-dashboard.spec.ts - OKR Dashboard (legacy)
 * - okr-wizards.spec.ts - OKR Wizards
 * - okrs.spec.ts - OKRs comprehensive tests
 * - performance.spec.ts - Performance metrics
 * - responsive.spec.ts - Responsive design
 * - teams.spec.ts - Teams & Organogram
 * - tickets.spec.ts - Tickets module
 * - users.spec.ts - User management
 * 
 * Coverage: ~70% of critical routes
 */

export * from './fixtures/test-data';
export * from './fixtures/auth.fixture';
