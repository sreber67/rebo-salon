// Booking rules the appointments API checks on the server, matching the booking
// page's rules (salon hours, closed days, holidays, overlapping bookings).

export type ScheduledStylist = { name: string };
export type BookedAppointment = { stylist: string; date: string; time: string; status: string; proposedTime?: string | null; totalDurationMins?: number };

export const SALON_OPEN_MINS = 9 * 60;
// Every booking must finish by closing time; the salon is closed on these weekdays (0 = Sunday)
export const CLOSING_TIME_MINS = 19 * 60;
export const CLOSED_WEEKDAYS = [0];
// Used when no stylists have been set up in the admin panel yet
export const DEFAULT_STYLISTS = ['Rebo (Inhaber)', 'Anna', 'Marcus'];
// Stored stylist values that mean "whoever is free"
export const ANY_STYLIST_NAMES = ['Egal (Wer frei ist)', 'Any'];
// Loyalty points needed for a reward visit (shown to customers as "x / 10")
export const REWARD_POINTS = 10;

// Appointment statuses that occupy a stylist's time
export const BLOCKING_STATUSES = ['confirmed', 'pending', 'proposed', 'blocked'];

export const timeToMins = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

export const minsToTime = (mins: number) =>
  `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

export const weekdayOf = (date: string) => new Date(`${date}T00:00:00`).getDay();

// A real calendar date in YYYY-MM-DD form (rejects things like 2026-02-30 or 2026-13-01)
export function isRealDate(date: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

// A clock time in HH:MM form between 00:00 and 23:59
export const isRealTime = (time: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time);

// The salon's bookable window on that date in minutes, or null when it is closed
export function getWorkHours(date: string): { start: number; end: number } | null {
  if (!isRealDate(date)) return null;
  if (CLOSED_WEEKDAYS.includes(weekdayOf(date))) return null;
  return { start: SALON_OPEN_MINS, end: CLOSING_TIME_MINS };
}

const overlapsBooking = (appointments: BookedAppointment[], stylistName: string, date: string, start: number, end: number, anyNames: string[]) =>
  appointments.some(a => {
    if (a.date !== date || !BLOCKING_STATUSES.includes(a.status)) return false;
    // A "whoever is free" booking holds a seat with every stylist
    if (a.stylist !== stylistName && !anyNames.includes(a.stylist)) return false;
    const aStart = timeToMins(a.status === 'proposed' && a.proposedTime ? a.proposedTime : a.time);
    const aEnd = aStart + (a.totalDurationMins || 60);
    return start < aEnd && end > aStart;
  });

export type SlotCheck = {
  date: string;
  startMins: number;
  duration: number;
  // A stylist's name, or anything else (e.g. "Any") to accept whoever is free
  stylist: string;
  stylists: ScheduledStylist[];
  appointments: BookedAppointment[];
  holidays?: string[];
  anyNames?: string[];
};

export const rosterOf = (stylists: ScheduledStylist[]): ScheduledStylist[] =>
  stylists.length > 0 ? stylists : DEFAULT_STYLISTS.map(name => ({ name }));

export function isSlotOpen({ date, startMins, duration, stylist, stylists, appointments, holidays = [], anyNames = ANY_STYLIST_NAMES }: SlotCheck): boolean {
  if (holidays.includes(date)) return false;
  const end = startMins + duration;
  const roster = rosterOf(stylists);
  const canTake = (s: ScheduledStylist) => {
    const hours = getWorkHours(date);
    return !!hours && startMins >= hours.start && end <= hours.end
      && !overlapsBooking(appointments, s.name, date, startMins, end, anyNames);
  };
  const chosen = roster.find(s => s.name === stylist);
  return chosen ? canTake(chosen) : roster.some(canTake);
}
