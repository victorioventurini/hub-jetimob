/**
 * Assets Module E2E Tests
 * 
 * Tests for Assets/Inventory functionality
 */

import { test, expect } from '@playwright/test';

test.describe('Assets Routes (Protected)', () => {
  const assetRoutes = [
    { path: '/assets', name: 'Assets Index' },
    { path: '/assets/inventory', name: 'Inventory' },
    { path: '/assets/keys', name: 'Keys' },
    { path: '/assets/gifts', name: 'Gifts' },
  ];

  for (const route of assetRoutes) {
    test(`${route.name} should require authentication`, async ({ page }) => {
      await page.goto(route.path);
      await page.waitForURL(/\/auth/, { timeout: 5000 });
      expect(page.url()).toContain('/auth');
    });
  }
});

test.describe('Assets Inventory Structure', () => {
  test.skip('should display inventory list when authenticated', async ({ page }) => {
    // Requires auth
    await page.goto('/assets/inventory');
    
    // Check for list structure
    const hasTable = await page.locator('table, [role="grid"]').isVisible();
    const hasCards = await page.locator('[data-testid="asset-card"]').count() > 0;
    const hasEmptyState = await page.locator('text=/nenhum|vazio|empty/i').isVisible();
    
    expect(hasTable || hasCards || hasEmptyState).toBeTruthy();
  });

  test.skip('should have search functionality', async ({ page }) => {
    // Requires auth
    await page.goto('/assets/inventory');
    
    const searchInput = page.locator('input[type="search"], input[placeholder*="buscar" i], input[placeholder*="pesquisar" i]');
    const hasSearch = await searchInput.isVisible();
    
    expect(hasSearch).toBeTruthy();
  });
});

test.describe('Assets Accessibility', () => {
  test.skip('should have proper heading hierarchy', async ({ page }) => {
    // Requires auth
    await page.goto('/assets/inventory');
    
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
  });
});
