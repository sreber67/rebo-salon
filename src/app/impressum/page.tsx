"use client";

import Link from "next/link";

export default function ImpressumPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-6 py-24 md:py-32">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-yellow-500 text-xs uppercase tracking-widest block mb-6">
          ← Zurück
        </Link>
        <h1 className="text-3xl md:text-4xl mb-10">Impressum</h1>

        <Section title="Angaben gemäß § 5 DDG">
          <p>REBO SALON</p>
          <p>Inh. Recep Bozkurt</p>
          <p>Manggasse 6, 97421 Schweinfurt</p>
        </Section>

        <Section title="Kontakt">
          <p>Telefon: 0176 42980985</p>
          <p>E-Mail: sreber657@gmail.com</p>
        </Section>

        <Section title="Umsatzsteuer-ID">
          <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz:</p>
          <p>24927432834</p>
        </Section>

        <Section title="Berufsbezeichnung und berufsrechtliche Regelungen">
          <p>Berufsbezeichnung: Friseur</p>
          <p className="mt-2">Zuständige Kammer:</p>
          <p>Handwerkskammer für Unterfranken</p>
          <p>Rennweger Ring 3, 97070 Würzburg</p>
          <p className="mt-2">Verliehen in: Deutschland</p>
          <p className="mt-2">Es gelten folgende berufsrechtliche Regelungen:</p>
          <p>
            Handwerksordnung (HwO), Anlage A – Friseurhandwerk, einsehbar unter:{" "}
            <a
              href="https://www.gesetze-im-internet.de/hwo/anlage_a.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-yellow-500 underline"
            >
              https://www.gesetze-im-internet.de/hwo/anlage_a.html
            </a>
          </p>
        </Section>

        <Section title="Angaben zur Berufshaftpflichtversicherung">
          <p><strong>Name und Sitz des Versicherers:</strong></p>
          <p>HDI Versicherung AG, 30650 Hannover</p>
          <p>(vermittelt durch: asspario Versicherungsdienst GmbH, Riegelgrube 5a, 55435 Bad Kreuznach)</p>
          <p className="mt-2"><strong>Geltungsraum der Versicherung:</strong> Deutschland</p>
        </Section>

        <Section title="Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV">
          <p>Recep Bozkurt, Manggasse 6, 97421 Schweinfurt</p>
        </Section>

        <Section title="EU-Streitschlichtung">
          <p>
            Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
            <a
              href="https://ec.europa.eu/consumers/odr/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-yellow-500 underline"
            >
              https://ec.europa.eu/consumers/odr/
            </a>
            . Unsere E-Mail-Adresse finden Sie oben.
          </p>
        </Section>

        <Section title="Verbraucherstreitbeilegung / Universalschlichtungsstelle">
          <p>
            Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
            Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </Section>
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