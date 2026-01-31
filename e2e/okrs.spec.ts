/**
 * OKRs Module E2E Tests
 * 
 * Comprehensive tests for OKRs functionality
 */

import { test, expect } from '@playwright/test';

test.describe('OKRs Routes (Protected)', () => {
  const okrRoutes = [
    { path: '/okrs', name: 'OKRs Index' },
    { path: '/okrs/dashboard', name: 'Dashboard' },
    { path: '/okrs/team-checkin', name: 'Team Check-in' },
    { path: '/okrs/leader-prep', name: 'Leader Prep' },
    { path: '/okrs/managers-checkin', name: 'Managers Check-in' },
    { path: '/okrs/construction-review', name: 'Construction Review' },
  ];

  for (const route of okrRoutes) {
    test(`${route.name} should require authentication`, async ({ page }) => {
      await page.goto(route.path);
      await page.waitForURL(/\/auth/, { timeout: 5000 });
      expect(page.url()).toContain('/auth');
    });
  }
});

test.describe('OKRs Dashboard Structure', () => {
  test.skip('should display cycle selector when authenticated', async ({ page }) => {
    // Requires auth - skipped until auth fixtures implemented
    await page.goto('/okrs/dashboard');
    
    const hasCycleSelector = await page.locator('[data-testid="cycle-selector"], select, [role="combobox"]').isVisible();
    expect(hasCycleSelector).toBeTruthy();
  });

  test.skip('should display team objectives section', async ({ page }) => {
    // Requires auth
    await page.goto('/okrs/dashboard');
    
    const hasObjectivesSection = await page.locator('text=/objetivos|objectives/i').isVisible();
    const hasEmptyState = await page.locator('text=/nenhum|vazio|empty|criar/i').isVisible();
    
    expect(hasObjectivesSection || hasEmptyState).toBeTruthy();
  });

  test.skip('should have key results display', async ({ page }) => {
    // Requires auth
    await page.goto('/okrs/dashboard');
    
    const hasKRSection = await page.locator('text=/resultado|key result|kr/i').count() > 0;
    expect(hasKRSection).toBeTruthy();
  });
});

test.describe('OKRs Check-in Flow', () => {
  test.skip('should display check-in wizard when authenticated', async ({ page }) => {
    // Requires auth
    await page.goto('/okrs/team-checkin');
    
    const hasCheckinContent = await page.locator('text=/check-?in|atualização|progresso/i').isVisible();
    const hasEmptyState = await page.locator('text=/nenhum|pendente/i').isVisible();
    
    expect(hasCheckinContent || hasEmptyState).toBeTruthy();
  });
});

test.describe('OKRs Leader Prep', () => {
  test.skip('should display preparation interface when authenticated', async ({ page }) => {
    // Requires auth - leader only
    await page.goto('/okrs/leader-prep');
    
    const hasPrepContent = await page.locator('text=/preparação|preparar|time/i').isVisible();
    expect(hasPrepContent).toBeTruthy();
  });
});

test.describe('OKRs Accessibility', () => {
  test.skip('should have proper heading hierarchy on dashboard', async ({ page }) => {
    // Requires auth
    await page.goto('/okrs/dashboard');
    
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
  });

  test.skip('should have accessible progress indicators', async ({ page }) => {
    // Requires auth
    await page.goto('/okrs/dashboard');
    
    const progressBars = page.locator('[role="progressbar"], progress');
    const hasProgress = await progressBars.count() > 0;
    
    if (hasProgress) {
      const firstProgress = progressBars.first();
      const hasAriaValue = await firstProgress.getAttribute('aria-valuenow') !== null ||
                          await firstProgress.getAttribute('value') !== null;
      expect(hasAriaValue).toBeTruthy();
    }
  });
});
