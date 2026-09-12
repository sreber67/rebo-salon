import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: 'Barbershop & Herrenfriseur Schweinfurt | REBO SALON',
  description: 'REBO SALON in Schweinfurt – moderne Herrenhaarschnitte, Bartpflege und Kinderhaarschnitte. Mit & ohne Termin in der Manggasse 6.',
  metadataBase: new URL('https://rebosalon.de'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Barbershop & Herrenfriseur Schweinfurt | REBO SALON',
    description: 'REBO SALON in Schweinfurt – moderne Herrenhaarschnitte, Bartpflege und Kinderhaarschnitte. Mit & ohne Termin in der Manggasse 6.',
    url: 'https://rebosalon.de',
    siteName: 'REBO SALON',
    locale: 'de_DE',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

// Schema.org Local Business Data (Crucial for Local Google Maps SEO)
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "HairSalon",
  "name": "REBO SALON",
  "url": "https://rebosalon.de",
  "telephone": "017642980985",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Manggasse 6",
    "addressLocality": "Schweinfurt",
    "postalCode": "97421",
    "addressCountry": "DE"
  },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      "opens": "09:00",
      "closes": "19:00"
    }
  ],
  "priceRange": "€€"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="scroll-smooth">
      <head>
        {/* eRecht24 / CCM19 Cookie Banner Script */}
        <Script 
          src="https://cloud.ccm19.de/app.js?apiKey=ead3fb743d306c48b3a0b5ef3285c3c2a808b5b05adc30b5&domain=6aa5454588131b02930bca92" 
          strategy="beforeInteractive" 
          referrerPolicy="origin"
        />
        
        <Script
          id="schema-local-business"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Lato:wght@300;400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-[#1a1814] text-[#e8e6e3] font-sans-custom selection:bg-[#c5a059] selection:text-[#1a1814] antialiased">
        {children}
      </body>
    </html>
  );
}