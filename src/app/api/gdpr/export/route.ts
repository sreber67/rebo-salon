import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { createAuditLog, logAudit } from '@/lib/validation';

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  let userId: string | undefined;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    userId = decodedToken.uid;

    // Fetch all user data
    const [
      userSnap,
      appointmentsSnap,
      alertsSnap,
      waitlistSnap,
    ] = await Promise.all([
      adminDb.doc(`users/${userId}`).get(),
      adminDb.collection('appointments').where('userId', '==', userId).get(),
      adminDb.collection('alerts').where('userId', '==', userId).get(),
      adminDb.collection('waitlist').where('userId', '==', userId).get(),
    ]);

    const userData = userSnap.exists ? userSnap.data() : null;
    const appointments = appointmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const alerts = alertsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const waitlist = waitlistSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Remove sensitive fields
    if (userData) {
      delete (userData as any).passwordHash;
    }

    const exportData = {
      user: userData,
      appointments,
      alerts,
      waitlist,
      exportedAt: new Date().toISOString(),
      format: 'json',
      version: '1.0',
    };

    const auditLog = createAuditLog(req, userId, 'user', 'data_export', userId, 'user', true, undefined, {
      dataCategories: Object.keys(exportData).filter(k => k !== 'exportedAt' && k !== 'format' && k !== 'version'),
      durationMs: Date.now() - startTime,
    });
    logAudit(auditLog);

    return NextResponse.json({ success: true, data: exportData });
  } catch (error: any) {
    const auditLog = createAuditLog(req, userId, undefined, 'data_export', undefined, 'user', false, error.message || 'Export failed', {
      durationMs: Date.now() - startTime,
    });
    logAudit(auditLog);

    return NextResponse.json(
      { error: 'Export failed' },
      { status: 500 }
    );
  }
}