/**
 * Tajik (`tg`) date names.
 *
 * Chromium — and therefore the Android WebView this app ships in — carries no
 * CLDR data for `tg`: `new Intl.DateTimeFormat('tg')` silently resolves to
 * `en-US`, so every date in the Tajik UI came out in English. These tables let
 * the date helpers format Tajik dates themselves when the platform cannot.
 */

const MONTHS_LONG = [
  'Январ',
  'Феврал',
  'Март',
  'Апрел',
  'Май',
  'Июн',
  'Июл',
  'Август',
  'Сентябр',
  'Октябр',
  'Ноябр',
  'Декабр',
] as const

const MONTHS_SHORT = [
  'Янв',
  'Фев',
  'Мар',
  'Апр',
  'Май',
  'Июн',
  'Июл',
  'Авг',
  'Сен',
  'Окт',
  'Ноя',
  'Дек',
] as const

/** Sunday-first, matching `Date.prototype.getDay()`. */
const WEEKDAYS_SHORT = ['Яшб', 'Дшб', 'Сшб', 'Чшб', 'Пшб', 'Ҷум', 'Шнб'] as const

const WEEKDAYS_NARROW = ['Я', 'Д', 'С', 'Ч', 'П', 'Ҷ', 'Ш'] as const

let platformSupportsTajik: boolean | null = null

/** True when the runtime has real `tg` data and we should leave Intl alone. */
function intlHasTajik(): boolean {
  if (platformSupportsTajik !== null) return platformSupportsTajik
  try {
    platformSupportsTajik =
      new Intl.DateTimeFormat('tg', { month: 'long' }).resolvedOptions().locale.startsWith('tg')
  } catch {
    platformSupportsTajik = false
  }
  return platformSupportsTajik
}

/** True when we must format Tajik dates ourselves. */
export function needsTajikShim(locale: string): boolean {
  return locale.startsWith('tg') && !intlHasTajik()
}

export function tajikMonthYear(date: Date): string {
  return `${MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}`
}

export function tajikMonthShort(date: Date): string {
  return MONTHS_SHORT[date.getMonth()]!
}

/** e.g. `26 Авг` */
export function tajikDayMonth(date: Date): string {
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`
}

/** e.g. `Сшб, 26 Авг` (plus the year when it is not the current one). */
export function tajikWeekdayDay(date: Date, withYear: boolean): string {
  const base = `${WEEKDAYS_SHORT[date.getDay()]}, ${tajikDayMonth(date)}`
  return withYear ? `${base} ${date.getFullYear()}` : base
}

export function tajikWeekdayLabels(style: 'narrow' | 'short'): string[] {
  return [...(style === 'narrow' ? WEEKDAYS_NARROW : WEEKDAYS_SHORT)]
}
