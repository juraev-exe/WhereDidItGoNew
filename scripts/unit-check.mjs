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
import {
  computeExecutiveKpis,
  computeBudgetRunway,
  detailedSpendByCategoryInRange,
  isEssentialCategory,
  spendSeries,
  transactionsForCategoryInRange,
} from '../src/services/stats.ts'

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

console.log('\n— executive financial kpis & pacing engine —')
const mockCategories = [
  {
    id: 'cat-groceries',
    name: 'Groceries',
    kind: 'expense',
    icon: 'utensils',
    color: '#e07a5f',
    sortOrder: 0,
    subcategories: [
      { id: 'sub-produce', name: 'Produce' },
      { id: 'sub-snacks', name: 'Snacks' },
    ],
  },
  { id: 'cat-bills', name: 'Utilities', kind: 'expense', icon: 'receipt', color: '#118ab2', sortOrder: 1 },
  { id: 'cat-games', name: 'Entertainment', kind: 'expense', icon: 'clapperboard', color: '#9b5de5', sortOrder: 2 },
  { id: 'cat-salary', name: 'Salary', kind: 'income', icon: 'briefcase', color: '#2a9d8f', sortOrder: 0 },
]

eq('essential category check: utensils is essential', isEssentialCategory(mockCategories[0]), true)
eq('essential category check: entertainment is discretionary', isEssentialCategory(mockCategories[2]), false)

const mockRange = { start: '2026-08-01', end: '2026-08-30' } // 30 days
const mockPrior = { start: '2026-07-02', end: '2026-07-31' } // 30 days
const mockRefDate = new Date(2026, 7, 10) // 10 days elapsed (Aug 1 to Aug 10)

const mockTx = [
  // Income in range: $1000
  { id: 't1', type: 'income', amount: 100000, date: '2026-08-02', accountId: 'a1', categoryId: 'cat-salary', note: '' },
  // Essential expense: $300 (split into produce $200 and snacks $100)
  { id: 't2a', type: 'expense', amount: 20000, date: '2026-08-05', accountId: 'a1', categoryId: 'cat-groceries', subcategoryId: 'sub-produce', note: 'Fresh apples' },
  { id: 't2b', type: 'expense', amount: 10000, date: '2026-08-06', accountId: 'a1', categoryId: 'cat-groceries', subcategoryId: 'sub-snacks', note: 'Chips' },
  // Discretionary expense: $200
  { id: 't3', type: 'expense', amount: 20000, date: '2026-08-08', accountId: 'a1', categoryId: 'cat-games', note: '' },
  // Prior range expense: $400 over 30 days = ~$13.33/day
  { id: 't4', type: 'expense', amount: 40000, date: '2026-07-15', accountId: 'a1', categoryId: 'cat-groceries', note: '' },
]

const kpis = computeExecutiveKpis(mockTx, mockCategories, mockRange, mockPrior, mockRefDate)

// Income = 1000, Expense = 500 -> Savings = (1000 - 500) / 1000 = 50%
eq('savings rate percentage', kpis.savingsRate.pct, 50)
eq('savings rate tone is good for >= 20%', kpis.savingsRate.tone, 'good')

// 10 elapsed days, 50000 expense -> 5000 / day
eq('daily burn rate current daily', kpis.dailyBurn.currentDaily, 5000)
// 30 days in prior range, 40000 expense -> 1333 / day
eq('daily burn rate prior daily', kpis.dailyBurn.priorDaily, 1333)
// delta = (5000 - 1333) / 1333 = ~275%
eq('daily burn rate delta pct', kpis.dailyBurn.deltaPct, 275)

// 30 days total, 10 elapsed -> 20 remaining. Projected = 50000 + 5000 * 20 = 150000
eq('projected spend days remaining', kpis.projectedSpend.daysRemaining, 20)
eq('projected spend total amount', kpis.projectedSpend.projectedAmount, 150000)

// Essential: 30000 (60%), Discretionary: 20000 (40%)
eq('essential percentage', kpis.essentialRatio.essentialPct, 60)
eq('discretionary percentage', kpis.essentialRatio.discretionaryPct, 40)

// Edge cases
const zeroIncomeKpis = computeExecutiveKpis(
  [{ id: 't-e', type: 'expense', amount: 2000, date: '2026-08-01', accountId: 'a1', note: '' }],
  mockCategories,
  mockRange,
  null,
  mockRefDate,
)
eq('zero income edge case savings rate is -100%', zeroIncomeKpis.savingsRate.pct, -100)
eq('zero income edge case tone is warn', zeroIncomeKpis.savingsRate.tone, 'warn')

const zeroAllKpis = computeExecutiveKpis([], mockCategories, mockRange, null, mockRefDate)
eq('zero activity savings rate is 0%', zeroAllKpis.savingsRate.pct, 0)
eq('zero activity tone is neutral', zeroAllKpis.savingsRate.tone, 'neutral')

