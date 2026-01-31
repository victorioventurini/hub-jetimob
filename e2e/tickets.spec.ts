/**
 * Tickets Module E2E Tests
 * 
 * Tests for Tickets functionality
 */

import { test, expect } from '@playwright/test';

test.describe('Tickets Routes (Protected)', () => {
  const ticketRoutes = [
    { path: '/tickets', name: 'Tickets List' },
    { path: '/tickets/new', name: 'Create Ticket' },
    { path: '/tickets/settings', name: 'Tickets Settings' },
  ];

  for (const route of ticketRoutes) {
    test(`${route.name} should require authentication`, async ({ page }) => {
      await page.goto(route.path);
      await page.waitForURL(/\/auth/, { timeout: 5000 });
      expect(page.url()).toContain('/auth');
    });
  }
});

test.describe('Tickets Create Flow', () => {
  test.skip('should display create ticket form when authenticated', async ({ page }) => {
    // Requires auth
    await page.goto('/tickets/new');
    
    // Check for form elements
    const form = page.locator('form');
    await expect(form).toBeVisible();
    
    // Check for required fields
    const titleInput = page.locator('input[name="title"], [data-testid="ticket-title"]');
    await expect(titleInput).toBeVisible();
  });
});

test.describe('Tickets Settings Access', () => {
  test.skip('should require admin permission for settings', async ({ page }) => {
    // Requires auth with admin role
    await page.goto('/tickets/settings');
    
    // Should either show settings or permission denied
    const hasSettings = await page.locator('text=/categorias|routing|configurações/i').isVisible();
    const hasPermissionDenied = await page.locator('text=/permissão|acesso negado|unauthorized/i').isVisible();
    
    expect(hasSettings || hasPermissionDenied).toBeTruthy();
  });
});
