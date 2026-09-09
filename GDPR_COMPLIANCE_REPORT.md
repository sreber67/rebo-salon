# GDPR & German Digital Law Compliance Report
## REBO SALON — Barbershop Booking System

**Generated:** 2026-09-08  
**Scope:** Full audit of `C:\Users\Test\Desktop\New folder\completed\rebo-salon`  
**Status:** Production-ready codebase — **missing mandatory legal pages**

---

## Executive Summary

| Area | Status | Critical Issues |
|------|--------|-----------------|
| **Impressum (§5 DDG)** | ❌ **MISSING** | No Impressum page exists — mandatory for German commercial sites |
| **Datenschutzerklärung (Art. 12–14 DSGVO)** | ❌ **MISSING** | No privacy policy page exists — mandatory |
| **Cookie Consent (TTDSG §25)** | ✅ **Excellent** | Granular, versioned, with audit trail — best practice |
| **Legal Basis Documentation** | ⚠️ **Partial** | Documented in code/comments but no user-facing policy |
| **Data Subject Rights (Art. 15–22)** | ✅ **Implemented** | Data export (Art. 20), Account deletion (Art. 17), Rectification via profile |
| **Data Retention / Storage Limitation** | ⚠️ **Not enforced** | No automated cleanup cron; retention periods undefined |
| **Security (Art. 32 DSGVO)** | ✅ **Strong** | CSP, HSTS, rate limiting, audit logs, breach checks, input validation |
| **Third-Party Processors (Art. 28)** | ⚠️ **AVVs needed** | Firebase, Cloudinary, Twilio, Gmail, DeepL, HIBP — no AVVs confirmed |
| **International Transfers (Art. 44–49)** | ⚠️ **Verify** | Firebase (EU), Cloudinary (US/Global), Twilio (US), DeepL (DE/US), Gmail (US) |
| **ePrivacy / TTDSG (§25)** | ✅ **Compliant** | Consent before analytics, necessary cookies exempt, easy withdrawal |
| **ROPA (Art. 30)** | ❌ **Missing** | No Record of Processing Activities documented |

---

## 1. Impressum (§5 DDG / §18 MStV) — **MISSING — CRITICAL**

**No Impressum page exists.** This is a legal requirement for any commercial website in Germany (§5 DDG). Missing Impressum is the #1 cause of *Abmahnungen* (cease-and-desist letters), typically €200–1,500 + legal fees.

### Required Content (must be created as `src/app/impressum/page.tsx`)
| Field | Requirement | Example for REBO SALON |
|-------|-------------|------------------------|
| **Vollständiger Name / Rechtsform** | Mandatory — natural person or legal entity | `Max Mustermann` or `REBO SALON GmbH` |
| **Anschrift** | Complete postal address | `Manggasse 6, 97421 Schweinfurt` |
| **Kontakt (E-Mail + Telefon)** | Must be reachable "quickly and directly" | `info@rebosalon.de` + `0176 42980985` |
| **Umsatzsteuer-ID** | If VAT-registered (§27a UStG) | `DE123456789` or remove section |
| **Handelsregister** | If registered (GmbH, UG, AG, e.K.) | `Amtsgericht Schweinfurt, HRB 12345` |
| **Verantwortlich für Inhalt (§18 MStV)** | Natural person with name + address | `Max Mustermann, Manggasse 6, 97421 Schweinfurt` |
| **EU-Streitschlichtung (OS-Plattform)** | Link + participation statement | Required template text |

### Action: Create `src/app/impressum/page.tsx` with all fields filled.

---

## 2. Datenschutzerklärung (Art. 12–14, 24 DSGVO) — **MISSING — CRITICAL**

**No privacy policy page exists.** Must document all processing activities with legal bases.

### Required Sections (create `src/app/datenschutz/page.tsx`)

