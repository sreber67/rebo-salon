import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from '@/proxy';
import { buildTranslationSource, fallbackTranslations } from '@/lib/translations';

const hit = (path: string, ip: string, ua = 'test') =>
  proxy(new NextRequest(`http://localhost${path}`, { headers: { 'x-forwarded-for': ip, 'user-agent': ua } }));

describe('rate limiting proxy', () => {
  it('blocks after the per-route limit and says when to retry', () => {
    const ip = '203.0.113.1';
    for (let i = 0; i < 5; i++) expect(hit('/api/sms', ip).status).toBe(200);
    const blocked = hit('/api/sms', ip);
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get('Retry-After'))).toBeGreaterThan(0);
  });

  it('cannot be bypassed by changing the User-Agent', () => {
    const ip = '203.0.113.2';
    for (let i = 0; i < 5; i++) hit('/api/sms', ip, `agent-${i}`);
    expect(hit('/api/sms', ip, 'brand-new-agent').status).toBe(429);
  });

  it('counts every appointment id against one bucket', () => {
    const ip = '203.0.113.3';
    for (let i = 0; i < 20; i++) hit(`/api/appointments/id-${i}`, ip);
    expect(hit('/api/appointments/another-id', ip).status).toBe(429);
  });

  it('keeps separate counts per IP and never limits the health check', () => {
    expect(hit('/api/sms', '203.0.113.99').status).toBe(200);
    for (let i = 0; i < 100; i++) expect(hit('/api/health', '203.0.113.4').status).toBe(200);
  });
});

describe('buildTranslationSource', () => {
  it('starts from the built-in German texts', () => {
    const source = buildTranslationSource([], [], [], undefined);
    expect(source.nav).toEqual(fallbackTranslations.de.nav);
    expect(source.dynamicServices).toBeUndefined();
  });

  it('adds only the expected fields of the salon content', () => {
    const source = buildTranslationSource(
      [{ id: 's1', name: 'Haarschnitt', price: '25', durationMins: 30, secret: 'x' }],
      [], [{ id: 'st1', name: 'Anna', services: ['Haarschnitt'] }], { walkinWaitTime: '15 Min' },
    );
    expect(source.dynamicServices).toEqual([{ id: 's1', name: 'Haarschnitt', price: '25', oldPrice: '', durationMins: 30 }]);
    expect(source.dynamicStylists[0].name).toBe('Anna');
    expect(source.generalSettings.walkinWaitTime).toBe('15 Min');
  });

  it('does not change the shared fallback texts', () => {
    const before = JSON.stringify(fallbackTranslations.de);
    buildTranslationSource([{ id: 'a', name: 'b', price: '1', durationMins: 5 }], [], [], {}).nav = {};
    expect(JSON.stringify(fallbackTranslations.de)).toBe(before);
  });
});
