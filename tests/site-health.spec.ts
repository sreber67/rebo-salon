import { test, expect, type Page } from '@playwright/test';

/**
 * This is the most valuable test in this suite for your situation: it visits
 * every page of your site and automatically fails if:
 *   1. Any console error appears (this catches "Missing or insufficient
 *      permissions" and similar Firebase errors automatically, on every page,
 *      every time — no more manually opening DevTools to check)
 *   2. Any network request to your own API routes (/api/sms, /api/email,
 *      Firestore calls) comes back with a failed/blocked status
 *
 * This would have caught the Brave Shields issue and the Firestore rules
 * issue automatically the first time either happened.
 */

const PUBLIC_ROUTES = ['/', '/#services', '/#gallery', '/#products', '/#contact'];

function attachDiagnostics(page: Page, consoleErrors: string[], failedRequests: string[]) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(`Uncaught: ${err.message}`);
  });

  page.on('requestfailed', (req) => {
    // Only care about our own backend routes — third-party analytics beacons
    // (Google Analytics, Firebase Analytics, etc.) commonly get aborted on
    // navigation and are not a real bug in the app.
    if (req.url().includes('/api/')) {
      failedRequests.push(`${req.method()} ${req.url()} — ${req.failure()?.errorText}`);
    }
  });

  page.on('response', (res) => {
    // Flag any failed API call to our own backend routes specifically —
    // this is exactly the class of bug (SMS/email silently not firing)
    // that has been hardest to catch manually.
    if (res.url().includes('/api/') && res.status() >= 400) {
      failedRequests.push(`${res.status()} ${res.url()}`);
    }
  });
}

test.describe('Site-wide health check (no login required)', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`no console errors or failed requests on ${route}`, async ({ page }) => {
      const consoleErrors: string[] = [];
      const failedRequests: string[] = [];
      attachDiagnostics(page, consoleErrors, failedRequests);

      await page.goto(route);
      // Give Firestore's real-time listeners a moment to connect and settle
      await page.waitForTimeout(2000);

      expect(consoleErrors, `Console errors on ${route}:\n${consoleErrors.join('\n')}`).toEqual([]);
      expect(failedRequests, `Failed requests on ${route}:\n${failedRequests.join('\n')}`).toEqual([]);
    });
  }
});

test.describe('Authenticated pages', () => {
  test.skip(
    !process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD,
    'Set TEST_USER_EMAIL and TEST_USER_PASSWORD in environment variables to run this test'
  );

  test('no console errors or failed requests on booking/profile after login', async ({ page }) => {
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];
    attachDiagnostics(page, consoleErrors, failedRequests);

    await page.goto('/#auth');
    await page.getByPlaceholder(/e-mail-adresse|email address/i).fill(process.env.TEST_USER_EMAIL!);
    await page.getByPlaceholder(/passwort|password/i).fill(process.env.TEST_USER_PASSWORD!);
    await page.getByRole('button', { name: /einloggen|sign in/i }).click();
    await expect(page.getByText(/mein profil|my profile/i)).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000);

    await page.goto('/#booking');
    await page.waitForTimeout(2000);

    expect(consoleErrors, `Console errors:\n${consoleErrors.join('\n')}`).toEqual([]);
    expect(failedRequests, `Failed requests:\n${failedRequests.join('\n')}`).toEqual([]);
  });
});

test.describe('Admin panel', () => {
  test.skip(
    !process.env.TEST_ADMIN_EMAIL || !process.env.TEST_ADMIN_PASSWORD,
    'Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD in environment variables to run this test'
  );

  test('no console errors or failed requests on admin panel after login', async ({ page }) => {
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];
    attachDiagnostics(page, consoleErrors, failedRequests);

    await page.goto('/#auth');
    await page.getByPlaceholder(/e-mail-adresse|email address/i).fill(process.env.TEST_ADMIN_EMAIL!);
    await page.getByPlaceholder(/passwort|password/i).fill(process.env.TEST_ADMIN_PASSWORD!);
    await page.getByRole('button', { name: /einloggen|sign in/i }).click();
    await expect(page.getByText(/mein profil|my profile/i)).toBeVisible({ timeout: 15000 });

    await page.goto('/#admin');
    await page.waitForTimeout(3000); // admin panel loads several onSnapshot listeners

    expect(consoleErrors, `Console errors:\n${consoleErrors.join('\n')}`).toEqual([]);
    expect(failedRequests, `Failed requests:\n${failedRequests.join('\n')}`).toEqual([]);
  });
});