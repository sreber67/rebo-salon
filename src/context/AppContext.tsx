"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db, getGoogleProvider, getFacebookProvider } from '../lib/firebase';
import { signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail, verifyBeforeUpdateEmail, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { doc, setDoc, collection, onSnapshot, addDoc, updateDoc, deleteDoc, getDoc, DocumentReference } from 'firebase/firestore';

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
export type StylistItem = { id: string; name: string; services: string[] };
export type GeneralSettings = { 
  holidays: string[]; 
  heroImage?: string;
  aboutImage?: string;
  aboutTitleDe?: string;
  aboutTextDe?: string;
  aboutTitleEn?: string;
  aboutTextEn?: string;
  galleryImages?: string[]; // <-- FIXED
};

export type Alert = { id: string; userId: string; message: string; isRead: boolean; link: Page; createdAt: number };
export type ServiceItem = { id: string; name: string; price: string; oldPrice?: string; durationMins: number };
export type ProductItem = { id: string; name: string; price: string; desc: string; image: string; stockCount?: number; };
export type Notification = { id: number; message: string; type: 'success' | 'info' | 'error' };
export type TimeSlot = { id: string; time: string; isBooked: boolean };
export type TranslationData = { [key: string]: { [key: string]: any } };

const initialSlots: TimeSlot[] = [
  { id: 't1', time: '09:00', isBooked: false }, { id: 't2', time: '10:00', isBooked: false },
  { id: 't3', time: '11:00', isBooked: false }, { id: 't4', time: '13:00', isBooked: false },
  { id: 't5', time: '14:00', isBooked: false }, { id: 't6', time: '15:30', isBooked: false },
];

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
  addAppointment: (appt: Omit<Appointment, 'id'>) => Promise<DocumentReference | undefined>;
  addAdminAppointment: (appt: Omit<Appointment, 'id'>) => Promise<void>;
  updateAppointmentStatus: (id: string, status: Appointment['status'], sendsms: boolean, notes?: string, proposedDate?: string, proposedTime?: string) => Promise<void>;
  servicesDB: ServiceItem[]; addService: (s: Omit<ServiceItem, 'id'>) => Promise<void>; deleteService: (id: string) => Promise<void>;
  productsDB: ProductItem[]; addProduct: (p: Omit<ProductItem, 'id'>) => Promise<void>; deleteProduct: (id: string) => Promise<void>;
  updateProductStock: (id: string, newStock: number) => Promise<void>;
  stylistsDB: StylistItem[]; addStylist: (s: Omit<StylistItem, 'id'>) => Promise<void>; deleteStylist: (id: string) => Promise<void>;
  generalSettings: GeneralSettings; updateGeneralSettings: (settings: Partial<GeneralSettings>) => Promise<void>;
  waitlist: WaitlistItem[]; addToWaitlist: (item: Omit<WaitlistItem, 'id' | 'createdAt'>) => Promise<void>; removeFromWaitlist: (id: string) => Promise<void>; notifyWaitlist: (item: WaitlistItem) => Promise<void>; resendConfirmation: (id: string) => Promise<void>;
  notifications: Notification[]; addNotification: (msg: string, type?: 'success' | 'info' | 'error') => void;
  alerts: Alert[]; markAlertRead: (id: string) => Promise<void>; clearAlerts: () => Promise<void>;
  getAvailableSlots: (date: string, stylist: string, requiredDuration?: number) => TimeSlot[];
}

