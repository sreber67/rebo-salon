import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { validateRequest, createAuditLog, logAudit } from '@/lib/validation';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email().max(254).toLowerCase().transform(s => s.trim()),
  password: z.string().min(8).max(128),
  name: z.string().min(2).max(100).transform(s => s.trim()),
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone format (E.164)').optional(),
});

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let userId: string | undefined;

  try {
    const body = await req.json();
    const validation = validateRequest(registerSchema, body);

    if (!validation.success) {
      const auditLog = createAuditLog(req, undefined, undefined, 'register', undefined, 'user', false, 'Validation failed', { errors: validation.errors.flatten() });
      logAudit(auditLog);
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors.flatten() },
        { status: 400 }
      );
    }

    const { email, password, name, phone } = validation.data;

    // Check if user already exists
    try {
      await adminAuth.getUserByEmail(email);
      const auditLog = createAuditLog(req, undefined, undefined, 'register', undefined, 'user', false, 'Email already registered');
      logAudit(auditLog);
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    } catch (error: any) {
      if (error.code !== 'auth/user-not-found') throw error;
    }

    // Create user in Firebase Auth
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
      phoneNumber: phone,
    });

    userId = userRecord.uid;

    // Create user profile in Firestore
    await adminDb.doc(`users/${userId}`).set({
      id: userId,
      name,
      email,
      phone: phone || '',
      haircutCount: 0,
      role: 'user',
      createdAt: new Date().toISOString(),
    });

    const auditLog = createAuditLog(req, userId, 'user', 'register', userId, 'user', true, undefined, {
      durationMs: Date.now() - startTime,
    });
    logAudit(auditLog);

    return NextResponse.json({ success: true, uid: userId }, { status: 201 });
  } catch (error: any) {
    const auditLog = createAuditLog(req, userId, undefined, 'register', undefined, 'user', false, error.message || 'Registration failed', {
      durationMs: Date.now() - startTime,
    });
    logAudit(auditLog);

    if (error.code === 'auth/email-already-exists') {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }
    if (error.code === 'auth/invalid-phone-number') {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}