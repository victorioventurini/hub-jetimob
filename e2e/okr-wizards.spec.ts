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

test.describe('Wizard URL State (Authenticated)', () => {
  // These tests verify URL state handling
  // They would require proper auth mocking

  test.skip('team check-in should preserve teamId in URL', async ({ page }) => {
    const teamId = 'test-team-123';
    await page.goto(`${ROUTES.teamCheckin}?teamId=${teamId}`);
    
    // After any redirects, URL should maintain teamId
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain(`teamId=${teamId}`);
  });

  test.skip('leader prep should preserve step in URL', async ({ page }) => {
    await page.goto(`${ROUTES.leaderPrep}?step=2`);
    
    await page.waitForLoadState('networkidle');
    // Step should be in URL or wizard should show step 2
    const url = page.url();
    expect(url).toContain('step=');
  });
});

test.describe('Wizard Components Structure', () => {
  // Tests for wizard component presence (when accessible)

  test.skip('check-in wizard should have step indicators', async ({ page }) => {
    await page.goto(ROUTES.teamCheckin);
    
    // Look for step indicators
    const stepIndicator = page.locator('[data-testid="wizard-steps"], [role="progressbar"], .step-indicator');
    await expect(stepIndicator).toBeVisible();
  });

  test.skip('wizard should have navigation buttons', async ({ page }) => {
    await page.goto(ROUTES.teamCheckin);
    
    // Look for navigation buttons
    const nextButton = page.locator('button:has-text("Continuar"), button:has-text("Próximo"), button:has-text("Avançar")');
    const backButton = page.locator('button:has-text("Voltar"), button:has-text("Anterior")');
    
    await expect(nextButton).toBeVisible();
    // Back button might not be visible on first step
  });
});

test.describe('Wizard Form Validation', () => {
  test.skip('should validate required fields before proceeding', async ({ page }) => {
    await page.goto(ROUTES.teamCheckin);
    
    // Try to proceed without filling required fields
    const nextButton = page.locator('button:has-text("Continuar"), button:has-text("Próximo")');
    await nextButton.click();
    
    // Should show validation errors or be disabled
    const hasError = await page.locator('[role="alert"], .text-destructive, [data-testid="error"]').isVisible();
    const isDisabled = await nextButton.isDisabled();
    
    expect(hasError || isDisabled).toBeTruthy();
  });
});