| Section | Processing Activities to Document | Legal Basis (Art. 6) |
|---------|-----------------------------------|----------------------|
| **1. Verantwortlicher** | Same as Impressum | — |
| **2. Hosting / Server-Logs** | Vercel/Next.js hosting, access logs (IP, UA, timestamp) | Art. 6(1)(f) — legitimate interest |
| **3. Firebase Authentication** | Email/password, Google, Facebook login — email, name, UID | Art. 6(1)(b) — contract; Art. 6(1)(f) — fraud prevention |
| **4. Firestore Database** | User profiles, appointments, alerts, waitlist, stylist notes | Art. 6(1)(b) — contract; Art. 6(1)(f) — service provision |
| **5. Terminbuchung** | Name, phone, email, services, stylist, date/time, notes, reference images | Art. 6(1)(b) — contract |
| **6. SMS (Twilio)** | Appointment confirmations, reminders, waitlist notifications | Art. 6(1)(b) — contract; Art. 6(1)(f) — service |
| **7. E-Mail (Nodemailer/Gmail)** | Booking confirmations, password resets, admin notifications | Art. 6(1)(b) — contract |
| **8. Firebase Analytics** | Page views, events, device info — **only with consent** | Art. 6(1)(a) — consent |
| **9. Cloudinary** | Reference images, hero/about/gallery images | Art. 6(1)(b) — contract; Art. 6(1)(f) — service |
| **10. DeepL Translation** | UI translations, service/product names | Art. 6(1)(f) — legitimate interest |
| **11. HIBP Password Check** | SHA-1 prefix sent to api.pwnedpasswords.com | Art. 6(1)(f) — security |
| **12. reCAPTCHA (Firebase Auth)** | Invisible reCAPTCHA during OAuth/phone flows | Art. 6(1)(f) — fraud prevention |
| **13. Google Fonts** | Preconnect + font loading | Art. 6(1)(f) — design/UX |
| **14. Cookies / LocalStorage** | Auth tokens, consent, language, UI state | §25 TTDSG / Art. 6(1)(f) |
| **15. Betroffenenrechte** | Access, Rectification, Erasure, Portability, Objection, Restriction | Art. 15–22 |
| **16. Speicherdauer / Löschung** | Define retention per data type | Art. 5(1)(e) |
| **17. Drittlandübermittlung** | Document transfer mechanisms for US providers | Art. 44–49 |
| **18. Datensicherheit** | TLS, CSP, HSTS, rate limiting, audit logs, input validation | Art. 32 |

### Placeholders to Fill
- Hosting provider name (Vercel?)
- Exact log retention period
- AVV status for each processor
- Transfer mechanism (DPF / SCCs) for US providers
- Contact email for data requests
- Supervisory authority (BayLDA for Bavaria)

---

## 3. Cookie Consent (TTDSG §25, ePrivacy) — `src/components/CookieConsent.tsx` ✅ **EXCELLENT**

### Implementation Quality
| Requirement | Status | Notes |
|-------------|--------|-------|
| **Granular consent (Necessary / Analytics)** | ✅ | Two categories, necessary locked |
| **No pre-ticked analytics** | ✅ | Default = false |
| **Equal prominence buttons** | ✅ | "Alle akzeptieren" / "Nur notwendige" |
| **Link to privacy policy** | ✅ | Links to `/datenschutz` (page missing!) |
| **Consent stored with timestamp + version** | ✅ | `localStorage` + optional server log |
| **Easy withdrawal (resetConsent)** | ✅ | `resetConsent()` function exposed |
| **Reopen banner UI** | ⚠️ | No footer "Cookie-Einstellungen" link yet |
| **Consent proof (audit trail)** | ✅ | Optional server logging implemented |
| **Analytics loaded conditionally** | ✅ | `useAnalyticsConsent()` hook |

### Gap: **Missing "Cookie-Einstellungen" link in footer**
The banner text says: *"Sie können Ihre Einwilligung jederzeit widerrufen oder ändern über den Link „Cookie-Einstellungen“ im Footer"* — but **no such link exists** in Navbar or footer.

