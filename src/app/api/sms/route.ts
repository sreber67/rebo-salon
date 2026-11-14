import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { adminDb } from '@/lib/firebaseAdmin';
import { validateRequest, smsRequestSchema, createAuditLog, logAudit } from '@/lib/validation';
import { getCaller, readJson, errorMessage, HttpError } from '@/lib/apiAuth';

const normalizePhone = (p: string) => p.replace(/\s+/g, '');

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let userId: string | undefined;
  let userRole: string | undefined;

  try {
    const caller = await getCaller(req);
    userId = caller.uid;
    const isCallerAdmin = caller.isAdmin;
    userRole = isCallerAdmin ? 'admin' : 'user';

    // Validate request body
    const validation = validateRequest(smsRequestSchema, await readJson(req));

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

    // Local test mode (npm run dev:local): checks above still run, but nothing is sent
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      console.log('[local test mode] SMS not sent:', { to: phone, message });
      return NextResponse.json({ success: true, skipped: 'emulator' });
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
  } catch (error) {
    const auditLog = createAuditLog(req, userId, userRole, 'sms_send', undefined, 'appointment', false, errorMessage(error), {
      durationMs: Date.now() - startTime,
    });
    logAudit(auditLog);

    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    // Twilio's "invalid number" errors are safe and useful to show; anything else stays generic
    const code = (error as { code?: number }).code;
    if (code === 21211 || code === 21614) {
      return NextResponse.json({ error: 'Invalid or non-mobile phone number' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to send SMS' }, { status: 500 });
  }
}
