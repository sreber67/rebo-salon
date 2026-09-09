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
          <p>E-Mail: info@rebosalon.de</p>
        </Section>

        <Section title="Umsatzsteuer-ID">
          <p>Kleinunternehmer gemäß § 19 UStG — keine Umsatzsteuer-ID ausgewiesen</p>
        </Section>

        <Section title="Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV">
          <p>Recep Bozkurt, Manggasse 6, 97421 Schweinfurt</p>
        </Section>

        <Section title="EU-Streitschlichtung">
          <p>
            Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: 
            <a
              href="https://ec.europa.eu/consumers/odr/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-yellow-500 underline"
            >
              https://ec.europa.eu/consumers/odr/
            </a>
            . Unsere E-Mail-Adresse finden Sie oben. Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
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