**Fix:** Add to Navbar (mobile + desktop) or create a footer component:
```tsx
// In Navbar.tsx or new Footer component
<button onClick={() => { useCookieConsent().resetConsent(); }} className="text-xs underline hover:text-yellow-400">
  Cookie-Einstellungen
</button>
```

---

## 4. Data Processing Activities — Code vs. Policy Alignment

| Processing | Code Location | Legal Basis (Code) | Documented in Policy? |
|------------|---------------|-------------------|----------------------|
| **User Registration** | `AppContext.tsx:447-459` | Contract (Art. 6(1)(b)) | ❌ Policy missing |
| **Email/Password Login** | `AppContext.tsx:439-445` | Contract | ❌ |
| **Google/Facebook OAuth** | `AppContext.tsx:427-437` | Contract + legitimate interest | ❌ |
| **Password Reset** | `AppContext.tsx:461-467` | Contract | ❌ |
| **Profile Update** | `AppContext.tsx:480-484, 317-329` | Contract | ❌ |
| **Booking (Appointments)** | `AppContext.tsx:560-579` | Contract | ❌ |
| **Waitlist** | `AppContext.tsx:506-532` | Legitimate interest | ❌ |
| **SMS (Twilio)** | `api/sms/route.ts` | Contract + legitimate interest | ❌ |
| **Email (Nodemailer)** | `api/email/route.ts` | Contract | ❌ |
| **Firebase Analytics** | `lib/firebase.ts:62-77` + `CookieConsent.tsx` | Consent (Art. 6(1)(a)) | ❌ |
| **Cloudinary Uploads** | `lib/storage.ts` | Contract | ❌ |
| **DeepL Translation** | `api/translate*.ts` | Legitimate interest | ❌ |
| **HIBP Breach Check** | `lib/password-breach.ts` | Security (Art. 32) | ❌ |
| **Rate Limiting** | `middleware.ts` | Legitimate interest (security) | ❌ |
| **Audit Logging** | `lib/validation.ts:140-174` | Legitimate interest (security) | ❌ |

**All processing activities are implemented correctly in code — but none are documented in a user-facing privacy policy.**

---

## 5. Third-Party Processors (Art. 28 DSGVO) — AVV Status

| Processor | Purpose | Data | Location | AVV Required? | Status |
|-----------|---------|------|----------|---------------|--------|
| **Firebase Auth** | Authentication | Email, name, UID, OAuth tokens | EU (europe-west1) | ✅ Yes | ⚠️ Verify AVV signed |
| **Firestore** | Database | All user/appointment data | EU (europe-west1) | ✅ Yes | ⚠️ Verify AVV signed |
| **Firebase Analytics** | Analytics (consent-gated) | Pseudonymized usage data | EU/US | ✅ Yes | ⚠️ Verify AVV + transfer |
| **Cloudinary** | Image storage | Reference images, site assets | US/Global | ✅ Yes | ⚠️ **Critical** — US provider |
| **Twilio** | SMS delivery | Phone numbers, message content | US | ✅ Yes | ⚠️ **Critical** — US provider |
| **Gmail (Nodemailer)** | Email delivery | Email content, recipients | US | ✅ Yes | ⚠️ **Critical** — US provider |
| **DeepL** | Translation | Text content (service names, UI) | DE (Pro) / US (Free) | ✅ Yes | ⚠️ Verify plan + location |
| **HIBP (api.pwnedpasswords.com)** | Password breach check | SHA-1 prefix (5 chars) | US | ❓ No personal data | ✅ Low risk (k-anonymity) |
| **Google Fonts** | Fonts | IP, request headers | US/Global | ❓ Borderline | ⚠️ Consider self-hosting |
| **Unsplash** | Placeholder images | IP, referrer | US | ❓ No personal data | ✅ Low risk |

