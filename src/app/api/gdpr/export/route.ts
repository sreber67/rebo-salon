import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { createAuditLog, logAudit } from '@/lib/validation';
import { getCaller, errorResponse, errorMessage } from '@/lib/apiAuth';

// GDPR Art. 15/20: everything stored about the caller, as JSON
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  let userId: string | undefined;

  try {
    const caller = await getCaller(req, { checkRevoked: true });
    userId = caller.uid;

    const [userSnap, appointmentsSnap, alertsSnap, waitlistSnap] = await Promise.all([
      adminDb.doc(`users/${userId}`).get(),
      adminDb.collection('appointments').where('userId', '==', userId).get(),
      adminDb.collection('alerts').where('userId', '==', userId).get(),
      adminDb.collection('waitlist').where('userId', '==', userId).get(),
    ]);
    const withId = (snap: FirebaseFirestore.QuerySnapshot) => snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const exportData = {
      user: userSnap.exists ? userSnap.data() : null,
      appointments: withId(appointmentsSnap),
      alerts: withId(alertsSnap),
      waitlist: withId(waitlistSnap),
      exportedAt: new Date().toISOString(),
      format: 'json',
      version: '1.0',
    };

    logAudit(createAuditLog(req, userId, 'user', 'data_export', userId, 'user', true, undefined, {
      dataCategories: ['user', 'appointments', 'alerts', 'waitlist'],
      durationMs: Date.now() - startTime,
    }));
    return NextResponse.json({ success: true, data: exportData });
  } catch (error) {
    logAudit(createAuditLog(req, userId, undefined, 'data_export', undefined, 'user', false, errorMessage(error), {
      durationMs: Date.now() - startTime,
    }));
    return errorResponse(error, 'Export failed');
  }
}
