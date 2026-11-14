import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/firebaseAdmin';
import { createAuditLog, logAudit } from '@/lib/validation';
import { getCaller, readJson, errorResponse, errorMessage, HttpError } from '@/lib/apiAuth';
import { isRealDate, isRealTime, REWARD_POINTS } from '@/lib/schedule';

const STATUSES = ['pending', 'confirmed', 'cancelled', 'proposed', 'blocked'] as const;

// What the salon may change on any appointment
const adminUpdateSchema = z.object({
  status: z.enum(STATUSES).optional(),
  sendsms: z.boolean().optional(),
  notes: z.string().trim().max(1000).optional(),
  proposedDate: z.string().refine(isRealDate, 'Invalid date').optional(),
  proposedTime: z.string().refine(isRealTime, 'Invalid time').optional(),
  specialRequests: z.string().trim().max(1000).optional(),
});

// Customers may only answer a time the salon proposed: accept it or turn it down
const customerUpdateSchema = z.object({
  status: z.enum(['confirmed', 'cancelled']),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const startTime = Date.now();
  let userId: string | undefined;
  let userRole: string | undefined;

  try {
    const { id } = await params;
    const caller = await getCaller(req);
    userId = caller.uid;
    userRole = caller.isAdmin ? 'admin' : 'user';
    const body = await readJson(req);
    const apptRef = adminDb.doc(`appointments/${id}`);

    const updates = await adminDb.runTransaction(async tx => {
      const apptSnap = await tx.get(apptRef);
      if (!apptSnap.exists) throw new HttpError(404, 'Appointment not found');
      const appt = apptSnap.data()!;
      if (!caller.isAdmin && appt.userId !== caller.uid) throw new HttpError(403, 'Forbidden');

      let changes: Record<string, unknown>;
      if (caller.isAdmin) {
        const parsed = adminUpdateSchema.safeParse(body);
        if (!parsed.success) throw new HttpError(400, 'Validation failed');
        changes = { ...parsed.data };
      } else {
        const parsed = customerUpdateSchema.safeParse(body);
        if (!parsed.success) throw new HttpError(400, 'Validation failed');
        if (appt.status !== 'proposed') throw new HttpError(409, 'Only a proposed time can be accepted or declined');
        changes = parsed.data.status === 'confirmed'
          ? { status: 'confirmed', date: appt.proposedDate || appt.date, time: appt.proposedTime || appt.time, proposedDate: null, proposedTime: null }
          : { status: 'cancelled' };
      }

      // Cancelling gives back the points this booking earned or spent
      const userRef = adminDb.doc(`users/${appt.userId}`);
      const userSnap = changes.status === 'cancelled' && appt.status !== 'cancelled' ? await tx.get(userRef) : null;
      if (userSnap?.exists) {
        const points = Number(userSnap.data()?.haircutCount) || 0;
        tx.update(userRef, { haircutCount: appt.usedReward ? points + REWARD_POINTS : Math.max(0, points - 1) });
      }

      const finalChanges = { ...changes, updatedAt: new Date().toISOString() };
      tx.update(apptRef, finalChanges);
      return finalChanges;
    });

    logAudit(createAuditLog(req, userId, userRole, 'appointment_update', id, 'appointment', true, undefined, {
      updates: Object.keys(updates),
      durationMs: Date.now() - startTime,
    }));
    return NextResponse.json({ success: true });
  } catch (error) {
    logAudit(createAuditLog(req, userId, userRole, 'appointment_update', undefined, 'appointment', false, errorMessage(error), {
      durationMs: Date.now() - startTime,
    }));
    return errorResponse(error, 'Failed to update appointment');
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const startTime = Date.now();
  let userId: string | undefined;
  let userRole: string | undefined;

  try {
    const { id } = await params;
    const caller = await getCaller(req);
    userId = caller.uid;
    userRole = caller.isAdmin ? 'admin' : 'user';

    const apptRef = adminDb.doc(`appointments/${id}`);
    const apptSnap = await apptRef.get();
    if (!apptSnap.exists) throw new HttpError(404, 'Appointment not found');
    if (!caller.isAdmin && apptSnap.data()!.userId !== caller.uid) throw new HttpError(403, 'Forbidden');

    await apptRef.delete();

    logAudit(createAuditLog(req, userId, userRole, 'appointment_delete', id, 'appointment', true, undefined, {
      durationMs: Date.now() - startTime,
    }));
    return NextResponse.json({ success: true });
  } catch (error) {
    logAudit(createAuditLog(req, userId, userRole, 'appointment_delete', undefined, 'appointment', false, errorMessage(error), {
      durationMs: Date.now() - startTime,
    }));
    return errorResponse(error, 'Failed to delete appointment');
  }
}
