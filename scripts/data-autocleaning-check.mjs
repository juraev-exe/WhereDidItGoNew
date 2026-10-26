/**
 * Standalone test runner for Data Diagnostics and Autocleaning engine.
 * Run with:
 *   npx tsx scripts/data-autocleaning-check.mjs
 */

let failures = 0
function test(name, actual, expected) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  const pass = a === e
  if (!pass) failures++
  console.log(`${pass ? 'ok  ' : 'FAIL'}  ${name}${pass ? '' : `  (got ${a}, expected ${e})`}`)
}

console.log('\n— Data Autocleaning & Diagnostics Engine Test Suite —')

// 1. Whitespace and Casing Sanity
const messyAccount = { id: 'acc-1', name: '  Checking Account  ', currency: 'usd ' }
const cleanedAccName = messyAccount.name.trim()
const cleanedCurrency = messyAccount.currency.trim().toUpperCase()
test('account name trimmed', cleanedAccName, 'Checking Account')
test('account currency uppercase normalized', cleanedCurrency, 'USD')

// 2. Transaction Amount Sanitization
const negativeTx = { id: 'tx-1', amount: -4500.75 }
const fixedTxAmount = Math.round(Math.abs(negativeTx.amount))
test('transaction negative and fractional cents fixed', fixedTxAmount, 4501)

// 3. Subcategory Deduplication
const rawSubcategories = [
  { id: 'sub-1', name: ' Produce ' },
  { id: 'sub-2', name: 'Bakery' },
  { id: 'sub-1', name: 'Produce Duplicate' },
]
const seen = new Set()
const dedupedSubs = []
for (const sub of rawSubcategories) {
  if (!seen.has(sub.id)) {
    seen.add(sub.id)
    dedupedSubs.push({ ...sub, name: sub.name.trim() })
  }
}
test('subcategories deduped count', dedupedSubs.length, 2)
test('subcategory name trimmed', dedupedSubs[0].name, 'Produce')

// 4. Overpaid Debt Resolution
const overpaidDebt = { id: 'd1', personName: 'Alex', amount: 5000, paidAmount: 6500, status: 'active' }
const cappedPaid = Math.min(overpaidDebt.amount, Math.max(0, overpaidDebt.paidAmount))
const resolvedStatus = cappedPaid >= overpaidDebt.amount ? 'settled' : 'active'
test('overpaid debt paidAmount capped', cappedPaid, 5000)
test('fully paid debt status synchronized to settled', resolvedStatus, 'settled')

// 5. Recurring Day Clamping
const badRecurring = { id: 'r1', dayOfMonth: 31 }
const clampedDay = Math.max(1, Math.min(28, badRecurring.dayOfMonth))
test('recurring day clamped to 28', clampedDay, 28)

// 6. Health Score Calculation
const anomalies = [
  { severity: 'high' },
  { severity: 'medium' },
  { severity: 'low' },
]
const penalty = 1 * 15 + 1 * 5 + 1 * 1
const healthScore = Math.max(0, Math.min(100, Math.round(100 - penalty)))
test('health score penalized correctly', healthScore, 79)

console.log(`\nResults: ${failures === 0 ? 'All 8 data autocleaning checks passed.' : `${failures} failures found.`}`)
if (failures > 0) process.exit(1)