### Critical Actions
1. **Execute AVVs** with all ✅ providers before go-live.
2. **Verify Firebase project region** = `europe-west1` or `europe-west3` (code sets `FIREBASE_REGION = 'europe-west1'` — good).
3. **Document transfer mechanisms** for US providers:
   - **Cloudinary**: Check DPF certification or SCCs
   - **Twilio**: Check DPF certification or SCCs  
   - **Gmail**: Google Ireland Ltd. (EU) — but SMTP via Gmail may route via US
   - **DeepL**: DeepL SE (Germany) for Pro; Free tier may use US — verify plan
4. **Consider self-hosting Google Fonts** (download & serve locally) to eliminate transfer.

---

## 6. Data Retention & Deletion (Art. 5(1)(e), 17, 30)

### Current Implementation
| Feature | Status | Location |
|---------|--------|----------|
| **User-initiated deletion (Art. 17)** | ✅ Full | `AccountDeletion.tsx` — deletes Firestore data + Firebase Auth user |
| **Data export (Art. 20)** | ✅ Full | `DataExport.tsx` — JSON export of profile, appointments, alerts |
| **Rectification (Art. 16)** | ✅ Profile edit | `ProfileViewLocal.tsx` — name, email (with verification), phone |
| **Automated retention cleanup** | ❌ **Missing** | No cron job for old appointments, alerts, waitlist |
| **Defined retention periods** | ❌ **Missing** | Not documented anywhere |

### Required Retention Policy (add to privacy policy + implement cron)
| Data Type | Recommended Retention | Legal Basis |
|-----------|----------------------|-------------|
| **User profile (active)** | Until deletion request | Art. 6(1)(b) |
| **User profile (deleted)** | 0 days (immediate) | Art. 17 |
| **Appointments (confirmed)** | 3 years (tax law §147 AO) | Legal obligation |
| **Appointments (cancelled/pending)** | 1 year | Legitimate interest |
| **Waitlist entries** | 6 months | Legitimate interest |
| **Alerts/Notifications** | 1 year | Legitimate interest |
| **Stylist notes** | 3 years (with appointment) | Contract |
| **Audit logs** | 1 year | Security (Art. 32) |
| **Consent logs** | 3 years | Art. 7(1) accountability |

### Action: Implement Vercel Cron for cleanup
```json
// vercel.json
{
  "crons": [
    { "path": "/api/cron/cleanup", "schedule": "0 3 * * *" }
  ]
}
```
Create `src/app/api/cron/cleanup/route.ts` with `CRON_SECRET` auth.

---

## 7. Security Measures (Art. 32 DSGVO) — ✅ **STRONG**

| Measure | Implementation | Grade |
|---------|---------------|-------|
| **TLS/HTTPS** | Vercel enforced + HSTS header (1 year, preload) | ✅ |
| **Content Security Policy** | Comprehensive CSP in `next.config.js` | ✅ |
| **Security Headers** | X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, COOP, CORP, Expect-CT | ✅ |
| **Rate Limiting** | In-memory per IP+UA (`middleware.ts`) | ⚠️ Use Redis/Upstash in production |
| **Input Validation** | Zod schemas on all API routes (`validation.ts`) | ✅ |
| **Header Injection Prevention** | Sanitization in email/SMS routes | ✅ |
| **Password Hashing** | Firebase Auth (scrypt) + client strength meter | ✅ |
| **Password Breach Check** | HIBP k-anonymity (`password-breach.ts`) | ✅ Excellent |
| **Re-auth for sensitive actions** | Password confirmation for deletion/password change | ✅ |
| **Audit Logging** | Structured JSON logs (`validation.ts:140-174`) | ⚠️ Console only — persist in production |
| **Admin Authorization** | Server-side role check (Firestore) + custom claims support | ✅ |
| **ID Token Verification** | All API routes verify Firebase ID token | ✅ |
| **Ownership Checks** | SMS/email routes verify resource ownership | ✅ |
| **Firebase Region** | `europe-west1` enforced in code | ✅ |

### Minor Improvements
- Replace in-memory rate limit with **Upstash Redis** (like Karmel project)
- Persist audit logs to **Cloud Logging / Datadog / Loki**
- Add **CSP nonce** for inline scripts (experimental in Next.js)

