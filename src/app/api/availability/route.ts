import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { BookedAppointment, BLOCKING_STATUSES } from '@/lib/schedule';

// Booked time blocks from a date onwards, so the booking page can grey out taken slots.
// Customers can't read other people's appointments, so only stylist + time leave the server - no names or phone numbers.
export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get('from') || '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) {
    return NextResponse.json({ error: 'Invalid from date' }, { status: 400 });
  }

  try {
    const snap = await adminDb.collection('appointments').where('date', '>=', from).get();
    const appointments: BookedAppointment[] = snap.docs
      .map(d => d.data())
      .filter(a => BLOCKING_STATUSES.includes(a.status))
      .map(a => ({
        stylist: a.stylist,
        date: a.date,
        time: a.time,
        status: a.status,
        proposedTime: a.proposedTime || null,
        totalDurationMins: a.totalDurationMins,
      }));

    return NextResponse.json({ appointments }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Failed to load availability' }, { status: 500 });
  }
}
