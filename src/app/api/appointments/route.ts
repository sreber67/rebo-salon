import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { createAuditLog, logAudit } from '@/lib/validation';

const appointmentSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone format (E.164)'),
  services: z.array(z.string()).min(1),
  totalDurationMins: z.number().int().min(15).max(480),
  stylist: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  sendsms: z.boolean(),
  usedReward: z.boolean(),
  notes: z.string().max(1000).optional(),
  specialRequests: z.string().max(1000).optional(),
  isGroup: z.boolean().optional(),
  guests: z.array(z.object({
    name: z.string(),
    age: z.string(),
    phone: z.string().optional(),
    service: z.string(),
    stylist: z.string(),
  })).optional(),
});

import { z } from 'zod';

export async function GET(req: NextRequest) {
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

    let appointmentsQuery = adminDb.collection('appointments');
    
    if (!isCallerAdmin) {
      appointmentsQuery = appointmentsQuery.where('userId', '==', userId) as any;
    }

    const snap = await appointmentsQuery.orderBy('date', 'asc').get();
    const appointments = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({ appointments });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
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

    const body = await req.json();
    const validation = appointmentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const appointmentData = {
      ...validation.data,
      userId,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const docRef = await adminDb.collection('appointments').add(appointmentData);

    const auditLog = createAuditLog(req, userId, userRole, 'appointment_create', docRef.id, 'appointment', true, undefined, {
      durationMs: Date.now() - startTime,
    });
    logAudit(auditLog);

    return NextResponse.json({ success: true, id: docRef.id }, { status: 201 });
  } catch (error: any) {
    const auditLog = createAuditLog(req, userId, userRole, 'appointment_create', undefined, 'appointment', false, error.message || 'Failed to create appointment', {
      durationMs: Date.now() - startTime,
    });
    logAudit(auditLog);

    return NextResponse.json(
      { error: 'Failed to create appointment' },
      { status: 500 }
    );
  }
}