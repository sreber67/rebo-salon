import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { createAuditLog, logAudit } from '@/lib/validation';

const waitlistSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone format (E.164)'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  stylist: z.string().min(1),
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

    let query = adminDb.collection('waitlist');
    
    if (!isCallerAdmin) {
      query = query.where('userId', '==', userId) as any;
    }

    const snap = await query.orderBy('createdAt', 'asc').get();
    const waitlist = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({ waitlist });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch waitlist' }, { status: 500 });
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
    const validation = waitlistSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const waitlistData = {
      ...validation.data,
      userId,
      createdAt: Date.now(),
    };

    const docRef = await adminDb.collection('waitlist').add(waitlistData);

    const auditLog = createAuditLog(req, userId, userRole, 'waitlist_join', docRef.id, 'waitlist', true, undefined, {
      durationMs: Date.now() - startTime,
    });
    logAudit(auditLog);

    return NextResponse.json({ success: true, id: docRef.id }, { status: 201 });
  } catch (error: any) {
    const auditLog = createAuditLog(req, userId, userRole, 'waitlist_join', undefined, 'waitlist', false, error.message || 'Failed to join waitlist', {
      durationMs: Date.now() - startTime,
    });
    logAudit(auditLog);

    return NextResponse.json(
      { error: 'Failed to join waitlist' },
      { status: 500 }
    );
  }
}