import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, deleteRefs } from '@/lib/firebaseAdmin';
import { safeEqual } from '@/lib/apiAuth';

// GDPR storage-limitation cleanup (Art. 5(1)(e)): purges old appointments, waitlist
// entries and alerts, and clears stylist notes on client profiles past their retention window.
// Triggered by Vercel Cron (see vercel.json) or manually with the CRON_SECRET bearer token.
const months = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};
const APPOINTMENT_RETENTION_MONTHS = months(process.env.APPOINTMENT_RETENTION_MONTHS, 36);
const ALERT_RETENTION_MONTHS = months(process.env.ALERT_RETENTION_MONTHS, 12);
const WAITLIST_RETENTION_MONTHS = months(process.env.WAITLIST_RETENTION_MONTHS, 6);
const CLIENT_NOTES_RETENTION_MONTHS = months(process.env.CLIENT_NOTES_RETENTION_MONTHS, 36);

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return safeEqual(req.headers.get('authorization') || '', `Bearer ${secret}`);
}

const monthsAgo = (n: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
};

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const appointmentCutoff = monthsAgo(APPOINTMENT_RETENTION_MONTHS).toISOString().split('T')[0];

    const [appointmentsSnap, alertsSnap, waitlistSnap, notedClientsSnap] = await Promise.all([
      // Every appointment whose date is past the retention window, whatever its status
      adminDb.collection('appointments').where('date', '<', appointmentCutoff).get(),
      adminDb.collection('alerts').where('createdAt', '<', monthsAgo(ALERT_RETENTION_MONTHS).getTime()).get(),
      adminDb.collection('waitlist').where('createdAt', '<', monthsAgo(WAITLIST_RETENTION_MONTHS).getTime()).get(),
      // Stylist notes live on the client's user doc; clear notes not touched within the window
      adminDb.collection('users').where('stylistNotesUpdatedAt', '<', monthsAgo(CLIENT_NOTES_RETENTION_MONTHS).toISOString()).get(),
    ]);

    const deletedAppointments = await deleteRefs(appointmentsSnap.docs.map(d => d.ref));
    const deletedAlerts = await deleteRefs(alertsSnap.docs.map(d => d.ref));
    const deletedWaitlist = await deleteRefs(waitlistSnap.docs.map(d => d.ref));

    for (let i = 0; i < notedClientsSnap.docs.length; i += 400) {
      const batch = adminDb.batch();
      notedClientsSnap.docs.slice(i, i + 400).forEach(d =>
        batch.update(d.ref, { stylistNotes: FieldValue.delete(), stylistNotesUpdatedAt: FieldValue.delete() }),
      );
      await batch.commit();
    }

    return NextResponse.json({
      ok: true,
      deletedAppointments,
      deletedAlerts,
      deletedWaitlist,
      clearedClientNotes: notedClientsSnap.size,
    });
  } catch (error) {
    console.error('[cron/cleanup] failed:', error);
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
