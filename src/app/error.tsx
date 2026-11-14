'use client';

import { useEffect } from 'react';

// Shown instead of a blank screen when something on a page crashes
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Page error:', error);
  }, [error]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-3xl md:text-5xl font-bold uppercase tracking-tight">Etwas ist schiefgelaufen</h1>
      <p className="text-gray-400 max-w-md">
        Bitte versuche es erneut. Wenn das Problem bleibt, ruf uns gerne an: 0176 42980985.
      </p>
      <button
        onClick={reset}
        className="px-8 py-3 bg-[#d4af37] text-black font-bold uppercase text-xs tracking-widest rounded-sm hover:bg-white transition-colors"
      >
        Erneut versuchen
      </button>
    </main>
  );
}
