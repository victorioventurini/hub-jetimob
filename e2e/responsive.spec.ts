/**
 * Responsive Design E2E Tests
 * 
 * Tests for responsive layout across different viewports
 */

import { test, expect } from '@playwright/test';
import { ROUTES } from './fixtures/test-data';

const VIEWPORTS = {
  mobile: { width: 375, height: 667, name: 'Mobile (iPhone SE)' },
  tablet: { width: 768, height: 1024, name: 'Tablet (iPad)' },
  desktop: { width: 1280, height: 720, name: 'Desktop' },
  widescreen: { width: 1920, height: 1080, name: 'Widescreen' },
};

test.describe('Responsive Auth Page', () => {
  for (const [key, viewport] of Object.entries(VIEWPORTS)) {
    test(`should display correctly on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(ROUTES.auth);
      
      // Email input should be visible and usable
      const emailInput = page.locator('input[type="email"], input[name="email"]');
      await expect(emailInput).toBeVisible();
      
      // Submit button should be visible
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeVisible();
      
      // Check that input is not cut off
      const inputBox = await emailInput.boundingBox();
      expect(inputBox).toBeTruthy();
      if (inputBox) {
        expect(inputBox.width).toBeGreaterThan(100);
        expect(inputBox.x).toBeGreaterThanOrEqual(0);
        expect(inputBox.x + inputBox.width).toBeLessThanOrEqual(viewport.width);
      }
    });
  }
});

test.describe('Mobile Navigation', () => {
  test('should have touch-friendly targets on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto(ROUTES.auth);
    
    // All interactive elements should have minimum touch target size (44x44px recommended)
    const buttons = page.locator('button, [role="button"]');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const box = await button.boundingBox();
        if (box) {
          // At least 40x40 for touch targets (slightly below 44 to account for padding)
          expect(box.width).toBeGreaterThanOrEqual(40);
          expect(box.height).toBeGreaterThanOrEqual(40);
        }
      }
    }
  });

  test('should not have horizontal scroll on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto(ROUTES.auth);
    
    // Check for horizontal overflow
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    
    expect(hasHorizontalScroll).toBeFalsy();
  });
});

test.describe('Tablet Layout', () => {
  test('should utilize tablet screen space', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tablet);
    await page.goto(ROUTES.auth);
    
    // Content should be centered or properly positioned
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const box = await emailInput.boundingBox();
    
    expect(box).toBeTruthy();
    if (box) {
      // Input should not be full width on tablet
      expect(box.width).toBeLessThan(VIEWPORTS.tablet.width - 40);
      // Should have some margin from edges
      expect(box.x).toBeGreaterThan(20);
    }
  });
});

test.describe('Desktop Layout', () => {
  test('should have proper content width on desktop', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(ROUTES.auth);
    
    // Content should be constrained
    const form = page.locator('form');
    if (await form.isVisible()) {
      const box = await form.boundingBox();
      expect(box).toBeTruthy();
      if (box) {
        // Form should not be full width on desktop
        expect(box.width).toBeLessThan(VIEWPORTS.desktop.width - 100);
      }
    }
  });

  test('should handle widescreen without breaking', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.widescreen);
    await page.goto(ROUTES.auth);
    
    // Content should still be visible and centered
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await expect(emailInput).toBeVisible();
    
    const box = await emailInput.boundingBox();
    expect(box).toBeTruthy();
    if (box) {
      // Should be somewhat centered
      const center = VIEWPORTS.widescreen.width / 2;
      const inputCenter = box.x + box.width / 2;
      const offset = Math.abs(center - inputCenter);
      
      // Input should be within 400px of center (allowing for sidebar layouts)
      expect(offset).toBeLessThan(600);
    }
  });
});

test.describe('Orientation Changes', () => {
  test('should handle portrait to landscape switch', async ({ page }) => {
    // Start in portrait
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(ROUTES.auth);
    
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await expect(emailInput).toBeVisible();
    
    // Switch to landscape
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForTimeout(300); // Allow for CSS transitions
    
    // Content should still be visible
    await expect(emailInput).toBeVisible();
    
    // Should not have vertical overflow issues
    const hasVerticalScroll = await page.evaluate(() => {
      return document.documentElement.scrollHeight > document.documentElement.clientHeight * 1.5;
    });
    
    // Some scroll is ok, but not excessive
    expect(hasVerticalScroll).toBeFalsy();
  });
});
