import { addDays, addMonths, format, getDaysInMonth, parseISO } from 'date-fns'
import {
  needsTajikShim,
  tajikDayMonth,
  tajikMonthShort,
  tajikMonthYear,
  tajikWeekdayDay,
  tajikWeekdayLabels,
} from '@/lib/tajikDates'

/**
 * First day of the budgeting cycle (1–28). With the default of 1 a "month" is the
 * calendar month; with e.g. 15 the month keyed `2026-08` runs 15 Aug → 14 Sep.
 *
 * Held in module scope rather than passed around because every date helper and
 * every stats function needs it, and it changes only from Settings.
 */
let cycleStartDay = 1

export function setCycleStartDay(day: number): void {
  cycleStartDay = clampDayOfMonth(day)
}

/** The first and last calendar day (inclusive) covered by a `yyyy-MM` key. */
export function monthRange(key: string): { start: string; end: string } {
  const [y, m] = key.split('-').map(Number)
  const anchor = new Date(y!, m! - 1, 1)
  const day = Math.min(cycleStartDay, getDaysInMonth(anchor))
  const start = new Date(y!, m! - 1, day)
  const nextAnchor = addMonths(anchor, 1)
  const nextDay = Math.min(cycleStartDay, getDaysInMonth(nextAnchor))
  const end = addDays(new Date(nextAnchor.getFullYear(), nextAnchor.getMonth(), nextDay), -1)
  return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') }
}

export function monthKey(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (cycleStartDay <= 1) return format(d, 'yyyy-MM')
  // Days before the cycle start belong to the previous key.
  const shifted = d.getDate() < cycleStartDay ? addMonths(d, -1) : d
  return format(shifted, 'yyyy-MM')
}

export function monthLabel(key: string, locale = 'en'): string {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y!, m! - 1, 1)
  if (needsTajikShim(locale)) return tajikMonthYear(d)
  try {
    return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(d)
  } catch {
    return format(d, 'MMMM yyyy')
  }
}

export function shortMonthLabel(date: Date, locale = 'en'): string {
  if (needsTajikShim(locale)) return tajikMonthShort(date)
  try {
    return new Intl.DateTimeFormat(locale, { month: 'short' }).format(date)
  } catch {
    return format(date, 'MMM')
  }
}

export function shortDayLabel(iso: string, locale = 'en'): string {
  if (needsTajikShim(locale)) return tajikDayMonth(parseLocalDay(iso))
  try {
    return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(
      parseLocalDay(iso),
    )
  } catch {
    return iso
  }
}

/** Weekday + date for list section headings, with year when not the current year. */
export function weekdayDayLabel(iso: string, locale = 'en'): string {
  const d = parseLocalDay(iso)
  const otherYear = d.getFullYear() !== new Date().getFullYear()
  if (needsTajikShim(locale)) return tajikWeekdayDay(d, otherYear)
  const opts: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }
  if (otherYear) opts.year = 'numeric'
  try {
    return new Intl.DateTimeFormat(locale, opts).format(d)
  } catch {
    return shortDayLabel(iso, locale)
  }
}

/** Parse a `yyyy-MM-dd` value as a local calendar day (avoids UTC shift). */
export function parseLocalDay(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function dayKey(date: Date | string = new Date()): string {
  if (typeof date === 'string') return date.slice(0, 10)
  return format(date, 'yyyy-MM-dd')
}

export function isInRange(isoDate: string, start: string | null, end: string | null): boolean {
  const d = isoDate.slice(0, 10)
  if (start && d < start) return false
  if (end && d > end) return false
  return true
}

/** Sunday-first weekday names for calendar side labels. */
export function weekdayLabels(locale = 'en', style: 'narrow' | 'short' = 'short'): string[] {
  if (needsTajikShim(locale)) return tajikWeekdayLabels(style)
  const fmt = new Intl.DateTimeFormat(locale, { weekday: style })
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2024, 0, 7 + i)))
}

export function isInMonth(isoDate: string, key: string): boolean {
  const { start, end } = monthRange(key)
  return isInRange(isoDate, start, end)
}

/** Number of calendar days in the cycle keyed by `key`. */
export function daysInMonthKey(key: string): number {
  const { start, end } = monthRange(key)
  return Math.round(
    (parseLocalDay(end).getTime() - parseLocalDay(start).getTime()) / 86_400_000,
  ) + 1
}

/** Pure key arithmetic — independent of the cycle start day. */
export function previousMonthKey(month = monthKey()): string {
  const [y, m] = month.split('-').map(Number)
  return format(new Date(y!, m! - 2, 1), 'yyyy-MM')
}

export function dateInMonth(month: string, dayOfMonth: number): string {
  const [y, m] = month.split('-').map(Number)
  const dim = getDaysInMonth(new Date(y!, m! - 1, 1))
  const day = Math.min(Math.max(1, Math.round(dayOfMonth)), dim)
  const iso = `${month}-${String(day).padStart(2, '0')}`
  if (cycleStartDay <= 1) return iso
  // A recurring day earlier than the cycle start falls in the following calendar
  // month, otherwise it would land outside the cycle it is meant to post in.
  if (day >= cycleStartDay) return iso
  const next = addMonths(new Date(y!, m! - 1, 1), 1)
  const nextDim = getDaysInMonth(next)
  const nextDay = Math.min(day, nextDim)
  return format(new Date(next.getFullYear(), next.getMonth(), nextDay), 'yyyy-MM-dd')
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function yesterdayISO(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return format(d, 'yyyy-MM-dd')
}

/** Recurring templates use 1–28 to avoid month-end edge cases. */
export function clampDayOfMonth(day: number): number {
  if (!Number.isFinite(day)) return 1
  return Math.min(28, Math.max(1, Math.round(day)))
}

export function todayDayOfMonth(): number {
  return clampDayOfMonth(new Date().getDate())
}

export function nowISO(): string {
  return new Date().toISOString()
}
