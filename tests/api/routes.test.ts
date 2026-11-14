import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createHash } from 'node:crypto';

// Calls the real route handlers against the Auth + Firestore emulators with real ID tokens.
// Needs the emulators: npm run test:emulator

const PROJECT = process.env.GCLOUD_PROJECT || 'demo-rebo-api';
process.env.GCLOUD_PROJECT = PROJECT;
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
const FS_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';

const { getAdminDb } = await import('@/lib/firebaseAdmin');
const appointments = await import('@/app/api/appointments/route');
const appointmentById = await import('@/app/api/appointments/[id]/route');
const email = await import('@/app/api/email/route');
const sms = await import('@/app/api/sms/route');
const translate = await import('@/app/api/translate/route');
const translateUi = await import('@/app/api/translate-ui/route');
const gdprExport = await import('@/app/api/gdpr/export/route');
const gdprDelete = await import('@/app/api/gdpr/delete/route');
const cron = await import('@/app/api/cron/cleanup/route');
const { buildTranslationSource } = await import('@/lib/translations');

const db = getAdminDb();

type TestUser = { uid: string; token: string; email: string };

async function signUp(emailAddress: string): Promise<TestUser> {
  const res = await fetch(`http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailAddress, password: 'test-pass-123', returnSecureToken: true }),
  });
  const body = await res.json();
  if (!body.idToken) throw new Error(`sign-up failed: ${JSON.stringify(body)}`);
  return { uid: body.localId, token: body.idToken, email: emailAddress };
}

const request = (url: string, init: { method?: string; token?: string; body?: unknown; headers?: Record<string, string> } = {}) =>
  new NextRequest(`http://localhost${url}`, {
    method: init.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
      ...init.headers,
    },
    body: init.body === undefined ? undefined : typeof init.body === 'string' ? init.body : JSON.stringify(init.body),
  });
const params = (id: string) => ({ params: Promise.resolve({ id }) });

// A Monday comfortably in the future, so the slot is never "in the past"
const DATE = '2030-01-07';
const validBooking = (over: Record<string, unknown> = {}) => ({
  name: 'Test Kunde', phone: '+4917612345678', services: ['Haarschnitt'], totalDurationMins: 30,
  stylist: 'Anna', date: DATE, time: '10:00', sendsms: false, usedReward: false, ...over,
});

let customer: TestUser;
let other: TestUser;
let admin: TestUser;

