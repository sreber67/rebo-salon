import { readFileSync } from 'node:fs';
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  initializeTestEnvironment, assertFails, assertSucceeds, RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, collection, getDocs, query, where } from 'firebase/firestore';

// Proves the Firestore security rules stop the attacks a signed-in customer could try
// straight from the browser console. Needs the emulator: npm run test:emulator

let env: RulesTestEnvironment;

const CUSTOMER = 'kunde-1';
const OTHER = 'kunde-2';
const ADMIN = 'admin-1';

beforeAll(async () => {
  const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');
  env = await initializeTestEnvironment({
    projectId: process.env.GCLOUD_PROJECT || 'demo-rebo-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host, port: Number(port) },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users', CUSTOMER), { id: CUSTOMER, name: 'Kunde', email: 'k@x.de', phone: '', haircutCount: 3, role: 'user' });
    await setDoc(doc(db, 'users', OTHER), { id: OTHER, name: 'Andere', email: 'a@x.de', phone: '', haircutCount: 0, role: 'user' });
    await setDoc(doc(db, 'users', ADMIN), { id: ADMIN, name: 'Admin', email: 'admin@x.de', phone: '', haircutCount: 0, role: 'admin' });
    await setDoc(doc(db, 'appointments', 'mine'), { userId: CUSTOMER, status: 'pending', date: '2030-01-07', time: '10:00', stylist: 'Anna' });
    await setDoc(doc(db, 'appointments', 'proposed'), { userId: CUSTOMER, status: 'proposed', date: '2030-01-07', time: '10:00', proposedDate: '2030-01-08', proposedTime: '11:00' });
    await setDoc(doc(db, 'appointments', 'theirs'), { userId: OTHER, status: 'pending', date: '2030-01-07', time: '12:00' });
    await setDoc(doc(db, 'alerts', 'admin-alert'), { userId: 'admin', message: 'Neue Anfrage', isRead: false });
    await setDoc(doc(db, 'waitlist', 'w1'), { userId: OTHER, name: 'Andere', phone: '+49', date: '2030-01-07', stylist: 'Anna', createdAt: 1 });
  });
});

const as = (uid: string) => env.authenticatedContext(uid).firestore();
const guest = () => env.unauthenticatedContext().firestore();

describe('users', () => {
  it('customers cannot make themselves admin', async () => {
    await assertFails(updateDoc(doc(as(CUSTOMER), 'users', CUSTOMER), { role: 'admin' }));
  });
  it('customers cannot give themselves loyalty points', async () => {
    await assertFails(updateDoc(doc(as(CUSTOMER), 'users', CUSTOMER), { haircutCount: 99 }));
  });
  it('customers cannot write the salon notes about themselves', async () => {
    await assertFails(updateDoc(doc(as(CUSTOMER), 'users', CUSTOMER), { stylistNotes: 'VIP, free cuts' }));
  });
  it('customers can still edit their name and phone', async () => {
    await assertSucceeds(updateDoc(doc(as(CUSTOMER), 'users', CUSTOMER), { name: 'Neu', phone: '+4917612345678' }));
  });
  it('new accounts must start as a plain user with no points', async () => {
    const db = as('new-user');
    await assertFails(setDoc(doc(db, 'users', 'new-user'), { id: 'new-user', role: 'admin', haircutCount: 0 }));
    await assertFails(setDoc(doc(db, 'users', 'new-user'), { id: 'new-user', role: 'user', haircutCount: 10 }));
    await assertSucceeds(setDoc(doc(db, 'users', 'new-user'), { id: 'new-user', name: 'N', email: 'n@x.de', phone: '', role: 'user', haircutCount: 0 }));
  });
  it("customers cannot read other customers' profiles; the salon can", async () => {
    await assertFails(getDoc(doc(as(CUSTOMER), 'users', OTHER)));
    await assertFails(getDoc(doc(guest(), 'users', OTHER)));
    await assertSucceeds(getDoc(doc(as(ADMIN), 'users', OTHER)));
    await assertSucceeds(updateDoc(doc(as(ADMIN), 'users', OTHER), { haircutCount: 5, stylistNotes: 'Allergie' }));
  });
});

