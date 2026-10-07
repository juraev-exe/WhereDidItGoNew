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
  budgetProgress,
  computeExecutiveKpis,
  computeBudgetRunway,
  detailedSpendByCategoryInRange,
  isEssentialCategory,
  rangeForPeriod,
  spendSeries,
  transactionsForCategoryInRange,
} from '../src/services/stats.ts'
import { generateAnalyticsReportCsv } from '../src/services/export.ts'
import { parseBankNotification, matchCategory } from '../src/services/smsParser.ts'

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

console.log('\n— flexible period filtering & reports export (Phase 4) —')
const pRef = new Date(2026, 7, 10) // 2026-08-10

const rThisMonth = rangeForPeriod('this_month', pRef)
eq('range this_month start', rThisMonth.start, '2026-08-01')
eq('range this_month end', rThisMonth.end, '2026-08-31')

const rLastMonth = rangeForPeriod('last_month', pRef)
eq('range last_month start', rLastMonth.start, '2026-07-01')
eq('range last_month end', rLastMonth.end, '2026-07-31')

const rQtd = rangeForPeriod('qtd', pRef)
eq('range qtd start', rQtd.start, '2026-07-01')
eq('range qtd end', rQtd.end, '2026-08-10')

const rYtd = rangeForPeriod('ytd', pRef)
eq('range ytd start', rYtd.start, '2026-01-01')
eq('range ytd end', rYtd.end, '2026-08-10')

const r7d = rangeForPeriod('7d', pRef)
eq('range 7d start', r7d.start, '2026-08-04')
eq('range 7d end', r7d.end, '2026-08-10')

const r30d = rangeForPeriod('30d', pRef)
eq('range 30d start', r30d.start, '2026-07-12')
eq('range 30d end', r30d.end, '2026-08-10')

const rAll = rangeForPeriod('all', pRef)
eq('range all start', rAll.start, null)
eq('range all end', rAll.end, '2026-08-10')

// CSV report generation check
const mockDetailedCats = detailedSpendByCategoryInRange(mockTx, mockCategories, mockRange)
const mockAccounts = [{ id: 'a1', name: 'Main Checking' }]

const csvOutput = generateAnalyticsReportCsv({
  transactions: mockTx,
  categories: mockCategories,
  accounts: mockAccounts,
  range: mockRange,
  rangeLabel: 'Aug 1 – Aug 30, 2026',
  period: 'this_month',
  kpis,
  detailedCategories: mockDetailedCats,
  currency: 'USD',
})

eq('csv starts with UTF-8 BOM', csvOutput.startsWith('\ufeff'), true)
eq('csv contains title', csvOutput.includes('"WhereDidItGo Financial Analytics Report"'), true)
eq('csv contains period', csvOutput.includes('"this_month"'), true)
eq('csv contains Total Inflow row', csvOutput.includes('"Total Inflow","1000.00","USD"'), true)
eq('csv contains Total Outflow row', csvOutput.includes('"Total Outflow","500.00","USD"'), true)
eq('csv contains Category breakdown', csvOutput.includes('"Groceries","(All)","300.00","60%","2"'), true)
eq('csv contains Subcategory row', csvOutput.includes('"Groceries","Produce","200.00","40%","1"'), true)
eq('csv contains escaped transactions', csvOutput.includes('"Fresh apples"'), true)

console.log('\n— bank SMS and push notification parser (Phase 6) —')
const pAlif = parseBankNotification('Pokupka: 78.50 TJS v "Paykar Supermarket". Balans: 350.00 TJS', 'Alif Bank')
eq('alif bank amount', pAlif?.amount, 7850)
eq('alif bank type', pAlif?.type, 'expense')
eq('alif bank note', pAlif?.note, 'Paykar Supermarket')
eq('alif bank matchedKeyword', pAlif?.matchedKeyword, 'groceries')

