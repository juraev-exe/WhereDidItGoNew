/**
 * Generates 12 high-craft 1080x1350 (4:5 portrait) Instagram mockups for WhereDidItGo,
 * plus a 4x3 visual contact sheet and an interactive HTML preview gallery with captions.
 *
 * Usage:
 *   node scripts/generate-instagram-mockups.mjs
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { createServer } from 'vite'
import { chromium } from 'playwright'

const ROOT = process.cwd()
const OUT_DIR = path.join(ROOT, 'marketing', 'instagram')
const RAW_DIR = path.join(OUT_DIR, 'screens')

async function toDataUri(filePath) {
  const buf = await fs.readFile(filePath)
  const ext = path.extname(filePath).toLowerCase()
  const mime = ext === '.svg' ? 'image/svg+xml' : 'image/png'
  return `data:${mime};base64,${buf.toString('base64')}`
}

async function seedMarketingData(page, baseUrl) {
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.waitForFunction(
    () =>
      new Promise((resolve) => {
        const r = indexedDB.open('wherediditgo')
        r.onsuccess = () => {
          const ok = r.result.objectStoreNames.contains('meta')
          r.result.close()
          resolve(ok)
        }
        r.onerror = () => resolve(false)
      }),
    null,
    { timeout: 25000 },
  )

  // Set premium flags in localStorage
  await page.evaluate(() => {
    localStorage.setItem('wdg_is_premium', 'true')
    localStorage.setItem('CapacitorStorage.wdg_is_premium', 'true')
  })

  // Step through onboarding if shown
  const stepButton = () =>
    page.getByRole('button', { name: /^(next|skip|finish|done|go to home|get started)$/i })
  for (let guard = 0; guard < 8; guard++) {
    const btn = stepButton()
    if (!(await btn.count())) break
    await btn.first().click()
    await page.waitForTimeout(450)
  }
  await page.waitForTimeout(600)

  // Write clean, realistic marketing dataset into Dexie IndexedDB
  await page.evaluate(async () => {
    localStorage.setItem('wdg_is_premium', 'true')
    localStorage.setItem('CapacitorStorage.wdg_is_premium', 'true')

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
    const clearStore = (s) =>
      new Promise((res, rej) => {
        const tx = idb.transaction(s, 'readwrite')
        tx.objectStore(s).clear()
        tx.oncomplete = () => res()
        tx.onerror = () => rej(tx.error)
      })
    const putAll = (s, rows) =>
      new Promise((res, rej) => {
        const tx = idb.transaction(s, 'readwrite')
        const os = tx.objectStore(s)
        rows.forEach((r) => os.put(r))
        tx.oncomplete = () => res()
        tx.onerror = () => rej(tx.error)
      })

    const now = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    const month = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`

    await putAll('meta', [
      { key: 'onboardingDone', value: 'true' },
      { key: 'currency', value: 'USD' },
      { key: 'currencyPosition', value: 'before' },
      { key: 'heroMetric', value: 'balance' },
      { key: 'privacyMode', value: 'none' },
      { key: 'hideAmounts', value: 'false' },
      { key: 'locale', value: 'en' },
      { key: 'theme', value: 'dark' },
      { key: 'colorScheme', value: 'teal' },
      { key: 'startOfMonth', value: '1' },
      { key: 'lastBackupAt', value: now.toISOString() },
    ])

    const categories = await all('categories')
    const expense = categories.filter((c) => c.kind === 'expense')
    const income = categories.filter((c) => c.kind === 'income')

    const findCat = (re, fallbackIdx = 0) =>
      expense.find((c) => re.test(c.name)) ?? expense[fallbackIdx % expense.length]

    const catFood = findCat(/food|grocer|dining/i, 0)
    const catTransport = findCat(/transport|car|transit/i, 1)
    const catBills = findCat(/bill|utilit|housing|rent/i, 2)
    const catShopping = findCat(/shop/i, 3)
    const catEnt = findCat(/entertain|fun/i, 4)
    const catHealth = findCat(/health|med/i, 5)

    if (catFood) {
      await putAll('categories', [
        {
          ...catFood,
          subcategories: [
            { id: 'sub_coffee', name: 'Coffee', icon: 'coffee' },
            { id: 'sub_groceries', name: 'Groceries', icon: 'shopping-cart' },
            { id: 'sub_dining', name: 'Dining out', icon: 'utensils' },
          ],
        },
      ])
    }

    await clearStore('accounts')
    const accounts = [
      {
        id: 'acc_checking',
        name: 'Main Checking',
        type: 'checking',
        balance: 984050,
        currency: 'USD',
        color: '#14b8a6',
        icon: 'landmark',
        archived: false,
        createdAt: now.toISOString(),
      },
      {
        id: 'acc_savings',
        name: 'Vault Savings',
        type: 'savings',
        balance: 520000,
        currency: 'USD',
        color: '#3b82f6',
        icon: 'piggy-bank',
        archived: false,
        createdAt: now.toISOString(),
      },
      {
        id: 'acc_cash',
        name: 'Cash Wallet',
        type: 'cash',
        balance: 71000,
        currency: 'USD',
        color: '#f59e0b',
        icon: 'wallet',
        archived: false,
        createdAt: now.toISOString(),
      },
    ]
    await putAll('accounts', accounts)

    await clearStore('transactions')
    const merchants = [
      { note: 'Whole Foods Market', cat: catFood, sub: 'sub_groceries', amt: 6420, acc: 'acc_checking' },
      { note: 'Blue Bottle Coffee', cat: catFood, sub: 'sub_coffee', amt: 680, acc: 'acc_cash' },
      { note: 'City Metro Pass', cat: catTransport, amt: 3200, acc: 'acc_checking' },
      { note: 'Fiber & Electric', cat: catBills, amt: 11840, acc: 'acc_checking' },
      { note: 'Apple iCloud & Music', cat: catEnt, amt: 1999, acc: 'acc_checking' },
      { note: 'Green Cross Pharmacy', cat: catHealth, amt: 2850, acc: 'acc_checking' },
      { note: 'Studio Bookshop', cat: catShopping, amt: 3490, acc: 'acc_checking' },
      { note: 'Ramen Nagi Dinner', cat: catFood, sub: 'sub_dining', amt: 2950, acc: 'acc_checking' },
    ]

    const txs = []
    let idx = 0

    // Add a clean split transaction today so Activity & Split look super authentic
    txs.push({
      id: `tx_mkt_${idx++}`,
      type: 'expense',
      amount: 8460,
      accountId: 'acc_checking',
      categoryId: catFood.id,
      note: 'Target Superstore Run',
      date: iso(now),
      splits: [
        { id: 'sp_1', amount: 5240, categoryId: catFood.id, subcategoryId: 'sub_groceries', note: 'Produce & pantry' },
        { id: 'sp_2', amount: 1920, categoryId: catShopping.id, note: 'Home essentials' },
        { id: 'sp_3', amount: 1300, categoryId: catHealth.id, note: 'Vitamins' },
      ],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    })

    for (let back = 0; back < 82; back++) {
      const d = new Date(now)
      d.setDate(d.getDate() - back)
      const count = back % 4 === 0 ? 2 : 1
      for (let k = 0; k < count; k++) {
        const m = merchants[(back + k * 3) % merchants.length]
        // Make previous 30-day stretch slightly higher so Insights says "You spent less"
        const mult = back >= 30 && back < 60 ? 1.45 : 0.85
        const jitter = ((back * 73 + k * 29) % 900) - 300
        const amount = Math.max(450, Math.round(m.amt * mult + jitter))
        txs.push({
          id: `tx_mkt_${idx++}`,
          type: 'expense',
          amount,
          accountId: m.acc,
          categoryId: m.cat.id,
          subcategoryId: m.sub,
          note: m.note,
          date: iso(d),
          createdAt: d.toISOString(),
          updatedAt: d.toISOString(),
        })
      }
      if (back === 2 || back === 32 || back === 62) {
        txs.push({
          id: `tx_mkt_${idx++}`,
          type: 'income',
          amount: 425000,
          accountId: 'acc_checking',
          categoryId: income[0]?.id ?? catFood.id,
          note: 'Product Design Salary',
          date: iso(d),
          createdAt: d.toISOString(),
          updatedAt: d.toISOString(),
        })
      }
    }
    await putAll('transactions', txs)

    await clearStore('budgets')
    const budgetSpecs = [
      { cat: catFood, limit: 65000 },
      { cat: catBills, limit: 90000 },
      { cat: catTransport, limit: 28000 },
      { cat: catShopping, limit: 35000 },
    ]
    await putAll(
      'budgets',
      budgetSpecs.map((b, i) => ({
        id: `bud_mkt_${i}`,
        categoryId: b.cat.id,
        month,
        limitAmount: b.limit,
        rollover: true,
      })),
    )

    await clearStore('goals')
    await putAll('goals', [
      {
        id: 'goal_tokyo',
        name: 'Tokyo Autumn Flight',
        targetAmount: 300000,
        currentAmount: 245000,
        color: '#14b8a6',
        icon: 'plane',
        createdAt: now.toISOString(),
      },
      {
        id: 'goal_emergency',
        name: 'Emergency 6-Mo Vault',
        targetAmount: 1000000,
        currentAmount: 820000,
        color: '#3b82f6',
        icon: 'shield',
        createdAt: now.toISOString(),
      },
      {
        id: 'goal_macbook',
        name: 'MacBook Pro Studio',
        targetAmount: 240000,
        currentAmount: 168000,
        color: '#8b5cf6',
        icon: 'laptop',
        createdAt: now.toISOString(),
      },
    ])

    await clearStore('debts')
    await putAll('debts', [
      {
        id: 'debt_alex',
        type: 'lent',
        personName: 'Alex Rivera',
        amount: 24000,
        paidAmount: 9000,
        status: 'active',
        dueDate: iso(new Date(now.getFullYear(), now.getMonth() + 1, 8)),
        note: 'Cabin weekend split',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: 'debt_maria',
        type: 'lent',
        personName: 'Maria Chen',
        amount: 8500,
        paidAmount: 0,
        status: 'active',
        dueDate: iso(new Date(now.getFullYear(), now.getMonth() + 1, 14)),
        note: 'Concert tickets',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: 'debt_sam',
        type: 'borrowed',
        personName: 'Samir K.',
        amount: 12000,
        paidAmount: 4500,
        status: 'active',
        note: 'Camera lens adapter',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    ])

    idb.close()
  })
}

async function updateMeta(page, entries) {
  await page.evaluate(async (rows) => {
    const idb = await new Promise((res, rej) => {
      const r = indexedDB.open('wherediditgo')
      r.onsuccess = () => res(r.result)
      r.onerror = () => rej(r.error)
    })
    await new Promise((res, rej) => {
      const tx = idb.transaction('meta', 'readwrite')
      const os = tx.objectStore('meta')
      rows.forEach((r) => os.put(r))
      tx.oncomplete = () => res()
      tx.onerror = () => rej(tx.error)
    })
    idb.close()
  }, entries)
}

async function captureAppScreens(browser, baseUrl) {
  await fs.mkdir(RAW_DIR, { recursive: true })
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    locale: 'en-US',
  })
  const page = await context.newPage()
  await seedMarketingData(page, baseUrl)

  const snap = async (route, fileName, afterNav) => {
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1100)
    if (afterNav) await afterNav()
    const out = path.join(RAW_DIR, fileName)
    await page.screenshot({ path: out })
    return out
  }

  // 1. Dark Home (English)
  await snap('/', 'home-dark.png')

  // 2. QuickAdd with inline math / amount & coffee subcategory
  await snap('/', 'quickadd.png', async () => {
    await page.locator('button.fab').click()
    await page.waitForTimeout(600)
    const amt = page.locator('.sheet-root input.amount-input')
    if (await amt.count()) {
      await amt.fill('13.50 + 4.80')
    }
    const coffeeChip = page.locator('.sheet-root').getByRole('button', { name: /^coffee$/i }).first()
    if (await coffeeChip.count()) {
      await coffeeChip.click({ timeout: 3000 }).catch(() => {})
    }
    await page.waitForTimeout(350)
  })

  // 3. QuickAdd Split Transaction Builder
  await snap('/', 'quickadd-split.png', async () => {
    await page.locator('button.fab').click()
    await page.waitForTimeout(600)
    const amt = page.locator('.sheet-root input.amount-input')
    if (await amt.count()) await amt.fill('84.60')
    const splitBtn = page.locator('.sheet-root .split-toggle-btn')
    if (await splitBtn.count()) {
      await splitBtn.click({ timeout: 3000 }).catch(() => {})
      await page.waitForTimeout(450)
      const splitInputs = page.locator('.sheet-root .split-amount-input')
      if ((await splitInputs.count()) >= 2) {
        await splitInputs.nth(0).fill('52.40')
        await splitInputs.nth(1).fill('32.20')
      }
    }
    await page.waitForTimeout(350)
  })

  // 4. Activity (Heatmap + real transactions)
  await snap('/activity', 'activity.png')

  // 5. Insights (30d executive summary)
  await snap('/insights', 'insights.png')

  // 6. Debts & Loans
  await snap('/debts', 'debts.png')

  // 7. Savings Goals
  await snap('/budgets', 'goals.png', async () => {
    const goalsTab = page.getByRole('tab', { name: /goals/i }).first()
    if (await goalsTab.count()) {
      await goalsTab.click()
      await page.waitForTimeout(550)
    } else {
      await page.getByRole('tab').nth(2).click()
      await page.waitForTimeout(550)
    }
  })

  // 8. Budgets with Payday Cycle (15th of month)
  await updateMeta(page, [{ key: 'startOfMonth', value: '15' }])
  await snap('/budgets', 'budgets-cycle.png', async () => {
    // Seed budgets for current cycle monthKey as well if startOfMonth shifted key
    await page.evaluate(async () => {
      const idb = await new Promise((res, rej) => {
        const r = indexedDB.open('wherediditgo')
        r.onsuccess = () => res(r.result)
        r.onerror = () => rej(r.error)
      })
      const buds = await new Promise((res) => {
        const r = idb.transaction('budgets').objectStore('budgets').getAll()
        r.onsuccess = () => res(r.result)
      })
      const now = new Date()
      const pad = (n) => String(n).padStart(2, '0')
      const prevM = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const altKey = `${prevM.getFullYear()}-${pad(prevM.getMonth() + 1)}`
      await new Promise((res) => {
        const tx = idb.transaction('budgets', 'readwrite')
        const os = tx.objectStore('budgets')
        buds.forEach((b, idx) => os.put({ ...b, id: `bud_alt_${idx}`, month: altKey }))
        tx.oncomplete = () => res()
      })
      idb.close()
    })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(900)
  })
  await updateMeta(page, [{ key: 'startOfMonth', value: '1' }])

  // 9. Privacy Blur Home (hero balance blurred)
  await updateMeta(page, [
    { key: 'privacyMode', value: 'all' },
    { key: 'hideAmounts', value: 'true' },
  ])
  await snap('/', 'home-blur.png')
  await updateMeta(page, [
    { key: 'privacyMode', value: 'none' },
    { key: 'hideAmounts', value: 'false' },
  ])

  // 10. Security & Privacy Settings
  await snap('/settings', 'security.png', async () => {
    // Same path the audit walk uses: 4th settings row = Security & Privacy
    await page.locator('.group-row').nth(3).waitFor({ timeout: 15000 })
    await page.locator('.group-row').nth(3).click()
    await page.locator('.back-btn').waitFor({ timeout: 10000 })
    await page.waitForTimeout(700)
  })

  // 11. Light Theme Home
  await updateMeta(page, [{ key: 'theme', value: 'light' }])
  await snap('/', 'home-light.png')
  await updateMeta(page, [{ key: 'theme', value: 'dark' }])

  // 12. Russian Locale Home
  await updateMeta(page, [{ key: 'locale', value: 'ru' }])
  await snap('/', 'home-ru.png')

  // 13. Tajik Locale Home
  await updateMeta(page, [{ key: 'locale', value: 'tj' }])
  await snap('/', 'home-tj.png')

  await updateMeta(page, [{ key: 'locale', value: 'en' }])
  await context.close()
}

function buildSlidesHtml(imgs) {
  const wayfinderW = `
    <svg viewBox="0 0 256 256" width="22" height="22" aria-hidden="true">
      <path d="M 32 64 L 76 192 Q 84 204 96 204 Q 108 204 116 192 L 128 156 L 140 192 Q 148 204 160 204 Q 172 204 180 192 L 224 64 L 196 64 L 160 172 L 138 108 Q 133 96 128 96 Q 123 96 118 108 L 96 172 L 60 64 Z" fill="currentColor" fill-rule="evenodd"/>
    </svg>
  `

  const topBar = (num, tag) => `
    <header class="topbar">
      <div class="brand-mark">
        <span class="brand-w">${wayfinderW}</span>
        <span class="brand-name">WhereDidItGo</span>
      </div>
      <div class="slide-meta">
        <span class="slide-tag">${tag}</span>
        <span class="slide-num">${num} / 12</span>
      </div>
    </header>
  `

  const phone = (src, extraClass = '', frameTheme = 'obsidian') => `
    <div class="phone phone--${frameTheme} ${extraClass}">
      <div class="phone-speaker"></div>
      <div class="phone-screen">
        <img src="${src}" alt="" />
      </div>
    </div>
  `

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #111;
      font-family: "Outfit", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-kerning: normal;
      text-rendering: optimizeLegibility;
      font-feature-settings: "kern" 1;
      -webkit-font-smoothing: antialiased;
      display: flex;
      flex-direction: column;
      gap: 40px;
      padding: 40px;
    }

    .num, .tabular {
      font-variant-numeric: tabular-nums;
    }

    .slide {
      width: 1080px;
      height: 1350px;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      padding: 64px 76px;
    }

    /* Theme A: Obsidian Emerald Studio (odd slides 1,3,5,7,9,11) */
    .slide--dark {
      background:
        radial-gradient(920px 680px at 50% 95%, rgba(20, 184, 166, 0.20), transparent 72%),
        radial-gradient(640px 520px at 88% 14%, rgba(13, 110, 99, 0.18), transparent 70%),
        linear-gradient(180deg, #070b0a 0%, #0a1210 58%, #07100e 100%);
      color: #f3f7f6;
      --muted: #9eb3af;
      --accent: #2dd4bf;
      --accent-strong: #14b8a6;
      --surface: rgba(20, 31, 29, 0.86);
      --surface-solid: #121c1a;
      --border: rgba(255, 255, 255, 0.10);
      --chip-bg: rgba(45, 212, 191, 0.12);
      --chip-fg: #5eead4;
    }

    /* Theme B: Editorial Warm Stone Cream (even slides 2,4,6,8,10,12) */
    .slide--cream {
      background:
        radial-gradient(860px 620px at 85% 92%, rgba(13, 110, 99, 0.10), transparent 70%),
        linear-gradient(180deg, #f6f4ef 0%, #efece4 100%);
      color: #101918;
      --muted: #4b5a57;
      --accent: #0d6e63;
      --accent-strong: #0a584f;
      --surface: #ffffff;
      --surface-solid: #ffffff;
      --border: rgba(16, 25, 24, 0.09);
      --chip-bg: rgba(13, 110, 99, 0.10);
      --chip-fg: #0b5d53;
    }

    /* Subtle architectural grid lines in background */
    .slide::before {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      background-image:
        linear-gradient(to right, rgba(128,140,138,0.045) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(128,140,138,0.045) 1px, transparent 1px);
      background-size: 90px 90px;
      mask-image: radial-gradient(circle at 50% 36%, black 20%, transparent 82%);
    }

    .topbar {
      position: relative;
      z-index: 5;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 44px;
    }

    .brand-mark {
      display: inline-flex;
      align-items: center;
      gap: 12px;
    }

    .brand-w {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--chip-bg);
      color: var(--accent);
      border: 1px solid var(--border);
    }

    .brand-name {
      font-weight: 600;
      font-size: 23px;
      letter-spacing: -0.02em;
    }

    .slide-meta {
      display: inline-flex;
      align-items: center;
      gap: 14px;
      font-size: 17px;
      font-weight: 500;
      color: var(--muted);
    }

    .slide-tag {
      text-transform: uppercase;
      letter-spacing: 0.07em;
      font-size: 14px;
      font-weight: 600;
      padding: 7px 14px;
      border-radius: 999px;
      background: var(--chip-bg);
      color: var(--chip-fg);
    }

    .slide-num {
      font-variant-numeric: tabular-nums;
      opacity: 0.85;
    }

    .copy-block {
      position: relative;
      z-index: 5;
      max-width: 880px;
    }

    .copy-block--center {
      text-align: center;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    h1 {
      font-family: "Fraunces", Georgia, serif;
      font-weight: 700;
      font-size: 72px;
      line-height: 1.04;
      letter-spacing: -0.03em;
      text-wrap: balance;
      margin-bottom: 22px;
    }

    h1.h1--md {
      font-size: 64px;
    }

    .lead {
      font-size: 27px;
      line-height: 1.42;
      color: var(--muted);
      font-weight: 400;
      max-width: 42ch;
      text-wrap: pretty;
    }

    .accent-text {
      color: var(--accent);
    }

    /* Concentric Device Mockup: r_outer(54) - padding(11) = r_inner(43) */
    .phone {
      position: relative;
      border-radius: 54px;
      padding: 11px;
      user-select: none;
      flex-shrink: 0;
    }

    .phone--obsidian {
      background: linear-gradient(145deg, #273230 0%, #111716 48%, #090d0c 100%);
      box-shadow:
        inset 0 0 0 1.5px rgba(255, 255, 255, 0.22),
        0 44px 95px -20px rgba(0, 0, 0, 0.72),
        0 18px 36px -12px rgba(0, 0, 0, 0.48);
    }

    .slide--cream .phone--obsidian {
      box-shadow:
        inset 0 0 0 1.5px rgba(255, 255, 255, 0.24),
        0 44px 90px -22px rgba(13, 33, 30, 0.34),
        0 16px 32px -10px rgba(13, 33, 30, 0.20);
    }

    .phone--silver {
      background: linear-gradient(145deg, #ffffff 0%, #dfe5e3 55%, #c8d1cf 100%);
      box-shadow:
        inset 0 0 0 1.5px rgba(255, 255, 255, 0.9),
        0 40px 85px -20px rgba(0, 0, 0, 0.55);
    }

    .phone-speaker {
      position: absolute;
      top: 22px;
      left: 50%;
      transform: translateX(-50%);
      width: 76px;
      height: 7px;
      border-radius: 99px;
      background: rgba(0, 0, 0, 0.65);
      z-index: 4;
      box-shadow: inset 0 1px 1px rgba(255,255,255,0.12);
    }

    .phone-screen {
      width: 100%;
      aspect-ratio: 390 / 844;
      border-radius: 43px;
      overflow: hidden;
      background: #050807;
      position: relative;
    }

    .phone-screen img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top center;
      display: block;
    }

    /* Floating Glass / Bento Callout Cards */
    .callout {
      background: var(--surface);
      backdrop-filter: blur(22px) saturate(160%);
      border: 1px solid var(--border);
      border-radius: 28px;
      padding: 28px 32px;
      box-shadow: 0 28px 60px -18px rgba(0, 0, 0, 0.42);
    }

    .slide--cream .callout {
      box-shadow: 0 24px 54px -18px rgba(14, 34, 31, 0.14);
    }

    /* ---------------- SLIDE 01: HERO LAUNCH ---------------- */
    .s1-stage {
      position: relative;
      flex: 1;
      margin-top: 38px;
    }
    .s1-phone-back {
      width: 440px;
      position: absolute;
      right: 18px;
      top: 44px;
      transform: rotate(6.5deg);
      opacity: 0.94;
      z-index: 2;
    }
    .s1-phone-front {
      width: 476px;
      position: absolute;
      left: 34px;
      top: 6px;
      transform: rotate(-3.5deg);
      z-index: 3;
    }
    .s1-pill {
      position: absolute;
      right: 10px;
      bottom: 34px;
      z-index: 6;
      display: flex;
      align-items: center;
      gap: 18px;
      padding: 20px 28px;
      border-radius: 24px;
      background: rgba(14, 26, 24, 0.92);
      border: 1px solid rgba(45, 212, 191, 0.34);
      box-shadow: 0 24px 50px rgba(0,0,0,0.65);
    }
    .s1-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #2dd4bf;
      box-shadow: 0 0 0 6px rgba(45, 212, 191, 0.18);
    }

    /* ---------------- SLIDE 02: LOCAL-FIRST PRIVACY ---------------- */
    .s2-grid {
      flex: 1;
      display: grid;
      grid-template-columns: 440px 1fr;
      gap: 36px;
      margin-top: 42px;
      align-items: start;
    }
    .s2-stack {
      display: flex;
      flex-direction: column;
      gap: 20px;
      z-index: 4;
    }
    .s2-card {
      background: #ffffff;
      border: 1px solid rgba(16, 25, 24, 0.08);
      border-radius: 26px;
      padding: 26px 28px;
      box-shadow: 0 16px 38px -18px rgba(16, 25, 24, 0.10);
    }
    .s2-card-icon {
      width: 46px;
      height: 46px;
      border-radius: 14px;
      background: rgba(13, 110, 99, 0.10);
      color: #0d6e63;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 14px;
    }
    .s2-card h3 {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.015em;
      margin-bottom: 6px;
    }
    .s2-card p {
      font-size: 19px;
      line-height: 1.42;
      color: var(--muted);
    }
    .s2-phone-wrap {
      position: relative;
      height: 100%;
    }
    .s2-phone {
      width: 470px;
      position: absolute;
      left: 8px;
      top: 0;
    }

    /* ---------------- SLIDE 03: QUICK ADD MATH ---------------- */
    .s3-stage {
      position: relative;
      flex: 1;
      margin-top: 38px;
    }
    .s3-phone {
      width: 490px;
      position: absolute;
      left: 24px;
      top: 0;
      z-index: 2;
    }
    .s3-math-card {
      position: absolute;
      right: 0;
      top: 78px;
      width: 455px;
      z-index: 5;
      background: #111c1a;
      border: 1px solid rgba(45, 212, 191, 0.30);
    }
    .s3-expr {
      font-size: 22px;
      color: #9eb3af;
      margin-bottom: 6px;
      font-variant-numeric: tabular-nums;
    }
    .s3-total {
      font-size: 56px;
      font-weight: 700;
      letter-spacing: -0.03em;
      color: #2dd4bf;
      font-variant-numeric: tabular-nums;
      margin-bottom: 20px;
    }
    .s3-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .s3-chip {
      padding: 10px 16px;
      border-radius: 999px;
      font-size: 17px;
      font-weight: 500;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.10);
      color: #d6e3e0;
    }
    .s3-chip--active {
      background: rgba(45, 212, 191, 0.16);
      border-color: rgba(45, 212, 191, 0.55);
      color: #5eead4;
    }
    .s3-speed-card {
      position: absolute;
      right: 0;
      top: 410px;
      width: 455px;
      z-index: 5;
    }

    /* ---------------- SLIDE 04: SPLIT TRANSACTIONS ---------------- */
    .s4-stage {
      flex: 1;
      display: grid;
      grid-template-columns: 465px 1fr;
      gap: 34px;
      margin-top: 40px;
      position: relative;
    }
    .s4-Receipt {
      background: #ffffff;
      border: 1px solid rgba(16,25,24,0.09);
      border-radius: 30px;
      padding: 32px;
      box-shadow: 0 24px 56px -18px rgba(16,25,24,0.12);
      align-self: start;
      z-index: 4;
    }
    .s4-split-row {
      padding: 18px 20px;
      border-radius: 18px;
      background: #f7f6f2;
      margin-top: 14px;
    }
    .s4-bar {
      height: 9px;
      border-radius: 99px;
      background: #e5e3dc;
      margin-top: 10px;
      overflow: hidden;
    }
    .s4-bar > span {
      display: block;
      height: 100%;
      border-radius: 99px;
    }
    .s4-phone {
      width: 460px;
      position: absolute;
      right: -12px;
      top: 0;
    }

    /* ---------------- SLIDE 05: OCR & BANK SMS ---------------- */
    .s5-stage {
      flex: 1;
      display: grid;
      grid-template-columns: 485px 1fr;
      gap: 32px;
      margin-top: 40px;
      position: relative;
    }
    .s5-flow {
      display: flex;
      flex-direction: column;
      gap: 18px;
      z-index: 5;
    }
    .sms-bubble {
      background: #14201e;
      border: 1px solid rgba(255,255,255,0.11);
      border-radius: 24px;
      padding: 24px 26px;
    }
    .sms-raw {
      font-family: ui-monospace, "Cascadia Code", Consolas, monospace;
      font-size: 16px;
      line-height: 1.5;
      color: #cbd9d6;
      background: rgba(0,0,0,0.32);
      padding: 14px 16px;
      border-radius: 14px;
      margin-top: 12px;
    }
    .parsed-card {
      background: linear-gradient(135deg, rgba(20,184,166,0.18), rgba(17,28,26,0.95));
      border: 1px solid rgba(45, 212, 191, 0.38);
      border-radius: 26px;
      padding: 26px;
    }
    .s5-phone {
      width: 455px;
      position: absolute;
      right: -14px;
      top: 10px;
    }

    /* ---------------- SLIDE 06: MONTHLY BUDGETS ---------------- */
    .s6-stage {
      position: relative;
      flex: 1;
      margin-top: 38px;
    }
    .s6-phone {
      width: 500px;
      position: absolute;
      right: 26px;
      top: 0;
      z-index: 3;
    }
    .s6-left {
      width: 410px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      position: relative;
      z-index: 5;
      padding-top: 24px;
    }

    /* ---------------- SLIDE 07: SAVINGS GOALS ---------------- */
    .s7-stage {
      position: relative;
      flex: 1;
      margin-top: 38px;
    }
    .s7-phone {
      width: 475px;
      position: absolute;
      left: 16px;
      top: 0;
      z-index: 2;
    }
    .s7-cards {
      position: absolute;
      right: 0;
      top: 48px;
      width: 465px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      z-index: 5;
    }
    .goal-card {
      background: #121d1b;
      border: 1px solid rgba(255,255,255,0.11);
      border-radius: 26px;
      padding: 26px 28px;
      box-shadow: 0 28px 55px -16px rgba(0,0,0,0.65);
    }
    .goal-track {
      height: 12px;
      border-radius: 99px;
      background: rgba(255,255,255,0.09);
      margin-top: 16px;
      overflow: hidden;
    }
    .goal-fill {
      height: 100%;
      border-radius: 99px;
    }

    /* ---------------- SLIDE 08: DEBTS & LOANS ---------------- */
    .s8-stage {
      position: relative;
      flex: 1;
      margin-top: 38px;
    }
    .s8-phone {
      width: 495px;
      position: absolute;
      left: 24px;
      top: 0;
      z-index: 3;
    }
    .s8-right {
      position: absolute;
      right: 0;
      top: 44px;
      width: 430px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      z-index: 5;
    }

    /* ---------------- SLIDE 09: INSIGHTS & HEATMAP ---------------- */
    .s9-stage {
      position: relative;
      flex: 1;
      margin-top: 38px;
    }
    .s9-phone-left {
      width: 465px;
      position: absolute;
      left: 18px;
      top: 8px;
      z-index: 4;
    }
    .s9-phone-right {
      width: 445px;
      position: absolute;
      right: 12px;
      top: 64px;
      z-index: 3;
    }

    /* ---------------- SLIDE 10: PRIVACY BLUR & BIOMETRICS ---------------- */
    .s10-stage {
      position: relative;
      flex: 1;
      margin-top: 38px;
    }
    .s10-phone-left {
      width: 455px;
      position: absolute;
      left: 12px;
      top: 14px;
      z-index: 3;
    }
    .s10-phone-right {
      width: 455px;
      position: absolute;
      right: 12px;
      top: 56px;
      z-index: 4;
    }
    .s10-badge {
      position: absolute;
      left: 50%;
      top: 2px;
      transform: translateX(-50%);
      z-index: 6;
      background: #0d6e63;
      color: #ffffff;
      padding: 12px 24px;
      border-radius: 999px;
      font-weight: 600;
      font-size: 18px;
      box-shadow: 0 16px 34px rgba(13, 110, 99, 0.30);
      white-space: nowrap;
    }

    /* ---------------- SLIDE 11: TRILINGUAL FAN ---------------- */
    .s11-stage {
      position: relative;
      flex: 1;
      margin-top: 52px;
    }
    .s11-left {
      width: 356px;
      position: absolute;
      left: 0;
      top: 66px;
      transform: rotate(-6deg);
      z-index: 2;
    }
    .s11-center {
      width: 392px;
      position: absolute;
      left: 50%;
      top: 8px;
      transform: translateX(-50%);
      z-index: 4;
    }
    .s11-right {
      width: 356px;
      position: absolute;
      right: 0;
      top: 66px;
      transform: rotate(6deg);
      z-index: 2;
    }
    .lang-pills {
      display: flex;
      gap: 14px;
      margin-top: 26px;
    }
    .lang-pill {
      padding: 10px 20px;
      border-radius: 999px;
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.13);
      font-size: 18px;
      font-weight: 500;
      color: #e2ecea;
    }

    /* ---------------- SLIDE 12: DOWNLOAD CTA CLOSER ---------------- */
    .s12-hero-card {
      margin-top: 16px;
      background: #0b2421;
      color: #f3f7f6;
      border-radius: 36px;
      padding: 48px 52px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 34px 75px -20px rgba(11, 36, 33, 0.35);
      z-index: 4;
    }
    .s12-hero-card::after {
      content: "";
      position: absolute;
      right: -80px;
      top: -80px;
      width: 380px;
      height: 380px;
      background: radial-gradient(circle, rgba(45,212,191,0.24), transparent 70%);
      pointer-events: none;
    }
    .s12-app-row {
      display: flex;
      align-items: center;
      gap: 24px;
      margin-bottom: 30px;
    }
    .s12-app-icon {
      width: 92px;
      height: 92px;
      border-radius: 24px;
      box-shadow: 0 14px 30px rgba(0,0,0,0.35);
    }
    .s12-checks {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px 24px;
      margin: 30px 0 38px;
    }
    .s12-check {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 21px;
      font-weight: 500;
      color: #d7e6e3;
    }
    .s12-check-dot {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: rgba(45, 212, 191, 0.18);
      color: #2dd4bf;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .s12-cta-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
      background: #2dd4bf;
      color: #06221f;
      font-size: 24px;
      font-weight: 700;
      padding: 22px 38px;
      border-radius: 999px;
      letter-spacing: -0.01em;
    }
    .s12-bottom-phones {
      position: relative;
      flex: 1;
      margin-top: 32px;
    }
    .s12-p1 {
      width: 430px;
      position: absolute;
      left: 36px;
      top: 12px;
      transform: rotate(-3deg);
    }
    .s12-p2 {
      width: 430px;
      position: absolute;
      right: 36px;
      top: 12px;
      transform: rotate(3deg);
    }
  </style>