---

## 8. Data Subject Rights (Art. 15–22) — ✅ **WELL IMPLEMENTED**

| Right | Implementation | Location |
|-------|----------------|----------|
| **Access (Art. 15)** | Profile page shows all data | `ProfileViewLocal.tsx` |
| **Rectification (Art. 16)** | Edit profile (name, email, phone) | `ProfileViewLocal.tsx:317-329` |
| **Erasure (Art. 17)** | Full account + data deletion wizard | `AccountDeletion.tsx` — multi-step, re-auth |
| **Portability (Art. 20)** | JSON download of all user data | `DataExport.tsx` — profile, appointments, alerts |
| **Restriction (Art. 18)** | Not implemented (no "pause" feature) | — |
| **Objection (Art. 21)** | Analytics opt-out via cookie banner | `CookieConsent.tsx` |
| **Withdraw consent (Art. 7(3))** | `resetConsent()` + banner reopen | `CookieConsent.tsx` |

**Grade: A-** — Only Art. 18 (restriction) not implemented, which is rarely used for this type of service.

---

## 9. International Data Transfers (Art. 44–49)

### Current Transfers
| Provider | Data | Transfer Mechanism Needed | Verification |
|----------|------|---------------------------|--------------|
| **Firebase (Auth/Firestore/Analytics)** | Personal data | Google Ireland Ltd. (EU) — **DPF certified** | ✅ Likely OK if region=EU |
| **Cloudinary** | Images (may contain personal data in reference photos) | Cloudinary Inc. (US) — **Check DPF/SCCs** | ⚠️ **Action required** |
| **Twilio** | Phone + message content | Twilio Inc. (US) — **Check DPF/SCCs** | ⚠️ **Action required** |
| **Gmail (Nodemailer)** | Email content | Google Ireland Ltd. (EU) for Workspace; SMTP may route via US | ⚠️ Verify |
| **DeepL** | Translation text | DeepL SE (DE) for Pro; Free tier = US | ⚠️ Verify plan |
| **HIBP** | SHA-1 prefix only (5 chars) | No personal data — k-anonymity | ✅ Low risk |
| **Google Fonts** | IP + request | Google Ireland Ltd. | ⚠️ Self-host to eliminate |

### Actions
1. Confirm **Firebase project region** = `europe-west1` (code has it, verify in console).
2. Check **Cloudinary DPF status**: https://www.dataprivacyframework.gov/s/participant-search
3. Check **Twilio DPF status**.
4. Upgrade **DeepL to Pro** (EU hosting) or execute SCCs.
5. **Self-host Google Fonts** (download WOFF2, serve via `next/font/local` or public folder).

---

## 10. Additional German Law Considerations

| Law | Requirement | Status |
|-----|-------------|--------|
| **§5 DDG (Impressum)** | Complete provider identification | ❌ **Missing page** |
| **§18 MStV** | Named responsible person | ❌ **Missing page** |
| **TTDSG §25** | Cookie consent for analytics | ✅ Implemented |
| **PAngV (Preisangabenverordnung)** | Prices include VAT, per unit | ⚠️ Check `servicesDB` prices — "€€" in schema.org but no VAT notice |
| **GOBD / AO §147** | Booking records = tax-relevant | ⚠️ Define 3-year retention for confirmed appointments |
| **Barrierefreiheit (BFSG 2025)** | WCAG 2.1 AA for public sites | ⚠️ Not audited — check contrast, ARIA, keyboard nav |
| **Dienstleistungs-Informationspflichten-Verordnung (DL-InfoV)** | Service info, prices, T&C | ⚠️ Add AGB/Terms page |

---

## 11. Priority Action Checklist

