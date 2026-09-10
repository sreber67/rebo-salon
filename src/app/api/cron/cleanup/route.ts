import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

// GDPR storage-limitation cleanup (Art. 5(1)(e)): purges old appointments,
// waitlist entries, alerts, and client notes past their retention window.
// Triggered by Vercel Cron (see vercel.json) or manually with the CRON_SECRET bearer token.
const APPOINTMENT_RETENTION_MONTHS = Number(
  process.env.APPOINTMENT_RETENTION_MONTHS ?? 36
);
const ALERT_RETENTION_MONTHS = Number(
  process.env.ALERT_RETENTION_MONTHS ?? 12
);
const WAITLIST_RETENTION_MONTHS = Number(
  process.env.WAITLIST_RETENTION_MONTHS ?? 6
);
const CLIENT_NOTES_RETENTION_MONTHS = Number(
  process.env.CLIENT_NOTES_RETENTION_MONTHS ?? 36
);

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const appointmentCutoff = new Date();
  appointmentCutoff.setMonth(appointmentCutoff.getMonth() - APPOINTMENT_RETENTION_MONTHS);

  const alertCutoff = new Date();
  alertCutoff.setMonth(alertCutoff.getMonth() - ALERT_RETENTION_MONTHS);

  const waitlistCutoff = new Date();
  waitlistCutoff.setMonth(waitlistCutoff.getMonth() - WAITLIST_RETENTION_MONTHS);

  const clientNotesCutoff = new Date();
  clientNotesCutoff.setMonth(clientNotesCutoff.getMonth() - CLIENT_NOTES_RETENTION_MONTHS);

  const batch = adminDb.batch();
  let deletedAppointments = 0;
  let deletedAlerts = 0;
  let deletedWaitlist = 0;
  let deletedClientNotes = 0;

  // Delete old appointments (cancelled/confirmed older than retention)
  const appointmentsSnap = await adminDb
    .collection('appointments')
    .where('date', '<', appointmentCutoff.toISOString().split('T')[0])
    .where('status', 'in', ['cancelled', 'confirmed', 'blocked'])
    .get();
  appointmentsSnap.docs.forEach(doc => {
    batch.delete(doc.ref);
    deletedAppointments++;
  });

  // Delete old alerts
  const alertsSnap = await adminDb
    .collection('alerts')
    .where('createdAt', '<', alertCutoff.getTime())
    .get();
  alertsSnap.docs.forEach(doc => {
    batch.delete(doc.ref);
    deletedAlerts++;
  });

  // Delete old waitlist entries
  const waitlistSnap = await adminDb
    .collection('waitlist')
    .where('createdAt', '<', waitlistCutoff.getTime())
    .get();
  waitlistSnap.docs.forEach(doc => {
    batch.delete(doc.ref);
    deletedWaitlist++;
  });

  // Delete old client notes (by updatedAt)
  const clientNotesSnap = await adminDb
    .collection('clientNotes')
    .where('updatedAt', '<', clientNotesCutoff.getTime())
    .get();
  clientNotesSnap.docs.forEach(doc => {
    batch.delete(doc.ref);
    deletedClientNotes++;
  });

  await batch.commit();

  return NextResponse.json({
    ok: true,
    deletedAppointments,
    deletedAlerts,
    deletedWaitlist,
    deletedClientNotes,
  });
}