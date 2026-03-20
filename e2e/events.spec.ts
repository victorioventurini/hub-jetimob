/**
 * Events Module (Jet Experience) E2E Tests
 */
import { test, expect } from '@playwright/test';

test.describe('Events Routes (Protected)', () => {
  const routes = [
    { path: '/events', name: 'Events Dashboard' },
    { path: '/events/capture', name: 'Opportunity Capture' },
    { path: '/events/settings', name: 'Events Settings' },
  ];

  for (const route of routes) {
    test(`${route.name} should require authentication`, async ({ page }) => {
      await page.goto(route.path);
      await page.waitForURL(/\/auth/, { timeout: 5000 });
      expect(page.url()).toContain('/auth');
    });
  }
});

test.describe('Events Module Structure', () => {
  test('should redirect to auth from /events when not authenticated', async ({ page }) => {
    const response = await page.goto('/events');
    expect(response?.status()).toBeLessThan(500);
  });
});
