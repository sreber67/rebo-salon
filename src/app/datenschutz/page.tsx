"use client";

import Link from "next/link";

export default function DatenschutzPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-6 py-24 md:py-32">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-yellow-500 text-xs uppercase tracking-widest block mb-6">
          ← Zurück
        </Link>
        <h1 className="text-3xl md:text-4xl mb-10">Datenschutzerklärung</h1>
        <p className="text-xs text-gray-500 mb-10">Stand: 09.09.2026</p>

        <Section title="1. Verantwortlicher">
          <p>REBO SALON</p>
          <p>Inh. Recep Bozkurt</p>
          <p>Manggasse 6, 97421 Schweinfurt</p>
          <p>Telefon: 0176 42980985</p>
          <p>E-Mail: datenschutz@rebosalon.de</p>
        </Section>

        <Section title="2. Verarbeitungsübersicht">
          <p>Wir verarbeiten personenbezogene Daten bei Website-Besuch, Online-Buchung, Kundenkonto, Kommunikation und Analyse.</p>
          <table className="w-full text-sm border-collapse mb-4">
            <thead>
              <tr className="border-b border-white/20">
                <th className="text-left p-2">Daten</th>
                <th className="text-left p-2">Zweck</th>
                <th className="text-left p-2">Rechtsgrundlage</th>
                <th className="text-left p-2">Speicherdauer</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/10">
                <td className="p-2">IP, Browser, Zeit, Seiten</td>
                <td className="p-2">Sicherheit, Fehleranalyse</td>
                <td className="p-2">Art. 6 Abs. 1 lit. f DSGVO</td>
                <td className="p-2">30 Tage / 1 Jahr</td>
              </tr>
              <tr className="border-b border-white/10">
                <td className="p-2">Name, E-Mail, Telefon, Services</td>
                <td className="p-2">Terminkoordination, Erinnerung</td>
                <td className="p-2">Art. 6 Abs. 1 lit. b DSGVO</td>
                <td className="p-2">3 Jahre nach Termin</td>
              </tr>
              <tr className="border-b border-white/10">
                <td className="p-2">Name, E-Mail, Passwort-Hash</td>
                <td className="p-2">Kontoverwaltung, Login, Historie</td>
                <td className="p-2">Art. 6 Abs. 1 lit. b DSGVO</td>
                <td className="p-2">Bis Konto-Löschung + 30 Tage</td>
              </tr>
              <tr className="border-b border-white/10">
                <td className="p-2">E-Mail, Telefon, Inhalt</td>
                <td className="p-2">Bestätigung, Erinnerung, Reset</td>
                <td className="p-2">Art. 6 Abs. 1 lit. b DSGVO</td>
                <td className="p-2">1 Jahr nach Versand</td>
              </tr>
              <tr className="border-b border-white/10">
                <td className="p-2">Pseudonyme Nutzer-ID, Events</td>
                <td className="p-2">Website-Optimierung (Einwilligung)</td>
                <td className="p-2">Art. 6 Abs. 1 lit. a DSGVO</td>
                <td className="p-2">14 Monate</td>
              </tr>
            </tbody>
          </table>
        </Section>

        <Section title="3. Hosting & Server-Logfiles">
          <p>Diese Website wird bei Vercel Inc. (USA) gehostet, mit Edge-Netzwerk in der EU. Bei jedem Aufruf erfasst der Hosting-Anbieter automatisch technische Zugriffsdaten (IP-Adresse, Datum/Uhrzeit, aufgerufene Seite, Referrer, Browsertyp) in Server-Logfiles. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an sicherem Betrieb). Logfiles werden nach 30 Tagen gelöscht. Ein Auftragsverarbeitungsvertrag (AVV) mit Vercel besteht. EU-Standardvertragsklauseln (SCC) für US-Übermittlung liegen vor.</p>
        </Section>

        <Section title="4. Online-Buchung & Kundenkonto">
          <p>Bei der Buchung verarbeiten wir Name, E-Mail, Telefon, gewünschte Services, Stylist-Präferenz, Terminwunsch, Notizen. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragsanbahnung). Daten werden 3 Jahre nach letztem Termin gespeichert (steuerrechtliche Aufbewahrung).</p>
          <p>Registrierung: Name, E-Mail, Telefon, Passwort-Hash. Verifizierung per E-Mail/SMS (Firebase). Passwort-Change mit OTP. Social Login via Google/Facebook möglich. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.</p>
        </Section>

        <Section title="5. Cookies & TTDSG §25">
          <p>Notwendige Cookies (Sitzung, Sicherheit, Sprache) – immer aktiv, keine Einwilligung nötig (§25 Abs. 2 Nr. 2 TTDSG). Analytics-Cookies (Firebase Analytics) – nur mit Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Speicherdauer Analytics: 14 Monate. Sie können Einwilligung jederzeit widerrufen über 'Cookie-Einstellungen' im Footer.</p>
        </Section>

        <Section title="6. Firebase / Google / DeepL">
          <p>Telefonverifizierung via Firebase Authentication (Google Ireland Ltd., EU). SMS-Versand, reCAPTCHA. Social Login via Google/Facebook (Meta Platforms Ireland Ltd., EU). UI-Übersetzung via DeepL SE (Deutschland, EU). Keine personenbezogenen Daten an DeepL.</p>
        </Section>

        <Section title="7. Google Maps">
          <p>Nach Einwilligung wird Google Maps eingebunden (IP an Google). Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung). Widerruf jederzeit möglich. Anbieter: Google Ireland Ltd., EU.</p>
        </Section>

        <Section title="8. Auftragsverarbeiter">
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Google Cloud / Firebase</strong> (Auth, Firestore, Hosting, Analytics) — EU (europe-west1), AVV ✅, SCC ✅</li>
            <li><strong>Twilio</strong> (SMS) — USA, AVV ✅, SCC ✅</li>
            <li><strong>Google (Gmail)</strong> (Transaktions-E-Mails) — EU/USA, AVV ✅, SCC ✅</li>
            <li><strong>DeepL SE</strong> (Übersetzung) — Deutschland, EU, AVV ✅, DSGVO direkt</li>
            <li><strong>Unsplash</strong> (Stock-Fotos, keine personenbezogenen Daten) — USA, N/A</li>
          </ul>
          <p className="mt-2 text-sm">Für USA-Übermittlungen: EU-Standardvertragsklauseln (SCC 2021/914) + ergänzende Maßnahmen. DPF-Zertifizierung geprüft.</p>
        </Section>

        <Section title="9. Ihre Rechte (Art. 15–22 DSGVO)">
          <table className="w-full text-sm border-collapse mb-4">
            <thead>
              <tr className="border-b border-white/20">
                <th className="text-left p-2">Recht</th>
                <th className="text-left p-2">Beschreibung</th>
                <th className="text-left p-2">Ausübung</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/10"><td className="p-2">Art. 15 – Auskunft</td><td className="p-2">Bestätigung & Kopie der Daten</td><td className="p-2">Profil → 'Daten exportieren' oder E-Mail</td></tr>
              <tr className="border-b border-white/10"><td className="p-2">Art. 16 – Berichtigung</td><td className="p-2">Korrektur unrichtiger Daten</td><td className="p-2">Profil → Einstellungen bearbeiten</td></tr>
              <tr className="border-b border-white/10"><td className="p-2">Art. 17 – Löschung</td><td className="p-2">'Recht auf Vergessenwerden' (vorbehaltlich Aufbewahrungspflichten)</td><td className="p-2">Profil → 'Konto löschen' oder E-Mail</td></tr>
              <tr className="border-b border-white/10"><td className="p-2">Art. 18 – Einschränkung</td><td className="p-2">Verarbeitung beschränken</td><td className="p-2">E-Mail an datenschutz@rebosalon.de</td></tr>
              <tr className="border-b border-white/10"><td className="p-2">Art. 20 – Datenübertragbarkeit</td><td className="p-2">Strukturierter, maschinenlesbarer Export</td><td className="p-2">Profil → 'Daten exportieren' (JSON)</td></tr>
              <tr className="border-b border-white/10"><td className="p-2">Art. 21 – Widerspruch</td><td className="p-2">Gegen Verarbeitung aus berechtigtem Interesse</td><td className="p-2">E-Mail oder Cookie-Banner (Analytics)</td></tr>
              <tr className="border-b border-white/10"><td className="p-2">Art. 7 Abs. 3 – Widerruf</td><td className="p-2">Einwilligung jederzeit widerrufen</td><td className="p-2">Cookie-Banner oder E-Mail</td></tr>
            </tbody>
          </table>
          <p className="mt-2">Beschwerderecht: Bayerisches Landesamt für Datenschutzaufsicht (BayLDA), Promenade 18, 91522 Ansbach, https://www.lda.bayern.de</p>
        </Section>

        <Section title="10. Datensicherheit (Art. 32 DSGVO)">
          <ul className="list-disc list-inside space-y-1">
            <li>Transportverschlüsselung: TLS 1.2+ (HTTPS, HSTS)</li>
            <li>Speicherverschlüsselung: Firebase/Firestore AES-256 at rest</li>
            <li>Zugriffskontrolle: Rollenbasiert (User/Admin), Firebase Custom Claims, MFA für Admin</li>
            <li>Passwortsicherheit: bcrypt (Firebase), Breach-Check (HIBP), Mindestlänge 8</li>
            <li>Rate Limiting: 5 SMS/min, 10 E-Mails/min, 30 Übersetzungen/min</li>
            <li>Sicherheits-Headers: CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy</li>
            <li>Audit-Logging: Alle Admin-Aktionen & API-Zugriffe</li>
            <li>Notfallplan: Incident-Response-Prozess (72h-Meldepflicht Art. 33 DSGVO)</li>
          </ul>
        </Section>

        <Section title="11. Speicherdauer & Löschung">
          <table className="w-full text-sm border-collapse mb-4">
            <thead>
              <tr className="border-b border-white/20">
                <th className="text-left p-2">Datenkategorie</th>
                <th className="text-left p-2">Regelfrist</th>
                <th className="text-left p-2">Ausnahme</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/10"><td className="p-2">Buchungsdaten</td><td className="p-2">3 Jahre nach Terminende</td><td className="p-2">Steuerrechtliche Aufbewahrung (§ 147 AO)</td></tr>
              <tr className="border-b border-white/10"><td className="p-2">Kundenkonto</td><td className="p-2">Bis Widerruf + 30 Tage</td><td className="p-2">Rechtliche Verpflichtungen</td></tr>
              <tr className="border-b border-white/10"><td className="p-2">Kommunikationslogs</td><td className="p-2">1 Jahr</td><td className="p-2">Beweissicherung</td></tr>
              <tr className="border-b border-white/10"><td className="p-2">Analytics-Daten</td><td className="p-2">14 Monate</td><td className="p-2">GA4 Standard</td></tr>
              <tr className="border-b border-white/10"><td className="p-2">Sicherheitslogs</td><td className="p-2">1 Jahr</td><td className="p-2">Angriffserkennung</td></tr>
              <tr className="border-b border-white/10"><td className="p-2">Backups</td><td className="p-2">30 Tage (rolling)</td><td className="p-2">Disaster Recovery</td></tr>
            </tbody>
          </table>
          <p className="text-sm">Automatische Löschung via Firestore TTL-Indizes: alerts (30 Tage), appointments (3 Jahre), translations cache (90 Tage).</p>
        </Section>

        <Section title="12. Kontakt & Datenschutzbeauftragter">
          <p><strong>Verantwortlicher:</strong></p>
          <p>REBO SALON</p>
          <p>Inh. Recep Bozkurt</p>
          <p>Manggasse 6, 97421 Schweinfurt</p>
          <p>E-Mail: datenschutz@rebosalon.de</p>
          <p>Telefon: +49 176 42980985</p>
          <p className="mt-2"><strong>Datenschutzbeauftragter:</strong> Nicht verpflichtend bestellt (weniger als 20 Personen). Ansprechpartner: Inhaber.</p>
        </Section>

        <Section title="13. Änderungen">
          <p>Wir behalten uns vor, diese Erklärung anzupassen. Die aktuelle Version finden Sie auf dieser Seite. Bei wesentlichen Änderungen informieren wir per E-Mail oder Website-Hinweis.</p>
        </Section>

        <Section title="Salvatorische Klausel">
          <p>Sollten einzelne Bestimmungen unwirksam sein, bleibt die Wirksamkeit der übrigen unberührt.</p>
        </Section>

        <p className="text-xs text-gray-500 mt-10 text-center">*Diese Datenschutzerklärung wurde unter Berücksichtigung der DSGVO, BDSG, TTDSG und DSK-Orientierungshilfen erstellt. Sie ersetzt keine rechtliche Beratung.*</p>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-yellow-500 text-sm uppercase tracking-widest mb-2">{title}</h2>
      <div className="text-sm leading-relaxed space-y-1">{children}</div>
    </section>
  );
}