import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { validateRequest, smsRequestSchema, createAuditLog, logAudit } from '@/lib/validation';

const normalizePhone = (p: string) => p.replace(/\s+/g, '');

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let userId: string | undefined;
  let userRole: string | undefined;

  try {
    // Verify Firebase ID Token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const auditLog = createAuditLog(req, undefined, undefined, 'sms_send', undefined, 'appointment', false, 'Missing or invalid Authorization header');
      logAudit(auditLog);
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    if (!decodedToken) {
      const auditLog = createAuditLog(req, undefined, undefined, 'sms_send', undefined, 'appointment', false, 'Invalid token');
      logAudit(auditLog);
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 403 });
    }

    userId = decodedToken.uid;
    // Role lives on the Firestore user doc, not a custom claim (nothing ever
    // sets one) - look it up server-side rather than trusting the client.
    const callerSnap = await adminDb.doc(`users/${userId}`).get();
    const callerData = callerSnap.exists ? callerSnap.data() : undefined;
    const isCallerAdmin = callerData?.role === 'admin';
    userRole = isCallerAdmin ? 'admin' : 'user';

    // Validate request body
    const body = await req.json();
    const validation = validateRequest(smsRequestSchema, body);

    if (!validation.success) {
      const auditLog = createAuditLog(req, userId, userRole, 'sms_send', undefined, 'appointment', false, 'Validation failed', { errors: validation.errors.flatten() });
      logAudit(auditLog);
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors.flatten() },
        { status: 400 }
      );
    }

    const { phone, message, appointmentId } = validation.data;

    // Non-admins may only trigger an SMS tied to an appointment they own,
    // and only to that appointment's own phone number - checked against the
    // appointment record itself (not the caller's live profile phone, which
    // may have since been changed independently via Settings) so this can't
    // be used to text an arbitrary number. Covers the self-service "accept
    // my reschedule" flow; anything else requires admin, which covers the
    // admin-panel confirmation flow that texts other customers.
    if (!isCallerAdmin) {
      const apptSnap = appointmentId ? await adminDb.doc(`appointments/${appointmentId}`).get() : undefined;
      const apptData = apptSnap?.exists ? apptSnap.data() : undefined;
      const isOwnAppointment = !!appointmentId && apptData?.userId === userId;
      const phoneMatchesAppointment = typeof apptData?.phone === 'string' && normalizePhone(apptData.phone) === normalizePhone(phone);
      if (!isOwnAppointment || !phoneMatchesAppointment) {
        const auditLog = createAuditLog(req, userId, userRole, 'sms_send', appointmentId, 'appointment', false, 'Recipient not permitted for non-admin caller');
        logAudit(auditLog);
        return NextResponse.json({ error: 'Forbidden: you may only text the phone number on your own appointment' }, { status: 403 });
      }
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !twilioPhone) {
      const auditLog = createAuditLog(req, userId, userRole, 'sms_send', undefined, 'appointment', false, 'Twilio credentials not configured');
      logAudit(auditLog);
      return NextResponse.json({ error: 'SMS service not configured' }, { status: 503 });
    }

    const client = twilio(accountSid, authToken);

    // Sanitize message - prevent injection
    const sanitizedMessage = message.replace(/[\r\n]+/g, ' ').trim();

    const response = await client.messages.create({
      body: sanitizedMessage,
      from: twilioPhone,
      to: phone,
    });

    const auditLog = createAuditLog(req, userId, userRole, 'sms_send', response.sid, 'message', true, undefined, {
      to: phone.replace(/\d(?=\d{4})/g, '*'), // Mask phone in logs
      durationMs: Date.now() - startTime,
    });
    logAudit(auditLog);

    return NextResponse.json({ success: true, sid: response.sid }, { status: 200 });
  } catch (error: any) {
    const auditLog = createAuditLog(req, userId, userRole, 'sms_send', undefined, 'appointment', false, error.message || 'Failed to send SMS', {
      durationMs: Date.now() - startTime,
    });
    logAudit(auditLog);

    // Don't expose internal error details
    const status = error.code === 21211 ? 400 : // Invalid phone number
                   error.code === 21614 ? 400 : // Not a valid mobile number
                   500;

    return NextResponse.json(
      { error: status === 400 ? error.message : 'Failed to send SMS' },
      { status }
    );
  }
}