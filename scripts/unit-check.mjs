/**
 * Pure-logic checks for the money and date helpers.
 *   npx tsx scripts/unit-check.mjs
 */
import {
  formatMoney,
  parseMoneyToMinor,
  evaluateAmountExpression,
  amountHasExpression,
} from '../src/lib/money.ts'
import {
  setCycleStartDay,
  monthKey,
  monthRange,
  isInMonth,
  daysInMonthKey,
  dateInMonth,
  previousMonthKey,
  parseLocalDay,
  clampDayOfMonth,
} from '../src/lib/dates.ts'

let failures = 0

function eq(label, actual, expected) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  const ok = a === e
  if (!ok) failures++
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}${ok ? '' : `  → ${a}, expected ${e}`}`)
}

console.log('\n— money —')
eq('USD before', formatMoney(123456, 'USD', 'en-US', 'before', false), '$1,234.56')
eq('USD negative', formatMoney(-123456, 'USD', 'en-US', 'before', false), '−$1,234.56')
eq('USD after', formatMoney(123456, 'USD', 'en-US', 'after', false), '1,234.56 $')
eq('TJS custom symbol', formatMoney(123456, 'TJS', 'en-US', 'before', false), 'с. 1,234.56')
eq('hide cents rounds', formatMoney(123456, 'USD', 'en-US', 'before', true), '$1,235')
eq('decimal point', parseMoneyToMinor('12.34'), 1234)
eq('decimal comma', parseMoneyToMinor('12,34'), 1234)
eq('running sum', parseMoneyToMinor('13+24+50'), 8700)
eq('subtraction', parseMoneyToMinor('100-25'), 7500)
eq('empty', parseMoneyToMinor(''), 0)
eq('garbage', parseMoneyToMinor('abc'), 0)
eq('leading minus', evaluateAmountExpression('-5'), -500)
eq('detects expression', amountHasExpression('13+24'), true)
eq('plain number is not an expression', amountHasExpression('13.5'), false)

console.log('\n— calendar month (start = 1) —')
setCycleStartDay(1)
eq('Aug range', monthRange('2026-08'), { start: '2026-08-01', end: '2026-08-31' })
eq('key for Aug 26', monthKey(new Date(2026, 7, 26)), '2026-08')
eq('Aug 31 is in Aug', isInMonth('2026-08-31', '2026-08'), true)
eq('Sep 1 is not in Aug', isInMonth('2026-09-01', '2026-08'), false)
eq('Feb length', daysInMonthKey('2026-02'), 28)
eq('recurring day 5', dateInMonth('2026-08', 5), '2026-08-05')
eq('recurring day clamps to month end', dateInMonth('2026-02', 31), '2026-02-28')

console.log('\n— custom cycle (start = 15) —')
setCycleStartDay(15)
eq('Aug cycle', monthRange('2026-08'), { start: '2026-08-15', end: '2026-09-14' })
eq('Aug 14 belongs to Jul', monthKey(new Date(2026, 7, 14)), '2026-07')
eq('Aug 15 belongs to Aug', monthKey(new Date(2026, 7, 15)), '2026-08')
eq('Sep 14 in Aug cycle', isInMonth('2026-09-14', '2026-08'), true)
eq('Sep 15 not in Aug cycle', isInMonth('2026-09-15', '2026-08'), false)
eq('Aug cycle length', daysInMonthKey('2026-08'), 31)
eq('previous key is pure arithmetic', previousMonthKey('2026-08'), '2026-07')
eq('recurring day inside cycle', dateInMonth('2026-08', 20), '2026-08-20')
eq('recurring day rolls forward', dateInMonth('2026-08', 5), '2026-09-05')

console.log('\n— custom cycle (start = 28, short month) —')
setCycleStartDay(28)
eq('Feb cycle', monthRange('2026-02'), { start: '2026-02-28', end: '2026-03-27' })

console.log('\n— misc —')
setCycleStartDay(1)
eq('local day parse avoids UTC shift', parseLocalDay('2026-08-26').getDate(), 26)
eq('day clamp low', clampDayOfMonth(0), 1)
eq('day clamp high', clampDayOfMonth(31), 28)

console.log(failures ? `\n${failures} FAILURES` : '\nAll unit checks passed.')
process.exit(failures ? 1 : 0)
