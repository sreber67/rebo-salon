import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { validateRequest, emailRequestSchema, createAuditLog, logAudit } from '@/lib/validation';
import { getCaller, readJson, errorResponse, errorMessage } from '@/lib/apiAuth';

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Server-side source of truth for the salon's own inbox - never trust a
// client-supplied value for this. No hardcoded fallback: misconfiguration
// should fail loudly, not silently route mail to a developer's own inbox.
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

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
    const validation = validateRequest(emailRequestSchema, await readJson(req));

    if (!validation.success) {
      const auditLog = createAuditLog(req, userId, userRole, 'email_send', undefined, 'notification', false, 'Validation failed', { errors: validation.errors.flatten() });
      logAudit(auditLog);
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors.flatten() },
        { status: 400 }
      );
    }

    const { email, subject, message } = validation.data;
    // Only the salon may pick a sender name/address; customers always send as the salon
    const fromEmail = isCallerAdmin ? validation.data.fromEmail : undefined;
    const fromName = isCallerAdmin ? validation.data.fromName : undefined;

    // Non-admins may only trigger an email to themselves or to the salon's
    // own inbox (the two legitimate self-service flows: booking/OTP
    // confirmations, and "notify the salon of a new request"). Anything else
    // requires admin, which covers the admin-panel flows that email other
    // customers about their appointments.
    if (!isCallerAdmin) {
      const callerEmail = caller.email;
      const targetEmail = email.toLowerCase();
      if (targetEmail !== callerEmail && targetEmail !== ADMIN_EMAIL?.toLowerCase()) {
        const auditLog = createAuditLog(req, userId, userRole, 'email_send', undefined, 'notification', false, 'Recipient not permitted for non-admin caller');
        logAudit(auditLog);
        return NextResponse.json({ error: 'Forbidden: you may only email yourself or the salon' }, { status: 403 });
      }
    }

    // Local test mode (npm run dev:local): checks above still run, but nothing is sent
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      console.log('[local test mode] Email not sent:', { to: email, subject });
      return NextResponse.json({ success: true, skipped: 'emulator' });
    }

    const emailUser = process.env.EMAIL_USER;
    // Gmail App Passwords are often copy-pasted with the spaces Google
    // displays them with (e.g. "abcd efgh ijkl mnop") - strip them, since
    // Gmail's SMTP login rejects the password if spaces are included.
    const emailPass = process.env.EMAIL_PASS?.replace(/\s+/g, '');

    if (!emailUser || !emailPass || !ADMIN_EMAIL) {
      const auditLog = createAuditLog(req, userId, userRole, 'email_send', undefined, 'notification', false, 'Email credentials not configured');
      logAudit(auditLog);
      return NextResponse.json({ error: 'Email service not configured' }, { status: 503 });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      // Security: enforce TLS
      tls: {
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2',
      },
    });

    // Sanitize inputs to prevent header injection
    const sanitizedSubject = subject.replace(/[\r\n]/g, ' ').trim();
    const sanitizedMessage = message.replace(/[\r\n]+/g, '\n').trim();
    const sanitizedFromName = (fromName || 'Rebo Salon').replace(/[\r\n"<>]/g, ' ').trim();

    await transporter.sendMail({
      from: `"${sanitizedFromName}" <${fromEmail || emailUser}>`,
      to: email,
      subject: sanitizedSubject,
      text: sanitizedMessage,
      // HTML version for better formatting - escaped so nobody can inject markup or links
      html: escapeHtml(sanitizedMessage).replace(/\n/g, '<br>'),
    });

    const auditLog = createAuditLog(req, userId, userRole, 'email_send', undefined, 'notification', true, undefined, {
      to: email.replace(/(.{2})(.*)(@.*)/, '$1***$3'), // Mask email in logs
      durationMs: Date.now() - startTime,
    });
    logAudit(auditLog);

    return NextResponse.json({ success: true, message: 'Email sent successfully' }, { status: 200 });
  } catch (error) {
    const auditLog = createAuditLog(req, userId, userRole, 'email_send', undefined, 'notification', false, errorMessage(error), {
      durationMs: Date.now() - startTime,
    });
    logAudit(auditLog);
    // Don't expose internal error details
    return errorResponse(error, 'Failed to send email');
  }
}
