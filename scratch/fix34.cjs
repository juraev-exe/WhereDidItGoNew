const fs = require('fs');
const file = 'src/services/backup.ts';
let content = fs.readFileSync(file, 'utf8');

// Replace upsertById and mergeFromBackup
const replacement = `async function upsertById<T extends { id: string, updatedAt?: string }>(
  table: { toArray: () => Promise<T[]>, bulkPut: (items: T[]) => Promise<unknown> },
  rows: T[] | undefined,
) {
  if (!rows?.length) return
  const existing = await table.toArray()
  const map = new Map(existing.map(r => [r.id, r]))
  const toPut = rows.filter(inc => {
    const curr = map.get(inc.id)
    if (!curr) return true
    if (inc.updatedAt && curr.updatedAt) return inc.updatedAt > curr.updatedAt
    return true
  })
  if (toPut.length > 0) await table.bulkPut(toPut)
}

async function getSignedFlowDelta(accountId: string, flow: 'in' | 'out', amount: number) {
  const acc = await db.accounts.get(accountId)
  if (acc?.type === 'credit') return flow === 'out' ? amount : -amount
  return flow === 'out' ? -amount : amount
}

async function applyMergeBalance(tx: import('@/types/finance').Transaction, dir: 1 | -1) {
  if (tx.type === 'expense') {
    const delta = await getSignedFlowDelta(tx.accountId, 'out', tx.amount)
    const acc = await db.accounts.get(tx.accountId)
    if (acc) await db.accounts.update(tx.accountId, { balance: acc.balance + (delta * dir) })
  } else if (tx.type === 'income') {
    const delta = await getSignedFlowDelta(tx.accountId, 'in', tx.amount)
    const acc = await db.accounts.get(tx.accountId)
    if (acc) await db.accounts.update(tx.accountId, { balance: acc.balance + (delta * dir) })
  } else if (tx.type === 'transfer') {
    const fromDelta = await getSignedFlowDelta(tx.accountId, 'out', tx.amount)
    const acc = await db.accounts.get(tx.accountId)
    if (acc) await db.accounts.update(tx.accountId, { balance: acc.balance + (fromDelta * dir) })
    if (tx.toAccountId) {
      const toDelta = await getSignedFlowDelta(tx.toAccountId, 'in', tx.amount)
      const toAcc = await db.accounts.get(tx.toAccountId)
      if (toAcc) await db.accounts.update(tx.toAccountId, { balance: toAcc.balance + (toDelta * dir) })
    }
  }
}

/** Merge backup rows by id. Does not clear existing data or overwrite app settings. */
export async function mergeFromBackup(payload: BackupPayload): Promise<void> {
  const data = clonePlain(validateBackup(payload))
  await db.transaction(
    'rw',
    [db.accounts, db.categories, db.budgets, db.transactions, db.goals, db.recurring, db.debts],
    async () => {
      if (data.accounts) {
        const existAccs = await db.accounts.toArray()
        const mapAcc = new Map(existAccs.map(a => [a.id, a]))
        data.accounts = data.accounts.map(inc => {
          const curr = mapAcc.get(inc.id)
          return curr ? { ...inc, balance: curr.balance } : inc
        })
      }

      await upsertById(db.accounts, data.accounts)
      await upsertById(db.categories, data.categories)
      await upsertById(db.budgets, data.budgets)
      await upsertById(db.goals, data.goals)
      await upsertById(db.recurring, data.recurring)
      await upsertById(db.debts, data.debts)

      if (data.transactions) {
        const existingTxs = await db.transactions.toArray()
        const txMap = new Map(existingTxs.map(t => [t.id, t]))
        const toPut = []
        for (const inc of data.transactions) {
          const curr = txMap.get(inc.id)
          if (!curr) {
            toPut.push(inc)
            await applyMergeBalance(inc, 1)
          } else if (inc.updatedAt > curr.updatedAt) {
            toPut.push(inc)
            await applyMergeBalance(curr, -1)
            await applyMergeBalance(inc, 1)
          }
        }
        if (toPut.length > 0) await db.transactions.bulkPut(toPut)
      }
    },
  )
}`;

content = content.replace(/async function upsertById[\s\S]*?export async function mergeFromBackup[\s\S]*?},\n  \)\n}/m, replacement);
fs.writeFileSync(file, content);
console.log('Done');
