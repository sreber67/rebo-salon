import { test, expect } from '@playwright/test';

// Production-readiness checks that need a running server (npm run build && npm start).
// They only use HTTP requests, so they're quick and never touch real data.

test.describe('security headers', () => {
  test('pages send the hardening headers', async ({ request }) => {
    const res = await request.get('/');
    expect(res.status()).toBe(200);
    const h = res.headers();
    expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(h['content-security-policy']).toContain("object-src 'none'");
    expect(h['strict-transport-security']).toContain('max-age=31536000');
    expect(h['x-frame-options']).toBe('DENY');
    expect(h['x-content-type-options']).toBe('nosniff');
    expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(h['x-powered-by']).toBeUndefined();
  });

  test('production CSP does not allow eval or third-party font hosts', async ({ request }) => {
    const csp = (await request.get('/')).headers()['content-security-policy'];
    test.skip(process.env.NODE_ENV === 'development', 'dev server allows eval for fast refresh');
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).not.toContain('fonts.googleapis.com');
  });

  test('API responses are never cached and carry rate-limit headers', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.status()).toBe(200);
    expect(res.headers()['cache-control']).toContain('no-store');
    const limited = await request.get('/api/availability?from=2030-01-01');
    expect(limited.headers()['x-ratelimit-limit']).toBeDefined();
  });

  test('removed test-only endpoints are gone', async ({ request }) => {
    for (const path of ['/api/auth/login', '/api/auth/register', '/api/auth/reset-password']) {
      const res = await request.post(path, { data: { email: 'admin@example.com', password: 'x' } });
      expect(res.status(), path).toBe(404);
    }
  });

  test('protected endpoints refuse anonymous callers', async ({ request }) => {
    expect((await request.get('/api/appointments')).status()).toBe(401);
    expect((await request.get('/api/gdpr/export')).status()).toBe(401);
    expect((await request.get('/api/cron/cleanup')).status()).toBe(401);
    expect((await request.post('/api/translate', { data: { text: 'Hallo', targetLang: 'en' } })).status()).toBe(401);
  });
});

test.describe('SEO and error pages', () => {
  test('robots.txt and sitemap.xml are served', async ({ request }) => {
    const robots = await request.get('/robots.txt');
    expect(robots.status()).toBe(200);
    expect(await robots.text()).toContain('Sitemap: https://rebosalon.de/sitemap.xml');
    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toContain('https://rebosalon.de/impressum');
  });

  test('home page has title, description and local-business data', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/REBO SALON/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Schweinfurt/);
    expect(await page.locator('script[type="application/ld+json"]').count()).toBeGreaterThan(0);
  });

  test('unknown pages show the branded 404', async ({ page }) => {
    const res = await page.goto('/diese-seite-gibt-es-nicht');
    expect(res?.status()).toBe(404);
    await expect(page.getByText('Seite nicht gefunden')).toBeVisible();
  });
});
