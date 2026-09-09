import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { createAuditLog, logAudit } from '@/lib/validation';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let userId: string | undefined;

  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    // Generate password reset link
    try {
      const userRecord = await adminAuth.getUserByEmail(email);
      userId = userRecord.uid;

      // Generate password reset link (in production, this would be sent via email)
      const resetLink = await adminAuth.generatePasswordResetLink(email);

      const auditLog = createAuditLog(req, userId, 'user', 'password_reset_request', userId, 'user', true, undefined, {
        durationMs: Date.now() - startTime,
      });
      logAudit(auditLog);

      // Don't expose the reset link in production response
      return NextResponse.json({ 
        success: true, 
        message: 'Password reset email sent',
        // Only for testing:
        resetLink: process.env.NODE_ENV === 'development' ? resetLink : undefined
      });
    } catch (error: any) {
      // Don't reveal if email exists or not (security)
      const auditLog = createAuditLog(req, undefined, undefined, 'password_reset_request', undefined, 'user', true, undefined, {
        durationMs: Date.now() - startTime,
      });
      logAudit(auditLog);
      
      return NextResponse.json({ 
        success: true, 
        message: 'If the email exists, a reset link has been sent' 
      });
    }
  } catch (error: any) {
    const auditLog = createAuditLog(req, userId, undefined, 'password_reset_request', undefined, 'user', false, error.message || 'Reset request failed', {
      durationMs: Date.now() - startTime,
    });
    logAudit(auditLog);

    return NextResponse.json(
      { error: 'Reset request failed' },
      { status: 500 }
    );
  }
}