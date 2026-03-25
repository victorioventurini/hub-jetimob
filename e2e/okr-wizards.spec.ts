/**
 * OKR Wizards E2E Tests
 * 
 * Tests for OKR wizard flows (check-in, creation, etc.)
 * Note: Most tests require authentication
 */

import { test, expect } from '@playwright/test';
import { ROUTES, TEST_KR, TEST_OBJECTIVE } from './fixtures/test-data';

test.describe('OKR Wizard Routes', () => {
  test('team check-in wizard redirects when unauthenticated', async ({ page }) => {
    await page.goto(ROUTES.teamCheckin);
    await page.waitForURL(/\/auth/, { timeout: 5000 });
    expect(page.url()).toContain('/auth');
  });

  test('leader prep wizard redirects when unauthenticated', async ({ page }) => {
    await page.goto(ROUTES.leaderPrep);
    await page.waitForURL(/\/auth/, { timeout: 5000 });
    expect(page.url()).toContain('/auth');
  });

  test('managers check-in wizard redirects when unauthenticated', async ({ page }) => {
    await page.goto(ROUTES.managersCheckin);
    await page.waitForURL(/\/auth/, { timeout: 5000 });
    expect(page.url()).toContain('/auth');
  });
});

test.describe('QBR Wizard Routes', () => {
  const qbrRoutes = [
    { path: '/okrs/qbr-pre', label: 'QBR Pre' },
    { path: '/okrs/qbr-pre-clevel', label: 'QBR Pre C-Level' },
    { path: '/okrs/qbr', label: 'QBR Meeting' },
    { path: '/okrs/qbr-post', label: 'QBR Post' },
  ];

  for (const route of qbrRoutes) {
    test(`${route.label} redirects to auth when unauthenticated`, async ({ page }) => {
      await page.goto(route.path);
      await page.waitForURL(/\/auth/, { timeout: 5000 });
      expect(page.url()).toContain('/auth');
    });
  }
});

test.describe('Additional Ritual Routes', () => {
  test('MBR redirects to auth when unauthenticated', async ({ page }) => {
    await page.goto('/okrs/mbr');
    await page.waitForURL(/\/auth/, { timeout: 5000 });
    expect(page.url()).toContain('/auth');
  });

  test('C-Level check-in redirects to auth when unauthenticated', async ({ page }) => {
    await page.goto('/okrs/clevel-checkin');
    await page.waitForURL(/\/auth/, { timeout: 5000 });
    expect(page.url()).toContain('/auth');
  });

  test('construction review redirects to auth when unauthenticated', async ({ page }) => {
    await page.goto(ROUTES.constructionReview);
    await page.waitForURL(/\/auth/, { timeout: 5000 });
    expect(page.url()).toContain('/auth');
  });
});

test.describe('Wizard URL State (Authenticated)', () => {
  test.skip('team check-in should preserve teamId in URL', async ({ page }) => {
    const teamId = 'test-team-123';
    await page.goto(`${ROUTES.teamCheckin}?teamId=${teamId}`);
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain(`teamId=${teamId}`);
  });

  test.skip('leader prep should preserve step in URL', async ({ page }) => {
    await page.goto(`${ROUTES.leaderPrep}?step=2`);
    await page.waitForLoadState('networkidle');
    const url = page.url();
    expect(url).toContain('step=');
  });
});

test.describe('Wizard Components Structure', () => {
  test.skip('check-in wizard should have step indicators', async ({ page }) => {
    await page.goto(ROUTES.teamCheckin);
    const stepIndicator = page.locator('[data-testid="wizard-steps"], [role="progressbar"], .step-indicator');
    await expect(stepIndicator).toBeVisible();
  });

  test.skip('wizard should have navigation buttons', async ({ page }) => {
    await page.goto(ROUTES.teamCheckin);
    const nextButton = page.locator('button:has-text("Continuar"), button:has-text("Próximo"), button:has-text("Avançar")');
    await expect(nextButton).toBeVisible();
  });
});

test.describe('Wizard Form Validation', () => {
  test.skip('should validate required fields before proceeding', async ({ page }) => {
    await page.goto(ROUTES.teamCheckin);
    const nextButton = page.locator('button:has-text("Continuar"), button:has-text("Próximo")');
    await nextButton.click();
    const hasError = await page.locator('[role="alert"], .text-destructive, [data-testid="error"]').isVisible();
    const isDisabled = await nextButton.isDisabled();
    expect(hasError || isDisabled).toBeTruthy();
  });
});