const pChase = parseBankNotification('Chase: Your debit card was charged $34.20 at WHOLE FOODS MARKET.', 'Chase')
eq('chase amount', pChase?.amount, 3420)
eq('chase type', pChase?.type, 'expense')
eq('chase note', pChase?.note, 'WHOLE FOODS MARKET')
eq('chase category match', matchCategory(pChase, mockCategories)?.id, 'cat-groceries')

const pTinkoff = parseBankNotification('Pokupka 850 RUB v Yandex Go. Karta *4821.', 'T-Bank')
eq('tinkoff amount', pTinkoff?.amount, 85000)
eq('tinkoff type', pTinkoff?.type, 'expense')
eq('tinkoff note', pTinkoff?.note, 'Yandex Go')
eq('tinkoff matchedKeyword', pTinkoff?.matchedKeyword, 'transport')

const pIncome = parseBankNotification('Postuplenie: 1000.00 TJS. Perevod ot Anvar.', 'Eskhata')
eq('income amount', pIncome?.amount, 100000)
eq('income type', pIncome?.type, 'income')
eq('income category match', matchCategory(pIncome, mockCategories)?.id, 'cat-salary')

const pInvalid = parseBankNotification('Hello how are you doing today?')
eq('invalid sms returns null', pInvalid, null)

console.log('\n— ZBB rollover envelope calculation (Phase 7) —')
const rolloverBudgets = [
  { id: 'b-jul', categoryId: 'cat-groceries', month: '2026-07', limitAmount: 50000, rollover: true },
  { id: 'b-aug', categoryId: 'cat-groceries', month: '2026-08', limitAmount: 30000, rollover: true },
]
// 1) Surplus test: spent 40000 in July (budget 50000) -> +10000 surplus rolled over to August
const surplusTx = [
  { id: 't-jul', type: 'expense', amount: 40000, date: '2026-07-15', accountId: 'a1', categoryId: 'cat-groceries', note: '' },
  { id: 't-aug', type: 'expense', amount: 25000, date: '2026-08-10', accountId: 'a1', categoryId: 'cat-groceries', note: '' },
]
const progSurplus = budgetProgress(rolloverBudgets, surplusTx, mockCategories, '2026-08')
eq('surplus rollover amount', progSurplus[0]?.rollover, 10000)
eq('surplus effective limit', progSurplus[0]?.effectiveLimit, 40000)
eq('surplus remaining', progSurplus[0]?.remaining, 15000)
eq('surplus percent', progSurplus[0]?.percent, 62.5)

// 2) Deficit test: spent 60000 in July (budget 50000) -> -10000 deficit rolled over to August
const deficitTx = [
  { id: 't-jul-2', type: 'expense', amount: 60000, date: '2026-07-20', accountId: 'a1', categoryId: 'cat-groceries', note: '' },
  { id: 't-aug-2', type: 'expense', amount: 10000, date: '2026-08-10', accountId: 'a1', categoryId: 'cat-groceries', note: '' },
]
const progDeficit = budgetProgress(rolloverBudgets, deficitTx, mockCategories, '2026-08')
eq('deficit rollover amount', progDeficit[0]?.rollover, -10000)
eq('deficit effective limit', progDeficit[0]?.effectiveLimit, 20000)
eq('deficit remaining', progDeficit[0]?.remaining, 10000)
eq('deficit percent', progDeficit[0]?.percent, 50)

// 3) Non-rollover budget remains unaffected
const nonRolloverBudgets = [
  { id: 'b-jul-nr', categoryId: 'cat-groceries', month: '2026-07', limitAmount: 50000, rollover: false },
  { id: 'b-aug-nr', categoryId: 'cat-groceries', month: '2026-08', limitAmount: 30000, rollover: false },
]
const progNr = budgetProgress(nonRolloverBudgets, surplusTx, mockCategories, '2026-08')
eq('non-rollover rollover is 0', progNr[0]?.rollover, 0)
eq('non-rollover effective limit is original limit', progNr[0]?.effectiveLimit, 30000)

console.log(failures ? `\n${failures} FAILURES` : '\nAll unit checks passed.')
process.exit(failures ? 1 : 0)
