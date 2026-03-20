/**
 * KPIs Module Extended E2E Tests
 */
import { test, expect } from '@playwright/test';

test.describe('KPIs Routes (Protected)', () => {
  const routes = [
    { path: '/kpis', name: 'KPIs Dashboard' },
    { path: '/kpis/settings', name: 'KPIs Settings' },
  ];

  for (const route of routes) {
    test(`${route.name} should require authentication`, async ({ page }) => {
      await page.goto(route.path);
      await page.waitForURL(/\/auth/, { timeout: 5000 });
      expect(page.url()).toContain('/auth');
    });
  }
});

test.describe('KPIs Auth Guard', () => {
  test('should not expose data to unauthenticated users', async ({ page }) => {
    await page.goto('/kpis');
    await page.waitForURL(/\/auth/, { timeout: 5000 });
    
    // Should not show any KPI data
    const hasKpiData = await page.locator('[data-testid="kpi-card"]').count();
    expect(hasKpiData).toBe(0);
  });
});
