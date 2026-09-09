import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { createAuditLog, logAudit } from '@/lib/validation';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let userId: string | undefined;

  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    // Verify password by getting user and checking with Firebase Auth
    // Note: Firebase Admin SDK doesn't have a direct password verification method.
    // In production, you'd use Firebase Client SDK on the client side to sign in,
    // then send the ID token to the server for verification.
    // For this test endpoint, we'll create a custom token for testing purposes.
    
    try {
      const userRecord = await adminAuth.getUserByEmail(email);
      userId = userRecord.uid;

      // Create a custom token for the user (for testing)
      const customToken = await adminAuth.createCustomToken(userId);

      const auditLog = createAuditLog(req, userId, 'user', 'login', userId, 'user', true, undefined, {
        durationMs: Date.now() - startTime,
      });
      logAudit(auditLog);

      return NextResponse.json({ 
        success: true, 
        idToken: customToken, // In production, client would get ID token from signInWithCustomToken
        uid: userId 
      });
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
      throw error;
    }
  } catch (error: any) {
    const auditLog = createAuditLog(req, userId, undefined, 'login', undefined, 'user', false, error.message || 'Login failed', {
      durationMs: Date.now() - startTime,
    });
    logAudit(auditLog);

    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}