/**
 * Authentication E2E Tests
 * 
 * Tests for login flow and authentication
 */

import { test, expect } from '@playwright/test';
import { ROUTES } from './fixtures/test-data';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.auth);
  });

  test('should display auth page with email input', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Hub|Jetimob|Login/i);
    
    // Check for email input
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await expect(emailInput).toBeVisible();
    
    // Check for submit button
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
  });

  test('should show validation error for invalid email', async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await emailInput.fill('invalid-email');
    
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    
    // Should show validation message or input should be invalid
    const hasError = await page.locator('[role="alert"], .text-destructive, [data-testid="error-message"]').isVisible();
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    
    expect(hasError || isInvalid).toBeTruthy();
  });

  test('should accept valid email and proceed', async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await emailInput.fill('test@jetimob.com');
    
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    
    // Should either show OTP input or redirect
    await page.waitForTimeout(1000);
    
    // Check if we're on a different state (OTP input, loading, or redirect)
    const hasOtpInput = await page.locator('input[type="text"][maxlength="6"], [data-testid="otp-input"]').isVisible();
    const hasSuccessMessage = await page.locator('text=/código|verificação|enviado/i').isVisible();
    const urlChanged = page.url() !== `http://localhost:5173${ROUTES.auth}`;
    
    expect(hasOtpInput || hasSuccessMessage || urlChanged).toBeTruthy();
  });

  test('should have accessible form elements', async ({ page }) => {
    // Check for proper labels
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const inputId = await emailInput.getAttribute('id');
    
    if (inputId) {
      const label = page.locator(`label[for="${inputId}"]`);
      const hasLabel = await label.isVisible();
      const hasAriaLabel = await emailInput.getAttribute('aria-label');
      
      expect(hasLabel || hasAriaLabel).toBeTruthy();
    }
  });

  test('should redirect unauthenticated users from protected routes', async ({ page }) => {
    // Try to access protected route
    await page.goto('/okrs/dashboard');
    
    // Should redirect to auth
    await page.waitForURL(/\/auth/);
    expect(page.url()).toContain('/auth');
  });
});

test.describe('Auth Page UI', () => {
  test('should display company branding', async ({ page }) => {
    await page.goto(ROUTES.auth);
    
    // Check for logo or company name
    const hasBranding = await page.locator('img[alt*="logo" i], img[alt*="jet" i], text=/jetimob/i').first().isVisible();
    expect(hasBranding).toBeTruthy();
  });

  test('should be responsive', async ({ page }) => {
    await page.goto(ROUTES.auth);
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await expect(emailInput).toBeVisible();
    
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    
    await expect(emailInput).toBeVisible();
    await expect(submitButton).toBeVisible();
  });
});