console.log('\n— interactive cash flow & category distribution (Phase 2) —')
const detailed = detailedSpendByCategoryInRange(mockTx, mockCategories, mockRange)
eq('detailed category count', detailed.length, 2)
eq('top category is groceries', detailed[0].categoryId, 'cat-groceries')
eq('groceries total amount', detailed[0].amount, 30000)
eq('groceries total txCount', detailed[0].txCount, 2)
eq('groceries subcategories count', detailed[0].subcategories.length, 2)
eq('produce subcategory amount', detailed[0].subcategories[0].amount, 20000)
eq('produce subcategory percent', Math.round(detailed[0].subcategories[0].percent), 67)
eq('snacks subcategory amount', detailed[0].subcategories[1].amount, 10000)
eq('snacks subcategory percent', Math.round(detailed[0].subcategories[1].percent), 33)

// Drill-down filtering
const groceryTxs = transactionsForCategoryInRange(mockTx, 'cat-groceries', mockRange)
eq('drill-down all groceries tx count', groceryTxs.length, 2)

const produceTxs = transactionsForCategoryInRange(mockTx, 'cat-groceries', mockRange, 'sub-produce')
eq('drill-down sub-produce tx count', produceTxs.length, 1)
eq('drill-down sub-produce tx note', produceTxs[0].note, 'Fresh apples')

// Cash flow series with net
const seriesDays = spendSeries(mockTx, mockRange, 'day', 'en')
const incomeDay = seriesDays.find((d) => d.date === '2026-08-02')
eq('cash flow income day inflow', incomeDay?.income, 100000)
eq('cash flow income day outflow', incomeDay?.expense, 0)
eq('cash flow income day net', incomeDay?.net, 100000)

const expenseDay = seriesDays.find((d) => d.date === '2026-08-05')
eq('cash flow expense day inflow', expenseDay?.income, 0)
eq('cash flow expense day outflow', expenseDay?.expense, 20000)
eq('cash flow expense day net', expenseDay?.net, -20000)

console.log('\n— budget runway & burn-rate gauge (Phase 3) —')
const mockBudgets = [
  { id: 'b-groceries', categoryId: 'cat-groceries', month: '2026-08', limitAmount: 50000 },
  { id: 'b-games', categoryId: 'cat-games', month: '2026-08', limitAmount: 10000 },
  { id: 'b-bills', categoryId: 'cat-bills', month: '2026-08', limitAmount: 40000 },
]

const runway = computeBudgetRunway(mockTx, mockBudgets, mockCategories, '2026-08', mockRefDate)
eq('runway month', runway.month, '2026-08')
eq('runway elapsed days', runway.elapsedDays, 10)
eq('runway total days', runway.totalDays, 31)
eq('runway elapsed percent', runway.elapsedPercent, 32)
eq('runway overall spent percent', runway.overallSpentPercent, 50)
eq('runway overall severity is over-budget', runway.overallSeverity, 'over-budget')
eq('runway category count', runway.categories.length, 3)

// Sort worst first: over-budget (games) -> at-risk (groceries) -> on-track (bills)
eq('runway top category is games (over-budget)', runway.categories[0].categoryId, 'cat-games')
eq('games severity', runway.categories[0].severity, 'over-budget')
eq('games spentPercent', runway.categories[0].spentPercent, 200)
eq('games pacingDelta', runway.categories[0].pacingDelta, 168)
eq('games projectedExhaustionDay is null when already over', runway.categories[0].projectedExhaustionDay, null)

eq('runway second category is groceries (at-risk)', runway.categories[1].categoryId, 'cat-groceries')
eq('groceries severity', runway.categories[1].severity, 'at-risk')
eq('groceries spentPercent', runway.categories[1].spentPercent, 60)
eq('groceries pacingDelta', runway.categories[1].pacingDelta, 28)
eq('groceries projectedExhaustionDay', runway.categories[1].projectedExhaustionDay, 17)

eq('runway third category is bills (on-track)', runway.categories[2].categoryId, 'cat-bills')
eq('bills severity', runway.categories[2].severity, 'on-track')
eq('bills spentPercent', runway.categories[2].spentPercent, 0)
eq('bills pacingDelta', runway.categories[2].pacingDelta, -32)

// Edge cases
const emptyRunway = computeBudgetRunway(mockTx, [], mockCategories, '2026-08', mockRefDate)
eq('empty budgets runway categories count', emptyRunway.categories.length, 0)
eq('empty budgets runway overall spent percent', emptyRunway.overallSpentPercent, 0)
eq('empty budgets runway overall severity is on-track', emptyRunway.overallSeverity, 'on-track')

const onTrackBudgets = [
  { id: 'b-groceries', categoryId: 'cat-groceries', month: '2026-08', limitAmount: 200000 },
]
const onTrackRunway = computeBudgetRunway(mockTx, onTrackBudgets, mockCategories, '2026-08', mockRefDate)
eq('on-track single category severity', onTrackRunway.categories[0].severity, 'on-track')
eq('on-track overall severity is on-track', onTrackRunway.overallSeverity, 'on-track')

console.log(failures ? `\n${failures} FAILURES` : '\nAll unit checks passed.')
process.exit(failures ? 1 : 0)
