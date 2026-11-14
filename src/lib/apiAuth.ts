import 'server-only';
import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from './firebaseAdmin';

// Shared request helpers for the API routes, so every route checks tokens,
// roles and bodies the same way and answers with the right status code.

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export type Caller = { uid: string; email?: string; isAdmin: boolean };

/**
 * Verifies the Firebase ID token in the Authorization header and looks up the
 * caller's role on their Firestore user doc (the role is never trusted from the client).
 * Throws HttpError(401) for a missing or invalid token.
 */
export async function getCaller(req: NextRequest, { checkRevoked = false } = {}): Promise<Caller> {
  const match = /^Bearer\s+(\S+)$/i.exec(req.headers.get('authorization') || '');
  if (!match) throw new HttpError(401, 'Unauthorized: Missing token');

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(match[1], checkRevoked);
  } catch {
    throw new HttpError(401, 'Unauthorized: Invalid token');
  }

  const snap = await adminDb.doc(`users/${decoded.uid}`).get();
  return {
    uid: decoded.uid,
    email: decoded.email?.toLowerCase(),
    isAdmin: snap.exists && snap.data()?.role === 'admin',
  };
}

export async function requireAdmin(req: NextRequest): Promise<Caller> {
  const caller = await getCaller(req);
  if (!caller.isAdmin) throw new HttpError(403, 'Forbidden: Admin only');
  return caller;
}

/** Parses a JSON body, answering 400 instead of crashing with a 500 on bad input. */
export async function readJson(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, 'Invalid JSON body');
  }
}

/** Turns a thrown error into a response without leaking internal details. */
export function errorResponse(error: unknown, fallbackMessage: string): NextResponse {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Constant-time string compare for shared secrets. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