export const fallbackTranslations: TranslationData = {
  de: { 
    common: { loading: "Lädt...", searchLang: "Sprache suchen...", noResults: "Keine gefunden.", footer: "Alle Rechte vorbehalten.", design: "Design", at: "um", by: "bei" },
    nav: { home: "Startseite", services: "Leistungen", gallery: "Galerie", products: "Produkte", contact: "Kontakt", book: "Termin buchen", profile: "Profil", logout: "Abmelden", admin: "Admin Panel" }, 
    hero: { title: "Dein Stil. Deine Zeit.", sub: "Präzision & Handwerk in Schweinfurt.", walkin: "Mit & Ohne Termin", walkinTagline: "Einfach vorbeikommen – ohne lange Wartezeit." }, 
    about: { title: "Unsere Rebo Salon", text: "Entdecken Sie Ihren neuen Look im Rebo Salon Schweinfurt!\n\n💇‍♀️ Professionelle Haarschnitte und trendige Stylings für Damen, Herren und Kinder\n🎨 Farbexperten für strahlende Highlights und perfekte Colorationen\n🧖‍♀️ Entspannung pur: Verwöhnende Pflege- und Wellnessbehandlungen für Ihr Haar\n🌟 Individuelle Beratung – Wir bringen Ihre Persönlichkeit zum Ausdruck\n\nOb klassisch oder modern – im Rebo Salon Schweinfurt sorgen wir dafür, dass Sie sich rundum wohlfühlen und Ihren perfekten Look finden. Vereinbaren Sie jetzt Ihren Termin und gönnen Sie sich ein Makeover!" }, 
    services: { title: "Unsere Leistungen", subtitle: "Goldenes Angebot Jeden Dienstag", min: "Minuten" }, 
    gallery: { title: "Unsere Arbeit", subtitle: "Einblicke in unseren Salon", images: [
      "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=800&q=80",
      "https://images.unsplash.com/photo-1599305090598-fe179d501227?w=800&q=80",
      "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&q=80",
      "https://images.unsplash.com/photo-1516975080661-4602f3066a24?w=800&q=80"
    ] }, 
    products: { title: "Store & Produkte", subtitle: "Professionelle Pflege für Zuhause" }, 
    contact: { title: "Kontakt", subtitle: "Besuchen Sie uns", addressLabel: "Adresse", address: "Manggasse 6, 97421 Schweinfurt", phoneLabel: "Telefon", phone: "+49 176 42980985", hoursLabel: "Öffnungszeiten", hours: [ { days: "Montag - Samstag", time: "09:00 - 19:00 Uhr" }, { days: "Sonntag", time: "Geschlossen" } ], socialLabel: "Social Media" }, 
    auth: { loginTitle: "Anmelden", loginSub: "Um einen Termin zu buchen, melden Sie sich bitte an.", email: "E-Mail-Adresse", pass: "Passwort", loginBtn: "Einloggen", register: "Oder neu registrieren", social: "Mit Social Media fortfahren", noAccount: "Noch kein Konto?", haveAccount: "Bereits ein Konto?", registerTitle: "Konto erstellen", resetPassBtn: "Passwort vergessen?", passStrength: "Passwort-Stärke:", weak: "Schwach", medium: "Mittel", strong: "Stark", ruleLength: "Mindestens 8 Zeichen", ruleUpper: "Ein Großbuchstabe", ruleLower: "Ein Kleinbuchstabe", ruleNum: "Eine Zahl", ruleSpec: "Ein Sonderzeichen" }, 
    booking: { title: "Termin buchen", subtitle: "Wählen Sie Ihren Stylisten.", quote: "Dein perfekter Look beginnt hier.", name: "Vollständiger Name", phone: "Telefon", service: "Leistung", stylist: "Stylist auswählen", stylistAny: "Egal (Wer frei ist)", stylistOptions: ["Egal (Wer frei ist)", "Rebo (Inhaber)", "Anna", "Marcus"], requestsLabel: "Besondere Wünsche / Notizen (Optional)", date: "Datum", time: "Uhrzeit", dsgvoNote: "Mit dem Absenden stimmen Sie der DSGVO zu.", smsNote: "SMS-Erinnerung 24h vor dem Termin erhalten.", reward: "Loyalty Bonus", rewardDesc: "Sie haben 10 Haarschnitte erreicht! Möchten Sie 50% Rabatt auf diesen Termin anwenden?", submit: "Kostenpflichtig Buchen", success: "Anfrage gesendet! Wir haben eine Bestätigungsmail an Sie gesendet.", refImage: "Referenzbild (Optional)", totalDuration: "Gesamtdauer:", pickDateFirst: "Wählen Sie zuerst ein Datum.", bookNew: "Neuen Termin anfragen", waitlistLabel: "Kein passender Termin?", joinWaitlistBtn: "Warteliste beitreten", addGuest: "+ Person / Kind hinzufügen", groupNotice: "Gruppenbuchungen werden manuell geprüft. Sende uns deine Wunschanfrage und wir melden uns!", prefTime: "Wunschuhrzeit", guestName: "Name", guestAge: "Alter", guestPhone: "Telefon (für ab 14 J.)" }, 
    profile: { title: "Mein Profil", pointsTitle: "Ihre Treuepunkte", pointsDesc: "Sammeln Sie 10 Punkte für 50% Rabatt auf Ihren nächsten Schnitt!", historyTitle: "Ihr Besuchsverlauf", upcomingTitle: "Anstehende Termine", notesLabel: "Stylisten-Notizen:", noHistory: "Bisher keine Termine.", saveNote: "Notiz speichern", welcome: "Willkommen zurück", overview: "Übersicht", settings: "Einstellungen", editProfile: "Profil bearbeiten", contactData: "Kontaktdaten", noPhone: "Keine Telefonnummer gespeichert. Bitte in den Einstellungen hinzufügen.", acceptTime: "Zeit Akzeptieren", cancel: "Stornieren", pending: "Ausstehend", completed: "Abgeschlossen", newProposal: "Neuer Terminvorschlag vom Salon:" }, 
    notifications: { title: "Benachrichtigungen", empty: "Keine Benachrichtigungen.", clearAll: "Alle löschen" },
    security: { title: "Sicherheitsupdate", desc: "Wir haben unsere Sicherheitsstandards aktualisiert. Bitte ändern Sie Ihr Passwort, um fortzufahren.", currentPass: "Aktuelles Passwort", newPass: "Neues Passwort", confirmPass: "Neues Passwort bestätigen", sendCode: "Code via E-Mail senden", enterCode: "E-Mail Bestätigungscode", cancel: "Abbrechen", confirmBtn: "Bestätigen & Ändern", secTitle: "Passwort & Sicherheit", oauthMsg: "Sie sind über einen Drittanbieter (Google/Facebook) angemeldet. Passwortänderungen sind hier nicht verfügbar.", sendOtpBtn: "OTP per E-Mail senden" },
    admin: { title: "Admin Control Panel", analytics: { revenue: "Umsatz Heute", completed: "Bestätigt (Heute)", upcoming: "Ausstehend (Heute)" }, tabs: { requests: "Anfragen", calendar: "Kalender", services: "Leistungen", products: "Produkte", clients: "Kunden", waitlist: "Warteliste", team: "Team", settings: "Einstellungen" }, team: { title: "Team & Stylists", name: "Name des Stylisten", services: "Spezialisierungen (Leistungen)", saveBtn: "Stylist speichern", deleteBtn: "Löschen" }, settings: { title: "Allgemeine Einstellungen", holidays: "Geschlossene Tage (Urlaub / Feiertage)", holidayDate: "Datum auswählen", addHoliday: "Tag blockieren", designTitle: "Homepage Design & Texte", heroImg: "Hero Hintergrundbild (URL)", aboutImg: "Profilbild (URL)", aboutTitleDe: "Titel (Deutsch)", aboutTextDe: "Beschreibung (Deutsch - max. 400 Zeichen)", aboutTitleEn: "Titel (Englisch)", aboutTextEn: "Beschreibung (Englisch - max. 400 Zeichen)", saveDesign: "Design speichern" }, calendar: { back: "Zurück", next: "Weiter", freeSlot: "Freier Slot", allStylists: "Alle Stylisten", blockBtn: "Blockieren", unblockBtn: "Freigeben" }, walkIn: { title: "Walk-In / Termin Hinzufügen", name: "Kundenname", service: "Leistung / Info", duration: "Dauer (Min)", saveBtn: "Speichern", cancel: "Abbrechen", btn: "+ Walk-In" }, clients: { search: "Kunde nach Name oder Telefon suchen...", notes: "Stylisten-Notizen (z.B. Haarfarbe, Formel...)", saveNotes: "Notizen speichern" }, waitlist: { title: "Warteliste", empty: "Warteliste ist leer.", notifyBtn: "Kunde Benachrichtigen", removeBtn: "Entfernen" }, requests: { pending: "Ausstehende Anfragen", noPending: "Keine neuen Anfragen.", services: "Leistungen:", refImage: "Referenzbild:", confirmBtn: "Bestätigen", rejectBtn: "Ablehnen", reschedule: "Termin verschieben (Neuer Vorschlag)", proposeBtn: "Vorschlagen", confirmed: "Bestätigt & Historie", notesPlaceholder: "Internal Notes (e.g. Skin fade #1...)", saveNote: "Notiz speichern", cancelBtn: "Stornieren", move: "Verschieben:", proposeClientBtn: "Kunden Vorschlagen", status: "Status", resendBtn: "Bestätigung neu senden", groupBadge: "👥 Gruppenbuchung" }, services: { addTitle: "Leistung hinzufügen", nameDe: "Name der Leistung (Deutsch)", nameEn: "Name (Englische Vorschau)", price: "Preis (€)", duration: "Dauer (Min)", saveBtn: "In Datenbank speichern", deleteBtn: "Löschen", translateBtn: "✨ KI: Auf Englisch übersetzen", translating: "Übersetzen..." }, products: { addTitle: "Produkt hinzufügen", nameDe: "Produktname (Deutsch)", descDe: "Beschreibung (Deutsch)", nameEn: "Name (Englische Vorschau)", descEn: "Beschreibung (Englische Vorschau)", price: "Preis (€)", initialStock: "Anfangsbestand", uploadImg: "Produktbild hochladen", saveBtn: "Produkt speichern", stockLabel: "Bestand" } },
    alertsMsg: { confirmed1: "Your appointment on", confirmed2: "has been confirmed!", cancelled1: "Your appointment on", cancelled2: "has been cancelled.", proposed1: "New appointment proposal:", proposed2: "Please confirm!" }
  }
};

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
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistItem[]>([]);
  
  // Phase 4 Dynamic State
  const [stylistsDB, setStylistsDB] = useState<StylistItem[]>([]);
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({ holidays: [] });

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'rick.maity07@gmail.com';
  
  const getAuthHeaders = async () => {
    const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const addNotification = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000); 
  };

  const markAlertRead = async (id: string) => {
    await updateDoc(doc(db, 'alerts', id), { isRead: true });
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a));
  };

  const clearAlerts = async () => {
    if (!currentUser) return;
    const userAlerts = alerts.filter(a => a.userId === currentUser.id);
    for (const a of userAlerts) {
      await deleteDoc(doc(db, 'alerts', a.id));
    }
    setAlerts(prev => prev.filter(a => a.userId !== currentUser.id));
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
    if (currentUser && page === 'auth') {
      setPageRouter('profile');
    }
  }, [currentUser, page, setPageRouter]);

  useEffect(() => {
    let unsubUser: (() => void) | null = null;
    let unsubAppts: (() => void) | null = null;
    let unsubAlerts: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        unsubUser = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
          if (docSnap.exists()) {
            const profile = docSnap.data() as UserProfile;
            setCurrentUser(profile);
            setIsAdminAuth(profile.role === 'admin');
          } else {
            const newProfile: UserProfile = { id: user.uid, name: user.displayName || 'Client', email: user.email || '', phone: '', haircutCount: 0, role: 'user' };
            setDoc(doc(db, 'users', user.uid), newProfile);
            setCurrentUser(newProfile);
            setIsAdminAuth(false);
          }
        });

        unsubAppts = onSnapshot(collection(db, 'appointments'), (snap) => {
          setAppointments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment)));
        });

        unsubAlerts = onSnapshot(collection(db, 'alerts'), (snap) => {
          setAlerts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Alert)));
        });
      } else {
        setCurrentUser(null);
        setIsAdminAuth(false);
        setAppointments([]);
        setAlerts([]);
        if (unsubUser) { unsubUser(); unsubUser = null; }
        if (unsubAppts) { unsubAppts(); unsubAppts = null; }
        if (unsubAlerts) { unsubAlerts(); unsubAlerts = null; }
      }
    });

    const unsubTrans = onSnapshot(doc(db, 'settings', 'translations'), (snap) => {
      if (snap.exists()) setTranslations({ ...fallbackTranslations, ...(snap.data() as TranslationData) });
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
      if (unsubAppts) unsubAppts(); 
      if (unsubAlerts) unsubAlerts(); 
      if (unsubUser) unsubUser(); 
    };
  }, []);

  useEffect(() => {
    let unsubUsersDB: (() => void) | null = null;
    let unsubWaitlist: (() => void) | null = null;
    
    if (isAdminAuth) {
      unsubUsersDB = onSnapshot(collection(db, 'users'), (snap) => {
        setUsersDB(snap.docs.map(d => ({ ...d.data() } as UserProfile)));
      });
      unsubWaitlist = onSnapshot(collection(db, 'waitlist'), (snap) => {
        setWaitlist(snap.docs.map(d => ({ id: d.id, ...d.data() } as WaitlistItem)));
      });
    } else {
      setUsersDB([]);
      setWaitlist([]);
    }
    
    return () => { 
      if (unsubUsersDB) unsubUsersDB(); 
      if (unsubWaitlist) unsubWaitlist();
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
      const res = await fetch('/api/translate-ui', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ targetLang: newLang, sourceDict: fallbackTranslations.de })
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

  const timeToMins = (t: string) => { 
    const [h, m] = t.split(':').map(Number); 
    return h * 60 + m; 
  };

  const getAvailableSlots = (date: string, stylist: string, requiredDuration: number = 60) => {
    if (!date) return initialSlots.map(s => ({ ...s, isBooked: false }));
    
    // Phase 4: Block Global Holidays Automatically
    if (generalSettings.holidays && generalSettings.holidays.includes(date)) {
        return initialSlots.map(s => ({ ...s, isBooked: true }));
    }

    const realStylists = stylistsDB.length > 0 ? stylistsDB.map(s => s.name) : ["Rebo (Inhaber)", "Anna", "Marcus"];

    return initialSlots.map(slot => {
      const slotMins = timeToMins(slot.time);
      
      let isBooked = false;
      if (stylist && stylist !== 'Egal (Wer frei ist)' && stylist !== 'Any' && stylist !== translations[lang]?.booking?.stylistAny) {
        isBooked = appointments.some(a => {
          if (a.date !== date || (a.status !== 'confirmed' && a.status !== 'pending' && a.status !== 'proposed' && a.status !== 'blocked')) return false;
          if (a.stylist !== stylist && a.stylist !== 'Egal (Wer frei ist)' && a.stylist !== 'Any' && a.stylist !== translations[lang]?.booking?.stylistAny) return false;
          
          const aStart = (a.status === 'proposed' && a.proposedTime) ? timeToMins(a.proposedTime) : timeToMins(a.time);
          const aEnd = aStart + (a.totalDurationMins || 60);
          
          const newStart = slotMins;
          const newEnd = slotMins + requiredDuration;
          
          return newStart < aEnd && newEnd > aStart;
        });
      } else {
        let overlaps = 0;
        realStylists.forEach(sName => {
          const sBooked = appointments.some(a => {
            if (a.date !== date || (a.status !== 'confirmed' && a.status !== 'pending' && a.status !== 'proposed' && a.status !== 'blocked')) return false;
            if (a.stylist !== sName && a.stylist !== 'Egal (Wer frei ist)' && a.stylist !== 'Any' && a.stylist !== translations[lang]?.booking?.stylistAny) return false;
            
            const aStart = (a.status === 'proposed' && a.proposedTime) ? timeToMins(a.proposedTime) : timeToMins(a.time);
            const aEnd = aStart + (a.totalDurationMins || 60);
            return slotMins < aEnd && (slotMins + requiredDuration) > aStart;
          });
          if (sBooked) overlaps++;
        });
        isBooked = overlaps >= realStylists.length;
      }

      return { ...slot, isBooked };
    });
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
    await updateDoc(doc(db, 'users', id), { stylistNotes: notes });
    addNotification("Stylisten-Notizen gespeichert!", "success");
  };

  const updateTranslation = async (l: Language, section: string, key: string, val: string) => {
    if (!isAdminAuth) return;
    await updateDoc(doc(db, 'settings', 'translations'), { [`${l}.${section}.${key}`]: val });
    addNotification("Translation saved via Cloud!", 'success');
  };

  const sendDualEmail = async (uEmail: string | null, uSubj: string, uMsg: string, aSubj: string, aMsg: string) => {
    try {
      const headers = await getAuthHeaders();
      if (uEmail) {
        fetch('/api/email', { method: 'POST', headers, body: JSON.stringify({ email: uEmail, subject: uSubj, message: uMsg }) }).catch(()=>{});
      }
      if (aSubj && aMsg) {
        fetch('/api/email', { method: 'POST', headers, body: JSON.stringify({ email: adminEmail, subject: aSubj, message: aMsg }) }).catch(()=>{});
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

  const addAppointment = async (appt: Omit<Appointment, 'id'>): Promise<DocumentReference | undefined> => {
    if (!currentUser) return;
    
    const docRef = await addDoc(collection(db, 'appointments'), appt);
    const userRef = doc(db, 'users', currentUser.id);
    
    if (appt.usedReward) await updateDoc(userRef, { haircutCount: Math.max(0, currentUser.haircutCount - 10) });
    else await updateDoc(userRef, { haircutCount: currentUser.haircutCount + 1 });
    
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
    
    await updateDoc(doc(db, 'appointments', id), updates);

    if (appt.status === 'blocked' || status === 'blocked' || appt.userId === 'walk-in' || appt.userId === 'block') {
      addNotification("Status aktualisiert (Gesperrt/Walk-In).", 'success');
      return;
    }

    if (status === 'cancelled' && appt.status !== 'cancelled') {
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
  const updateGeneralSettings = async (settings: Partial<GeneralSettings>) => {
    if (!isAdminAuth) return;
    await setDoc(doc(db, 'settings', 'general'), settings, { merge: true });
    addNotification("Einstellungen gespeichert!", 'success');
  };

  const t = translations[lang] || fallbackTranslations[lang] || fallbackTranslations.de;

  return (
    <AppContext.Provider value={{ 
      lang, setLang, changeLanguage, isTranslatingUI, page, setPage: setPageRouter, t, updateTranslation,
      isAdminAuth, currentUser, usersDB, updateUserNotes, loginOAuth, loginEmail, registerEmail, resetPassword, updateUserPassword, logout,
      servicesDB, addService, deleteService, productsDB, addProduct, deleteProduct, updateProductStock,
      appointments, addAppointment, addAdminAppointment, updateAppointmentStatus, notifications, addNotification, getAvailableSlots,
      waitlist, addToWaitlist, removeFromWaitlist, notifyWaitlist, resendConfirmation,
      stylistsDB, addStylist, deleteStylist, generalSettings, updateGeneralSettings,
      alerts, markAlertRead, clearAlerts
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