### 🔴 CRITICAL (Legal Risk: Abmahnung / Fines)
- [ ] **Create `src/app/impressum/page.tsx`** with all §5 DDG fields
- [ ] **Create `src/app/datenschutz/page.tsx`** with all Art. 12–14 sections
- [ ] **Add Impressum + Datenschutz links** to Navbar (desktop + mobile) and/or Footer
- [ ] **Add "Cookie-Einstellungen" link** to Navbar/Footer (calls `resetConsent()`)
- [ ] **Execute AVVs** with Firebase, Cloudinary, Twilio, Gmail, DeepL
- [ ] **Verify international transfer mechanisms** (DPF/SCCs) for US providers
- [ ] **Set real `NEXT_PUBLIC_ADMIN_EMAIL`** (not personal Gmail in code)
- [ ] **Configure `INTERNAL_API_SECRET`** for admin API protection
- [ ] **Add `vercel.json` with cleanup cron** + `CRON_SECRET`

### 🟠 HIGH (GDPR Compliance)
- [ ] **Document retention periods** in privacy policy + implement cleanup cron
- [ ] **Create ROPA (Verarbeitungsverzeichnis)** — spreadsheet with all processing activities
- [ ] **Verify Firebase region** = `europe-west1` in Firebase Console
- [ ] **Verify DeepL plan** = Pro (EU hosting) or execute SCCs
- [ ] **Self-host Google Fonts** (eliminate transfer)
- [ ] **Replace in-memory rate limit** with Upstash Redis (production)
- [ ] **Persist audit logs** to logging service (not just console)

### 🟡 MEDIUM (Best Practice)
- [ ] **Add AGB/Terms page** (DL-InfoV)
- [ ] **Add VAT notice** to prices ("inkl. MwSt.") — PAngV
- [ ] **Accessibility audit** (WCAG 2.1 AA) — BFSG 2025
- [ ] **CSP nonce support** for stricter CSP
- [ ] **Consent logging to Firestore** (currently optional/fire-and-forget)
- [ ] **Email domain verification** (use own domain, not Gmail SMTP)

### 🟢 LOW (Nice to Have)
- [ ] **Automated appointment cleanup** for cancelled bookings
- [ ] **Data processing agreement links** in privacy policy
- [ ] **Regular penetration testing**

---

## 12. File Reference Map (for your fixes)

| File | Purpose | Action Needed |
|------|---------|---------------|
| **NEW** `src/app/impressum/page.tsx` | Legal notice | Create with all mandatory fields |
| **NEW** `src/app/datenschutz/page.tsx` | Privacy policy | Create with all 18 sections |
| **NEW** `src/app/api/cron/cleanup/route.ts` | Retention cleanup | Create + add to `vercel.json` |
| **NEW** `vercel.json` | Cron config | Add cleanup schedule |
| `src/components/Navbar.tsx` | Navigation | Add Impressum/Datenschutz/Cookie links |
| `src/components/CookieConsent.tsx` | Cookie banner | Verify footer link text matches implementation |
| `src/lib/firebase.ts:105` | Firebase region | Verify `europe-west1` in Firebase Console |
| `src/lib/storage.ts` | Cloudinary uploads | Confirm AVV + DPF/SCCs |
| `src/app/api/sms/route.ts` | Twilio SMS | Confirm AVV + DPF/SCCs |
| `src/app/api/email/route.ts` | Nodemailer/Gmail | Use verified domain, confirm AVV |
| `src/app/api/translate*.ts` | DeepL | Confirm Pro plan (EU) or SCCs |
| `.env.example` | Env template | Add all required vars (see below) |
| `next.config.js` | Security headers | Already excellent — verify CSP doesn't break Firebase Auth popups |

---

## 13. Required Environment Variables (add to `.env.example` + Vercel)

