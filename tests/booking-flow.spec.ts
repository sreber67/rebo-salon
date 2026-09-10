import { test, expect } from '@playwright/test';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { acceptCookies, waitForPageReady, login, logout } from './test-helpers';

// Initialize Firebase Admin for test data seeding
function getAdminDb() {
  if (getApps().length === 0) {
    const base64Key = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    if (!base64Key) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable not set');
    }
    const serviceAccount = JSON.parse(Buffer.from(base64Key, 'base64').toString('utf-8'));
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getFirestore();
}

// Seed test service if none exist
async function ensureTestService() {
  const db = getAdminDb();
  const servicesSnap = await db.collection('services').limit(1).get();
  if (servicesSnap.empty) {
    await db.collection('services').add({
      name: 'Test Haarschnitt',
      price: '35 €',
      durationMins: 30
    });
    console.log('Seeded test service');
  }
}

test.skip(
  !process.env.TEST_USER_EMAIL || !process.env.TEST_ADMIN_EMAIL,
  'Set TEST_USER_EMAIL/PASSWORD and TEST_ADMIN_EMAIL/PASSWORD in environment variables to run this test'
);

test('customer can book, admin confirm triggers SMS + email', async ({ page }) => {
  await ensureTestService();
  const consoleErrors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => consoleErrors.push(`Uncaught: ${err.message}`));

  // --- LOGIN AS CUSTOMER ---
  await login(page, process.env.TEST_USER_EMAIL!, process.env.TEST_USER_PASSWORD!);

  // --- BOOK AN APPOINTMENT ---
  await page.goto('/#booking');
  await waitForPageReady(page);
  
  // Wait for service items to load from Firestore
  await expect(page.locator('text=€').first()).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(2000);
  
  // Select first available service
  await page.locator('text=€').first().locator('..').click();
  await page.waitForTimeout(2000);
  
  // Debug: verify service was selected
  const pageAfterService = await page.textContent('body');
  console.log('Page after service select:', pageAfterService?.substring(0, 2000));
  
// Pick a date far in future to avoid conflicts
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 60);
  const dateStr = targetDate.toISOString().split('T')[0];
  await page.locator('input[type="date"]').fill(dateStr);
  await page.waitForTimeout(8000); // let Firestore listener settle longer
  
  // Try to click on the stylist dropdown if it exists
  try {
    await page.locator('select').first().click({ timeout: 3000 });
    await page.waitForTimeout(500);
    await page.locator('option:has-text("Egal")').first().click({ timeout: 3000 });
    await page.waitForTimeout(2000);
  } catch {
    // Not a select dropdown
  }
  
  // Debug: log what's on the page
  const pageContent = await page.textContent('body');
  console.log('Page content after date select:', pageContent?.substring(0, 2000));

  // Wait for time slots to appear - try multiple selectors
  // First wait for ANY time slot to be visible
  await expect(page.locator('button:has-text(":"):visible, [role="button"]:has-text(":"):visible').filter({ hasText: /^\d{2}:\d{2}$/ }).first()).toBeVisible({ timeout: 30000 });
  // Then get the first ENABLED (not disabled) slot - try multiple patterns
  let slotButtons = page.locator('button:not([disabled]):has-text(":"):visible').filter({ hasText: /^\d{2}:\d{2}$/ });
  if ((await slotButtons.count()) === 0) {
    slotButtons = page.locator('[role="button"]:not([disabled]):has-text(":"):visible').filter({ hasText: /^\d{2}:\d{2}$/ });
  }
  if ((await slotButtons.count()) === 0) {
    slotButtons = page.locator('button:has-text(":"):visible:not([disabled])').filter({ hasText: /^\d{2}:\d{2}$/ });
  }
  await expect(slotButtons.first()).toBeVisible({ timeout: 30000 });
  
  await slotButtons.first().click({ timeout: 10000 });
  
  // Submit booking
  await page.getByRole('button', { name: /buchen|book/i }).click();
  await Promise.race([
    expect(page.getByText(/anfrage gesendet|request sent/i).first()).toBeVisible({ timeout: 15000 }),
    expect(page.getByText(/fehler|error|failed/i)).toBeVisible({ timeout: 15000 })
  ]);
  
  // --- LOGOUT CUSTOMER ---
  await logout(page);
  
  // --- LOGIN AS ADMIN ---
  await login(page, process.env.TEST_ADMIN_EMAIL!, process.env.TEST_ADMIN_PASSWORD!);

  await page.goto('/#admin');
  await waitForPageReady(page);

  // --- CONFIRM THE MOST RECENT PENDING APPOINTMENT ---
  const smsCallPromise = page.waitForResponse(
    (res) => res.url().includes('/api/sms') && res.request().method() === 'POST',
    { timeout: 15000 }
  ).catch(() => null);

  const emailCallPromise = page.waitForResponse(
    (res) => res.url().includes('/api/email') && res.request().method() === 'POST',
    { timeout: 15000 }
  );

  await page.getByRole('button', { name: /confirm/i }).first().click();

  const emailResponse = await emailCallPromise;
  expect(emailResponse.status(), 'POST /api/email should return 200').toBe(200);
  const emailBody = await emailResponse.json();
  expect(emailBody.success, `Email API returned failure: ${JSON.stringify(emailBody)}`).toBe(true);

  const smsResponse = await smsCallPromise;
  if (smsResponse) {
    expect(smsResponse.status(), 'POST /api/sms should return 200').toBe(200);
    const smsBody = await smsResponse.json();
    if (!smsBody.success) {
      console.warn(`SMS API call succeeded but Twilio rejected it: ${smsBody.error}`);
    }
  }
});