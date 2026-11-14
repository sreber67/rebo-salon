# REBO SALON – Security, Quality & Performance Audit

**Date:** 2026-11-14 · **Branch:** `audit/full-hardening` · **Stack:** Next.js 16.4.6, React 19, Firebase (Firestore + Auth), Vercel

This replaces the earlier report (2026-09-09), which described API routes that have since been removed.

## Summary

| Area | Before | After |
|---|---|---|
| Production dependency vulnerabilities | 27 (1 critical, 14 high) | **0** |
| Account takeover / privilege bugs | 4 critical | **0** (all fixed and covered by tests) |
| Automated tests | 3 Playwright specs | **+67 tests**: 23 unit, 16 Firestore-rules, 20 API, 8 headers/SEO |
| ESLint errors | 22 | **0** |
| TypeScript errors | 0 | 0 |
| Lighthouse (mobile) | – | SEO 100 · Best Practices 96 · Accessibility 88 (icon buttons fixed after the run) |

## Critical / high findings (all fixed)

1. **Account takeover via `/api/auth/login`.** The endpoint returned a valid sign-in token for *any* email address without checking a password, so anyone could log in as the salon admin. The site never used it. **Removed**, together with the unused `register`, `reset-password`, `products`, `services` and `waitlist` routes.
2. **Next.js remote code execution (critical CVE, < 16.3.3).** Upgraded to 16.4.6. Also upgraded firebase, firebase-admin, nodemailer (header/IDN issues), zod (memory DoS) and twilio, and pinned the patched `@grpc/grpc-js`.
3. **Free rewards.** Loyalty points (`haircutCount`) were written by the browser, and the rules let customers edit their own profile, so anyone could set themselves to 999 points. Points are now added or spent on the server inside the booking transaction, and the rules block customers from changing points or stylist notes.
4. **Self-confirming bookings.** `PATCH /api/appointments/[id]` let customers set any status (e.g. `confirmed`, `blocked`) on their own booking. Customers can now only accept or decline a time the salon proposed, and the accepted time comes from the salon's proposal, not from the request.
5. **Site defacement via `/api/translate-ui`.** The public endpoint translated and *saved for every visitor* whatever text the caller sent, and each call burned DeepL quota. The server now builds the texts itself, ignores the request body, and serves a cached copy until the site's content changes.
6. **Open DeepL proxy / broken admin translate.** `/api/translate` was guarded by a secret the browser can never have, so it was either open to everyone or broken for the admin. It now requires an admin login.
7. **HTML injection in emails.** Customer-provided text went into the HTML part of emails sent to the salon. It's now escaped, and only admins may choose the sender name/address.

## Medium findings (fixed)

- Bad or expired tokens returned **500** instead of **401** on every route → shared `src/lib/apiAuth.ts` helper; malformed JSON now returns 400.
- Impossible dates (`2026-02-30`, `2026-13-01`, `25:00`) passed validation and could be booked → real date/time checks; list/field size limits added.
- The rate limiter keyed on IP + User-Agent, so rotating the UA reset the limit → IP-only, a shared bucket for `/api/appointments/:id`, a memory cap, stricter limits for SMS, email, GDPR and translation.
- **GDPR:** the privacy policy promised "Profil → Daten exportieren / Konto löschen", but those buttons were never rendered. They're now in Profile → Settings. Export and deletion go through the server, so they also cover waitlist entries (which the browser can't read), and Google/Facebook users can now delete their account.
- **GDPR:** Google Fonts were loaded from Google's servers (visitor IP sent to Google, a common cause of German warning letters) yet never applied anywhere → removed.
- Cron cleanup crashed above 500 documents, never purged `pending`/`proposed` bookings, and targeted a non-existent `clientNotes` collection → batched deletes, all statuses, stylist notes cleared via a new `stylistNotesUpdatedAt`, constant-time secret check.
- GDPR delete/export now refuse revoked sessions.
- Firestore rules: reference images must be Cloudinary URLs; waitlist entries are shape- and size-checked; customers may only mark their alerts read.
- Admin translate buttons swallowed errors silently → they now show a message.

## Architecture & dead code

- `page.tsx` contained copies of `LanguageSelector`, `NotificationBell` and `ProfileView` that duplicated `src/components/` → removed (page.tsx: 2,434 → ~2,000 lines).
- Deleted: 6 unused API routes, `phone.ts`, `exif.ts`, `password-breach.ts`, the unused `libphonenumber-js`/`exifr` packages, stray `fix-imports.js`/`fix-navbar.js`, a duplicate `next.config.js`, unused Firebase Analytics code and admin-SDK wrappers, the Playwright example spec, placeholder SVGs, and committed build output (`tsconfig.tsbuildinfo`, `playwright-report/`, `audit-report/`, `LINT_ERRORS.md`).
- `middleware.ts` → `proxy.ts` (Next 16 convention).
- Built-in texts moved to `src/lib/translations.ts` so the server and browser share them.
- All `set-state-in-effect` errors fixed (form syncing now happens during render; admin-data reset moved into effect cleanup).

## Performance, caching & SEO

- CSP: `'unsafe-eval'` is now dev-only; unused origins removed; deprecated `Expect-CT` header removed.
- Images: lazy-loading and async decoding below the fold; `fetchPriority="high"` on the hero image; fixed a fallback image that 404'd on every page load.
- Translations are served from the Firestore cache instead of calling DeepL again while content is unchanged.
- Added `robots.txt`, `sitemap.xml`, a branded 404 page, an error boundary, and `/api/health` for uptime monitoring.
- API responses remain `no-store`; static assets use Next's immutable caching.

## Tests & CI

- `npm run test:unit` – booking rules, rate limiting, translation source (no services needed).
- `npm run test:emulator` – Firestore rules + every API route against the Firebase emulators (needs Java).
- `npm run test:e2e` – Playwright, including the new `tests/headers-and-seo.spec.ts`.
- CI: Node 22, a new "Unit, Firestore rules & API tests" job, the dependency audit now fails the build on high/critical advisories, and the build job waits for the tests.

## Deployment notes (action needed)

1. **Firestore rules are not live yet.** They must be deployed after this branch's frontend is live: `firebase deploy --only firestore:rules`. Deploying them earlier would break the old frontend's client-side point updates.
2. Remove the unused `INTERNAL_API_SECRET` from Vercel's environment variables.
3. In the Cloudinary dashboard, restrict the unsigned upload preset (allowed formats `jpg,png,webp,heic`, max size, the `rebo-salon/` folder), since anyone who sees the preset name can upload to it.

## Known remaining items (not fixed, by choice)

- Rate limiting is in-memory per server instance; use Upstash/Redis if abuse ever shows up across instances.
- The password-change "OTP" is generated and checked in the browser, so it adds no security (the real check is the current-password re-authentication). Replace it with Firebase's email action links or remove it.
- Lighthouse flagged low colour contrast on some grey text and a heading-order issue: design decisions left to the owner.
- One moderate advisory remains in a lint-tooling dependency (`minimatch` under typescript-eslint, dev-only, not shipped).