```bash
# Firebase (already in use)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
FIREBASE_SERVICE_ACCOUNT_BASE64=          # Base64-encoded service account JSON
FIREBASE_REGION=europe-west1              # Confirm in Firebase Console

# Cloudinary (image storage)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=

# Twilio (SMS)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Email (Nodemailer via Gmail — use App Password)
EMAIL_USER=your-salon@yourdomain.de       # Use verified domain!
EMAIL_PASS=your-gmail-app-password

# DeepL (Translation)
DEEPL_API_KEY=                            # Pro key for EU hosting

# Internal API Security
INTERNAL_API_SECRET=                      # openssl rand -hex 32

# Admin & Legal
NEXT_PUBLIC_ADMIN_EMAIL=info@yourdomain.de # Salon inbox (not personal!)

# Cron & Retention
CRON_SECRET=                              # openssl rand -hex 32
UNVERIFIED_ACCOUNT_RETENTION_DAYS=30      # If you add email verification
APPOINTMENT_RETENTION_MONTHS=36           # 3 years for tax law
ALERT_RETENTION_MONTHS=12
WAITLIST_RETENTION_MONTHS=6
```

---

## 14. Testing Checklist (Manual Verification)

### Legal Pages
- [ ] `/impressum` accessible from every page (Navbar/Footer)
- [ ] `/datenschutz` accessible from every page
- [ ] No placeholder text remains
- [ ] Contact email works (test send)
- [ ] VAT ID format valid (DE + 9 digits) if applicable

### Cookie Consent
- [ ] Banner appears on first visit (incognito)
- [ ] "Nur notwendige" → Firebase Analytics NOT loaded (check Network tab)
- [ ] "Alle akzeptieren" → Firebase Analytics loads
- [ ] Consent persists across reloads
- [ ] "Cookie-Einstellungen" link in footer reopens banner
- [ ] No analytics cookies before consent

### Data Rights
- [ ] Profile page shows all stored data (Art. 15)
- [ ] Profile edit saves changes (Art. 16) — email change sends verification
- [ ] Data export downloads valid JSON (Art. 20)
- [ ] Account deletion wizard works end-to-end (Art. 17) — deletes Firestore + Auth
- [ ] Analytics opt-out works via cookie banner

### Security
- [ ] HTTPS enforced (no mixed content)
- [ ] Security headers present (check via securityheaders.com)
- [ ] Rate limiting active (test 10 rapid API calls → 429)
- [ ] Input validation rejects malicious payloads (XSS, SQLi — Firestore safe)
- [ ] CSP blocks inline scripts (check console for violations)
- [ ] Password breach check works (test "Password123" → should warn)
- [ ] Admin API requires valid ID token + admin role

### Data Flows
- [ ] Booking → confirmation email + admin email + SMS (if opted in)
- [ ] Admin confirm → customer email + SMS + in-app alert
- [ ] Waitlist notify → SMS + email
- [ ] Password reset → email sent
- [ ] UI language change → DeepL translation cached in Firestore

---

## 15. Lawyer Review Recommendation

**Strongly recommended:** Have a German IT/recht lawyer (or **eRecht24**, **Trusted Shops**, **WBS Law**) review:
1. Final Impressum (once created)
2. Final Datenschutzerklärung (once created)
3. AVV contracts with all 6+ processors
4. International transfer documentation
5. Retention policy alignment with tax law (AO §147)

**Estimated cost:** €400–1,000 — far cheaper than an Abmahnung or DSGVO fine.

---

## 16. Summary

**The technical implementation is outstanding — privacy-by-design, strong security, full Art. 17/20 implementation, granular consent.**  
**The legal documentation is completely missing — two mandatory pages (Impressum, Datenschutz) do not exist.**

### Before Go-Live You MUST:
1. **Create Impressum page** with verified business data
2. **Create Datenschutzerklärung** documenting all 14+ processing activities
3. **Link both in Navbar/Footer** + add "Cookie-Einstellungen" link
4. **Sign AVVs** with Firebase, Cloudinary, Twilio, Gmail, DeepL
5. **Verify transfer mechanisms** for US providers (DPF/SCCs)
6. **Add retention cleanup cron** + document periods
7. **Create ROPA** (Art. 30)

Once these are done, the site will be fully compliant for a German barbershop operation. The codebase quality is significantly above average — the compliance gaps are purely documentation/contractual.

---

*This report is a technical audit, not legal advice. Consult a qualified German attorney for final legal sign-off.*