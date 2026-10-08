// Booking availability rules shared by the booking page and the appointments API,
// so the browser and the server always agree on what can be booked.

export type WorkHours = { start: string; end: string };
// Indexed by weekday (0 = Sunday); null = day off. No schedule at all = full salon hours.
export type WeeklySchedule = (WorkHours | null)[];
export type ScheduledStylist = { name: string; weeklySchedule?: WeeklySchedule | null; daysOff?: string[] };
export type BookedAppointment = { stylist: string; date: string; time: string; status: string; proposedTime?: string | null; totalDurationMins?: number };

export const SALON_OPEN_MINS = 9 * 60;
// Every booking must finish by closing time; the salon is closed on these weekdays (0 = Sunday)
export const CLOSING_TIME_MINS = 19 * 60;
export const CLOSED_WEEKDAYS = [0];
// Used when no stylists have been set up in the admin panel yet
export const DEFAULT_STYLISTS = ['Rebo (Inhaber)', 'Anna', 'Marcus'];
// Stored stylist values that mean "whoever is free"
export const ANY_STYLIST_NAMES = ['Egal (Wer frei ist)', 'Any'];
// Weekdays in the order the salon thinks of them (Monday first)
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

// Appointment statuses that occupy a stylist's time
export const BLOCKING_STATUSES = ['confirmed', 'pending', 'proposed', 'blocked'];

export const timeToMins = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

export const minsToTime = (mins: number) =>
  `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

export const weekdayOf = (date: string) => new Date(`${date}T00:00:00`).getDay();

// The stylist's bookable window on that date in minutes, or null when they don't work
export function getWorkHours(stylist: ScheduledStylist | undefined, date: string): { start: number; end: number } | null {
  const weekday = weekdayOf(date);
  if (CLOSED_WEEKDAYS.includes(weekday)) return null;
  if (stylist?.daysOff?.includes(date)) return null;
  if (!stylist?.weeklySchedule) return { start: SALON_OPEN_MINS, end: CLOSING_TIME_MINS };
  const day = stylist.weeklySchedule[weekday];
  if (!day) return null;
  const start = Math.max(SALON_OPEN_MINS, timeToMins(day.start));
  const end = Math.min(CLOSING_TIME_MINS, timeToMins(day.end));
  return start < end ? { start, end } : null;
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
    const hours = getWorkHours(s, date);
    return !!hours && startMins >= hours.start && end <= hours.end
      && !overlapsBooking(appointments, s.name, date, startMins, end, anyNames);
  };
  const chosen = roster.find(s => s.name === stylist);
  return chosen ? canTake(chosen) : roster.some(canTake);
}

// Short note for the stylist picker, e.g. "Di, Do" or "Mo–Sa 12:00–19:00"; '' for full salon hours
export function describeSchedule(stylist: ScheduledStylist, locale: string): string {
  if (!stylist.weeklySchedule) return '';
  const openDays = WEEKDAY_ORDER.filter(d => !CLOSED_WEEKDAYS.includes(d));
  const workDays = openDays.filter(d => stylist.weeklySchedule?.[d]);
  if (workDays.length === 0) return '';

  let dayName: (d: number) => string;
  try {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    // 2024-01-07 was a Sunday
    dayName = d => fmt.format(new Date(2024, 0, 7 + d)).replace(/\.$/, '');
  } catch {
    dayName = d => ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][d];
  }

  const parts: string[] = [];
  if (workDays.length < openDays.length) parts.push(workDays.map(dayName).join(', '));

  const hours = workDays.map(d => stylist.weeklySchedule![d]!);
  const sameHours = hours.every(h => h.start === hours[0].start && h.end === hours[0].end);
  const isSalonHours = timeToMins(hours[0].start) <= SALON_OPEN_MINS && timeToMins(hours[0].end) >= CLOSING_TIME_MINS;
  if (sameHours && !isSalonHours) parts.push(`${hours[0].start}–${hours[0].end}`);

  return parts.join(' · ');
}
