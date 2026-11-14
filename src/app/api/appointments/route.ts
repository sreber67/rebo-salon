import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebaseAdmin';
import { createAuditLog, logAudit } from '@/lib/validation';
import { getCaller, readJson, errorResponse, errorMessage, HttpError } from '@/lib/apiAuth';
import { isSlotOpen, timeToMins, isRealDate, isRealTime, REWARD_POINTS, BookedAppointment, ScheduledStylist } from '@/lib/schedule';

const shortText = (max: number) => z.string().trim().max(max);

const appointmentSchema = z.object({
  name: shortText(100).min(2),
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone format (E.164)'),
  services: z.array(shortText(100).min(1)).min(1).max(20),
  totalDurationMins: z.number().int().min(15).max(480),
  stylist: shortText(100).min(1),
  date: z.string().refine(isRealDate, 'Invalid date'),
  time: z.string().refine(isRealTime, 'Invalid time'),
  sendsms: z.boolean(),
  usedReward: z.boolean(),
  notes: shortText(1000).optional(),
  specialRequests: shortText(1000).optional(),
  isGroup: z.boolean().optional(),
  guests: z.array(z.object({
    name: shortText(100),
    age: shortText(10),
    phone: shortText(20).optional(),
    service: shortText(100),
    stylist: shortText(100),
  })).max(10).optional(),
});

// Today's date and the current time in the salon's time zone
function berlinNow(): { today: string; time: string } {
  const [today, time] = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date()).split(' ');
  return { today, time };
}

export async function GET(req: NextRequest) {
  try {
    const caller = await getCaller(req);
    const base = adminDb.collection('appointments');
    const scoped = caller.isAdmin ? base : base.where('userId', '==', caller.uid);
    const snap = await scoped.orderBy('date', 'asc').get();
    return NextResponse.json({ appointments: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch appointments');
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let userId: string | undefined;
  let userRole: string | undefined;

  try {
    const caller = await getCaller(req);
    userId = caller.uid;
    userRole = caller.isAdmin ? 'admin' : 'user';

    const validation = appointmentSchema.safeParse(await readJson(req));
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error.flatten() }, { status: 400 });
    }
    const data = validation.data;

    // No back-dated bookings (salon runs on German time)
    const now = berlinNow();
    if (!caller.isAdmin && (data.date < now.today || (data.date === now.today && data.time <= now.time))) {
      return NextResponse.json({ error: 'Appointments in the past cannot be booked' }, { status: 400 });
    }

    const appointmentData = {
      ...data,
      userId: caller.uid,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    const docRef = adminDb.collection('appointments').doc();

    if (caller.isAdmin) {
      await docRef.set(appointmentData);
    } else {
      const [stylistsSnap, settingsSnap] = await Promise.all([
        adminDb.collection('stylists').get(),
        adminDb.doc('settings/general').get(),
      ]);
      const stylists = stylistsSnap.docs.map(d => d.data() as ScheduledStylist);
      const holidays: string[] = settingsSnap.data()?.holidays || [];
      const userRef = adminDb.doc(`users/${caller.uid}`);

      // Slot check, booking and loyalty points happen in one transaction, so two customers
      // can't grab the same slot at once and points can't be spent twice
      const result = await adminDb.runTransaction(async tx => {
        const [sameDay, userSnap] = await Promise.all([
          tx.get(adminDb.collection('appointments').where('date', '==', data.date)),
          tx.get(userRef),
        ]);

        // Group bookings carry only a preferred time and are arranged by the salon by hand
        if (!data.isGroup) {
          const open = isSlotOpen({
            date: data.date,
            startMins: timeToMins(data.time),
            duration: data.totalDurationMins,
            stylist: data.stylist,
            stylists,
            appointments: sameDay.docs.map(d => d.data() as BookedAppointment),
            holidays,
          });
          if (!open) return 'slot-taken' as const;
        }

        const points = Number(userSnap.data()?.haircutCount) || 0;
        if (data.usedReward && points < REWARD_POINTS) return 'no-reward' as const;

        tx.create(docRef, appointmentData);
        if (userSnap.exists) {
          tx.update(userRef, { haircutCount: data.usedReward ? points - REWARD_POINTS : FieldValue.increment(1) });
        }
        return 'ok' as const;
      });

      if (result === 'slot-taken') {
        return NextResponse.json({ error: 'This time is not available for the chosen stylist' }, { status: 409 });
      }
      if (result === 'no-reward') {
        throw new HttpError(400, 'Not enough loyalty points for a reward');
      }
    }

    logAudit(createAuditLog(req, userId, userRole, 'appointment_create', docRef.id, 'appointment', true, undefined, {
      durationMs: Date.now() - startTime,
    }));
    return NextResponse.json({ success: true, id: docRef.id }, { status: 201 });
  } catch (error) {
    logAudit(createAuditLog(req, userId, userRole, 'appointment_create', undefined, 'appointment', false, errorMessage(error), {
      durationMs: Date.now() - startTime,
    }));
    return errorResponse(error, 'Failed to create appointment');
  }
}
