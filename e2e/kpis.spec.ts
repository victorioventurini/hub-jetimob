/**
 * KPIs Module E2E Tests
 * 
 * Tests for KPIs dashboard and management functionality
 */

import { test, expect } from '@playwright/test';

test.describe('KPIs Dashboard (Protected Route)', () => {
  test('should redirect to auth when not authenticated', async ({ page }) => {
    await page.goto('/kpis');
    await page.waitForURL(/\/auth/, { timeout: 5000 });
    expect(page.url()).toContain('/auth');
  });

  test('should redirect /kpis/dashboard to auth when not authenticated', async ({ page }) => {
    await page.goto('/kpis/dashboard');
    await page.waitForURL(/\/auth/, { timeout: 5000 });
    expect(page.url()).toContain('/auth');
  });
});

test.describe('KPIs Route Structure', () => {
  const kpiRoutes = [
    { path: '/kpis', name: 'KPIs Index' },
    { path: '/kpis/dashboard', name: 'KPIs Dashboard' },
  ];

  for (const route of kpiRoutes) {
    test(`${route.name} should require authentication`, async ({ page }) => {
      await page.goto(route.path);
      await page.waitForURL(/\/auth/, { timeout: 5000 });
      expect(page.url()).toContain('/auth');
    });
  }
});

test.describe('KPIs Accessibility', () => {
  test.skip('should have proper heading structure when authenticated', async ({ page }) => {
    // Requires auth - skipped until auth fixtures are implemented
    await page.goto('/kpis/dashboard');
    
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
  });

  test.skip('should have accessible KPI cards', async ({ page }) => {
    // Requires auth - skipped until auth fixtures are implemented
    await page.goto('/kpis/dashboard');
    
    const cards = page.locator('[data-testid="kpi-card"], .kpi-card');
    const count = await cards.count();
    
    if (count > 0) {
      // Each card should have a title
      for (let i = 0; i < Math.min(count, 3); i++) {
        const card = cards.nth(i);
        const hasTitle = await card.locator('h3, [role="heading"]').isVisible();
        expect(hasTitle).toBeTruthy();
      }
    }
  });
});
