import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { createAuditLog, logAudit } from '@/lib/validation';

const updateSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'proposed', 'blocked']).optional(),
  sendsms: z.boolean().optional(),
  notes: z.string().max(1000).optional(),
  proposedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  proposedTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  specialRequests: z.string().max(1000).optional(),
});

import { z } from 'zod';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  let userId: string | undefined;
  let userRole: string | undefined;

  try {
    const { id } = await params;
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

    const apptSnap = await adminDb.doc(`appointments/${id}`).get();
    if (!apptSnap.exists) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    const apptData = apptSnap.data()!;

    // Non-admins can only update their own appointments
    if (!isCallerAdmin && apptData.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const validation = updateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const updateData = { ...validation.data, updatedAt: new Date().toISOString() };
    await adminDb.doc(`appointments/${id}`).update(updateData);

    const auditLog = createAuditLog(req, userId, userRole, 'appointment_update', id, 'appointment', true, undefined, {
      updates: validation.data,
      durationMs: Date.now() - startTime,
    });
    logAudit(auditLog);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    const auditLog = createAuditLog(req, userId, userRole, 'appointment_update', undefined, 'appointment', false, error.message || 'Failed to update appointment', {
      durationMs: Date.now() - startTime,
    });
    logAudit(auditLog);

    return NextResponse.json(
      { error: 'Failed to update appointment' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  let userId: string | undefined;
  let userRole: string | undefined;

  try {
    const { id } = await params;
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

    const apptSnap = await adminDb.doc(`appointments/${id}`).get();
    if (!apptSnap.exists) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    const apptData = apptSnap.data()!;

    // Non-admins can only delete their own appointments
    if (!isCallerAdmin && apptData.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await adminDb.doc(`appointments/${id}`).delete();

    const auditLog = createAuditLog(req, userId, userRole, 'appointment_delete', id, 'appointment', true, undefined, {
      durationMs: Date.now() - startTime,
    });
    logAudit(auditLog);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    const auditLog = createAuditLog(req, userId, userRole, 'appointment_delete', undefined, 'appointment', false, error.message || 'Failed to delete appointment', {
      durationMs: Date.now() - startTime,
    });
    logAudit(auditLog);

    return NextResponse.json(
      { error: 'Failed to delete appointment' },
      { status: 500 }
    );
  }
}