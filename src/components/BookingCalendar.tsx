'use client';
import React, { useEffect, useRef, useState } from 'react';
import { toLocalDateStr } from '@/context/AppContext';

type Props = {
  value: string;
  onChange: (date: string) => void;
  // Whether a YYYY-MM-DD day can be booked; everything else is greyed out
  isSelectable: (date: string) => boolean;
  locale: string;
  labels: { placeholder: string; available: string; unavailable: string; prevMonth: string; nextMonth: string };
};

const fmt = (locale: string, options: Intl.DateTimeFormatOptions) => {
  try { return new Intl.DateTimeFormat(locale, options); } catch { return new Intl.DateTimeFormat('de', options); }
};

// Month-grid date picker that, unlike the browser's own, can grey out individual days
export function BookingCalendar({ value, onChange, isSelectable, locale, labels }: Props) {
  const [open, setOpen] = useState(false);
  const today = toLocalDateStr(new Date());
  const initial = new Date(`${value || today}T00:00:00`);
  const [month, setMonth] = useState({ year: initial.getFullYear(), month: initial.getMonth() });
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [open]);

  const toggle = () => {
    if (!open) {
      const shown = new Date(`${value || today}T00:00:00`);
      setMonth({ year: shown.getFullYear(), month: shown.getMonth() });
    }
    setOpen(!open);
  };

  const first = new Date(month.year, month.month, 1);
  const daysInMonth = new Date(month.year, month.month + 1, 0).getDate();
  // Monday-first grid: blank cells before the 1st
  const leadingBlanks = (first.getDay() + 6) % 7;
  const cells: (string | null)[] = [
    ...Array(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => toLocalDateStr(new Date(month.year, month.month, i + 1))),
  ];
  const isCurrentMonth = month.year === new Date().getFullYear() && month.month === new Date().getMonth();
  const shiftMonth = (by: number) => {
    const d = new Date(month.year, month.month + by, 1);
    setMonth({ year: d.getFullYear(), month: d.getMonth() });
  };

  const weekdayFmt = fmt(locale, { weekday: 'short' });
  // 2024-01-01 was a Monday
  const weekdays = Array.from({ length: 7 }, (_, i) => weekdayFmt.format(new Date(2024, 0, 1 + i)).replace(/\.$/, ''));
  const shownValue = value ? fmt(locale, { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${value}T00:00:00`)) : '';
  const dayLabel = fmt(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div ref={wrapperRef} className="relative sm:w-[40%]">
      <button type="button" onClick={toggle} aria-haspopup="dialog" aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 bg-black border border-white/20 p-4 rounded-sm text-left hover:border-[#d4af37] focus:border-[#d4af37] outline-none transition-colors">
        <span className={value ? 'text-white' : 'text-gray-500'}>{shownValue || labels.placeholder}</span>
        <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      </button>

      {open && (
        <div role="dialog" aria-label={labels.placeholder}
          className="absolute z-30 mt-2 w-[19rem] max-w-[calc(100vw-2rem)] bg-[#141210] border border-white/15 rounded-sm shadow-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={() => shiftMonth(-1)} disabled={isCurrentMonth} aria-label={labels.prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-sm text-[#d4af37] hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-transparent">‹</button>
            <span className="text-sm font-bold text-white capitalize">{fmt(locale, { month: 'long', year: 'numeric' }).format(first)}</span>
            <button type="button" onClick={() => shiftMonth(1)} aria-label={labels.nextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-sm text-[#d4af37] hover:bg-white/10">›</button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {weekdays.map(w => <span key={w} className="text-[10px] uppercase text-gray-500 pb-1">{w}</span>)}
            {cells.map((date, i) => {
              if (!date) return <span key={`blank-${i}`} />;
              const selectable = date >= today && isSelectable(date);
              const selected = date === value;
              return (
                <button key={date} type="button" disabled={!selectable} aria-pressed={selected}
                  aria-label={`${dayLabel.format(new Date(`${date}T00:00:00`))}${selectable ? '' : ` – ${labels.unavailable}`}`}
                  onClick={() => { onChange(date); setOpen(false); }}
                  className={`h-9 rounded-sm text-sm transition-colors ${
                    selected ? 'bg-[#d4af37] text-black font-bold'
                    : selectable ? `text-white hover:bg-[#d4af37]/20 ${date === today ? 'ring-1 ring-[#d4af37]/60' : ''}`
                    : 'text-gray-600 line-through cursor-not-allowed'}`}>
                  {Number(date.slice(8))}
                </button>
              );
            })}
          </div>

          <div className="flex gap-4 mt-3 pt-3 border-t border-white/10 text-[11px] text-gray-400">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-white/80" />{labels.available}</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-gray-700" />{labels.unavailable}</span>
          </div>
        </div>
      )}
    </div>
  );
}
