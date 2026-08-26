/** Shared boot + seed helpers for the audit/screenshot scripts. */
import { chromium } from 'playwright'

export const BASE = process.env.WDG_BASE ?? 'http://127.0.0.1:5173'

export async function boot({ headless = true } = {}) {
  const browser = await chromium.launch({ headless })
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'en-US',
  })
  const page = await context.newPage()
  const problems = []
  const state = { stage: 'boot' }
  page.on('pageerror', (e) => problems.push(`[${state.stage}] PAGEERROR: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() !== 'error' && m.type() !== 'warning') return
    const text = m.text()
    if (text.includes('Vue Devtools')) return
    // Raised by our own reset step racing Dexie's open connection.
    if (text.includes("wants to delete database 'wherediditgo'")) return
    problems.push(`[${state.stage}] ${m.type().toUpperCase()}: ${text}`)
  })
  return { browser, context, page, problems, state }
}

export async function resetDb(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(700)
  await page.evaluate(async () => {
    const dbs = (await indexedDB.databases?.()) ?? []
    await Promise.all(
      dbs
        .filter((d) => d.name)
        .map(
          (d) =>
            new Promise((res) => {
              const r = indexedDB.deleteDatabase(d.name)
              r.onsuccess = r.onerror = r.onblocked = () => res()
            }),
        ),
    )
    localStorage.clear()
  })
}

export async function completeOnboarding(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  const next = page.getByRole('button', { name: /^next$/i })
  if (!(await next.count())) return false
  await next.first().click()
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: /^next$/i }).first().click()
  await page.waitForTimeout(400)
  const skip = page.getByRole('button', { name: /^skip$/i })
  if (await skip.count()) await skip.first().click()
  await page.waitForTimeout(1400)
  return true
}

/** Writes a realistic dataset straight into Dexie's IndexedDB stores. */
export async function seed(page) {
  return page.evaluate(async () => {
    const idb = await new Promise((res, rej) => {
      const r = indexedDB.open('wherediditgo')
      r.onsuccess = () => res(r.result)
      r.onerror = () => rej(r.error)
    })
    const all = (s) =>
      new Promise((res, rej) => {
        const r = idb.transaction(s).objectStore(s).getAll()
        r.onsuccess = () => res(r.result)
        r.onerror = () => rej(r.error)
      })
    const putAll = (s, rows) =>
      new Promise((res, rej) => {
        const tx = idb.transaction(s, 'readwrite')
        const os = tx.objectStore(s)
        rows.forEach((r) => os.put(r))
        tx.oncomplete = () => res()
        tx.onerror = () => rej(tx.error)
      })

    const accounts = await all('accounts')
    const categories = await all('categories')
    const expense = categories.filter((c) => c.kind === 'expense')
    const income = categories.filter((c) => c.kind === 'income')
    const acc = accounts[0]
    const acc2 = accounts[1] ?? accounts[0]
    const pad = (n) => String(n).padStart(2, '0')
    const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

    const withSubs = {
      ...expense[0],
      subcategories: [
        { id: 'sub_groceries', name: 'Groceries', icon: 'shopping-cart' },
        { id: 'sub_dining', name: 'Dining out', icon: 'utensils' },
      ],
    }
    await putAll('categories', [withSubs])

    const txs = []
    const now = new Date()
    let n = 0
    let cashDelta = 0
    let savingsDelta = 0
    const bump = (accountId, delta) => {
      if (accountId === acc.id) cashDelta += delta
      else savingsDelta += delta
    }
    for (let back = 0; back < 75; back++) {
      const d = new Date(now)
      d.setDate(d.getDate() - back)
      const perDay = back % 3 === 0 ? 2 : 1
      for (let i = 0; i < perDay; i++) {
        const cat = expense[(back + i) % expense.length]
        const accountId = back % 5 === 0 ? acc2.id : acc.id
        const amount = 500 + ((back * 137 + i * 911) % 9500)
        txs.push({
          id: `tx_seed_${n++}`,
          type: 'expense',
          amount,
          accountId,
          categoryId: cat.id,
          subcategoryId: cat.id === withSubs.id ? 'sub_groceries' : undefined,
          note: i === 0 ? '' : 'Seeded note',
          date: iso(d),
          createdAt: d.toISOString(),
          updatedAt: d.toISOString(),
        })
        bump(accountId, -amount)
      }
      if (back % 30 === 5) {
        txs.push({
          id: `tx_seed_${n++}`,
          type: 'income',
          amount: 250000,
          accountId: acc.id,
          categoryId: income[0].id,
          note: 'Salary',
          date: iso(d),
          createdAt: d.toISOString(),
          updatedAt: d.toISOString(),
        })
        bump(acc.id, 250000)
      }
    }
    txs.push({
      id: `tx_seed_${n++}`,
      type: 'transfer',
      amount: 50000,
      accountId: acc.id,
      toAccountId: acc2.id,
      note: 'Move to savings',
      date: iso(now),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    })
    bump(acc.id, -50000)
    bump(acc2.id, 50000)
    await putAll('transactions', txs)
    await putAll('accounts', [
      { ...acc, balance: cashDelta },
      ...(acc2.id === acc.id ? [] : [{ ...acc2, balance: savingsDelta }]),
    ])

    const month = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`
    await putAll(
      'budgets',
      expense.slice(0, 4).map((c, i) => ({
        id: `bud_seed_${i}`,
        categoryId: c.id,
        month,
        limitAmount: [40000, 25000, 90000, 15000][i],
      })),
    )
    await putAll('goals', [
      {
        id: 'goal_seed_1',
        name: 'New laptop',
        targetAmount: 200000,
        currentAmount: 65000,
        color: '#0b6e6a',
        icon: 'piggy-bank',
        createdAt: now.toISOString(),
      },
    ])
    await putAll('recurring', [
      {
        id: 'rec_seed_1',
        type: 'expense',
        amount: 1200,
        accountId: acc.id,
        categoryId: expense[0].id,
        note: 'Streaming',
        dayOfMonth: 5,
        lastPostedMonth: month,
        createdAt: now.toISOString(),
      },
    ])
    await putAll('debts', [
      {
        id: 'debt_seed_1',
        type: 'lent',
        personName: 'Alex',
        amount: 12000,
        paidAmount: 4000,
        status: 'active',
        dueDate: iso(new Date(now.getFullYear(), now.getMonth() + 1, 3)),
        note: 'Concert tickets',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: 'debt_seed_2',
        type: 'borrowed',
        personName: 'Sam',
        amount: 7550,
        paidAmount: 0,
        status: 'active',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    ])
    idb.close()
    return { txs: txs.length, accounts: accounts.length, categories: categories.length }
  })
}

export async function bootSeeded(opts) {
  const ctx = await boot(opts)
  await resetDb(ctx.page)
  await completeOnboarding(ctx.page)
  const report = await seed(ctx.page)
  return { ...ctx, report }
}
