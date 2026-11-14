import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-[#c5a059] text-sm uppercase tracking-[0.3em]">404</p>
      <h1 className="text-3xl md:text-5xl font-bold uppercase tracking-tight">Seite nicht gefunden</h1>
      <p className="text-gray-400 max-w-md">Diese Seite gibt es leider nicht (mehr).</p>
      <Link href="/" className="px-8 py-3 bg-[#d4af37] text-black font-bold uppercase text-xs tracking-widest rounded-sm hover:bg-white transition-colors">
        Zur Startseite
      </Link>
    </main>
  );
}