</head>
<body>

  <!-- 01: HERO LAUNCH (Dark) -->
  <section class="slide slide--dark" id="slide-01">
    ${topBar('01', 'Personal Finance')}
    <div class="copy-block">
      <h1>Know where every dollar actually went.</h1>
      <p class="lead">Fast enough for the checkout line, local-first by default, with zero mandatory bank logins.</p>
    </div>
    <div class="s1-stage">
      ${phone(imgs.homeDark, 's1-phone-front')}
      ${phone(imgs.insights, 's1-phone-back')}
      <div class="s1-pill">
        <span class="s1-dot"></span>
        <div>
          <div style="font-size:20px;font-weight:700;color:#f3f7f6;">100% On-Device Storage</div>
          <div style="font-size:16px;color:#9eb3af;">Android APK &amp; Instant Web Vault</div>
        </div>
      </div>
    </div>
  </section>

  <!-- 02: LOCAL-FIRST PRIVACY (Cream) -->
  <section class="slide slide--cream" id="slide-02">
    ${topBar('02', 'Local-First Architecture')}
    <div class="copy-block">
      <h1 class="h1--md">Your money stays on your phone. Not our servers.</h1>
      <p class="lead">Every balance, note, and receipt lives in isolated device storage and works in airplane mode.</p>
    </div>
    <div class="s2-grid">
      <div class="s2-stack">
        <div class="s2-card">
          <div class="s2-card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <h3>Zero Bank Credentials</h3>
          <p>Never hand over banking passwords or let third-party aggregators sell your purchase history.</p>
        </div>
        <div class="s2-card">
          <div class="s2-card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          </div>
          <h3>Offline-First, Cloud Optional</h3>
          <p>Core tracking needs no account. Turn on encrypted Cloud Vault sync only if you want multi-device backup.</p>
        </div>
        <div class="s2-card">
          <div class="s2-card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </div>
          <h3>Own Your Raw Data</h3>
          <p>One-tap portable JSON backups and clean CSV spreadsheet exports whenever you want them.</p>
        </div>
      </div>
      <div class="s2-phone-wrap">
        ${phone(imgs.homeDark, 's2-phone')}
      </div>
    </div>
  </section>

  <!-- 03: QUICK ADD MATH (Dark) -->
  <section class="slide slide--dark" id="slide-03">
    ${topBar('03', '2.8-Second Entry')}
    <div class="copy-block">
      <h1>Log coffee before the receipt prints.</h1>
      <p class="lead">Tap +, add items right inside the amount box, pick a subcategory, and get back to your day.</p>
    </div>
    <div class="s3-stage">
      ${phone(imgs.quickadd, 's3-phone')}
      <div class="callout s3-math-card">
        <div style="font-size:14px;font-weight:600;letter-spacing:0.07em;text-transform:uppercase;color:#5eead4;margin-bottom:12px;">Inline Math Expression</div>
        <div class="s3-expr">13.50 + 4.80 =</div>
        <div class="s3-total">$18.30</div>
        <div class="s3-chips">
          <span class="s3-chip s3-chip--active">Food &amp; Drink · Coffee</span>
          <span class="s3-chip">Groceries</span>
          <span class="s3-chip">Dining out</span>
        </div>
      </div>
      <div class="callout s3-speed-card">
        <div style="font-size:22px;font-weight:700;margin-bottom:8px;">Remembers your last wallet</div>
        <p style="font-size:18px;line-height:1.45;color:#9eb3af;">Smart defaults pre-select your go-to account and category so most entries take two taps.</p>
      </div>
    </div>
  </section>

  <!-- 04: SPLIT TRANSACTIONS (Cream) -->
  <section class="slide slide--cream" id="slide-04">
    ${topBar('04', 'Split Receipts')}
    <div class="copy-block">
      <h1 class="h1--md">One supermarket checkout. Three accurate budgets.</h1>
      <p class="lead">Divide a single Target or grocery run across categories with automatic remainder math.</p>
    </div>
    <div class="s4-stage">
      <div class="s4-Receipt">
        <div style="display:flex;justify-content:space-between;align-items:baseline;padding-bottom:20px;border-bottom:1px solid rgba(16,25,24,0.09);">
          <div>
            <div style="font-size:15px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#0d6e63;">Target Superstore</div>
            <div style="font-size:22px;font-weight:700;margin-top:4px;">1 Card Charge</div>
          </div>
          <div class="tabular" style="font-size:38px;font-weight:700;letter-spacing:-0.02em;">$84.60</div>
        </div>

        <div class="s4-split-row">
          <div style="display:flex;justify-content:space-between;font-size:19px;font-weight:600;">
            <span>Food &amp; Drink · Groceries</span>
            <span class="tabular">$52.40</span>
          </div>
          <div class="s4-bar"><span style="width:62%;background:#0d6e63;"></span></div>
        </div>

        <div class="s4-split-row">
          <div style="display:flex;justify-content:space-between;font-size:19px;font-weight:600;">
            <span>Shopping · Home Essentials</span>
            <span class="tabular">$19.20</span>
          </div>
          <div class="s4-bar"><span style="width:23%;background:#d97706;"></span></div>
        </div>

        <div class="s4-split-row">
          <div style="display:flex;justify-content:space-between;font-size:19px;font-weight:600;">
            <span>Health · Pharmacy</span>
            <span class="tabular">$13.00</span>
          </div>
          <div class="s4-bar"><span style="width:15%;background:#e11d48;"></span></div>
        </div>

        <div style="margin-top:20px;display:flex;justify-content:space-between;font-size:17px;font-weight:600;color:#0d6e63;">
          <span>Remaining to assign</span>
          <span class="tabular">$0.00 ✓</span>
        </div>
      </div>

      <div style="position:relative;">
        ${phone(imgs.quickaddSplit, 's4-phone')}
      </div>
    </div>
  </section>

  <!-- 05: ON-DEVICE OCR & SMS PARSER (Dark) -->
  <section class="slide slide--dark" id="slide-05">
    ${topBar('05', 'OCR & Bank SMS')}
    <div class="copy-block">
      <h1 class="h1--md">Snap a paper receipt or paste a bank SMS.</h1>
      <p class="lead">Tesseract OCR and bank alert parsing run 100% locally on your device—no cloud upload required.</p>
    </div>
    <div class="s5-stage">
      <div class="s5-flow">
        <div class="sms-bubble">
          <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:600;color:#9eb3af;">
            <span>Incoming Bank Alert · Alif / Chase / T-Bank</span>
            <span>Now</span>
          </div>
          <div class="sms-raw">Chase: Debit card *4821 charged $64.20 at WHOLE FOODS MARKET. Avail Bal: $9,840.50</div>
        </div>

        <div style="display:flex;align-items:center;gap:12px;padding-left:18px;color:#5eead4;font-weight:600;font-size:18px;">
          <span>↓ Parsed locally in 40ms</span>
        </div>

        <div class="parsed-card">
          <div style="font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.07em;color:#5eead4;margin-bottom:10px;">Ready-to-Save Draft</div>
          <div style="display:flex;justify-content:space-between;align-items:baseline;">
            <div>
              <div style="font-size:26px;font-weight:700;">Whole Foods Market</div>
              <div style="font-size:18px;color:#b4c7c3;margin-top:4px;">Food &amp; Drink · Groceries · Main Checking</div>
            </div>
            <div class="tabular" style="font-size:34px;font-weight:700;color:#f3f7f6;white-space:nowrap;flex-shrink:0;margin-left:16px;">−$64.20</div>
          </div>
        </div>

        <div class="sms-bubble" style="padding:20px 26px;">
          <div style="font-size:19px;font-weight:600;color:#f3f7f6;">English + Russian Receipt OCR</div>
          <div style="font-size:17px;color:#9eb3af;margin-top:4px;">Extracts merchant totals from crumpled paper receipts offline.</div>
        </div>
      </div>

      <div style="position:relative;">
        ${phone(imgs.quickadd, 's5-phone')}
      </div>
    </div>
  </section>

  <!-- 06: MONTHLY BUDGETS & PAYDAY CYCLES (Cream) -->
  <section class="slide slide--cream" id="slide-06">
    ${topBar('06', 'Payday Cycles')}
    <div class="copy-block">
      <h1 class="h1--md">Budgets that start on payday, not just the 1st.</h1>
      <p class="lead">Paid on the 15th? Set your cycle start day once and every category cap aligns to your real paycheck.</p>
    </div>
    <div class="s6-stage">
      <div class="s6-left">
        <div class="callout">
          <div style="font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#0d6e63;margin-bottom:10px;">Custom Cycle Active</div>
          <div style="font-size:32px;font-weight:700;letter-spacing:-0.02em;">15 Oct – 14 Nov</div>
          <p style="font-size:18px;line-height:1.45;color:#4b5a57;margin-top:8px;">Every chart, budget bar, and monthly insight automatically shifts to match your pay schedule.</p>
        </div>

        <div class="callout">
          <div style="display:flex;justify-content:space-between;align-items:baseline;">
            <span style="font-size:20px;font-weight:700;">Groceries Cap</span>
            <span class="tabular" style="font-size:18px;font-weight:600;color:#0d6e63;">Left $312.40</span>
          </div>
          <div style="height:12px;border-radius:99px;background:#ece9e1;margin:14px 0 10px;overflow:hidden;">
            <div style="width:52%;height:100%;background:#0d6e63;border-radius:99px;"></div>
          </div>
          <div class="tabular" style="font-size:17px;color:#4b5a57;">$337.60 spent of $650.00</div>
        </div>
      </div>

      ${phone(imgs.budgetsCycle, 's6-phone')}
    </div>
  </section>

  <!-- 07: SAVINGS GOALS (Dark) -->
  <section class="slide slide--dark" id="slide-07">
    ${topBar('07', 'Dedicated Goals')}
    <div class="copy-block">
      <h1 class="h1--md">Save for big plans without muddying daily spend.</h1>
      <p class="lead">Move money into dedicated targets—flights, a 6-month runway, new studio gear—without logging fake expenses.</p>
    </div>
    <div class="s7-stage">
      ${phone(imgs.goals, 's7-phone')}
      <div class="s7-cards">
        <div class="goal-card">
          <div style="display:flex;justify-content:space-between;align-items:baseline;">
            <div style="font-size:24px;font-weight:700;">Tokyo Autumn Flight</div>
            <div class="tabular" style="font-size:18px;font-weight:600;color:#5eead4;">82%</div>
          </div>
          <div class="tabular" style="font-size:32px;font-weight:700;margin-top:8px;">$2,450 <span style="font-size:20px;font-weight:400;color:#9eb3af;">of $3,000</span></div>
          <div class="goal-track"><div class="goal-fill" style="width:82%;background:#2dd4bf;"></div></div>
        </div>

        <div class="goal-card">
          <div style="display:flex;justify-content:space-between;align-items:baseline;">
            <div style="font-size:24px;font-weight:700;">Emergency 6-Mo Vault</div>
            <div class="tabular" style="font-size:18px;font-weight:600;color:#60a5fa;">82%</div>
          </div>
          <div class="tabular" style="font-size:32px;font-weight:700;margin-top:8px;">$8,200 <span style="font-size:20px;font-weight:400;color:#9eb3af;">of $10,000</span></div>
          <div class="goal-track"><div class="goal-fill" style="width:82%;background:#3b82f6;"></div></div>
        </div>
      </div>
    </div>
  </section>

  <!-- 08: DEBTS & LOANS (Cream) -->
  <section class="slide slide--cream" id="slide-08">
    ${topBar('08', 'Debts & Payoff')}
    <div class="copy-block">
      <h1 class="h1--md">Track who owes who. Skip the awkward texts.</h1>
      <p class="lead">Separate "I Lent" from "I Borrowed", log partial repayments, and project your exact debt-free month.</p>
    </div>
    <div class="s8-stage">
      ${phone(imgs.debts, 's8-phone')}
      <div class="s8-right">
        <div class="callout">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <span style="font-size:22px;font-weight:700;">Alex Rivera</span>
            <span style="padding:6px 14px;border-radius:99px;background:rgba(13,110,99,0.12);color:#0d6e63;font-size:14px;font-weight:700;">I LENT</span>
          </div>
          <div class="tabular" style="font-size:36px;font-weight:700;">$150.00 <span style="font-size:18px;font-weight:500;color:#4b5a57;">remaining</span></div>
          <div style="font-size:17px;color:#4b5a57;margin-top:8px;">$90.00 repaid of $240.00 · Cabin split</div>
        </div>

        <div class="callout">
          <div style="font-size:21px;font-weight:700;margin-bottom:8px;">Snowball &amp; Avalanche Planner</div>
          <p style="font-size:18px;line-height:1.45;color:#4b5a57;">Drag your monthly repayment slider to compare payoff order and see your projected debt-free date live.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- 09: INSIGHTS & ACTIVITY HEATMAP (Dark) -->
  <section class="slide slide--dark" id="slide-09">
    ${topBar('09', 'Clarity & Heatmaps')}
    <div class="copy-block">
      <h1 class="h1--md">Insights that answer questions, not dump charts.</h1>
      <p class="lead">See your savings rate, biggest category shift, and 365-day spending rhythm at a single glance.</p>
    </div>
    <div class="s9-stage">
      ${phone(imgs.insights, 's9-phone-left')}
      ${phone(imgs.activity, 's9-phone-right')}
    </div>
  </section>

  <!-- 10: PRIVACY BLUR & BIOMETRICS (Cream) -->
  <section class="slide slide--cream" id="slide-10">
    ${topBar('10', 'Public Privacy')}
    <div class="copy-block">
      <h1 class="h1--md">Share your screen, never your numbers.</h1>
      <p class="lead">Tap the eye icon to blur balances on the train, and lock the app behind Face ID, fingerprint, or PIN.</p>
    </div>
    <div class="s10-stage">
      <div class="s10-badge">One-Tap Balance Spoiler + Biometric Lock</div>
      ${phone(imgs.homeBlur, 's10-phone-left')}
      ${phone(imgs.security, 's10-phone-right')}
    </div>
  </section>

  <!-- 11: 3 LANGUAGES & WORLD CURRENCIES (Dark) -->
  <section class="slide slide--dark" id="slide-11">
    ${topBar('11', 'Global & Native')}
    <div class="copy-block copy-block--center">
      <h1 class="h1--md">Fluent in English, Русский, and Тоҷикӣ.</h1>
      <p class="lead" style="max-width:46ch;">Full native translations and world currencies—USD, EUR, RUB, TJS, and more—formatted the way you read money.</p>
      <div class="lang-pills">
        <span class="lang-pill">English · $ USD</span>
        <span class="lang-pill">Русский · ₽ RUB</span>
        <span class="lang-pill">Тоҷикӣ · с. TJS</span>
      </div>
    </div>
    <div class="s11-stage">
      ${phone(imgs.homeRu, 's11-left')}
      ${phone(imgs.homeDark, 's11-center')}
      ${phone(imgs.homeTj, 's11-right')}
    </div>
  </section>

  <!-- 12: DOWNLOAD CTA CLOSER (Cream + Deep Forest Teal Hero Card) -->
  <section class="slide slide--cream" id="slide-12">
    ${topBar('12', 'Get Started Free')}
    <div class="s12-hero-card">
      <div class="s12-app-row">
        <img class="s12-app-icon" src="${imgs.logo}" alt="WhereDidItGo icon" />
        <div>
          <div style="font-size:16px;font-weight:600;letter-spacing:0.07em;text-transform:uppercase;color:#5eead4;">WhereDidItGo v1.1.6</div>
          <div style="font-family:'Fraunces',Georgia,serif;font-size:48px;font-weight:700;line-height:1.06;letter-spacing:-0.025em;margin-top:4px;">Take back your money clarity.</div>
        </div>
      </div>

      <div class="s12-checks">
        <div class="s12-check"><span class="s12-check-dot">✓</span><span>Free offline core forever</span></div>
        <div class="s12-check"><span class="s12-check-dot">✓</span><span>Zero ads &amp; zero trackers</span></div>
        <div class="s12-check"><span class="s12-check-dot">✓</span><span>Android APK &amp; Google Play</span></div>
        <div class="s12-check"><span class="s12-check-dot">✓</span><span>Instant Web &amp; Desktop Vault</span></div>
      </div>

      <div class="s12-cta-btn">
        <span>Download Free — Link in Bio</span>
        <span>→</span>
      </div>
    </div>

    <div class="s12-bottom-phones">
      ${phone(imgs.homeLight, 's12-p1', 'silver')}
      ${phone(imgs.homeDark, 's12-p2', 'obsidian')}
    </div>
  </section>

