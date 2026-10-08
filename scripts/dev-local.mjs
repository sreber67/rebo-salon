// Local test mode: runs the site against Firebase emulators on this machine.
// Nothing touches the live database, logins, customers or the salon's inbox:
// emails/SMS are skipped, and all data disappears when you stop this script (Ctrl+C).
//
//   npm run dev:local
//
// Then open http://localhost:3100 and log in with one of the test accounts below.
// Emulator dashboard (browse the test database): http://127.0.0.1:4000

import { spawn } from 'node:child_process';

const PROJECT_ID = 'demo-rebo-salon'; // "demo-" projects can never reach real Firebase resources
const PASSWORD = 'test1234';
const ACCOUNTS = {
  admin: { uid: 'test-admin', email: 'admin@rebo.test', name: 'Test Admin', role: 'admin' },
  customer: { uid: 'test-kunde', email: 'kunde@rebo.test', name: 'Test Kunde', role: 'user' },
};

const emulatorEnv = {
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
  FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
  GCLOUD_PROJECT: PROJECT_ID,
};
Object.assign(process.env, emulatorEnv);

const children = [];
const run = (cmd, env = process.env) => {
  const child = spawn(cmd, { shell: true, stdio: 'inherit', env });
  children.push(child);
  return child;
};
// On Windows, kill() only stops the shell wrapper; taskkill /T also stops the emulators and Next it started
const stopAll = (code = 0) => {
  for (const c of children) {
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(c.pid), '/T', '/F'], { stdio: 'ignore' });
    else c.kill();
  }
  setTimeout(() => process.exit(code), 500);
};
process.on('SIGINT', () => stopAll());
process.on('SIGTERM', () => stopAll());

async function waitFor(url) {
  for (let i = 0; i < 120; i++) {
    try { await fetch(url); return; } catch { await new Promise(r => setTimeout(r, 1000)); }
  }
  throw new Error(`Emulator did not start: ${url}`);
}

const dateStr = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const nextWeekday = weekday => {
  const d = new Date();
  d.setDate(d.getDate() + (((weekday - d.getDay()) + 7) % 7 || 7));
  return dateStr(d);
};

async function seed() {
  const { initializeApp } = await import('firebase-admin/app');
  const { getAuth } = await import('firebase-admin/auth');
  const { getFirestore } = await import('firebase-admin/firestore');
  initializeApp({ projectId: PROJECT_ID });
  const auth = getAuth();
  const db = getFirestore();

  for (const a of Object.values(ACCOUNTS)) {
    await auth.createUser({ uid: a.uid, email: a.email, password: PASSWORD, displayName: a.name });
    await db.doc(`users/${a.uid}`).set({ id: a.uid, name: a.name, email: a.email, phone: '+491701234567', haircutCount: 0, role: a.role });
  }

  const services = [
    { name: 'Haarschnitt', price: '25', durationMins: 30 },
    { name: 'Bart', price: '15', durationMins: 30 },
    { name: 'Haarschnitt + Bart', price: '35', durationMins: 60 },
  ];
  for (const s of services) await db.collection('services').add(s);

  const allDay = { start: '09:00', end: '19:00' };
  const fromNoon = { start: '12:00', end: '19:00' };
  await db.collection('stylists').add({ name: 'Ibrahim', services: [], weeklySchedule: [null, null, allDay, null, null, null, null] });
  await db.collection('stylists').add({ name: 'Anna', services: [], weeklySchedule: [null, fromNoon, fromNoon, fromNoon, fromNoon, fromNoon, fromNoon] });
  await db.collection('stylists').add({ name: 'Rebo (Inhaber)', services: [] });
  await db.doc('settings/general').set({ holidays: [] });

  // One existing booking so you can see a taken slot: Ibrahim, next Tuesday 10:00
  await db.collection('appointments').add({
    userId: ACCOUNTS.customer.uid, name: 'Beispiel Kunde', phone: '+491701234567', services: ['Haarschnitt'], totalDurationMins: 30,
    stylist: 'Ibrahim', date: nextWeekday(2), time: '10:00', status: 'confirmed', sendsms: false, usedReward: false,
  });
}

run(`npx firebase emulators:start --project ${PROJECT_ID} --only auth,firestore`);
await waitFor('http://127.0.0.1:8080');
await waitFor('http://127.0.0.1:9099');
await seed();

// Port 3100 so it doesn't clash with other projects on 3000
const site = run('npx next dev -p 3100', {
  ...process.env,
  NEXT_PUBLIC_USE_FIREBASE_EMULATOR: 'true',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo-api-key',
  NEXT_PUBLIC_ADMIN_EMAIL: ACCOUNTS.admin.email,
});

site.on('exit', code => stopAll(code ?? 0));

console.log(`
==================================================================
 LOCAL TEST MODE - nothing here touches the live site
 Site:       http://localhost:3100
 Database:   http://127.0.0.1:4000
 Admin:      ${ACCOUNTS.admin.email} / ${PASSWORD}
 Customer:   ${ACCOUNTS.customer.email} / ${PASSWORD}
 Emails/SMS are switched off. Ctrl+C wipes everything.
==================================================================
`);