beforeAll(async () => {
  await fetch(`http://${AUTH_HOST}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
  const stamp = Date.now();
  [customer, other, admin] = await Promise.all([
    signUp(`kunde-${stamp}@rebo.test`), signUp(`andere-${stamp}@rebo.test`), signUp(`admin-${stamp}@rebo.test`),
  ]);
});

beforeEach(async () => {
  await fetch(`http://${FS_HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
  const user = (u: TestUser, role: string, haircutCount = 0) =>
    db.doc(`users/${u.uid}`).set({ id: u.uid, name: 'Test', email: u.email, phone: '', haircutCount, role });
  await Promise.all([user(customer, 'user', 2), user(other, 'user'), user(admin, 'admin')]);
  await db.doc('stylists/anna').set({ name: 'Anna', services: [] });
});

describe('authentication', () => {
  it('rejects missing and forged tokens with 401 (not 500)', async () => {
    expect((await appointments.GET(request('/api/appointments'))).status).toBe(401);
    expect((await appointments.GET(request('/api/appointments', { token: 'forged.token.value' }))).status).toBe(401);
  });
  it('rejects malformed JSON with 400', async () => {
    const res = await appointments.POST(request('/api/appointments', { method: 'POST', token: customer.token, body: '{not json' }));
    expect(res.status).toBe(400);
  });
});

describe('POST /api/appointments', () => {
  it('books a free slot, forces status pending and adds a loyalty point', async () => {
    const res = await appointments.POST(request('/api/appointments', { method: 'POST', token: customer.token, body: validBooking({ status: 'confirmed', userId: other.uid }) }));
    expect(res.status).toBe(201);
    const { id } = await res.json();
    const saved = (await db.doc(`appointments/${id}`).get()).data()!;
    expect(saved.status).toBe('pending');
    expect(saved.userId).toBe(customer.uid);
    expect((await db.doc(`users/${customer.uid}`).get()).data()!.haircutCount).toBe(3);
  });
  it('refuses a slot that is already taken', async () => {
    await appointments.POST(request('/api/appointments', { method: 'POST', token: customer.token, body: validBooking() }));
    const res = await appointments.POST(request('/api/appointments', { method: 'POST', token: other.token, body: validBooking({ time: '10:15' }) }));
    expect(res.status).toBe(409);
  });
  it('refuses impossible dates, past dates and Sundays', async () => {
    for (const body of [validBooking({ date: '2030-02-30' }), validBooking({ time: '25:00' }), validBooking({ date: '2020-01-06' }), validBooking({ date: '2030-01-06' })]) {
      const res = await appointments.POST(request('/api/appointments', { method: 'POST', token: customer.token, body }));
      expect([400, 409]).toContain(res.status);
    }
  });
  it('refuses a reward booking without enough points', async () => {
    const res = await appointments.POST(request('/api/appointments', { method: 'POST', token: customer.token, body: validBooking({ usedReward: true }) }));
    expect(res.status).toBe(400);
    expect((await db.doc(`users/${customer.uid}`).get()).data()!.haircutCount).toBe(2);
  });
  it('caps oversized lists', async () => {
    const guests = Array.from({ length: 11 }, () => ({ name: 'G', age: '30', service: 'S', stylist: 'Anna' }));
    const res = await appointments.POST(request('/api/appointments', { method: 'POST', token: customer.token, body: validBooking({ isGroup: true, guests }) }));
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/appointments/[id]', () => {
  beforeEach(async () => {
    await db.doc('appointments/pending1').set({ userId: customer.uid, status: 'pending', date: DATE, time: '10:00', usedReward: false });
    await db.doc('appointments/proposed1').set({ userId: customer.uid, status: 'proposed', date: DATE, time: '10:00', proposedDate: '2030-01-08', proposedTime: '11:00', usedReward: false });
  });
  it('does not let customers confirm their own pending booking', async () => {
    const res = await appointmentById.PATCH(request('/api/appointments/pending1', { method: 'PATCH', token: customer.token, body: { status: 'confirmed' } }), params('pending1'));
    expect(res.status).toBe(409);
    expect((await db.doc('appointments/pending1').get()).data()!.status).toBe('pending');
  });
  it('accepting a proposal moves the booking to the proposed time', async () => {
    const res = await appointmentById.PATCH(request('/api/appointments/proposed1', { method: 'PATCH', token: customer.token, body: { status: 'confirmed' } }), params('proposed1'));
    expect(res.status).toBe(200);
    const saved = (await db.doc('appointments/proposed1').get()).data()!;
    expect(saved).toMatchObject({ status: 'confirmed', date: '2030-01-08', time: '11:00', proposedDate: null });
  });
  it('declining a proposal cancels it and takes back the point', async () => {
    const res = await appointmentById.PATCH(request('/api/appointments/proposed1', { method: 'PATCH', token: customer.token, body: { status: 'cancelled' } }), params('proposed1'));
    expect(res.status).toBe(200);
    expect((await db.doc(`users/${customer.uid}`).get()).data()!.haircutCount).toBe(1);
  });
  it("blocks other customers and lets the salon change anything", async () => {
    expect((await appointmentById.PATCH(request('/api/appointments/pending1', { method: 'PATCH', token: other.token, body: { status: 'cancelled' } }), params('pending1'))).status).toBe(403);
    expect((await appointmentById.DELETE(request('/api/appointments/pending1', { method: 'DELETE', token: other.token }), params('pending1'))).status).toBe(403);
    expect((await appointmentById.PATCH(request('/api/appointments/pending1', { method: 'PATCH', token: admin.token, body: { status: 'confirmed', notes: 'ok' } }), params('pending1'))).status).toBe(200);
    expect((await appointmentById.PATCH(request('/api/appointments/missing', { method: 'PATCH', token: admin.token, body: { status: 'confirmed' } }), params('missing'))).status).toBe(404);
  });
});

describe('notifications', () => {
  it('customers can only email themselves', async () => {
    const toStranger = await email.POST(request('/api/email', { method: 'POST', token: customer.token, body: { email: 'victim@example.com', subject: 'Hi', message: 'Spam' } }));
    expect(toStranger.status).toBe(403);
    const toSelf = await email.POST(request('/api/email', { method: 'POST', token: customer.token, body: { email: customer.email, subject: 'Hi', message: 'Ok' } }));
    expect(toSelf.status).toBe(200);
  });
  it('customers can only text the number on their own appointment', async () => {
    await db.doc('appointments/sms1').set({ userId: customer.uid, phone: '+4917612345678', status: 'confirmed' });
    const other = await sms.POST(request('/api/sms', { method: 'POST', token: customer.token, body: { phone: '+4915112345678', message: 'Spam', appointmentId: 'sms1' } }));
    expect(other.status).toBe(403);
    const own = await sms.POST(request('/api/sms', { method: 'POST', token: customer.token, body: { phone: '+4917612345678', message: 'Ok', appointmentId: 'sms1' } }));
    expect(own.status).toBe(200);
  });
});

describe('translation', () => {
  it('admin translation is admin-only', async () => {
    const body = { text: 'Hallo', targetLang: 'en' };
    expect((await translate.POST(request('/api/translate', { method: 'POST', body }))).status).toBe(401);
    expect((await translate.POST(request('/api/translate', { method: 'POST', token: customer.token, body }))).status).toBe(403);
  });
  it('site translation ignores text sent by the visitor and serves the stored copy', async () => {
    const source = buildTranslationSource([], [], [{ id: 'anna', name: 'Anna', services: [] }], { holidays: [] });
    const hash = createHash('sha256').update(JSON.stringify(source)).digest('hex');
    await db.doc('settings/translations').set({ en: { nav: { home: 'Home' } }, sourceHashes: { en: hash } });

    const res = await translateUi.POST(request('/api/translate-ui', { method: 'POST', body: { targetLang: 'en', sourceDict: { nav: { home: 'HACKED' } } } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cached).toBe(true);
    expect(JSON.stringify(body.translatedDict)).not.toContain('HACKED');
    expect(JSON.stringify((await db.doc('settings/translations').get()).data())).not.toContain('HACKED');
  });
  it('rejects unsupported languages', async () => {
    expect((await translateUi.POST(request('/api/translate-ui', { method: 'POST', body: { targetLang: 'xx' } }))).status).toBe(400);
  });
});

describe('GDPR', () => {
  it("exports the caller's data, including waitlist entries, and nobody else's", async () => {
    await db.doc('waitlist/w1').set({ userId: customer.uid, name: 'Test', phone: '+49', date: DATE, stylist: 'Anna', createdAt: 1 });
    await db.doc('waitlist/w2').set({ userId: other.uid, name: 'Other', phone: '+49', date: DATE, stylist: 'Anna', createdAt: 1 });
    const res = await gdprExport.GET(request('/api/gdpr/export', { token: customer.token }));
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.user.email).toBe(customer.email);
    expect(data.waitlist).toHaveLength(1);
    expect(data.waitlist[0].userId).toBe(customer.uid);
  });
  it('deletes the account and everything linked to it', async () => {
    const victim = await signUp(`delete-${Date.now()}@rebo.test`);
    await db.doc(`users/${victim.uid}`).set({ id: victim.uid, role: 'user', haircutCount: 0 });
    await db.doc('appointments/v1').set({ userId: victim.uid, status: 'pending', date: DATE });
    await db.doc('waitlist/v1').set({ userId: victim.uid, createdAt: 1 });
    await db.doc('appointments/keep').set({ userId: other.uid, status: 'pending', date: DATE });

    const res = await gdprDelete.DELETE(request('/api/gdpr/delete', { method: 'DELETE', token: victim.token }));
    expect(res.status).toBe(200);
    expect((await db.doc(`users/${victim.uid}`).get()).exists).toBe(false);
    expect((await db.doc('appointments/v1').get()).exists).toBe(false);
    expect((await db.doc('waitlist/v1').get()).exists).toBe(false);
    expect((await db.doc('appointments/keep').get()).exists).toBe(true);
  });
});

describe('cron cleanup', () => {
  it('refuses calls without the right secret', async () => {
    process.env.CRON_SECRET = 'test-secret';
    expect((await cron.GET(request('/api/cron/cleanup'))).status).toBe(401);
    expect((await cron.GET(request('/api/cron/cleanup', { headers: { authorization: 'Bearer wrong' } }))).status).toBe(401);
  });
  it('deletes appointments past the retention window', async () => {
    process.env.CRON_SECRET = 'test-secret';
    await db.doc('appointments/old').set({ userId: other.uid, status: 'pending', date: '2015-01-01' });
    await db.doc('appointments/new').set({ userId: other.uid, status: 'pending', date: DATE });
    const res = await cron.GET(request('/api/cron/cleanup', { headers: { authorization: 'Bearer test-secret' } }));
    expect(res.status).toBe(200);
    expect((await db.doc('appointments/old').get()).exists).toBe(false);
    expect((await db.doc('appointments/new').get()).exists).toBe(true);
  });
});