</body>
</html>`
}

const POST_METADATA = [
  {
    id: 'slide-01',
    file: '01-hero-launch.png',
    title: 'Know Where Every Dollar Went',
    caption: `Where did your paycheck actually go this month? 👀\n\nMeet WhereDidItGo — the fast, local-first personal finance tracker built for people who want instant clarity without handing over bank passwords.\n\n✦ 2.8-second expense entry\n✦ 100% offline-first on-device storage\n✦ Multi-wallet balances, budgets, goals & debts\n\nTry it free via the link in bio.\n\n#personalfinance #budgetingapp #moneytracker #privacyfirst #localfirst #fintechdesign #indieapp`,
  },
  {
    id: 'slide-02',
    file: '02-local-first-privacy.png',
    title: 'Local-First Privacy Architecture',
    caption: `Your financial life belongs on your phone — not on someone else's ad server. 🔒\n\nWhereDidItGo stores every transaction locally on your device, works in airplane mode, and never asks for bank login credentials. Want multi-device backup later? Opt into encrypted Cloud Vault sync on your own terms.\n\n#privacyfirst #offlinefirst #personalfinance #dataprivacy #localfirst #budgeting`,
  },
  {
    id: 'slide-03',
    file: '03-quick-add-math.png',
    title: '2.8-Second QuickAdd + Inline Math',
    caption: `If logging an expense takes 30 seconds, you'll stop doing it by Thursday. ⚡\n\nOpen +, type "13.50 + 4.80" right inside the amount field, tap Coffee, and you're done before the receipt prints.\n\n#productivityapps #expensetracker #uidesign #mindfulspending #dailyhabits`,
  },
  {
    id: 'slide-04',
    file: '04-split-transactions.png',
    title: 'Split Supermarket Receipts Cleanly',
    caption: `One Target run shouldn't wreck your Grocery budget just because you bought pharmacy items and home supplies too. 🛒\n\nSplit any transaction across multiple categories with live remainder math down to the cent.\n\n#budgettips #grocerybudget #splittransactions #smartmoney #wherediditgo`,
  },
  {
    id: 'slide-05',
    file: '05-receipt-ocr-sms.png',
    title: 'On-Device Receipt OCR & Bank SMS Parser',
    caption: `Hate typing receipts? Snap a photo or paste your bank alert. 📸\n\nWhereDidItGo parses paper receipts (EN + RU OCR) and bank SMS notifications locally on your phone in milliseconds — zero server uploads.\n\n#ocr #automation #fintech #smartbudgeting #androidapps`,
  },
  {
    id: 'slide-06',
    file: '06-monthly-budgets.png',
    title: 'Payday-Aligned Monthly Budgets',
    caption: `Not everyone gets paid on the 1st of the month. 🗓️\n\nShift your monthly start day to the 15th (or any day up to the 28th) and watch every category budget, pace bar, and insight align to your real paycheck cycle.\n\n#paydayroutine #monthlybudget #financialclarity #moneygoals`,
  },
  {
    id: 'slide-07',
    file: '07-savings-goals.png',
    title: 'Dedicated Savings Goals',
    caption: `Saving for a flight to Tokyo or a 6-month emergency fund? ✈️\n\nMove money into dedicated visual goals without mixing savings transfers into your daily spending totals.\n\n#savingsgoals #emergencyfund #financialfreedom #travelbudget`,
  },
  {
    id: 'slide-08',
    file: '08-debts-and-loans.png',
    title: 'Debts, IOUs & Snowball Payoff Planner',
    caption: `Splitting cabin weekends or paying down a balance? 🤝\n\nTrack "I Lent" and "I Borrowed" separately from expenses, record partial payments, and compare Snowball vs. Avalanche payoff timelines.\n\n#debtfreejourney #snowballmethod #moneymanagement #personalfinance`,
  },
  {
    id: 'slide-09',
    file: '09-insights-heatmap.png',
    title: 'Actionable Insights & 365-Day Heatmap',
    caption: `No cluttered wall of pie charts. 📊\n\nSee immediately whether you spent less than last stretch, how much of your income you kept, and spot no-spend streaks on your 365-day activity heatmap.\n\n#datavisualization #spendinghabits #savingmoney #financialhealth`,
  },
  {
    id: 'slide-10',
    file: '10-privacy-blur-biometrics.png',
    title: 'One-Tap Balance Blur & Biometrics',
    caption: `Checking your budget on a crowded train or showing a friend a category? 👁️\n\nTap the eye icon to blur hero numbers instantly, hide app previews in the switcher, and lock everything behind Face ID, fingerprint, or a 4-digit PIN.\n\n#mobileprivacy #infosec #appdesign #biometrics`,
  },
  {
    id: 'slide-11',
    file: '11-languages-currencies.png',
    title: 'English, Русский & Тоҷикӣ + Multi-Currency',
    caption: `Built for life across borders and currencies. 🌍\n\nFull native support for English, Русский, and Тоҷикӣ alongside USD, EUR, RUB, TJS, and major world currencies.\n\n#multilingual #globalfintech #tajikistan #russian #indiedev`,
  },
  {
    id: 'slide-12',
    file: '12-download-cta.png',
    title: 'Free Offline Forever — Download Now',
    caption: `Ready to finally answer "Where did it go?" ✨\n\nCore expense tracking, budgets, goals, and local backups are 100% free offline forever — with zero ads.\n\nDownload for Android or launch the instant Web Vault from the link in bio.\n\n#wherediditgo #launch #androidapp #pwa #budgettracker #personalfinance`,
  },
]

