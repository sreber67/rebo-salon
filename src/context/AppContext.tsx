"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, db, getGoogleProvider, getFacebookProvider } from '../lib/firebase';
import { signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { doc, setDoc, collection, onSnapshot, addDoc, updateDoc, deleteDoc, getDoc, query, where } from 'firebase/firestore';
import { fallbackTranslations, type TranslationData } from '../lib/translations';
export { fallbackTranslations, type TranslationData };
import { CLOSED_WEEKDAYS, isSlotOpen, getWorkHours, rosterOf, timeToMins, ANY_STYLIST_NAMES, WeeklySchedule, BookedAppointment } from '../lib/schedule';

type Language = string;
type Page = 'home' | 'services' | 'gallery' | 'products' | 'contact' | 'booking' | 'admin' | 'auth' | 'profile';

export type UserProfile = { id: string; name: string; email: string; phone: string; haircutCount: number; role: 'user' | 'admin'; photoURL?: string; hasUpdatedPassword?: boolean; stylistNotes?: string; };

export type Guest = { id: string; name: string; age: string; phone: string; service: string; stylist: string; };

export type Appointment = { 
  id: string; userId: string; name: string; phone: string; 
  services: string[]; totalDurationMins: number; stylist: string; 
  date: string; time: string; 
  status: 'pending' | 'confirmed' | 'cancelled' | 'proposed' | 'blocked'; 
  proposedDate?: string; proposedTime?: string;
  sendsms: boolean; usedReward: boolean; notes?: string; isEmergency?: boolean;
  referenceImage?: string; 
  specialRequests?: string;
  isGroup?: boolean;
  guests?: Guest[];
};

export type WaitlistItem = { id: string; userId: string; name: string; phone: string; date: string; stylist: string; createdAt: number; };

// Phase 4 Dynamic Management Types
export type StylistItem = { id: string; name: string; services: string[]; weeklySchedule?: WeeklySchedule | null; daysOff?: string[] };
export type GeneralSettings = { 
  holidays: string[]; 
  heroImage?: string;
  aboutImage?: string;
  aboutTitleDe?: string;
  aboutTextDe?: string;
  aboutTitleEn?: string;
  aboutTextEn?: string;
  galleryImages?: string[]; 
  walkinWaitTime?: string;
};

export type Alert = { id: string; userId: string; message: string; isRead: boolean; link: Page; createdAt: number; appointmentId?: string };
export type ServiceItem = { id: string; name: string; price: string; oldPrice?: string; durationMins: number };
export type ProductItem = { id: string; name: string; price: string; desc: string; image: string; stockCount?: number; };
export type Notification = { id: number; message: string; type: 'success' | 'info' | 'error' };
export type TimeSlot = { id: string; time: string; isBooked: boolean };

// Bookable start times: 09:00 to 18:30 in 30-minute steps
export const initialSlots: TimeSlot[] = Array.from({ length: 20 }, (_, i) => {
  const mins = 9 * 60 + i * 30;
  const time = `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  return { id: `t${i + 1}`, time, isBooked: false };
});

export { CLOSING_TIME_MINS } from '../lib/schedule';
// How far ahead to look when suggesting the next free slot
const NEXT_SLOT_SEARCH_DAYS = 60;

// YYYY-MM-DD in local time (toISOString would shift the date near midnight)
export const toLocalDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Alerts addressed to the salon admins rather than a single user
export const ADMIN_ALERT_USER_ID = 'admin';

export interface AppContextType {
  lang: Language; setLang: (lang: Language) => void;
  changeLanguage: (newLang: string) => Promise<void>;
  isTranslatingUI: boolean;
  page: Page; setPage: (page: Page) => void;
  t: any; updateTranslation: (lang: Language, section: string, key: string, val: string) => Promise<void>;
  isAdminAuth: boolean;
  currentUser: UserProfile | null; 
  usersDB: UserProfile[]; updateUserNotes: (id: string, notes: string) => Promise<void>;
  loginOAuth: (provider: 'Google' | 'Facebook') => Promise<void>; 
  loginEmail: (email: string, pass: string) => Promise<void>;
  registerEmail: (email: string, pass: string, name: string, phone?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserPassword: (oldPass: string, newPass: string) => Promise<void>;
  logout: () => void;
  appointments: Appointment[]; 
  addAppointment: (appt: Omit<Appointment, 'id'>) => Promise<{ id: string } | undefined>;
  addAdminAppointment: (appt: Omit<Appointment, 'id'>) => Promise<void>;
  getAuthHeaders: () => Promise<Record<string, string>>;
  updateAppointmentStatus: (id: string, status: Appointment['status'], sendsms: boolean, notes?: string, proposedDate?: string, proposedTime?: string) => Promise<void>;
  servicesDB: ServiceItem[]; addService: (s: Omit<ServiceItem, 'id'>) => Promise<void>; deleteService: (id: string) => Promise<void>;
  productsDB: ProductItem[]; addProduct: (p: Omit<ProductItem, 'id'>) => Promise<void>; deleteProduct: (id: string) => Promise<void>;
  updateProductStock: (id: string, newStock: number) => Promise<void>;
  stylistsDB: StylistItem[]; addStylist: (s: Omit<StylistItem, 'id'>) => Promise<void>; deleteStylist: (id: string) => Promise<void>;
  updateStylist: (id: string, data: Partial<Omit<StylistItem, 'id'>>) => Promise<void>;
  generalSettings: GeneralSettings; updateGeneralSettings: (settings: Partial<GeneralSettings>) => Promise<void>;
  waitlist: WaitlistItem[]; addToWaitlist: (item: Omit<WaitlistItem, 'id' | 'createdAt'>) => Promise<void>; removeFromWaitlist: (id: string) => Promise<void>; notifyWaitlist: (item: WaitlistItem) => Promise<void>; resendConfirmation: (id: string) => Promise<void>;
  notifications: Notification[]; addNotification: (msg: string, type?: 'success' | 'info' | 'error') => void;
  alerts: Alert[]; markAlertRead: (id: string) => Promise<void>; clearAlerts: () => Promise<void>;
  focusedAppointmentId: string | null; setFocusedAppointmentId: (id: string | null) => void;
  refreshBookedTimes: () => Promise<void>;
  getAvailableSlots: (date: string, stylist: string, requiredDuration?: number) => TimeSlot[];
  findNextAvailableSlot: (fromDate: string, stylist: string, requiredDuration: number) => { date: string; slot: TimeSlot } | null;
  getTranslatedServices: () => ServiceItem[];
  getTranslatedProducts: () => ProductItem[];
  getTranslatedStylists: () => StylistItem[];
  getTranslatedGeneralSettings: () => GeneralSettings;
}


const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>('de'); 
  const [isTranslatingUI, setIsTranslatingUI] = useState(false);
  const [page, setPageState] = useState<Page>('home');
  const [translations, setTranslations] = useState<TranslationData>(fallbackTranslations);
  
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [usersDB, setUsersDB] = useState<UserProfile[]>([]);
  
  const [servicesDB, setServicesDB] = useState<ServiceItem[]>([]);
  const [productsDB, setProductsDB] = useState<ProductItem[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [userAlerts, setUserAlerts] = useState<Alert[]>([]);
  const [adminAlerts, setAdminAlerts] = useState<Alert[]>([]);
  const alerts = [...userAlerts, ...adminAlerts];
  // Appointment the admin panel should scroll to and highlight (set from a notification click)
  const [focusedAppointmentId, setFocusedAppointmentId] = useState<string | null>(null);
  const [waitlist, setWaitlist] = useState<WaitlistItem[]>([]);
  // Everyone's booked time blocks (no personal data); customers can only read their own appointments
  const [bookedTimes, setBookedTimes] = useState<BookedAppointment[]>([]);
  
  // Phase 4 Dynamic State
  const [stylistsDB, setStylistsDB] = useState<StylistItem[]>([]);
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({ holidays: [] });

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || '';
  
  const getAuthHeaders = async () => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  const addNotification = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000); 
  };

  const markAlertRead = async (id: string) => {
    await updateDoc(doc(db, 'alerts', id), { isRead: true });
    setUserAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a));
    setAdminAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a));
  };

  const clearAlerts = async () => {
    if (!currentUser) return;
    for (const a of alerts) {
      await deleteDoc(doc(db, 'alerts', a.id));
    }
    setUserAlerts([]);
    setAdminAlerts([]);
  };

  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash.replace('#', '') as Page;
      if (['home', 'services', 'gallery', 'products', 'contact', 'booking', 'admin', 'auth', 'profile'].includes(hash)) {
        setPageState(hash);
      } else {
        setPageState('home');
      }
    };
    handlePopState();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const setPageRouter = (newPage: Page) => {
    if (newPage !== page) {
      if ((newPage === 'booking' || newPage === 'profile') && !currentUser) {
        window.history.pushState(null, '', '#auth');
        setPageState('auth');
        return;
      }
      if (newPage === 'admin' && (!currentUser || currentUser.role !== 'admin')) {
        addNotification("Admin access required.", 'error');
        return;
      }
      const newUrl = newPage === 'home' ? window.location.pathname : `#${newPage}`;
      window.history.pushState(null, '', newUrl);
      setPageState(newPage);
      window.scrollTo(0, 0);
    }
  };

  useEffect(() => {
    let unsubUser: (() => void) | null = null;
    let unsubAlerts: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        unsubUser = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
          if (docSnap.exists()) {
            const profile = docSnap.data() as UserProfile;
            setCurrentUser(profile);
            setIsAdminAuth(profile.role === 'admin');
            // Signed in while on the login page: go to the profile instead
            if (window.location.hash === '#auth') {
              window.history.pushState(null, '', '#profile');
              setPageState('profile');
            }
          } else {
            const newProfile: UserProfile = { id: user.uid, name: user.displayName || 'Client', email: user.email || '', phone: '', haircutCount: 0, role: 'user' };
            setDoc(doc(db, 'users', user.uid), newProfile);
            setCurrentUser(newProfile);
            setIsAdminAuth(false);
          }
        });

        // Security rules only allow reading your own alerts, so the query must be scoped to match
        unsubAlerts = onSnapshot(query(collection(db, 'alerts'), where('userId', '==', user.uid)), (snap) => {
          setUserAlerts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Alert)));
        });
      } else {
        setCurrentUser(null);
        setIsAdminAuth(false);
        setAppointments([]);
        setUserAlerts([]);
        if (unsubUser) { unsubUser(); unsubUser = null; }
        if (unsubAlerts) { unsubAlerts(); unsubAlerts = null; }
      }
    });

    const unsubTrans = onSnapshot(doc(db, 'settings', 'translations'), (snap) => {
      if (snap.exists()) {
        setTranslations({ ...fallbackTranslations, ...(snap.data() as TranslationData) });
      } else {
        // Document doesn't exist (e.g., TTL deleted it) — initialize with fallback translations
        // and write it back to Firestore so it's recreated
        setTranslations(fallbackTranslations);
        if (typeof window !== 'undefined') {
          setDoc(doc(db, 'settings', 'translations'), { 
            ...fallbackTranslations,
            updatedAt: new Date().toISOString()
          }, { merge: true }).catch(console.error);
        }
      }
    });
    const unsubSrv = onSnapshot(collection(db, 'services'), (snap) => {
      setServicesDB(snap.docs.map(d => ({ id: d.id, ...d.data() } as ServiceItem)));
    });
    const unsubProd = onSnapshot(collection(db, 'products'), (snap) => {
      setProductsDB(snap.docs.map(d => ({ id: d.id, ...d.data() } as ProductItem)));
    });
    
    // Phase 4 Dynamic Listeners
    const unsubStylists = onSnapshot(collection(db, 'stylists'), (snap) => {
      setStylistsDB(snap.docs.map(d => ({ id: d.id, ...d.data() } as StylistItem)));
    });
    const unsubSettings = onSnapshot(doc(db, 'settings', 'general'), (snap) => {
      if (snap.exists()) setGeneralSettings({ holidays: [], ...snap.data() });
    });

    return () => { 
      unsubAuth(); unsubTrans(); unsubSrv(); unsubProd(); unsubStylists(); unsubSettings();
      if (unsubAlerts) unsubAlerts(); 
      if (unsubUser) unsubUser(); 
    };
  }, []);

  // Admins see every booking; security rules only let customers read their own,
  // so their query must be scoped to match (others' booked times come from /api/availability)
  const currentUserId = currentUser?.id;
  useEffect(() => {
    if (!currentUserId) return;
    const appointmentsQuery = isAdminAuth
      ? collection(db, 'appointments')
      : query(collection(db, 'appointments'), where('userId', '==', currentUserId));
    return onSnapshot(appointmentsQuery, (snap) => {
      setAppointments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment)));
    });
  }, [currentUserId, isAdminAuth]);

  useEffect(() => {
    let unsubUsersDB: (() => void) | null = null;
    let unsubWaitlist: (() => void) | null = null;
    let unsubAdminAlerts: (() => void) | null = null;
    
    if (isAdminAuth) {
      let isInitialSnapshot = true;
      unsubAdminAlerts = onSnapshot(query(collection(db, 'alerts'), where('userId', '==', ADMIN_ALERT_USER_ID)), (snap) => {
        setAdminAlerts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Alert)));
        // Surface new booking requests in the OS notification center while the site is open
        if (!isInitialSnapshot && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          snap.docChanges().filter(c => c.type === 'added').forEach(c => {
            new Notification('REBO SALON', { body: (c.doc.data() as Alert).message, icon: '/favicon.ico', tag: c.doc.id });
          });
        }
        isInitialSnapshot = false;
      });
      unsubUsersDB = onSnapshot(collection(db, 'users'), (snap) => {
        setUsersDB(snap.docs.map(d => ({ ...d.data() } as UserProfile)));
      });
      unsubWaitlist = onSnapshot(collection(db, 'waitlist'), (snap) => {
        setWaitlist(snap.docs.map(d => ({ id: d.id, ...d.data() } as WaitlistItem)));
      });
    }

    return () => {
      if (unsubUsersDB) unsubUsersDB();
      if (unsubWaitlist) unsubWaitlist();
      if (unsubAdminAlerts) unsubAdminAlerts();
      // Losing admin rights (or signing out) drops the salon-wide data from memory
      setUsersDB([]);
      setWaitlist([]);
      setAdminAlerts([]);
    };
  }, [isAdminAuth]);

  const changeLanguage = async (newLang: string) => {
    if (newLang === lang) return;
    if (newLang === 'de' || translations[newLang]) {
      setLang(newLang);
      return;
    }

    setIsTranslatingUI(true);
    try {
      // The server builds the texts to translate itself, so only the language is sent
      const res = await fetch('/api/translate-ui', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ targetLang: newLang })
      });
      const data = await res.json();
      if (data.translatedDict) {
        setTranslations(prev => ({ ...prev, [newLang]: data.translatedDict }));
        setLang(newLang);
        addNotification(`Interface in neuer Sprache geladen!`, 'success');
      } else {
        addNotification(data.error || 'Übersetzung fehlgeschlagen.', 'error');
        setLang('de');
      }
    } catch (e) {
      addNotification('Übersetzung fehlgeschlagen.', 'error');
      setLang('de');
    } finally {
      setIsTranslatingUI(false);
    }
  };

  const refreshBookedTimes = useCallback(async () => {
    try {
      const res = await fetch(`/api/availability?from=${toLocalDateStr(new Date())}`);
      if (res.ok) setBookedTimes((await res.json()).appointments || []);
    } catch (err) { console.error('Could not load booked times', err); }
  }, []);

  const getAvailableSlots = (date: string, stylist: string, requiredDuration: number = 60) => {
    if (!date) return initialSlots.map(s => ({ ...s, isBooked: false }));
    const allBooked = initialSlots.map(s => ({ ...s, isBooked: true }));
    
    // Phase 4: Block Global Holidays Automatically
    if (generalSettings.holidays && generalSettings.holidays.includes(date)) return allBooked;
    // No back-dated bookings; YYYY-MM-DD strings compare correctly as text
    if (date < toLocalDateStr(new Date()) || CLOSED_WEEKDAYS.includes(new Date(`${date}T00:00:00`).getDay())) return allBooked;

    // Only offer times inside the working hours of the chosen stylist (or of anyone, for "Any")
    const roster = rosterOf(stylistsDB);
    const chosen = roster.find(s => s.name === stylist);
    const windows = (chosen ? [chosen] : roster).map(s => getWorkHours(s, date)).filter(h => h !== null);
    if (windows.length === 0) return allBooked;

    // Hide start times whose services would run past the end of the shift, and times already passed today
    const now = new Date();
    const nowMins = date === toLocalDateStr(now) ? now.getHours() * 60 + now.getMinutes() : -1;
    const anyNames = [...ANY_STYLIST_NAMES, translations[lang]?.booking?.stylistAny].filter(Boolean);
    const knownBookings: BookedAppointment[] = isAdminAuth ? appointments : [...bookedTimes, ...appointments];

    return initialSlots
      .filter(slot => {
        const slotMins = timeToMins(slot.time);
        return slotMins > nowMins && windows.some(w => slotMins >= w.start && slotMins + requiredDuration <= w.end);
      })
      .map(slot => ({
        ...slot,
        isBooked: !isSlotOpen({ date, startMins: timeToMins(slot.time), duration: requiredDuration, stylist, stylists: stylistsDB, appointments: knownBookings, anyNames }),
      }));
  };

  // First free slot on a later day that fits the whole booking before closing time
  const findNextAvailableSlot = (fromDate: string, stylist: string, requiredDuration: number) => {
    const day = new Date(`${fromDate}T00:00:00`);
    for (let i = 0; i < NEXT_SLOT_SEARCH_DAYS; i++) {
      day.setDate(day.getDate() + 1);
      const date = toLocalDateStr(day);
      const slot = getAvailableSlots(date, stylist, requiredDuration).find(s => !s.isBooked);
      if (slot) return { date, slot };
    }
    return null;
  };

  const loginOAuth = async (providerName: 'Google' | 'Facebook') => {
    try {
      const provider = providerName === 'Google' ? getGoogleProvider() : getFacebookProvider();
      await signInWithPopup(auth, provider);
      setPageRouter('profile');
      addNotification(`Logged in with ${providerName}`, 'success');
    } catch (error: any) { 
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') return; 
      addNotification(error.message, 'error'); 
    }
  };

  const loginEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      setPageRouter('profile');
      addNotification("Login successful", 'success');
    } catch (error: any) { addNotification(error.message, 'error'); }
  };

  const registerEmail = async (email: string, pass: string, name: string, phone?: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      const cleanPhone = phone ? phone.replace(/\s+/g, '') : '';
      await setDoc(doc(db, 'users', cred.user.uid), { 
        id: cred.user.uid, name, email, phone: cleanPhone, haircutCount: 0, role: 'user' 
      });
      setPageRouter('profile');
      addNotification("Account created and verified successfully!", 'success');
    } catch (error: any) { 
      addNotification(error.message, 'error'); 
    }
  };

  const resetPassword = async (email: string) => {
    if (!email) return addNotification("Please enter your email address first.", 'error');
    try {
      await sendPasswordResetEmail(auth, email);
      addNotification("Password reset email sent! Check your inbox.", 'success');
    } catch (error: any) { addNotification(error.message, 'error'); }
  };

  const logout = () => { signOut(auth); setPageRouter('home'); };

  const updateUserPassword = async (oldPass: string, newPass: string) => {
    if (!auth.currentUser || !currentUser) throw new Error("Nicht angemeldet.");
    const credential = EmailAuthProvider.credential(currentUser.email, oldPass);
    await reauthenticateWithCredential(auth.currentUser, credential);
    await updatePassword(auth.currentUser, newPass);
    await updateDoc(doc(db, 'users', currentUser.id), { hasUpdatedPassword: true });
    addNotification("Passwort erfolgreich aktualisiert!", "success");
  };

  const updateUserNotes = async (id: string, notes: string) => {
    if (!isAdminAuth) return;
    // The timestamp lets the retention cleanup clear notes nobody has touched for years
    await updateDoc(doc(db, 'users', id), { stylistNotes: notes, stylistNotesUpdatedAt: new Date().toISOString() });
    addNotification("Stylisten-Notizen gespeichert!", "success");
  };

  const updateTranslation = async (l: Language, section: string, key: string, val: string) => {
    if (!isAdminAuth) return;
    await updateDoc(doc(db, 'settings', 'translations'), { 
      [`${l}.${section}.${key}`]: val,
      updatedAt: new Date().toISOString()
    });
    addNotification("Translation saved via Cloud!", 'success');
  };

  const sendDualEmail = async (uEmail: string | null, uSubj: string, uMsg: string, aSubj: string, aMsg: string) => {
    try {
      const headers = await getAuthHeaders();
      const promises: Promise<Response>[] = [];
      
      if (uEmail) {
        promises.push(fetch('/api/email', { method: 'POST', headers, body: JSON.stringify({ email: uEmail, subject: uSubj, message: uMsg }) }));
      }
      if (aSubj && aMsg) {
        promises.push(fetch('/api/email', { method: 'POST', headers, body: JSON.stringify({ email: adminEmail, subject: aSubj, message: aMsg }) }));
      }
      
      if (promises.length > 0) {
        const results = await Promise.allSettled(promises);
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.error(`Email ${index} failed:`, result.reason);
          } else if (!result.value.ok) {
            console.error(`Email ${index} returned non-ok status:`, result.value.status);
          }
        });
      }
    } catch (e) {
      console.error("Dual Email Execution Failed", e);
    }
  };

  const addToWaitlist = async (item: Omit<WaitlistItem, 'id' | 'createdAt'>) => {
    await addDoc(collection(db, 'waitlist'), { ...item, createdAt: Date.now() });
    addNotification("Auf die Warteliste gesetzt!", 'success');
  };

  const removeFromWaitlist = async (id: string) => {
    await deleteDoc(doc(db, 'waitlist', id));
    addNotification("Von Warteliste entfernt.", 'info');
  };

  const notifyWaitlist = async (item: WaitlistItem) => {
    if (item.phone) {
      const cleanPhone = item.phone.replace(/\s+/g, '');
      fetch('/api/sms', { method: 'POST', headers: await getAuthHeaders(), body: JSON.stringify({ phone: cleanPhone, message: `Rebo Salon: Ein Termin am ${item.date} bei ${item.stylist} ist freigeworden! Buche jetzt online.` }) }).catch(()=>{});
    }
    const userDoc = await getDoc(doc(db, 'users', item.userId));
    const userEmail = userDoc.exists() ? userDoc.data().email : null;
    if (userEmail) {
      await sendDualEmail(
        userEmail,
        "Rebo Salon: Warteliste Update - Freier Termin!",
        `Hallo ${item.name},\n\nGute Neuigkeiten! Ein Termin am ${item.date} bei ${item.stylist} ist gerade freigeworden.\n\nBitte besuche unsere Webseite, um ihn direkt zu buchen, bevor er weg ist!\n\nDein Rebo Salon Team`,
        "", ""
      );
    }
    addNotification("Kunde benachrichtigt!", 'success');
  };

  const resendConfirmation = async (id: string) => {
    const appt = appointments.find(a => a.id === id);
    if (!appt || appt.status !== 'confirmed') return;
    const userDoc = await getDoc(doc(db, 'users', appt.userId));
    const userEmail = userDoc.exists() ? userDoc.data().email : null;
    
    if (appt.sendsms && appt.phone) {
      const cleanPhone = appt.phone.replace(/\s+/g, '');
      fetch('/api/sms', { method: 'POST', headers: await getAuthHeaders(), body: JSON.stringify({ phone: cleanPhone, message: `Rebo Salon (Erinnerung): Dein Termin am ${appt.date} um ${appt.time} Uhr ist bestätigt!` }) }).catch(()=>{});
    }
    
    await sendDualEmail(
      userEmail,
      "Rebo Salon: Terminbestätigung (Erneut gesendet)",
      `Hallo ${appt.name},\n\nDies ist eine Erinnerung an deinen bestätigten Termin am ${appt.date} um ${appt.time} Uhr bei ${appt.stylist}.\n\nWir freuen uns auf dich.\nRebo Salon`,
      "", ""
    );
    addNotification("Bestätigung erfolgreich erneut gesendet!", 'success');
  };

  const addAdminAppointment = async (appt: Omit<Appointment, 'id'>) => {
    if (!isAdminAuth) return;
    await addDoc(collection(db, 'appointments'), appt);
    addNotification("Gespeichert!", 'success');
  };

  const addAppointment = async (appt: Omit<Appointment, 'id'>): Promise<{ id: string } | undefined> => {
    if (!currentUser) return;
    
    // Bookings go through the server, which re-checks the stylist's hours and existing bookings
    const res = await fetch('/api/appointments', { method: 'POST', headers: await getAuthHeaders(), body: JSON.stringify(appt) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = res.status === 409
        ? "Dieser Termin ist leider nicht mehr verfügbar. Bitte wähle eine andere Uhrzeit."
        : res.status === 400
          ? "Bitte überprüfe deine Angaben (Name, Telefonnummer, Datum)."
          : "Buchung fehlgeschlagen. Bitte versuche es erneut oder ruf uns an.";
      addNotification(message, 'error');
      if (res.status === 409) refreshBookedTimes();
      return;
    }
    const docRef = { id: data.id as string };
    refreshBookedTimes();

    // Notify the salon in the admin notification bell; a failure here must not block the booking
    try {
      await addDoc(collection(db, 'alerts'), { userId: ADMIN_ALERT_USER_ID, message: `Neue Terminanfrage: ${appt.name} – ${appt.date} um ${appt.time} Uhr (${appt.services.join(', ')})`, isRead: false, link: 'admin', appointmentId: docRef.id, createdAt: Date.now() });
    } catch (err) { console.error('Admin alert failed', err); }

    // Loyalty points are added (or a reward spent) by the server as part of the booking

    await sendDualEmail(
      currentUser.email,
      "Rebo Salon: Buchungsanfrage erhalten",
      `Hallo ${appt.name},\n\nDeine Anfrage für ${appt.services.join(', ')} am ${appt.date} um ${appt.time} Uhr wurde an den Salon übermittelt.\n\nWir prüfen derzeit die Verfügbarkeit und werden deinen Termin in Kürze bestätigen.\n\nDein Rebo Salon Team`,
      "🚨 Neuer Termin eingegangen!",
      `Hallo Admin,\n\nEs gibt eine neue Buchung:\nKunde: ${appt.name} (${appt.phone})\nLeistungen: ${appt.services.join(', ')} (${appt.totalDurationMins} Min)\nDatum: ${appt.date} um ${appt.time} Uhr\nStylist: ${appt.stylist}\nWünsche: ${appt.specialRequests || '-'}\n\nBitte logge dich im Admin-Panel ein, um den Termin zu bestätigen, abzulehnen oder zu verschieben.`
    );

    addNotification("Appointment request sent!", 'success');
    return docRef;
  };

  const updateAppointmentStatus = async (id: string, status: Appointment['status'], sendsms: boolean, notes?: string, proposedDate?: string, proposedTime?: string) => {
    const appt = appointments.find(a => a.id === id);
    if (!appt) return;

    const updates: any = { status };
    if (notes !== undefined) updates.notes = notes;

    if (status === 'confirmed' && proposedDate && proposedTime) {
      updates.date = proposedDate;
      updates.time = proposedTime;
      updates.proposedDate = null;
      updates.proposedTime = null;
    } else {
      if (proposedDate) updates.proposedDate = proposedDate;
      if (proposedTime) updates.proposedTime = proposedTime;
    }
    
    if (isAdminAuth) {
      await updateDoc(doc(db, 'appointments', id), updates);
    } else {
      // Customers answer a proposed time through the server, which also handles their points
      const res = await fetch(`/api/appointments/${id}`, { method: 'PATCH', headers: await getAuthHeaders(), body: JSON.stringify({ status }) });
      if (!res.ok) {
        addNotification("Aktion fehlgeschlagen. Bitte lade die Seite neu oder ruf uns an.", 'error');
        return;
      }
    }

    if (appt.status === 'blocked' || status === 'blocked' || appt.userId === 'walk-in' || appt.userId === 'block') {
      addNotification("Status aktualisiert (Gesperrt/Walk-In).", 'success');
      return;
    }

    // Give back the points this booking earned or spent (the server does this for customers)
    if (isAdminAuth && status === 'cancelled' && appt.status !== 'cancelled') {
      const userRef = doc(db, 'users', appt.userId);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const uData = userDoc.data();
        if (appt.usedReward) await updateDoc(userRef, { haircutCount: uData.haircutCount + 10 }); 
        else await updateDoc(userRef, { haircutCount: Math.max(0, uData.haircutCount - 1) }); 
      }
    }

    const userDoc = await getDoc(doc(db, 'users', appt.userId));
    const userEmail = userDoc.exists() ? userDoc.data().email : null;
    
    const finalDate = (status === 'confirmed' && proposedDate) ? proposedDate : (proposedDate || appt.date);
    const finalTime = (status === 'confirmed' && proposedTime) ? proposedTime : (proposedTime || appt.time);

    const tAlert = translations[lang]?.alertsMsg || fallbackTranslations[lang]?.alertsMsg || fallbackTranslations.de.alertsMsg;
    const tCommon = translations[lang]?.common || fallbackTranslations[lang]?.common || fallbackTranslations.de.common;

    if (status === 'confirmed' && appt.status !== 'confirmed') {
        if (sendsms && appt.phone) {
          const cleanPhone = appt.phone.replace(/\s+/g, '');
          fetch('/api/sms', { method: 'POST', headers: await getAuthHeaders(), body: JSON.stringify({ phone: cleanPhone, message: `Rebo Salon: Dein Termin am ${finalDate} um ${finalTime} Uhr ist bestätigt!`, appointmentId: id }) }).catch(()=>{});
        }
        
        await addDoc(collection(db, 'alerts'), { userId: appt.userId, message: `${tAlert.confirmed1} ${finalDate} ${tCommon.at} ${finalTime} ${tAlert.confirmed2}`, isRead: false, link: 'profile', createdAt: Date.now() });
        await sendDualEmail(
          userEmail,
          "Rebo Salon: Terminbestätigung",
          `Hallo ${appt.name},\n\nDein Termin am ${finalDate} um ${finalTime} Uhr bei ${appt.stylist} ist offiziell bestätigt!\n\nWir freuen uns auf dich.\nRebo Salon`,
          "Admin Info: Termin Bestätigt",
          `Der Termin für ${appt.name} am ${finalDate} um ${finalTime} Uhr wurde erfolgreich bestätigt.`
        );
        addNotification("Status aktualisiert & Bestätigungs-E-Mails gesendet!", 'success');
        
    } else if (status === 'cancelled' && appt.status !== 'cancelled') {
        await addDoc(collection(db, 'alerts'), { userId: appt.userId, message: `${tAlert.cancelled1} ${appt.date} ${tAlert.cancelled2}`, isRead: false, link: 'profile', createdAt: Date.now() });
        await sendDualEmail(
          userEmail,
          "Rebo Salon: Terminabsage",
          `Hallo ${appt.name},\n\nLeider mussten wir deine Terminanfrage für den ${appt.date} um ${appt.time} Uhr stornieren (z.B. aufgrund von Überbuchungen oder Überschneidungen).\n\nBitte buche einen neuen Termin auf unserer Webseite.\n\nDein Rebo Salon Team`,
          "Admin Info: Termin Storniert",
          `Der Termin für ${appt.name} am ${appt.date} um ${appt.time} Uhr wurde storniert.`
        );
        addNotification("Termin abgelehnt & Absage-E-Mail gesendet!", 'info');

    } else if (status === 'proposed' && appt.status !== 'proposed') {
        await addDoc(collection(db, 'alerts'), { userId: appt.userId, message: `${tAlert.proposed1} ${proposedDate} ${tCommon.at} ${proposedTime}. ${tAlert.proposed2}`, isRead: false, link: 'profile', createdAt: Date.now() });
        await sendDualEmail(
          userEmail,
          "Rebo Salon: Terminvorschlag / Bitte bestätigen",
          `Hallo ${appt.name},\n\nWir mussten deinen Termin am ${appt.date} um ${appt.time} leider verschieben.\n\nWir schlagen stattdessen vor:\nNeues Datum: ${proposedDate}\nNeue Uhrzeit: ${proposedTime}\n\nBitte logge dich auf unserer Webseite in dein Profil ein, um diesen neuen Termin zu akzeptieren oder abzulehnen.\n\nDein Rebo Salon Team`,
          "Admin Info: Termin verschoben (Kunde muss bestätigen)",
          `Du hast einen neuen Terminvorschlag an ${appt.name} gesendet. Neues Datum: ${proposedDate} um ${proposedTime} Uhr. Wartet auf Kundenbestätigung.`
        );
        addNotification("Neuer Termin vorgeschlagen & E-Mail an Kunden gesendet!", 'info');
        
    } else if (notes !== undefined) { 
      addNotification("Notizen gespeichert.", 'success'); 
    }
  };

  const addService = async (s: Omit<ServiceItem, 'id'>) => { await addDoc(collection(db, 'services'), s); addNotification("Added!", 'success'); };
  const deleteService = async (id: string) => { await deleteDoc(doc(db, 'services', id)); addNotification("Deleted.", 'info'); };
  
  const addProduct = async (p: Omit<ProductItem, 'id'>) => { await addDoc(collection(db, 'products'), p); addNotification("Added!", 'success'); };
  const deleteProduct = async (id: string) => { await deleteDoc(doc(db, 'products', id)); addNotification("Deleted.", 'info'); };
  
  const updateProductStock = async (id: string, newStock: number) => {
    if (!isAdminAuth) return;
    await updateDoc(doc(db, 'products', id), { stockCount: newStock });
  };

  const addStylist = async (s: Omit<StylistItem, 'id'>) => { await addDoc(collection(db, 'stylists'), s); addNotification("Stylist gespeichert!", 'success'); };
  const deleteStylist = async (id: string) => { await deleteDoc(doc(db, 'stylists', id)); addNotification("Stylist entfernt.", 'info'); };
  const updateStylist = async (id: string, data: Partial<Omit<StylistItem, 'id'>>) => {
    if (!isAdminAuth) return;
    await updateDoc(doc(db, 'stylists', id), data);
    addNotification("Stylist aktualisiert!", 'success');
  };
  const updateGeneralSettings = async (settings: Partial<GeneralSettings>) => {
    if (!isAdminAuth) return;
    await setDoc(doc(db, 'settings', 'general'), settings, { merge: true });
    addNotification("Einstellungen gespeichert!", 'success');
  };

  const t = translations[lang] || fallbackTranslations[lang] || fallbackTranslations.de;

  // Helper to get translated dynamic content (services, products, stylists, generalSettings)
  const getTranslatedServices = () => {
    const trans = translations[lang];
    if (trans?.dynamicServices && trans.dynamicServices.length > 0) {
      return trans.dynamicServices.map((ts: any, i: number) => ({
        ...servicesDB[i],
        name: ts.name || servicesDB[i]?.name,
        price: ts.price || servicesDB[i]?.price,
        oldPrice: ts.oldPrice || servicesDB[i]?.oldPrice,
      }));
    }
    return servicesDB;
  };

  const getTranslatedProducts = () => {
    const trans = translations[lang];
    if (trans?.dynamicProducts && trans.dynamicProducts.length > 0) {
      return trans.dynamicProducts.map((tp: any, i: number) => ({
        ...productsDB[i],
        name: tp.name || productsDB[i]?.name,
        price: tp.price || productsDB[i]?.price,
        desc: tp.desc || productsDB[i]?.desc,
      }));
    }
    return productsDB;
  };

  const getTranslatedStylists = () => {
    const trans = translations[lang];
    if (trans?.dynamicStylists && trans.dynamicStylists.length > 0) {
      return trans.dynamicStylists.map((ts: any, i: number) => ({
        ...stylistsDB[i],
        name: ts.name || stylistsDB[i]?.name,
        services: ts.services || stylistsDB[i]?.services,
      }));
    }
    return stylistsDB;
  };

  const getTranslatedGeneralSettings = () => {
    const trans = translations[lang];
    if (trans?.generalSettings) {
      return { ...generalSettings, ...trans.generalSettings };
    }
    return generalSettings;
  };

  return (
    <AppContext.Provider value={{ 
      getAuthHeaders, lang, setLang, changeLanguage, isTranslatingUI, page, setPage: setPageRouter, t, updateTranslation,
      isAdminAuth, currentUser, usersDB, updateUserNotes, loginOAuth, loginEmail, registerEmail, resetPassword, updateUserPassword, logout,
      servicesDB, addService, deleteService, productsDB, addProduct, deleteProduct, updateProductStock,
      appointments, addAppointment, addAdminAppointment, updateAppointmentStatus, notifications, addNotification, getAvailableSlots, findNextAvailableSlot, refreshBookedTimes,
      waitlist, addToWaitlist, removeFromWaitlist, notifyWaitlist, resendConfirmation,
      stylistsDB, addStylist, deleteStylist, updateStylist, generalSettings, updateGeneralSettings,
      alerts, markAlertRead, clearAlerts, focusedAppointmentId, setFocusedAppointmentId,
      getTranslatedServices, getTranslatedProducts, getTranslatedStylists, getTranslatedGeneralSettings
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
}
