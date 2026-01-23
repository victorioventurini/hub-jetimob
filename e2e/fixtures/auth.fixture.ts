/**
 * Auth Fixture for E2E Tests
 * 
 * Provides authentication helpers for Playwright tests
 */

import { test as base, expect, type Page } from '@playwright/test';
import { ROUTES, TEST_USERS } from './test-data';

export interface AuthFixture {
  loginAsAdmin: () => Promise<void>;
  loginAsLeader: () => Promise<void>;
  loginAsMember: () => Promise<void>;
  logout: () => Promise<void>;
}

async function performLogin(page: Page, email: string): Promise<void> {
  await page.goto(ROUTES.auth);
  
  // Wait for auth page to load
  await page.waitForSelector('[data-testid="auth-form"], form');
  
  // Fill email
  const emailInput = page.locator('input[type="email"], input[name="email"]');
  await emailInput.fill(email);
  
  // Click continue/submit
  const submitButton = page.locator('button[type="submit"]');
  await submitButton.click();
  
  // Note: In test environment, we'd mock the Magic Link callback
  // For now, this sets up the flow - actual auth would need backend mocking
}

export const test = base.extend<AuthFixture>({
  loginAsAdmin: async ({ page }, use) => {
    await use(async () => {
      await performLogin(page, TEST_USERS.admin.email);
    });
  },
  
  loginAsLeader: async ({ page }, use) => {
    await use(async () => {
      await performLogin(page, TEST_USERS.leader.email);
    });
  },
  
  loginAsMember: async ({ page }, use) => {
    await use(async () => {
      await performLogin(page, TEST_USERS.member.email);
    });
  },
  
  logout: async ({ page }, use) => {
    await use(async () => {
      // Click user menu and logout
      const userMenu = page.locator('[data-testid="user-menu"]');
      if (await userMenu.isVisible()) {
        await userMenu.click();
        const logoutButton = page.locator('[data-testid="logout-button"], button:has-text("Sair")');
        await logoutButton.click();
      }
    });
  },
});

export { expect };