async function buildGalleryAndContactSheet(browser) {
  const galleryHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>WhereDidItGo — Instagram 12-Post Campaign Pack</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0c100f;
      color: #f2f6f5;
      font-family: "Outfit", system-ui, sans-serif;
      padding: 48px 32px 96px;
      max-width: 1360px;
      margin: 0 auto;
    }
    header {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-end;
      gap: 24px;
      padding-bottom: 36px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      margin-bottom: 48px;
    }
    h1 {
      font-family: "Fraunces", Georgia, serif;
      font-size: 42px;
      letter-spacing: -0.025em;
    }
    .sub { color: #9ab0ac; font-size: 18px; margin-top: 8px; }
    h2 { font-size: 22px; font-weight: 600; margin-bottom: 18px; color: #5eead4; letter-spacing: -0.01em; }

    /* 3-Column Instagram Profile Feed Simulator */
    .ig-profile-wrap {
      background: #050707;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 28px;
      padding: 28px;
      max-width: 780px;
      margin-bottom: 64px;
    }
    .ig-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
    }
    .ig-grid img {
      width: 100%;
      aspect-ratio: 4 / 5;
      object-fit: cover;
      display: block;
      border-radius: 4px;
    }

    /* Full Cards + Captions */
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 28px;
    }
    .card {
      background: #131b19;
      border: 1px solid rgba(255,255,255,0.09);
      border-radius: 22px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .card img {
      width: 100%;
      aspect-ratio: 4 / 5;
      display: block;
    }
    .card-body {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      flex: 1;
    }
    .card-title {
      font-weight: 700;
      font-size: 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .card-file {
      font-size: 13px;
      color: #5eead4;
      font-weight: 500;
    }
    pre {
      white-space: pre-wrap;
      font-family: inherit;
      font-size: 14px;
      line-height: 1.5;
      color: #b7c8c4;
      background: rgba(0,0,0,0.28);
      padding: 14px;
      border-radius: 12px;
      flex: 1;
    }
    button {
      background: #14b8a6;
      color: #05201d;
      border: 0;
      border-radius: 10px;
      padding: 11px 16px;
      font-family: inherit;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
    }
    button:hover { background: #2dd4bf; }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>WhereDidItGo — Instagram Campaign Pack</h1>
      <p class="sub">12 portrait feed &amp; carousel mockups (1080×1350 px · 4:5 aspect ratio) with alternating profile-grid checkerboard.</p>
    </div>
  </header>

  <h2>Instagram 3-Column Profile Grid Preview (Post #12 → #01)</h2>
  <div class="ig-profile-wrap">
    <div class="ig-grid" id="contact-grid">
      ${[...POST_METADATA]
        .reverse()
        .map((p) => `<img src="./${p.file}" alt="${p.title}" />`)
        .join('\n      ')}
    </div>
  </div>

  <h2>All 12 Ready-to-Post PNGs &amp; Captions</h2>
  <div class="cards">
    ${POST_METADATA.map(
      (p, idx) => `
    <article class="card">
      <a href="./${p.file}" target="_blank"><img src="./${p.file}" alt="${p.title}" /></a>
      <div class="card-body">
        <div class="card-title">
          <span>#${String(idx + 1).padStart(2, '0')} · ${p.title}</span>
          <span class="card-file">${p.file}</span>
        </div>
        <pre id="cap-${idx}">${p.caption.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre>
        <button onclick="navigator.clipboard.writeText(document.getElementById('cap-${idx}').innerText);this.innerText='Copied Caption ✓';setTimeout(()=>this.innerText='Copy Instagram Caption',1600)">Copy Instagram Caption</button>
      </div>
    </article>`,
    ).join('\n')}
  </div>
</body>
</html>`

  const galleryPath = path.join(OUT_DIR, 'index.html')
  await fs.writeFile(galleryPath, galleryHtml, 'utf8')

  // Render a crisp 4x3 Contact Sheet PNG of all 12 slides in order
  const sheetHtml = `<!doctype html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 2400px;
      background: #0b0f0e;
      padding: 48px;
      font-family: system-ui, sans-serif;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 28px;
    }
    .cell img {
      width: 100%;
      aspect-ratio: 4 / 5;
      display: block;
      border-radius: 14px;
      box-shadow: 0 14px 34px rgba(0,0,0,0.45);
    }
  </style>
</head>
<body>
  <div class="grid">
    ${POST_METADATA.map((p) => `<div class="cell"><img src="./${p.file}" /></div>`).join('')}
  </div>
</body>
</html>`
  const tempSheetHtml = path.join(OUT_DIR, '.contact-sheet.html')
  await fs.writeFile(tempSheetHtml, sheetHtml, 'utf8')

  const ctx = await browser.newContext({ viewport: { width: 2400, height: 2220 }, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  await page.goto(`file:///${tempSheetHtml.replace(/\\/g, '/')}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(OUT_DIR, 'contact-sheet.png'), fullPage: true })
  await ctx.close()
  await fs.unlink(tempSheetHtml).catch(() => {})
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true })

  console.log('1/4 Starting local Vite server...')
  const server = await createServer({
    configFile: path.join(ROOT, 'vite.config.ts'),
    server: { host: '127.0.0.1', port: 0, strictPort: false },
    logLevel: 'error',
  })
  await server.listen()
  const addr = server.httpServer?.address()
  const port = typeof addr === 'object' && addr ? addr.port : 5173
  const baseUrl = `http://127.0.0.1:${port}`

  const browser = await chromium.launch({ headless: true })
  try {
    console.log(`2/4 Capturing 3x retina app screens from ${baseUrl}...`)
    await captureAppScreens(browser, baseUrl)

    const imgs = {
      homeDark: await toDataUri(path.join(RAW_DIR, 'home-dark.png')),
      homeLight: await toDataUri(path.join(RAW_DIR, 'home-light.png')),
      homeBlur: await toDataUri(path.join(RAW_DIR, 'home-blur.png')),
      homeRu: await toDataUri(path.join(RAW_DIR, 'home-ru.png')),
      homeTj: await toDataUri(path.join(RAW_DIR, 'home-tj.png')),
      quickadd: await toDataUri(path.join(RAW_DIR, 'quickadd.png')),
      quickaddSplit: await toDataUri(path.join(RAW_DIR, 'quickadd-split.png')),
      activity: await toDataUri(path.join(RAW_DIR, 'activity.png')),
      budgetsCycle: await toDataUri(path.join(RAW_DIR, 'budgets-cycle.png')),
      goals: await toDataUri(path.join(RAW_DIR, 'goals.png')),
      debts: await toDataUri(path.join(RAW_DIR, 'debts.png')),
      insights: await toDataUri(path.join(RAW_DIR, 'insights.png')),
      security: await toDataUri(path.join(RAW_DIR, 'security.png')),
      logo: await toDataUri(path.join(ROOT, 'docs', 'logo.png')),
    }

    console.log('3/4 Rendering 12 supersampled 1080x1350 Instagram slides...')
    const htmlPath = path.join(OUT_DIR, '.slides-render.html')
    await fs.writeFile(htmlPath, buildSlidesHtml(imgs), 'utf8')

    // Render at 2x DPR (2160x2700) then high-quality downscale to exact 1080x1350
    const renderCtx = await browser.newContext({
      viewport: { width: 1200, height: 1500 },
      deviceScaleFactor: 2,
    })
    const renderPage = await renderCtx.newPage()
    await renderPage.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle' })
    await renderPage.evaluate(() => document.fonts.ready)
    await renderPage.waitForTimeout(500)

    const downscaleCtx = await browser.newContext({
      viewport: { width: 1080, height: 1350 },
      deviceScaleFactor: 1,
    })
    const downscalePage = await downscaleCtx.newPage()

    for (const meta of POST_METADATA) {
      const loc = renderPage.locator(`#${meta.id}`)
      const rawBuf = await loc.screenshot({ type: 'png' })
      const b64 = `data:image/png;base64,${rawBuf.toString('base64')}`

      const exactB64 = await downscalePage.evaluate(async (src) => {
        const img = new Image()
        img.src = src
        await img.decode()
        const c = document.createElement('canvas')
        c.width = 1080
        c.height = 1350
        const g = c.getContext('2d')
        g.imageSmoothingEnabled = true
        g.imageSmoothingQuality = 'high'
        g.drawImage(img, 0, 0, 1080, 1350)
        return c.toDataURL('image/png').split(',')[1]
      }, b64)

      const outFile = path.join(OUT_DIR, meta.file)
      await fs.writeFile(outFile, Buffer.from(exactB64, 'base64'))
      console.log(`   ✓ ${meta.file} (1080x1350)`)
    }

    await renderCtx.close()
    await downscaleCtx.close()
    await fs.unlink(htmlPath).catch(() => {})

    console.log('4/4 Building gallery HTML and 4x3 contact sheet...')
    await buildGalleryAndContactSheet(browser)
    console.log('Done! Saved to marketing/instagram/')
  } finally {
    await browser.close()
    await server.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
