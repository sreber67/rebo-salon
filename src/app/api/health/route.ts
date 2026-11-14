import { NextResponse } from 'next/server';

// Liveness check for uptime monitors. Deliberately touches no database or secret.
export function GET() {
  return NextResponse.json(
    { ok: true, time: new Date().toISOString() },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
