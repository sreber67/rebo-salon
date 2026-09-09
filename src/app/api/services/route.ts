import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { createAuditLog, logAudit } from '@/lib/validation';

const serviceSchema = z.object({
  name: z.string().min(1).max(100),
  price: z.string().min(1).max(20),
  durationMins: z.number().int().min(5).max(480),
  oldPrice: z.string().optional(),
});

import { z } from 'zod';

export async function GET() {
  try {
    const snap = await adminDb.collection('services').orderBy('name').get();
    const services = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ services });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let userId: string | undefined;
  let userRole: string | undefined;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    userId = decodedToken.uid;

    const callerSnap = await adminDb.doc(`users/${userId}`).get();
    const callerData = callerSnap.exists ? callerSnap.data() : undefined;
    const isCallerAdmin = callerData?.role === 'admin';
    userRole = isCallerAdmin ? 'admin' : 'user';

    if (!isCallerAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    const body = await req.json();
    const validation = serviceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const docRef = await adminDb.collection('services').add({
      ...validation.data,
      createdAt: new Date().toISOString(),
    });

    const auditLog = createAuditLog(req, userId, userRole, 'service_create', docRef.id, 'service', true, undefined, {
      durationMs: Date.now() - startTime,
    });
    logAudit(auditLog);

    return NextResponse.json({ success: true, id: docRef.id }, { status: 201 });
  } catch (error: any) {
    const auditLog = createAuditLog(req, userId, userRole, 'service_create', undefined, 'service', false, error.message || 'Failed to create service', {
      durationMs: Date.now() - startTime,
    });
    logAudit(auditLog);

    return NextResponse.json(
      { error: 'Failed to create service' },
      { status: 500 }
    );
  }
}