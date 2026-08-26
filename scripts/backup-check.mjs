/**
 * Backup round-trip check.
 *
 * Exports a backup, wipes the database, re-imports and verifies nothing was
 * lost — subcategories and `subcategoryId` in particular used to be dropped
 * silently on both the write path and the restore path.
 *
 * Requires the Vite dev server (it imports the app's TypeScript modules by URL),
 * so run it against `npm run dev`, not a production preview.
 *
 *   node scripts/backup-check.mjs
 */
import { bootSeeded, BASE } from './walk-lib.mjs'

const { browser, page, problems } = await bootSeeded()
await page.goto(BASE, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1400)

function check(label, ok, detail = '') {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}${ok ? '' : `  ${detail}`}`)
  if (!ok) problems.push(`[backup] ${label} ${detail}`)
}

const dumpAll = () =>
  page.evaluate(async () => {
    const idb = await new Promise((res) => {
      const r = indexedDB.open('wherediditgo')
      r.onsuccess = () => res(r.result)
    })
    const all = (s) =>
      new Promise((res) => {
        const r = idb.transaction(s).objectStore(s).getAll()
        r.onsuccess = () => res(r.result)
      })
    const out = {}
    for (const store of ['accounts', 'categories', 'budgets', 'transactions', 'goals', 'recurring', 'debts']) {
      out[store] = await all(store)
    }
    idb.close()
    return out
  })

const before = await dumpAll()
check('seed has a category with subcategories', before.categories.some((c) => c.subcategories?.length))
check('seed has transactions carrying a subcategoryId', before.transactions.some((t) => t.subcategoryId))
check('seed has debts', before.debts.length > 0)

// Build the backup through the app's own exporter, then restore it.
const json = await page.evaluate(async () => {
  const mod = await import('/services/backup.ts')
  return JSON.stringify(await mod.buildBackup())
})
const payload = JSON.parse(json)
check('backup declares version 2', payload.version === 2, `got ${payload.version}`)
check('backup keeps subcategories', payload.categories.some((c) => c.subcategories?.length))
check('backup keeps subcategoryId', payload.transactions.some((t) => t.subcategoryId))

const restored = await page.evaluate(async (raw) => {
  const mod = await import('/services/backup.ts')
  const { db } = await import('/db/index.ts')
  await db.transaction(
    'rw',
    [db.accounts, db.categories, db.budgets, db.transactions, db.goals, db.recurring, db.debts],
    async () => {
      await Promise.all([
        db.accounts.clear(),
        db.categories.clear(),
        db.budgets.clear(),
        db.transactions.clear(),
        db.goals.clear(),
        db.recurring.clear(),
        db.debts.clear(),
      ])
    },
  )
  await mod.replaceFromBackup(mod.parseBackupJson(raw))
  return true
}, json)
check('restore completed', restored === true)

const after = await dumpAll()
for (const store of ['accounts', 'categories', 'budgets', 'transactions', 'goals', 'recurring', 'debts']) {
  check(
    `${store} row count survives the round trip`,
    after[store].length === before[store].length,
    `${before[store].length} → ${after[store].length}`,
  )
}
check(
  'subcategories survive the round trip',
  after.categories.some((c) => c.subcategories?.length),
)
check(
  'subcategoryId survives the round trip',
  after.transactions.some((t) => t.subcategoryId),
)
check(
  'debt amounts are unchanged (still minor units)',
  after.debts.every((d) => before.debts.find((b) => b.id === d.id)?.amount === d.amount),
)

// A v1 backup carried debts in major units and must be scaled on import.
const legacyScaled = await page.evaluate(async () => {
  const mod = await import('/services/backup.ts')
  const v1 = {
    version: 1,
    exportedAt: new Date().toISOString(),
    meta: { currency: 'USD' },
    accounts: [
      { id: 'a', name: 'A', type: 'cash', balance: 0, currency: 'USD', color: '#000', archived: false, createdAt: '2026-01-01' },
    ],
    categories: [{ id: 'c', name: 'C', kind: 'expense', icon: 'circle', color: '#000', sortOrder: 0 }],
    budgets: [],
    transactions: [],
    debts: [
      { id: 'd', type: 'lent', personName: 'P', amount: 120.5, paidAmount: 40.25, status: 'active', createdAt: '2026-01-01', updatedAt: '2026-01-01' },
    ],
  }
  return mod.validateBackup(v1).debts[0]
})
check(
  'v1 backup debts are converted to minor units',
  legacyScaled.amount === 12050 && legacyScaled.paidAmount === 4025,
  JSON.stringify(legacyScaled),
)

await browser.close()
console.log(problems.length ? `\n${problems.length} problems` : '\nBackup round trip is lossless.')
process.exit(problems.length ? 1 : 0)
