// Built-in site texts (German source + English). Shared by the browser and the
// /api/translate-ui route, which builds what it translates from these on the server.
export type TranslationData = { [key: string]: { [key: string]: any } };

export const fallbackTranslations: TranslationData = {
  de: { 
    common: { loading: "Lädt...", searchLang: "Sprache suchen...", noResults: "Keine gefunden.", footer: "Alle Rechte vorbehalten.", design: "Design", at: "um", by: "bei" },
    nav: { home: "Startseite", services: "Leistungen", gallery: "Galerie", products: "Produkte", contact: "Kontakt", book: "Termin buchen", profile: "Profil", logout: "Abmelden", admin: "Admin Panel" }, 
    hero: { 
      title: "REBO SALON", 
      headlineSub: "Dein Barbershop & Herrenfriseur in Schweinfurt",
      sub: "Moderner Style. Saubere Arbeit. Dein Look.\n\nWillkommen bei REBO SALON in Schweinfurt.\n\nBei uns erwarten dich moderne und klassische Herrenhaarschnitte, professionelle Bartpflege, Kinderhaarschnitte und präzises Styling – individuell auf deinen Look abgestimmt.", 
      btns: {
        book: { title: "TERMIN BUCHEN", sub: "Jetzt online Termin vereinbaren" },
        walkin: { title: "OHNE TERMIN\nVORBEIKOMMEN", sub: "Einfach vorbeischauen" },
        call: { title: "JETZT ANRUFEN", sub: "Wir sind für dich da" },
        route: { title: "ROUTE ANZEIGEN", sub: "So findest du uns" }
      }
    }, 
    walkinBlock: {
      title: "Mit & ohne Termin",
      text1: "Du möchtest spontan zum Friseur?",
      text2: "Bei REBO SALON kannst du mit oder ohne Termin vorbeikommen.",
      text3: "Besuche uns einfach während unserer Öffnungszeiten in der Schweinfurter Innenstadt."
    },
    reviews: {
      title: "Kundenbewertungen",
      subtitle: "Basierend auf echten Google Rezensionen.",
      btn: "Google-Bewertungen ansehen"
    },
    about: { 
      title: "Dein Barbershop in Schweinfurt", 
      text: "Du suchst einen professionellen Barbershop oder Herrenfriseur in Schweinfurt?\n\nREBO SALON befindet sich zentral in der Innenstadt von Schweinfurt.\n\nUnser Team steht für moderne Haarschnitte, saubere Arbeit, persönliche Beratung und professionelle Bartpflege." 
    }, 
    services: { title: "Unsere Leistungen", subtitle: "Von modernen Fades bis zum klassischen Herrenhaarschnitt", min: "Minuten" }, 
    gallery: { title: "Unsere Arbeit", subtitle: "Einblicke in unseren Salon", images: [
      "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=800&q=80",
      "https://images.unsplash.com/photo-1599305090598-fe179d501227?w=800&q=80",
      "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&q=80",
      "https://images.unsplash.com/photo-1516975080661-4602f3066a24?w=800&q=80"
    ] }, 
    products: { title: "Store & Produkte", subtitle: "Professionelle Pflege für Zuhause" }, 
    contact: { title: "Besuche REBO SALON", subtitle: "Zentral in Schweinfurt", addressLabel: "Adresse", address: "Manggasse 6, 97421 Schweinfurt", phoneLabel: "Telefon", phone: "0176 42980985", hoursLabel: "Öffnungszeiten", hours: [ { days: "Montag - Samstag", time: "09:00 - 19:00 Uhr" }, { days: "Sonntag", time: "Geschlossen" } ], socialLabel: "Social Media" }, 
    auth: { loginTitle: "Anmelden", loginSub: "Um einen Termin zu buchen, melden Sie sich bitte an.", email: "E-Mail-Adresse", pass: "Passwort", loginBtn: "Einloggen", register: "Oder neu registrieren", social: "Mit Social Media fortfahren", noAccount: "Noch kein Konto?", haveAccount: "Bereits ein Konto?", registerTitle: "Konto erstellen", resetPassBtn: "Passwort vergessen?", passStrength: "Passwort-Stärke:", weak: "Schwach", medium: "Mittel", strong: "Stark", ruleLength: "Mindestens 8 Zeichen", ruleUpper: "Ein Großbuchstabe", ruleLower: "Ein Kleinbuchstabe", ruleNum: "Eine Zahl", ruleSpec: "Ein Sonderzeichen" }, 
    booking: { title: "Termin buchen", subtitle: "Wählen Sie Ihren Stylisten.", quote: "Dein perfekter Look beginnt hier.", name: "Vollständiger Name", phone: "Telefon", service: "Leistung", stylist: "Stylist auswählen", stylistAny: "Egal (Wer frei ist)", stylistOptions: ["Egal (Wer frei ist)", "Rebo (Inhaber)", "Anna", "Marcus"], requestsLabel: "Besondere Wünsche / Notizen (Optional)", date: "Datum", time: "Uhrzeit", dsgvoNote: "Mit dem Absenden stimmen Sie der DSGVO zu.", smsNote: "SMS-Erinnerung 24h vor dem Termin erhalten.", reward: "Loyalty Bonus", rewardDesc: "Sie haben 10 Haarschnitte erreicht! Möchten Sie 50% Rabatt auf diesen Termin anwenden?", submit: "Kostenpflichtig Buchen", success: "Anfrage gesendet! Wir haben eine Bestätigungsmail an Sie gesendet.", refImage: "Referenzbild (Optional)", totalDuration: "Gesamtdauer:", pickDateFirst: "Wählen Sie zuerst ein Datum.", pickDate: "Datum wählen", calendarAvailable: "Verfügbar", calendarUnavailable: "Nicht verfügbar", prevMonth: "Vorheriger Monat", nextMonth: "Nächster Monat", bookNew: "Neuen Termin anfragen", waitlistLabel: "Kein passender Termin?", joinWaitlistBtn: "Warteliste beitreten", noSlotsFit: "An diesem Tag ist kein Termin mehr frei, bei dem alle gewählten Leistungen vor Ladenschluss (19:00 Uhr) fertig werden.", totalDurationLabel: "Gesamtdauer", nextAvailable: "Nächster freier Termin:", takeSlotBtn: "Diesen Termin übernehmen", pastDateError: "Termine in der Vergangenheit können nicht gebucht werden.", noSlotFound: "In den nächsten Wochen ist leider kein passender Termin frei. Trage dich gern in die Warteliste ein oder ruf uns an.", addGuest: "+ Person / Kind hinzufügen", groupNotice: "Gruppenbuchungen werden manuell geprüft. Sende uns deine Wunschanfrage und wir melden uns!", prefTime: "Wunschuhrzeit", guestName: "Name", guestAge: "Alter", guestPhone: "Telefon (für ab 14 J.)" }, 
    profile: { title: "Mein Profil", pointsTitle: "Ihre Treuepunkte", pointsDesc: "Sammeln Sie 10 Punkte für 50% Rabatt auf Ihren nächsten Schnitt!", historyTitle: "Ihr Besuchsverlauf", upcomingTitle: "Anstehende Termine", notesLabel: "Stylisten-Notizen:", noHistory: "Bisher keine Termine.", saveNote: "Notiz speichern", welcome: "Willkommen zurück", overview: "Übersicht", settings: "Einstellungen", editProfile: "Profil bearbeiten", contactData: "Kontaktdaten", noPhone: "Keine Telefonnummer gespeichert. Bitte in den Einstellungen hinzufügen.", acceptTime: "Zeit Akzeptieren", cancel: "Stornieren", pending: "Ausstehend", completed: "Abgeschlossen", newProposal: "Neuer Terminvorschlag vom Salon:" }, 
    notifications: { title: "Benachrichtigungen", empty: "Keine Benachrichtigungen.", clearAll: "Alle löschen" },
    security: { title: "Sicherheitsupdate", desc: "Wir haben unsere Sicherheitsstandards aktualisiert. Bitte ändern Sie Ihr Passwort, um fortzufahren.", currentPass: "Aktuelles Passwort", newPass: "Neues Passwort", confirmPass: "Neues Passwort bestätigen", sendCode: "Code via E-Mail senden", enterCode: "E-Mail Bestätigungscode", cancel: "Abbrechen", confirmBtn: "Bestätigen & Ändern", secTitle: "Passwort & Sicherheit", oauthMsg: "Sie sind über einen Drittanbieter (Google/Facebook) angemeldet. Passwortänderungen sind hier nicht verfügbar.", sendOtpBtn: "OTP per E-Mail senden" },
    admin: { title: "Admin Control Panel", analytics: { revenue: "Umsatz Heute", completed: "Bestätigt (Heute)", upcoming: "Ausstehend (Heute)" }, tabs: { requests: "Anfragen", calendar: "Kalender", services: "Leistungen", products: "Produkte", clients: "Kunden", waitlist: "Warteliste", team: "Team", settings: "Einstellungen" }, team: { title: "Team & Stylisten", name: "Name des Stylisten", services: "Spezialisierungen (Leistungen)", saveBtn: "Stylist speichern", deleteBtn: "Löschen", editSchedule: "Arbeitszeiten", workingHours: "Arbeitszeiten", salonHours: "Normale Öffnungszeiten", scheduleHint: "Kunden können diesen Stylisten nur zu diesen Zeiten buchen.", salonHoursHint: "Noch keine eigenen Zeiten – bucht sich zu den normalen Öffnungszeiten.", salonClosed: "Salon geschlossen", dayOff: "Frei", saveSchedule: "Arbeitszeiten speichern", resetSchedule: "Auf Öffnungszeiten zurücksetzen", invalidHours: "Bitte gültige Zeiten zwischen 09:00 und 19:00 eingeben (Beginn vor Ende).", daysOff: "Urlaub / freie Tage", daysOffHint: "An diesen Tagen ist nur dieser Stylist nicht buchbar.", addDayOff: "Hinzufügen", noDaysOff: "Keine freien Tage eingetragen." }, settings: { title: "Allgemeine Einstellungen", holidays: "Geschlossene Tage (Urlaub / Feiertage)", holidayDate: "Datum auswählen", addHoliday: "Tag blockieren", designTitle: "Homepage Design & Texte", heroImg: "Hero Hintergrundbild (URL)", aboutImg: "Profilbild (URL)", aboutTitleDe: "Titel (Deutsch)", aboutTextDe: "Beschreibung (Deutsch - max. 400 Zeichen)", aboutTitleEn: "Titel (Englisch)", aboutTextEn: "Beschreibung (Englisch - max. 400 Zeichen)", saveDesign: "Design speichern" }, calendar: { back: "Zurück", next: "Weiter", freeSlot: "Freier Slot", allStylists: "Alle Stylisten", blockBtn: "Blockieren", unblockBtn: "Freigeben" }, walkIn: { title: "Walk-In / Termin Hinzufügen", name: "Kundenname", service: "Leistung / Info", duration: "Dauer (Min)", saveBtn: "Speichern", cancel: "Abbrechen", btn: "+ Walk-In" }, clients: { search: "Kunde nach Name oder Telefon suchen...", notes: "Stylisten-Notizen (z.B. Haarfarbe, Formel...)", saveNotes: "Notizen speichern" }, waitlist: { title: "Warteliste", empty: "Warteliste ist leer.", notifyBtn: "Kunde Benachrichtigen", removeBtn: "Entfernen" }, requests: { pending: "Ausstehende Anfragen", noPending: "Keine neuen Anfragen.", services: "Leistungen:", refImage: "Referenzbild:", confirmBtn: "Bestätigen", rejectBtn: "Ablehnen", reschedule: "Termin verschieben (Neuer Vorschlag)", proposeBtn: "Vorschlagen", confirmed: "Bestätigt & Historie", notesPlaceholder: "Internal Notes (e.g. Skin fade #1...)", saveNote: "Notiz speichern", cancelBtn: "Stornieren", move: "Verschieben:", proposeClientBtn: "Kunden Vorschlagen", status: "Status", resendBtn: "Bestätigung neu senden", groupBadge: "👥 Gruppenbuchung" }, services: { addTitle: "Leistung hinzufügen", nameDe: "Name der Leistung (Deutsch)", nameEn: "Name (Englische Vorschau)", price: "Preis (€)", duration: "Dauer (Min)", saveBtn: "In Datenbank speichern", deleteBtn: "Löschen", translateBtn: "✨ KI: Auf Englisch übersetzen", translating: "Übersetzen..." }, products: { addTitle: "Produkt hinzufügen", nameDe: "Produktname (Deutsch)", descDe: "Beschreibung (Deutsch)", nameEn: "Name (Englische Vorschau)", descEn: "Beschreibung (Englische Vorschau)", price: "Preis (€)", initialStock: "Anfangsbestand", uploadImg: "Produktbild hochladen", saveBtn: "Produkt speichern", stockLabel: "Bestand" } },
    alertsMsg: { confirmed1: "Your appointment on", confirmed2: "has been confirmed!", cancelled1: "Your appointment on", cancelled2: "has been cancelled.", proposed1: "New appointment proposal:", proposed2: "Please confirm!" }
  },
  en: { 
    common: { loading: "Loading...", searchLang: "Search language...", noResults: "None found.", footer: "All rights reserved.", design: "Design", at: "at", by: "with" },
    nav: { home: "Home", services: "Services", gallery: "Gallery", products: "Products", contact: "Contact", book: "Book Now", profile: "Profile", logout: "Log Out", admin: "Admin Panel" }, 
    hero: { 
      title: "REBO SALON", 
      headlineSub: "Your Barbershop & Men's Hairdresser in Schweinfurt",
      sub: "Modern Style. Clean Work. Your Look.\n\nWelcome to REBO SALON in Schweinfurt.\n\nWe offer modern and classic men's haircuts, professional beard care, children's cuts, and precise styling – individually tailored to your look.", 
      btns: {
        book: { title: "BOOK APPOINTMENT", sub: "Schedule online now" },
        walkin: { title: "WALK-IN\nAVAILABLE", sub: "Just drop by" },
        call: { title: "CALL NOW", sub: "We are here for you" },
        route: { title: "GET DIRECTIONS", sub: "How to find us" }
      }
    }, 
    about: { title: "About Me", text: "Behind Rebo Salon is me, your personal barber. With years of experience and a sharp eye for detail, my mission is to give you not just a haircut, but a real upgrade to your self-confidence. Quality, precision, and your style are my top priorities." }, 
    services: { title: "Our Services", subtitle: "Golden Offer Every Tuesday", min: "minutes" }, 
    gallery: { title: "Our Work", subtitle: "Inside the salon", images: [
      "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=800&q=80",
      "https://images.unsplash.com/photo-1599305090598-fe179d501227?w=800&q=80",
      "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&q=80",
      "https://images.unsplash.com/photo-1516975080661-4602f3066a24?w=800&q=80"
    ] }, 
    products: { title: "Store & Products", subtitle: "Professional care for home" }, 
    contact: { title: "Contact Us", subtitle: "Visit us", addressLabel: "Address", address: "Manggasse 6, 97421 Schweinfurt", phoneLabel: "Phone", phone: "+49 176 42980985", hoursLabel: "Opening Hours", hours: [ { days: "Monday - Saturday", time: "9:00 AM - 7:00 PM" }, { days: "Sunday", time: "Closed" } ], socialLabel: "Social Media" }, 
    auth: { loginTitle: "Login", loginSub: "Please log in to book an appointment.", email: "Email Address", pass: "Password", loginBtn: "Sign In", register: "Or create an account", social: "Continue with Social", noAccount: "Don't have an account?", haveAccount: "Already have an account?", registerTitle: "Create Account", resetPassBtn: "Forgot Password?", passStrength: "Password Strength:", weak: "Weak", medium: "Medium", strong: "Strong", ruleLength: "At least 8 characters", ruleUpper: "One uppercase letter", ruleLower: "One lowercase letter", ruleNum: "One number", ruleSpec: "One special character" }, 
    booking: { title: "Book Appointment", subtitle: "Select your stylist.", quote: "Your perfect look begins here.", name: "Full Name", phone: "Phone", service: "Service", stylist: "Select Stylist", stylistAny: "Any (First Available)", stylistOptions: ["Any", "Rebo (Owner)", "Anna", "Marcus"], requestsLabel: "Special Requests / Notes (Optional)", date: "Date", time: "Time", dsgvoNote: "By submitting, you agree to GDPR processing.", smsNote: "Receive SMS reminder 24h before appointment.", reward: "Loyalty Bonus", rewardDesc: "You reached 10 haircuts! Want to apply a 50% discount to this booking?", submit: "Confirm Booking", success: "Request sent! We have emailed you a confirmation receipt.", refImage: "Reference Image (Optional)", totalDuration: "Total Duration:", pickDateFirst: "Please select a date first.", pickDate: "Choose a date", calendarAvailable: "Available", calendarUnavailable: "Unavailable", prevMonth: "Previous month", nextMonth: "Next month", bookNew: "Request new appointment", waitlistLabel: "No suitable time?", joinWaitlistBtn: "Join Waitlist", noSlotsFit: "There is no free slot left on this day where all selected services finish before closing time (7:00 pm).", totalDurationLabel: "Total duration", nextAvailable: "Next available slot:", takeSlotBtn: "Book this slot", pastDateError: "Appointments in the past cannot be booked.", noSlotFound: "Unfortunately there is no suitable slot in the coming weeks. Please join the waitlist or give us a call.", addGuest: "+ Add Person / Child", groupNotice: "Group bookings are manually reviewed. Send us your requested time and we'll be in touch!", prefTime: "Preferred Time", guestName: "Name", guestAge: "Age", guestPhone: "Phone (if >14 yrs)" }, 
    profile: { title: "My Profile", pointsTitle: "Your Loyalty Points", pointsDesc: "Collect 10 points for 50% off your next cut!", historyTitle: "Your Visit History", upcomingTitle: "Upcoming Appointments", notesLabel: "Stylist Notes:", noHistory: "No appointments yet.", saveNote: "Save Note", welcome: "Welcome back", overview: "Overview", settings: "Settings", editProfile: "Edit Profile", contactData: "Contact Data", noPhone: "No phone number saved. Please add in settings.", acceptTime: "Accept Time", cancel: "Cancel", pending: "Pending", completed: "Completed", newProposal: "New appointment proposal from salon:" }, 
    notifications: { title: "Notifications", empty: "No notifications.", clearAll: "Clear All" },
    security: { title: "Security Update", desc: "We updated our security standards. Please change your password to continue.", currentPass: "Current Password", newPass: "New Password", confirmPass: "Confirm New Password", sendCode: "Send code via E-Mail", enterCode: "E-Mail verification code", cancel: "Cancel", confirmBtn: "Confirm & Change", secTitle: "Password & Security", oauthMsg: "You are logged in via a third party (Google/Facebook). Password changes are not available here.", sendOtpBtn: "Send OTP via E-Mail" },
    admin: { title: "Admin Control Panel", analytics: { revenue: "Today's Revenue", completed: "Confirmed (Today)", upcoming: "Pending (Today)" }, tabs: { requests: "Requests", calendar: "Calendar", services: "Services", products: "Products", clients: "Clients", waitlist: "Waitlist", team: "Team", settings: "Settings" }, team: { title: "Team & Stylists", name: "Stylist Name", services: "Specialties (Services)", saveBtn: "Save Stylist", deleteBtn: "Delete", editSchedule: "Working hours", workingHours: "Working hours", salonHours: "Regular opening hours", scheduleHint: "Clients can only book this stylist during these times.", salonHoursHint: "No custom hours yet – bookable during regular opening hours.", salonClosed: "Salon closed", dayOff: "Off", saveSchedule: "Save working hours", resetSchedule: "Reset to opening hours", invalidHours: "Please enter valid times between 09:00 and 19:00 (start before end).", daysOff: "Holidays / days off", daysOffHint: "Only this stylist is unavailable on these dates.", addDayOff: "Add", noDaysOff: "No days off entered." }, settings: { title: "General Settings", walkin: "Live Walk-in Wait Time", walkinPlaceholder: "e.g. 15 Minutes, Fully Booked...", saveWalkin: "Update Wait Time", holidays: "Closed Dates (Holidays)", holidayDate: "Select Date", addHoliday: "Block Date", designTitle: "Homepage Design & Text", heroImg: "Hero Background Image (URL)", aboutImg: "Profile Picture (URL)", aboutTitleDe: "Title (German)", aboutTextDe: "Description (German - max. 400 chars)", aboutTitleEn: "Title (English)", aboutTextEn: "Description (English - max. 400 chars)", saveDesign: "Save Design" }, calendar: { back: "Back", next: "Next", freeSlot: "Free Slot", allStylists: "All Stylists", blockBtn: "Block", unblockBtn: "Unblock" }, walkIn: { title: "Add Walk-In / Appointment", name: "Client Name", service: "Service / Info", duration: "Duration (Min)", saveBtn: "Save", cancel: "Cancel", btn: "+ Walk-In" }, clients: { search: "Search client by name or phone...", notes: "Stylist Notes (e.g. formula, allergies...)", saveNotes: "Save Notes" }, waitlist: { title: "Waitlist", empty: "Waitlist is empty.", notifyBtn: "Notify Client", removeBtn: "Remove" }, requests: { pending: "Pending Requests", noPending: "No new requests.", services: "Services:", refImage: "Reference Image:", confirmBtn: "Confirm", rejectBtn: "Reject", reschedule: "Reschedule (New Proposal)", proposeBtn: "Propose", confirmed: "Confirmed & History", notesPlaceholder: "Internal Notes (e.g. Skin fade #1...)", saveNote: "Save Note", cancelBtn: "Cancel", move: "Move:", proposeClientBtn: "Propose to Client", status: "Status", resendBtn: "Resend Confirm", groupBadge: "👥 Group Booking" }, services: { addTitle: "Add Service", nameDe: "Service Name (German)", nameEn: "Name (English Preview)", price: "Price (€)", duration: "Duration (Min)", saveBtn: "Save to Database", deleteBtn: "Delete", translateBtn: "✨ AI: Translate to English", translating: "Translating..." }, products: { addTitle: "Add Product", nameDe: "Product Name (German)", descDe: "Description (German)", nameEn: "Name (English Preview)", descEn: "Description (English Preview)", price: "Price (€)", initialStock: "Initial Stock", uploadImg: "Upload Product Image", saveBtn: "Save Product", stockLabel: "Stock" } },
    alertsMsg: { confirmed1: "Your appointment on", confirmed2: "has been confirmed!", cancelled1: "Your appointment on", cancelled2: "has been cancelled.", proposed1: "New appointment proposal:", proposed2: "Please confirm!" }
  }
};

