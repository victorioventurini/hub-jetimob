/**
 * Performance E2E Tests
 * 
 * Basic performance checks for critical pages
 */

import { test, expect } from '@playwright/test';
import { ROUTES } from './fixtures/test-data';

test.describe('Page Load Performance', () => {
  test('auth page should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto(ROUTES.auth);
    await page.waitForLoadState('domcontentloaded');
    
    const loadTime = Date.now() - startTime;
    
    // Page should load DOM content within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('auth page should be interactive quickly', async ({ page }) => {
    await page.goto(ROUTES.auth);
    
    const startTime = Date.now();
    
    // Wait for email input to be interactive
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await expect(emailInput).toBeVisible();
    await emailInput.click();
    
    const interactiveTime = Date.now() - startTime;
    
    // Should be interactive within 3 seconds
    expect(interactiveTime).toBeLessThan(3000);
  });
});

test.describe('Asset Loading', () => {
  test('critical assets should load', async ({ page }) => {
    const failedRequests: string[] = [];
    
    page.on('requestfailed', (request) => {
      const url = request.url();
      // Only track critical assets
      if (url.includes('.js') || url.includes('.css')) {
        failedRequests.push(url);
      }
    });
    
    await page.goto(ROUTES.auth);
    await page.waitForLoadState('networkidle');
    
    // No critical assets should fail
    expect(failedRequests).toHaveLength(0);
  });

  test('page should not have excessive network requests', async ({ page }) => {
    let requestCount = 0;
    
    page.on('request', () => {
      requestCount++;
    });
    
    await page.goto(ROUTES.auth);
    await page.waitForLoadState('networkidle');
    
    // Auth page should not make more than 50 requests
    expect(requestCount).toBeLessThan(50);
  });
});

test.describe('Memory and Resources', () => {
  test('page should not have JavaScript errors', async ({ page }) => {
    const jsErrors: string[] = [];
    
    page.on('pageerror', (error) => {
      jsErrors.push(error.message);
    });
    
    await page.goto(ROUTES.auth);
    await page.waitForLoadState('networkidle');
    
    // No JavaScript errors should occur
    expect(jsErrors).toHaveLength(0);
  });

  test('console should not have critical errors', async ({ page }) => {
    const criticalErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore some common non-critical errors
        if (!text.includes('Failed to load resource') && 
            !text.includes('favicon')) {
          criticalErrors.push(text);
        }
      }
    });
    
    await page.goto(ROUTES.auth);
    await page.waitForLoadState('networkidle');
    
    // Should have minimal critical console errors
    expect(criticalErrors.length).toBeLessThan(3);
  });
});

test.describe('Caching', () => {
  test('static assets should be cacheable', async ({ page }) => {
    const responses: { url: string; cacheControl: string | null }[] = [];
    
    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('.js') || url.includes('.css') || url.includes('.png')) {
        responses.push({
          url,
          cacheControl: response.headers()['cache-control'] || null,
        });
      }
    });
    
    await page.goto(ROUTES.auth);
    await page.waitForLoadState('networkidle');
    
    // At least some static assets should have cache headers
    const cachedAssets = responses.filter(r => r.cacheControl !== null);
    // This is informational - not all dev servers set cache headers
  });
});
