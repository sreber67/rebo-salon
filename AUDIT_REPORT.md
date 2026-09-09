# REBO SALON - Complete Codebase Audit Report  
**Generated:** 2026-09-09  
**Codebase Path:** C:\Users\Test\Desktop\rebo-salon  
**Framework:** Next.js 16.3.0 (App Router) + React 19.2.8 + TypeScript  
**Hosting Target:** Vercel  
**Database:** Firebase Firestore (region: europe-west1)  
**Auth:** Firebase Authentication (Email/Password, Google OAuth, Facebook OAuth)  
  
---  
  
## Table of Contents  
  
1. [API Routes](#1-api-routes)  
2. [Firebase Collections](#2-firebase-collections)  
3. [Authentication Flows](#3-authentication-flows)  
4. [Business Logic](#4-business-logic)  
5. [Admin Features](#5-admin-features)  
6. [GDPR Features](#6-gdpr-features)  
7. [Translation Features](#7-translation-features)  
8. [Security Features](#8-security-features)  
9. [Environment Variables](#9-environment-variables)  
10. [Third-Party Integrations](#10-third-party-integrations)  
  
--- 
  
## 1. API Routes  
  
All API routes are located in src/app/api/ and use Firebase Admin SDK for server-side operations with Zod validation and audit logging.  
  
### 1.1 Appointments API  
  
Route: /api/appointments, Method: GET, Description: List appointments (own for users, all for admin), Auth Required: Yes, Admin Only: No  
Route: /api/appointments, Method: POST, Description: Create appointment, Auth Required: Yes, Admin Only: No  
Route: /api/appointments/[id], Method: PATCH, Description: Update appointment (status, notes, proposed times), Auth Required: Yes, Admin Only: No*  
Route: /api/appointments/[id], Method: DELETE, Description: Delete appointment, Auth Required: Yes, Admin Only: No*  
  
*Non-admins can only update/delete their own appointments. Admins have full access.  
  
**Validation Schema** (src/app/api/appointments/route.ts:5-25):  
- name: string (2-100 chars)  
- phone: E.164 format regex  
- services: string[] (min 1)  
- totalDurationMins: 15-480  
- stylist: string (min 1)  
- date: YYYY-MM-DD regex  
- time: HH:MM regex  
- sendsms: boolean  
- usedReward: boolean  
- Optional: notes, specialRequests, isGroup, guests[] 
  
### 1.2 Authentication API  
  
Route: /api/auth/register, Method: POST, Description: Email/password registration with Firestore profile creation  
Route: /api/auth/login, Method: POST, Description: Email/password login (returns custom token for testing)  
Route: /api/auth/reset-password, Method: POST, Description: Password reset link generation (security: does not reveal if email exists)  
  
### 1.3 Communication APIs  
  
Route: /api/email, Method: POST, Description: Send email via Nodemailer/Gmail, Rate Limit: 10/min  
Route: /api/sms, Method: POST, Description: Send SMS via Twilio, Rate Limit: 5/min  
  
**Email Authorization** (src/app/api/email/route.ts:61-69):  
- Non-admins: can only email themselves or the salon admin email  
- Admins: can email any address  
  
**SMS Authorization** (src/app/api/sms/route.ts:62-72):  
- Non-admins: can only SMS phone number on their own appointment (verified via appointmentId)  
- Admins: can SMS any number 
  
### 1.4 Translation APIs  
  
Route: /api/translate, Method: POST, Description: Admin single-text translation (DeepL), Auth: x-internal-secret header  
Route: /api/translate-ui, Method: POST, Description: Public UI dictionary translation (DeepL), Auth: None (public)  
  
### 1.5 Waitlist API  
  
Route: /api/waitlist, Method: GET, Description: List waitlist entries (own for users, all for admin)  
Route: /api/waitlist, Method: POST, Description: Join waitlist  
  
### 1.6 Services and Products API (Admin Only for Write)  
  
Route: /api/services, Method: GET, Description: List all services (public)  
Route: /api/services, Method: POST, Description: Create service (admin only)  
Route: /api/products, Method: GET, Description: List all products (public)  
Route: /api/products, Method: POST, Description: Create product (admin only)  
  
### 1.7 GDPR API  
  
Route: /api/gdpr/export, Method: GET, Description: Export all user data (Art. 20)  
Route: /api/gdpr/delete, Method: DELETE, Description: Delete account + all data (Art. 17) 
  
---  
  
## 2. Firebase Collections  
  
From AppContext.tsx listeners and Firestore rules:  
  
Collection: users, Document: UserProfile {id, name, email, phone, haircutCount, role, photoURL, hasUpdatedPassword, stylistNotes}, Access: Owner/Admin read; Owner create (role=user); Owner/Admin update (role immutable for owner); Owner/Admin delete, Realtime: Yes (all users for admin, own for user)  
Collection: appointments, Document: Appointment {id, userId, name, phone, services[], totalDurationMins, stylist, date, time, status, proposedDate, proposedTime, sendsms, usedReward, notes, specialRequests, referenceImage, isGroup, guests[]}, Access: Owner/Admin read; Owner create; Owner/Admin update (restricted fields for owner); Owner/Admin delete, Realtime: Yes (all for logged-in user)  
Collection: services, Document: ServiceItem {id, name, price, oldPrice?, durationMins}, Access: Public read; Admin write, Realtime: Yes  
Collection: products, Document: ProductItem {id, name, price, desc, image, stockCount?}, Access: Public read; Admin write, Realtime: Yes  
Collection: waitlist, Document: WaitlistItem {id, userId, name, phone, date, stylist, createdAt}, Access: Owner/Admin read; Owner/Admin create; Admin delete, Realtime: Yes (admin only)  
Collection: alerts, Document: Alert {id, userId, message, isRead, link, createdAt}, Access: Owner/Admin read; Owner/Admin write, Realtime: Yes (all for logged-in user)  
Collection: stylists, Document: StylistItem {id, name, services[]}, Access: Public read; Admin write, Realtime: Yes (admin only)  
Collection: settings/general, Document: GeneralSettings {holidays[], heroImage?, aboutImage?, aboutTitleDe?, aboutTextDe?, aboutTitleEn?, aboutTextEn?, galleryImages[], walkinWaitTime?}, Access: Public read; Admin write, Realtime: Yes (admin only)  
Collection: settings/translations, Document: TranslationData { [lang]: { [section]: { [key]: value } } }, Access: Public read; Admin write, Realtime: Yes  
  
**Firestore Security Rules** (firestore.rules):  
- Role-based access via isAdmin() and isOwner() functions  
- Appointment updates restricted: users can only add referenceImage or accept/reject proposed reschedules  
- Role field immutable for non-admins (prevents self-promotion)  
- Settings/translations/admin-only write 
  
---  
  
## 3. Authentication Flows  
  
### 3.1 Email/Password Registration  
Location: AppContext.tsx:447-459, src/app/api/auth/register/route.ts  
1. Client calls registerEmail(email, pass, name, phone?)  
2. Firebase Auth createUserWithEmailAndPassword  
3. Firestore users/{uid} document created with: role: user (hardcoded), haircutCount: 0, Clean phone number  
4. Auto-redirect to profile page  
5. Server API also creates user via Admin SDK with audit log  
  
Password Requirements (enforced client + server):  
- Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char  
- HIBP breach check via password-breach.ts (k-anonymity)  
  
### 3.2 Email/Password Login  
Location: AppContext.tsx:439-445, src/app/api/auth/login/route.ts  
1. Client calls loginEmail(email, pass) - 
2. Server API verifies via Admin SDK getUserByEmail + createCustomToken  
3. On success: redirect to profile, notification 
  
### 3.3 OAuth (Google + Facebook)  
Location: AppContext.tsx:427-437, src/lib/firebase.ts:82-99  
1. Client calls loginOAuth(Google/Facebook)  
2. Firebase Auth signInWithPopup with provider  
3. Provider config: Google: prompt: select_account, Facebook: display: popup  
4. New users: auto-create Firestore profile with role: user  
5. Existing users: load profile from Firestore  
  
### 3.4 Password Reset  
Location: AppContext.tsx:461-467, src/app/api/auth/reset-password/route.ts  
1. Client calls resetPassword(email) - sendPasswordResetEmail  
2. Server API: generatePasswordResetLink(email) (dev only returns link)  
3. Security: Always returns success message even if email not found  
  
### 3.5 Email Verification (Profile Email Change)  
Location: ProfileView.tsx:66-68, ProfileViewLocal.tsx:320-322  
1. User changes email in settings  
2. verifyBeforeUpdateEmail(auth.currentUser, newEmail)  
3. Confirmation email sent via Firebase Auth  
4. Email updated in Firestore after verification  
  
### 3.6 Password Change (with OTP)  
Location: ProfileView.tsx:331-365, AppContext.tsx:471-478  
1. User enters current password + new password (2x)  
2. OTP (6-digit) sent to user email via /api/email  
3. User enters OTP - 
4. reauthenticateWithCredential + updatePassword  
5. Firestore hasUpdatedPassword: true flag set  
6. Force modal for users who have not updated password since security upgrade (hasUpdatedPassword !== true) 
  
---  
## 4. Business Logic  
  
### 4.1 Appointments  
Core Logic: AppContext.tsx:560-665  
Booking Flow:  
1. User selects services, stylist, date, time  
2. addAppointment() creates appointments doc with status: pending  
3. User haircutCount incremented (or -10 if reward used)  
4. Dual emails sent: User: Booking request received, Admin: New appointment with full details  
5. Notification: Appointment request sent!  
  
Status Transitions (updateAppointmentStatus):  
pending - Admin confirms, SMS (if opted), Alert, Dual emails, haircutCount adjusted  
pending - Admin rejects, haircutCount refunded if reward used, Alert, Dual emails  
pending/confirmed - Admin proposes new time, Alert with new time, Dual emails (customer must confirm)  
proposed - Customer accepts, SMS, Alert, Dual emails  
proposed - Customer rejects, Alert, Dual emails  
any - Admin blocks slot, No notifications  
  
Walk-ins: Admin creates with userId: walk-in, status: confirmed, no notifications.  
Group Bookings: isGroup: true with guests[] array (name, age, phone, service, stylist).  
Loyalty Program: 10 haircuts = 50% off next cut (usedReward flag). 
  
### 4.2 Waitlist  
Core Logic: AppContext.tsx:506-532, src/app/api/waitlist/route.ts  
1. User joins: addToWaitlist(name, phone, date, stylist) - waitlist + createdAt  
2. Admin views waitlist in dashboard  
3. Admin clicks Notify - SMS via Twilio, Email via /api/email, In-app notification  
4. Admin can remove entries  
  
### 4.3 Services Management  
Types: ServiceItem {id, name, price, oldPrice?, durationMins}  
Admin CRUD: addService(), deleteService() in AppContext  
API: GET (public), POST (admin only)  
  
### 4.4 Products Management  
Types: ProductItem {id, name, price, desc, image, stockCount?}  
Admin CRUD: addProduct(), deleteProduct(), updateProductStock()  
API: GET (public), POST (admin only)  
  
  
---  
## 5. Admin Features  
  
Location: src/app/admin/test-dashboard/page.tsx (main admin UI in src/app/page.tsx AdminView component)  
  
### 5.1 Dashboard Tabs  
Anfragen (Requests): Pending/confirmed appointments, confirm/reject/propose, internal notes, resend confirmation  
Kalender (Calendar): Date navigation, stylist filter, slot blocking/unblocking, walk-in modal  
Leistungen (Services): List, add (with DeepL translate), delete  
Produkte (Products): List, add (with DeepL translate), delete, stock management  
Kunden (Clients): Search by name/phone, stylist notes editing  
Warteliste (Waitlist): List, notify (SMS+email), remove  
Team: Stylist management (name + services array)  
Einstellungen (Settings): Holidays, walk-in wait time, hero/about images, about text (DE/EN), gallery images  
Galerie: Gallery image upload/replace/remove via Cloudinary  
  
### 5.2 Calendar Features  
- Date picker with prev/next navigation  
- Stylist filter dropdown (All + dynamic stylists from stylistsDB)  
- Visual slot grid (free/booked/blocked)  
- Block/unblock individual slots  
- Walk-in modal: name, service, duration, time - confirmed appointment  
  
### 5.3 Client Management  
- Search across all users (name/phone)  
- Edit stylist notes per client (hair color formulas, allergies, preferences)  
- Notes persisted to users/{uid}.stylistNotes  
  
### 5.4 Translation Integration  
- Service/Product name/description translation via DeepL button in admin forms  
- Uses /api/translate with x-internal-secret header  
  
### 5.5 Image Management (Cloudinary)  
- Hero image upload, About/profile image upload  
- Gallery: multi-image upload, replace individual, remove  
- All via uploadSiteAsset() - unsigned upload preset 
  
---  
## 6. GDPR Features  
  
### 6.1 Data Export (Art. 20) - Fully Implemented  
Components: src/components/DataExport.tsx (Button + Modal), API: /api/gdpr/export (GET)  
Exported Data: User profile (minus passwordHash), All appointments, All alerts, All waitlist entries, Metadata  
Client-side: JSON download, Server-side: Same data via authenticated API  
  
### 6.2 Account Deletion (Art. 17) - Fully Implemented  
Components: src/components/AccountDeletion.tsx (Modal + Button), API: /api/gdpr/delete (DELETE)  
Deletion Wizard Steps:  
1. Confirmation: Type exact phrase MEIN KONTO ENDGUELTIG LOESCHEN  
2. Re-authentication: Current password (via EmailAuthProvider.credential)  
3. Firestore Deletion: Batch delete appointments, alerts, user profile  
4. Auth Deletion: deleteUser(auth.currentUser)  
5. Complete: Logout + notification  
  
### 6.3 Rectification (Art. 16) - Implemented  
Profile settings: Edit name, email (with verification), phone  
Email change triggers verifyBeforeUpdateEmail  
  
### 6.4 Consent Management (TTDSG 25) - Excellent  
Component: src/components/CookieConsent.tsx  
Categories: Necessary (always on), Analytics (opt-in): Firebase Analytics  
Features: Granular toggles, Versioned consent, Optional server-side logging, resetConsent() for withdrawal, useAnalyticsConsent() hook  
Gap: Missing Cookie-Einstellungen link in footer/navbar  
  
### 6.5 Data Minimization  
EXIF stripping on image upload (src/lib/storage.ts:31-71, src/lib/exif.ts)  
Canvas-based client-side processing removes metadata  
Phone numbers stored in E.164 format only 
  
---  
## 7. Translation Features  
  
### 7.1 UI Translation (User-Facing)  
Component: src/components/LanguageSelector.tsx + AppContext.changeLanguage()  
Supported Languages: 12 (de, en, es, fr, it, nl, tr, pl, ru, ar, zh, ja)  
Flow: 1. User selects language, 2. If de or cached - switch, 3. Else POST /api/translate-ui with sourceDict, 4. DeepL translates, 5. Cached in Firestore, 6. UI updates  
Technical: flatten() / unflatten() for nested object translation preserving structure  
  
### 7.2 Admin Content Translation  
Location: Admin dashboard (Services, Products, Settings tabs)  
Features: Translate button next to DE fields, Calls /api/translate (requires x-internal-secret), Auto-fills EN fields, Service names stored as DE Name / EN Name  
  
### 7.3 Fallback Translations  
Location: AppContext.tsx:86-165 (fallbackTranslations)  
Complete DE/EN dictionaries covering: common, nav, hero, walkinBlock, reviews, about, services, gallery, products, contact, auth, booking, profile, notifications, security, admin (all tabs), alertsMsg 
  
---  
## 8. Security Features  
  
### 8.1 Rate Limiting  
File: src/middleware.ts  
In-memory store (Map) with cleanup interval (5 min)  
Endpoints: /api/sms (60s, 5), /api/email (60s, 10), /api/translate (60s, 30), /api/translate-ui (60s, 5), Default (60s, 60)  
Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After (on 429)  
Client identification: IP (x-forwarded-for / x-real-ip) + User-Agent prefix  
  
### 8.2 Security Headers  
File: next.config.js:4-101  
CSP, HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy, Permissions-Policy, COOP, CORP, Expect-CT  
  
### 8.3 Input Validation  
File: src/lib/validation.ts  
Zod Schemas: smsRequestSchema, emailRequestSchema, translateRequestSchema, translateUiRequestSchema  
Sanitization: Header injection prevention, Phone normalization, Email masking in audit logs  
  
### 8.4 Audit Logging  
File: src/lib/validation.ts:124-174  
AuditLogEntry: timestamp, endpoint, userId?, userRole?, action, resourceId?, resourceType?, success, error?, ip, userAgent, metadata?  
Logged: Auth events, Appointment CRUD, Email/SMS sends, Translation requests, GDPR export/delete, Service/Product create  
Current: Console logging only, Production need: Cloud Logging / Datadog / Loki 
  
### 8.5 Password Security  
Firebase Auth handles hashing (scrypt), Client-side strength meter (5 criteria)  
HIBP Breach Check (src/lib/password-breach.ts): k-anonymity model (SHA-1 prefix 5 chars), Add-Padding: true header, Fail-open, Penalizes breached passwords (-2 strength)  
  
### 8.6 Authorization  
All API routes: Verify Firebase ID token via Admin SDK  
Role checks: Server-side Firestore lookup (users/{uid}.role === admin)  
Ownership checks: SMS/Email routes verify resource ownership for non-admins  
Custom Claims Support: firebaseAdmin.ts:79-90 (setAdminClaim, hasAdminClaim)  
  
### 8.7 Firebase Security  
Project region: europe-west1 (GDPR), auth.languageCode = de for German auth emails, Firestore rules enforce role/ownership at database level 
  
---  
## 9. Environment Variables  
  
### 9.1 Required (from .env.local.template)  
NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, NEXT_PUBLIC_FIREBASE_APP_ID, NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, FIREBASE_SERVICE_ACCOUNT_BASE64, NEXT_PUBLIC_ADMIN_EMAIL, EMAIL_USER, EMAIL_PASS, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, DEEPL_API_KEY, INTERNAL_API_SECRET, FIREBASE_REGION  
  
### 9.2 Cloudinary (referenced in storage.ts)  
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET  
  
### 9.3 Recommended Additional (from GDPR report)  
CRON_SECRET, UNVERIFIED_ACCOUNT_RETENTION_DAYS (30), APPOINTMENT_RETENTION_MONTHS (36), ALERT_RETENTION_MONTHS (12), WAITLIST_RETENTION_MONTHS (6) 
  
---  
## 10. Third-Party Integrations  
  
Firebase Auth: Client + Admin SDK, Email/name/UID/OAuth tokens, EU (europe-west1)  
Firestore: Client + Admin SDK, All user/appointment data, EU (europe-west1)  
Firebase Analytics: Client SDK + getAnalyticsInstance(), Pseudonymized events, EU/US  
Cloudinary: Unsigned REST API upload, Images (may contain PII), US/Global  
Twilio: Node SDK (twilio), Phone/message content, US  
Gmail (Nodemailer): SMTP via nodemailer, Email content/recipients, US  
DeepL: REST API (/api/translate*), Text content, DE (Pro) / US (Free)  
HIBP: REST API (api.pwnedpasswords.com), SHA-1 prefix (5 chars), US (k-anonymity)  
Google Fonts: Preconnect + font loading, IP/request headers, US/Global  
Unsplash: Direct image URLs, Referrer/IP, US (no PII)  
libphonenumber-js: Local library, None (client-side), N/A  
exifr: Local library, None (client-side), N/A  
  
Critical Compliance Notes (from GDPR report):  
1. AVVs needed for: Firebase, Cloudinary, Twilio, Gmail, DeepL  
2. International Transfers: Verify DPF/SCCs for US providers (Cloudinary, Twilio, Gmail)  
3. DeepL: Use Pro plan for EU hosting; Free tier uses US  
4. Google Fonts: Self-host to eliminate transfer  
5. Firebase Region: Confirm europe-west1 in Firebase Console 
  
---  
## Summary: Test Suite Coverage Areas  
  
Unit Tests: Validation schemas, Phone formatting/validation, Password breach check, EXIF stripping, Image processing, Translation flatten/unflatten, Time slot availability logic  
  
Integration Tests (API Routes): All 10 API routes, Auth flows, Appointment CRUD + status transitions, Waitlist join/notify, Service/Product CRUD, Email/SMS sending, Translation, GDPR export/delete  
  
E2E Tests (Playwright): Complete booking flow, Waitlist flow, Admin dashboard all tabs, Language switching, GDPR export/deletion, Cookie consent + analytics gating, Rate limiting, Security headers verification  
  
Security Tests: CSP header validation, Rate limit enforcement, Auth token verification, Ownership checks, Input sanitization, Firestore rules simulation 
  
---  
## Files Reference Map  
  
Core State: src/context/AppContext.tsx (707 lines)  
API Routes: src/app/api/**/*.ts (10 routes)  
Auth: src/lib/firebase.ts, src/lib/firebaseAdmin.ts  
Validation: src/lib/validation.ts  
Security: src/middleware.ts, next.config.js  
GDPR: src/components/AccountDeletion.tsx, DataExport.tsx, CookieConsent.tsx  
Translation: src/components/LanguageSelector.tsx, src/app/api/translate*.ts  
Admin UI: src/app/page.tsx (AdminView), src/app/admin/test-dashboard/page.tsx  
Profile: src/components/ProfileView.tsx, ProfileViewLocal.tsx  
Storage: src/lib/storage.ts, src/lib/exif.ts  
Phone: src/lib/phone.ts  
Password: src/lib/password-breach.ts  
Env: .env.example, .env.local.template  
Rules: firestore.rules  
Compliance: GDPR_COMPLIANCE_REPORT.md  
  
---  
This audit covers the complete production codebase as of 2026-09-09. Use this document as the authoritative reference for building comprehensive test suites. 