type DocData = Record<string, any>;

/**
 * Everything a visitor sees that needs translating: the built-in German texts plus the
 * salon's own services, products, stylists and homepage texts from Firestore.
 * Lists keep Firestore's default (document id) order, which the browser relies on to
 * match translated entries back to the originals by position.
 */
export function buildTranslationSource(
  services: DocData[],
  products: DocData[],
  stylists: DocData[],
  generalSettings: DocData | undefined,
): DocData {
  const source: DocData = JSON.parse(JSON.stringify(fallbackTranslations.de));

  if (services.length > 0) {
    source.dynamicServices = services.map(s => ({
      id: s.id, name: s.name, price: s.price, oldPrice: s.oldPrice || '', durationMins: s.durationMins,
    }));
  }
  if (products.length > 0) {
    source.dynamicProducts = products.map(p => ({
      id: p.id, name: p.name, price: p.price, desc: p.desc, image: p.image, stockCount: p.stockCount || 0,
    }));
  }
  if (stylists.length > 0) {
    source.dynamicStylists = stylists.map(s => ({ id: s.id, name: s.name, services: s.services }));
  }
  if (generalSettings) {
    source.generalSettings = {
      walkinWaitTime: generalSettings.walkinWaitTime || '',
      heroImage: generalSettings.heroImage || '',
      aboutImage: generalSettings.aboutImage || '',
      aboutTitleDe: generalSettings.aboutTitleDe || '',
      aboutTextDe: generalSettings.aboutTextDe || '',
      aboutTitleEn: generalSettings.aboutTitleEn || '',
      aboutTextEn: generalSettings.aboutTextEn || '',
      galleryImages: generalSettings.galleryImages || [],
      holidays: generalSettings.holidays || [],
    };
  }
  return source;
}
