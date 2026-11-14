import { describe, it, expect } from 'vitest';
import {
  isRealDate, isRealTime, getWorkHours, isSlotOpen, timeToMins, minsToTime,
  describeSchedule, rosterOf, DEFAULT_STYLISTS, BookedAppointment, ScheduledStylist,
} from '@/lib/schedule';

// 2026-11-16 is a Monday, 2026-11-15 a Sunday (salon closed)
const MONDAY = '2026-11-16';
const SUNDAY = '2026-11-15';

const anna: ScheduledStylist = { name: 'Anna' };
const marcus: ScheduledStylist = {
  name: 'Marcus',
  // Works Monday 12:00-16:00 only
  weeklySchedule: [null, { start: '12:00', end: '16:00' }, null, null, null, null, null],
  daysOff: ['2026-11-23'],
};
const booking = (over: Partial<BookedAppointment>): BookedAppointment => ({
  stylist: 'Anna', date: MONDAY, time: '10:00', status: 'confirmed', totalDurationMins: 60, ...over,
});
const slot = (over: Partial<Parameters<typeof isSlotOpen>[0]>) => isSlotOpen({
  date: MONDAY, startMins: timeToMins('10:00'), duration: 60, stylist: 'Anna',
  stylists: [anna, marcus], appointments: [], ...over,
});

describe('isRealDate / isRealTime', () => {
  it('accepts real dates and rejects impossible ones', () => {
    expect(isRealDate('2026-11-16')).toBe(true);
    expect(isRealDate('2028-02-29')).toBe(true);
    expect(isRealDate('2026-02-29')).toBe(false);
    expect(isRealDate('2026-13-01')).toBe(false);
    expect(isRealDate('2026-1-01')).toBe(false);
    expect(isRealDate('not-a-date')).toBe(false);
  });
  it('accepts clock times only', () => {
    expect(isRealTime('09:30')).toBe(true);
    expect(isRealTime('23:59')).toBe(true);
    expect(isRealTime('24:00')).toBe(false);
    expect(isRealTime('12:60')).toBe(false);
    expect(isRealTime('9:30')).toBe(false);
  });
});

describe('time helpers', () => {
  it('round-trips minutes and HH:MM', () => {
    expect(timeToMins('09:05')).toBe(545);
    expect(minsToTime(545)).toBe('09:05');
  });
});

describe('getWorkHours', () => {
  it('uses salon hours when a stylist has no schedule', () => {
    expect(getWorkHours(anna, MONDAY)).toEqual({ start: 540, end: 1140 });
  });
  it('is closed on Sundays, days off and invalid dates', () => {
    expect(getWorkHours(anna, SUNDAY)).toBeNull();
    expect(getWorkHours(marcus, '2026-11-23')).toBeNull();
    expect(getWorkHours(anna, '2026-02-30')).toBeNull();
  });
  it('follows the weekly schedule', () => {
    expect(getWorkHours(marcus, MONDAY)).toEqual({ start: 720, end: 960 });
    expect(getWorkHours(marcus, '2026-11-17')).toBeNull(); // Tuesday off
  });
});

describe('isSlotOpen', () => {
  it('allows a free slot inside working hours', () => {
    expect(slot({})).toBe(true);
  });
  it('rejects overlapping bookings for the same stylist', () => {
    expect(slot({ appointments: [booking({ time: '10:30' })] })).toBe(false);
    expect(slot({ appointments: [booking({ time: '09:00' })] })).toBe(true); // ends exactly at 10:00
  });
  it('ignores cancelled bookings', () => {
    expect(slot({ appointments: [booking({ status: 'cancelled' })] })).toBe(true);
  });
  it('treats a proposed booking as held at its proposed time', () => {
    const proposed = booking({ status: 'proposed', time: '15:00', proposedTime: '10:00' });
    expect(slot({ appointments: [proposed] })).toBe(false);
  });
  it('lets a "whoever is free" booking block every stylist', () => {
    expect(slot({ appointments: [booking({ stylist: 'Egal (Wer frei ist)' })] })).toBe(false);
  });
  it('rejects slots that run past closing time or outside a shift', () => {
    expect(slot({ startMins: timeToMins('18:30') })).toBe(false);
    expect(slot({ stylist: 'Marcus', startMins: timeToMins('11:00') })).toBe(false);
    expect(slot({ stylist: 'Marcus', startMins: timeToMins('12:00') })).toBe(true);
  });
  it('rejects holidays, Sundays and impossible dates', () => {
    expect(slot({ holidays: [MONDAY] })).toBe(false);
    expect(slot({ date: SUNDAY })).toBe(false);
    expect(slot({ date: '2026-02-30' })).toBe(false);
  });
  it('for "any stylist" finds whoever is free', () => {
    const annaBusy = [booking({ time: '12:00' })];
    expect(slot({ stylist: 'Any', startMins: timeToMins('12:00'), appointments: annaBusy })).toBe(true); // Marcus
    expect(slot({ stylist: 'Any', startMins: timeToMins('10:00'), appointments: [booking({}), booking({ stylist: 'Marcus' })] })).toBe(false);
  });
});

describe('roster and schedule text', () => {
  it('falls back to the default stylists', () => {
    expect(rosterOf([]).map(s => s.name)).toEqual(DEFAULT_STYLISTS);
  });
  it('describes custom working days', () => {
    expect(describeSchedule(anna, 'de')).toBe('');
    expect(describeSchedule(marcus, 'de')).toContain('12:00–16:00');
  });
});
