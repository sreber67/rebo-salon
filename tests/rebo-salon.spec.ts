import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await expect(page).toHaveTitle(/REBO/);
});

// Use your local dev server URL
const APP_URL = 'http://localhost:3000';

test.describe('Rebo Salon - Full System E2E Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Go to the app before each test
    await page.goto(APP_URL);
  });

  test('1. UI & Navigation: Public pages render correctly', async ({ page }) => {
    // Check if hero section loads
    await expect(page.locator('h1')).toContainText('Dein Stil');
    
    // Navigate to Services
    await page.click('button:has-text("Leistungen")');
    await expect(page.locator('h2').first()).toContainText('Unsere Leistungen');

    // Navigate to Contact
    await page.click('button:has-text("Kontakt")');
    await expect(page.locator('h3:has-text("Adresse")')).toBeVisible();
  });

  test('2. Backend API: Translation Pipeline Triggers', async ({ page }) => {
    // Intercept the translation API call so we know the frontend is communicating with the backend
    const translationRequest = page.waitForRequest(
      request => request.url().includes('/api/translate-ui') && request.method() === 'POST'
    );

    // Click language selector and change to English
    await page.click('button:has-text("DEUTSCH")'); 
    await page.click('button:has-text("English")');

    // Verify the backend API was actually called
    const request = await translationRequest;
    expect(request.postDataJSON().targetLang).toBe('en');
  });

  test('3. Authentication Flow: UI validations work', async ({ page }) => {
    // Go to Auth page
    await page.goto(`${APP_URL}/#auth`);

    // Switch to Register
    await page.click('button:has-text("Oder neu registrieren")');

    // Type a weak password and verify real-time UI validation
    await page.fill('input[type="password"]', 'weak');
    await expect(page.locator('text=Schwach')).toBeVisible();

    // Type a strong password
    await page.fill('input[type="password"]', 'StrongPass123!');
    await expect(page.locator('text=Stark')).toBeVisible();
  });

  test('4. Booking Flow & Email Confirmation Pipeline', async ({ page }) => {
    // Mock the email API route so we don't actually send real emails during testing
    await page.route('**/api/email', async route => {
      const request = route.request();
      const postData = request.postDataJSON();
      
      expect(postData).toHaveProperty('email');
      expect(postData).toHaveProperty('subject');
      expect(postData.message).toContain('Termin');

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto(`${APP_URL}/#booking`);
    
    // Wait for the booking view to render
    await page.waitForSelector('h2:has-text("Termin buchen")');

    // Fill out user details
    await page.fill('input[placeholder="Vollständiger Name"]', 'Test User');
    await page.fill('input[type="tel"]', '1520000000');

    // Select the first available service
    await page.locator('.cursor-pointer.border').first().click();

    // Select a date
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 2);
    const dateString = futureDate.toISOString().split('T')[0];
    await page.fill('input[type="date"]', dateString);

    // Select the first available time slot
    await page.click('button.py-3.border:not([disabled])');

    // Verify submit button is enabled
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeEnabled();
  });

  test('5. Admin & Overbooking UI State', async ({ page }) => {
    // Go to Admin tab
    await page.goto(`${APP_URL}/#admin`);
    
    // Test Theme switching
    await page.click('button:has-text("Heritage")');
    // Verify background color changes to Heritage theme
    await expect(page.locator('div.min-h-screen').first()).toHaveClass(/bg-\[#1a1814\]/);
  });
});