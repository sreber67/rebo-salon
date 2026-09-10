import { Page } from '@playwright/test';

declare global {
  interface Window {
    firebase: any;
  }
}
/**
 * Accept cookie consent banner if present
 * This banner blocks clicks on elements behind it
 */
export async function acceptCookies(page: Page) {
  try {
    // Try multiple possible button texts/roles
    await page.getByRole('button', { name: /akzeptieren|accept|zustimmen|allow all|alle akzeptieren/i }).click({ timeout: 3000 });
    await page.waitForTimeout(500);
  } catch {
    try {
      // Try clicking by text content
      await page.getByText(/akzeptieren|accept|zustimmen|alle akzeptieren/i).first().click({ timeout: 3000 });
      await page.waitForTimeout(500);
    } catch {
      // Banner not present or already accepted
    }
  }
}

/**
 * Wait for page to be fully loaded and ready for interaction
 */
export async function waitForPageReady(page: Page, timeout = 15000) {
  try {
    await page.waitForLoadState('domcontentloaded', { timeout });
  } catch {
    // Continue anyway
  }
  await acceptCookies(page);
}

/**
 * Login helper for tests
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto('/#auth');
  await waitForPageReady(page);
  
  // Explicitly handle cookie banner before filling form
  await acceptCookies(page);
  await page.waitForTimeout(1000);
  
  // Debug: check what's on the page
  const pageContent = await page.textContent('body');
  console.log('Login page content:', pageContent?.substring(0, 1000));
  
  // Wait for form to be visible
  await expect(page.getByPlaceholder(/e-mail-adresse|email address/i)).toBeVisible({ timeout: 15000 });
  
  await page.getByPlaceholder(/e-mail-adresse|email address/i).fill(email);
  await page.getByPlaceholder(/passwort|password/i).fill(password);
  await page.getByRole('button', { name: /einloggen|sign in/i }).click();
  await expect(page.getByText(/mein profil|my profile/i)).toBeVisible({ timeout: 15000 });
  await waitForPageReady(page);
}

/**
 * Logout helper
 */
export async function logout(page: Page) {
  await page.goto('/#profile');
  await waitForPageReady(page);
  await page.getByRole('button', { name: /einstellungen|settings/i }).click();
  await page.waitForTimeout(500);
  await page.locator('button:has-text("Abmelden")').click({ force: true });
  
  // Wait for redirect to auth page
  await page.waitForURL('**/#auth', { timeout: 10000 }).catch(() => {});
  
  // Force page reload to clear client-side auth state
  await page.reload();
  await page.waitForTimeout(3000);
  
  // Explicitly clear Firebase auth by calling signOut via console
  await page.evaluate(() => {
    try {
      const auth = window.firebase?.auth?.();
      if (auth) auth.signOut();
    } catch {}
    // Also clear localStorage/sessionStorage
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.waitForTimeout(2000);
  
  // Navigate to auth page and VERIFY we're on the login form
  await page.goto('/#auth');
  await waitForPageReady(page);
  await acceptCookies(page);
  
  // Verify login form is actually visible (not profile page)
  await expect(page.getByPlaceholder(/e-mail-adresse|email address/i)).toBeVisible({ timeout: 15000 });
  console.log('Logout verified - login form is visible');
}

import { expect } from '@playwright/test';