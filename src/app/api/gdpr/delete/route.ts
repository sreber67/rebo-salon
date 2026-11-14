import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, deleteRefs } from '@/lib/firebaseAdmin';
import { createAuditLog, logAudit } from '@/lib/validation';
import { getCaller, errorResponse, errorMessage } from '@/lib/apiAuth';

// GDPR Art. 17: erase the caller's account and everything stored about them
export async function DELETE(req: NextRequest) {
  const startTime = Date.now();
  let userId: string | undefined;

  try {
    // Irreversible, so a token from a signed-out / revoked session is refused
    const caller = await getCaller(req, { checkRevoked: true });
    userId = caller.uid;

    const [appointmentsSnap, alertsSnap, waitlistSnap] = await Promise.all([
      adminDb.collection('appointments').where('userId', '==', userId).get(),
      adminDb.collection('alerts').where('userId', '==', userId).get(),
      adminDb.collection('waitlist').where('userId', '==', userId).get(),
    ]);

    await deleteRefs([
      adminDb.doc(`users/${userId}`),
      ...appointmentsSnap.docs.map(d => d.ref),
      ...alertsSnap.docs.map(d => d.ref),
      ...waitlistSnap.docs.map(d => d.ref),
    ]);
    await adminAuth.deleteUser(userId);

    logAudit(createAuditLog(req, userId, 'user', 'account_deletion', userId, 'user', true, undefined, {
      deletedCollections: ['users', 'appointments', 'alerts', 'waitlist'],
      authDeleted: true,
      durationMs: Date.now() - startTime,
    }));
    return NextResponse.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    logAudit(createAuditLog(req, userId, undefined, 'account_deletion', undefined, 'user', false, errorMessage(error), {
      durationMs: Date.now() - startTime,
    }));
    return errorResponse(error, 'Account deletion failed');
  }
}
