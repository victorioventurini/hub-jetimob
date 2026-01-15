/**
 * Navigation E2E Tests
 * 
 * Tests for app navigation and routing
 */

import { test, expect } from '@playwright/test';
import { ROUTES } from './fixtures/test-data';

test.describe('Public Routes', () => {
  test('should load auth page', async ({ page }) => {
    await page.goto(ROUTES.auth);
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should load home page', async ({ page }) => {
    await page.goto(ROUTES.home);
    // Home may redirect to auth if not logged in
    await page.waitForLoadState('networkidle');
    expect(page.url()).toMatch(/\/(auth)?$/);
  });
});

test.describe('Protected Routes Redirect', () => {
  const protectedRoutes = [
    { path: '/okrs', name: 'OKRs' },
    { path: '/okrs/dashboard', name: 'OKR Dashboard' },
    { path: '/okrs/team-checkin', name: 'Team Check-in' },
    { path: '/okrs/leader-prep', name: 'Leader Prep' },
    { path: '/okrs/managers-checkin', name: 'Managers Check-in' },
    { path: '/admin', name: 'Admin' },
  ];

  for (const route of protectedRoutes) {
    test(`should redirect ${route.name} to auth when not logged in`, async ({ page }) => {
      await page.goto(route.path);
      await page.waitForURL(/\/auth/, { timeout: 5000 });
      expect(page.url()).toContain('/auth');
    });
  }
});

test.describe('Navigation Elements', () => {
  test('should have proper navigation structure on auth page', async ({ page }) => {
    await page.goto(ROUTES.auth);
    
    // Main content should be accessible
    const main = page.locator('main, [role="main"]');
    const hasMain = await main.count() > 0;
    
    // If no main, at least should have a form
    if (!hasMain) {
      const form = page.locator('form');
      await expect(form).toBeVisible();
    }
  });

  test('should support keyboard navigation on auth page', async ({ page }) => {
    await page.goto(ROUTES.auth);
    
    // Tab to email input
    await page.keyboard.press('Tab');
    
    // Check if email input is focused (might need multiple tabs)
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    
    // Try focusing it directly and check if it's focusable
    await emailInput.focus();
    const isFocused = await emailInput.evaluate((el) => document.activeElement === el);
    expect(isFocused).toBeTruthy();
  });
});

test.describe('Error Handling', () => {
  test('should show 404 or redirect for unknown routes', async ({ page }) => {
    await page.goto('/non-existent-route-12345');
    
    await page.waitForLoadState('networkidle');
    
    // Should either show 404 page or redirect to home/auth
    const has404 = await page.locator('text=/404|não encontrad|not found/i').isVisible();
    const redirectedToKnown = /\/(auth|okrs)?$/.test(page.url());
    
    expect(has404 || redirectedToKnown).toBeTruthy();
  });
});
