import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { createAuditLog, logAudit } from '@/lib/validation';

export async function DELETE(req: NextRequest) {
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

    // Delete user data from Firestore
    const batch = adminDb.batch();

    // Delete user document
    batch.delete(adminDb.doc(`users/${userId}`));

    // Delete user's appointments
    const appointmentsSnap = await adminDb.collection('appointments').where('userId', '==', userId).get();
    appointmentsSnap.docs.forEach(doc => batch.delete(doc.ref));

    // Delete user's alerts
    const alertsSnap = await adminDb.collection('alerts').where('userId', '==', userId).get();
    alertsSnap.docs.forEach(doc => batch.delete(doc.ref));

    // Delete user's waitlist entries
    const waitlistSnap = await adminDb.collection('waitlist').where('userId', '==', userId).get();
    waitlistSnap.docs.forEach(doc => batch.delete(doc.ref));

    await batch.commit();

    // Delete Firebase Auth user
    await adminAuth.deleteUser(userId);

    const auditLog = createAuditLog(req, userId, 'user', 'account_deletion', userId, 'user', true, undefined, {
      deletedCollections: ['users', 'appointments', 'alerts', 'waitlist'],
      authDeleted: true,
      durationMs: Date.now() - startTime,
    });
    logAudit(auditLog);

    return NextResponse.json({ success: true, message: 'Account deleted successfully' });
  } catch (error: any) {
    const auditLog = createAuditLog(req, userId, undefined, 'account_deletion', undefined, 'user', false, error.message || 'Deletion failed', {
      durationMs: Date.now() - startTime,
    });
    logAudit(auditLog);

    return NextResponse.json(
      { error: 'Account deletion failed' },
      { status: 500 }
    );
  }
}