describe('appointments', () => {
  it('customers only read their own bookings', async () => {
    await assertSucceeds(getDoc(doc(as(CUSTOMER), 'appointments', 'mine')));
    await assertFails(getDoc(doc(as(CUSTOMER), 'appointments', 'theirs')));
    await assertFails(getDocs(collection(as(CUSTOMER), 'appointments')));
    await assertSucceeds(getDocs(query(collection(as(CUSTOMER), 'appointments'), where('userId', '==', CUSTOMER))));
  });
  it('customers cannot create bookings directly (they go through the server)', async () => {
    await assertFails(addDoc(collection(as(CUSTOMER), 'appointments'), { userId: CUSTOMER, status: 'confirmed' }));
  });
  it('customers cannot confirm or move their own booking', async () => {
    await assertFails(updateDoc(doc(as(CUSTOMER), 'appointments', 'mine'), { status: 'confirmed' }));
    await assertFails(updateDoc(doc(as(CUSTOMER), 'appointments', 'proposed'), { status: 'confirmed', date: '2030-12-24', time: '09:00' }));
  });
  it('a reference image must be a Cloudinary upload', async () => {
    await assertFails(updateDoc(doc(as(CUSTOMER), 'appointments', 'mine'), { referenceImage: 'https://evil.example/track.png' }));
    await assertSucceeds(updateDoc(doc(as(CUSTOMER), 'appointments', 'mine'), { referenceImage: 'https://res.cloudinary.com/demo/image/upload/x.jpg' }));
  });
  it("customers cannot touch someone else's booking", async () => {
    await assertFails(updateDoc(doc(as(CUSTOMER), 'appointments', 'theirs'), { referenceImage: 'https://res.cloudinary.com/x.jpg' }));
    await assertFails(deleteDoc(doc(as(CUSTOMER), 'appointments', 'theirs')));
  });
  it('the salon can manage every booking', async () => {
    await assertSucceeds(updateDoc(doc(as(ADMIN), 'appointments', 'theirs'), { status: 'confirmed' }));
  });
});

describe('alerts, waitlist and site content', () => {
  it("customers cannot read the salon's inbox", async () => {
    await assertFails(getDoc(doc(as(CUSTOMER), 'alerts', 'admin-alert')));
    await assertSucceeds(getDoc(doc(as(ADMIN), 'alerts', 'admin-alert')));
  });
  it('customers may only drop short, unread alerts into the salon inbox', async () => {
    const db = as(CUSTOMER);
    await assertSucceeds(addDoc(collection(db, 'alerts'), { userId: 'admin', message: 'Neue Anfrage', isRead: false }));
    await assertFails(addDoc(collection(db, 'alerts'), { userId: 'admin', message: 'x'.repeat(501), isRead: false }));
    await assertFails(addDoc(collection(db, 'alerts'), { userId: OTHER, message: 'Phishing', isRead: false }));
  });
  it('waitlist entries are validated and private to the salon', async () => {
    const db = as(CUSTOMER);
    await assertSucceeds(addDoc(collection(db, 'waitlist'), { userId: CUSTOMER, name: 'Kunde', phone: '+4917612345678', date: '2030-01-07', stylist: 'Anna', createdAt: Date.now() }));
    await assertFails(addDoc(collection(db, 'waitlist'), { userId: CUSTOMER, name: 'Kunde', phone: '+49', date: '2030-01-07', stylist: 'Anna', createdAt: Date.now(), extra: 'x' }));
    await assertFails(addDoc(collection(db, 'waitlist'), { userId: OTHER, name: 'Fake', phone: '+49', date: '2030-01-07', stylist: 'Anna', createdAt: Date.now() }));
    await assertFails(getDoc(doc(db, 'waitlist', 'w1')));
  });
  it('anyone can read services, only the salon can change them or the translations', async () => {
    await assertSucceeds(getDocs(collection(guest(), 'services')));
    await assertFails(setDoc(doc(as(CUSTOMER), 'services', 's1'), { name: 'Gratis', price: '0' }));
    await assertFails(setDoc(doc(as(CUSTOMER), 'settings', 'translations'), { en: { nav: { home: 'Hacked' } } }));
    await assertSucceeds(setDoc(doc(as(ADMIN), 'services', 's1'), { name: 'Haarschnitt', price: '25' }));
  });
});
