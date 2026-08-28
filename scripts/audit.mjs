/**
 * Page-by-page audit walk.
 *
 * Seeds a realistic dataset, then drives every route, sheet and settings
 * sub-page through the real UI in each locale, collecting console errors,
 * page errors and screenshots.
 *
 *   node scripts/audit.mjs
 *   WDG_BASE=http://localhost:4173 node scripts/audit.mjs
 */
import { bootSeeded, BASE } from './walk-lib.mjs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const OUT = path.resolve(process.cwd(), 'audit-out')
await mkdir(OUT, { recursive: true })

const { browser, page, problems, state, report } = await bootSeeded()
console.log('seeded:', JSON.stringify(report))

async function shot(name) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`) })
}

async function visit(route, name, fn) {
  state.stage = name
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)
  if (fn) await fn()
  await expectNoHorizontalOverflow()
  await shot(name)
}

async function expectVisible(selector, label) {
  const count = await page.locator(selector).count()
  if (!count) problems.push(`[${state.stage}] expected ${label} (${selector}) — not found`)
  return count > 0
}

/** Nothing should sit outside the viewport or force the page to scroll sideways. */
async function expectNoHorizontalOverflow() {
  const overflow = await page.evaluate(() => {
    const w = document.documentElement.clientWidth
    const offenders = []
    for (const el of document.querySelectorAll('body *')) {
      const style = getComputedStyle(el)
      if (style.position === 'fixed' || style.visibility === 'hidden' || style.display === 'none') continue
      const box = el.getBoundingClientRect()
      if (box.width === 0 || box.height === 0) continue
      // Content inside a deliberately scrollable strip (the activity calendar)
      // is allowed to sit outside the viewport.
      let scroller = el.parentElement
      let inScroller = false
      while (scroller && scroller !== document.body) {
        const overflowX = getComputedStyle(scroller).overflowX
        if (overflowX === 'auto' || overflowX === 'scroll') {
          inScroller = true
          break
        }
        scroller = scroller.parentElement
      }
      if (inScroller) continue
      if (box.right > w + 1 || box.left < -1) {
        offenders.push(
          `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} [${Math.round(box.left)}…${Math.round(box.right)}] of ${w}`,
        )
      }
      if (offenders.length >= 4) break
    }
    return { docScroll: document.documentElement.scrollWidth > w + 1, offenders }
  })
  if (overflow.docScroll) {
    problems.push(`[${state.stage}] page scrolls horizontally: ${overflow.offenders.join(' | ')}`)
  } else if (overflow.offenders.length) {
    problems.push(`[${state.stage}] content outside the viewport: ${overflow.offenders.join(' | ')}`)
  }
}

// ── every route renders ───────────────────────────────────────────────────────
await visit('/', '01-home', async () => {
  await expectVisible('.hero-card', 'home hero')
  await expectVisible('.list .row', 'recent transactions')
})
await visit('/activity', '02-activity', async () => {
  await expectVisible('.totals', 'filtered totals')
  await expectVisible('.swipe .row', 'transaction rows')
})
await visit('/categories', '03-categories', async () => {
  await expectVisible('.cat-card', 'category cards')
})
await visit('/budgets', '04-budgets', async () => {
  await expectVisible('.summary', 'budget summary')
})
await visit('/debts', '05-debts', async () => {
  await expectVisible('.card', 'debt cards')
})
await visit('/insights', '06-insights', async () => {
  await expectVisible('.stories', 'insight stories')
})
await visit('/accounts', '07-accounts', async () => {
  await expectVisible('.card', 'account cards')
})
await visit('/settings', '08-settings', async () => {
  await expectVisible('.hub-back', 'settings back button')
  await expectVisible('.group-card', 'settings groups')
})

// ── sheets actually paint (they used to render on a blank body) ───────────────
async function sheetOpens(name, open) {
  state.stage = name
  await open()
  await page.waitForTimeout(900)
  const visible = await page.evaluate(() => {
    const panel = document.querySelector('.sheet-panel')
    if (!panel) return { ok: false, why: 'no .sheet-panel' }
    const box = panel.getBoundingClientRect()
    const bodyVisible = getComputedStyle(document.body).visibility === 'visible'
    return {
      ok: bodyVisible && box.width > 100 && box.height > 100 && box.top < window.innerHeight,
      why: `bodyVisible=${bodyVisible} box=${Math.round(box.width)}x${Math.round(box.height)}@${Math.round(box.top)}`,
    }
  })
  if (!visible.ok) problems.push(`[${name}] sheet did not paint — ${visible.why}`)
  await shot(name)
}

await page.goto(BASE, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1200)
await sheetOpens('09-sheet-quickadd', () => page.locator('button.fab').click())
await page.keyboard.press('Escape')
await page.waitForTimeout(500)

await page.goto(`${BASE}/categories`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1200)
await sheetOpens('10-sheet-category', () => page.locator('.edit-icon').first().click())
await page.keyboard.press('Escape')

await page.goto(`${BASE}/accounts`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1200)
await sheetOpens('11-sheet-account', () => page.locator('button.card').first().click())
await page.keyboard.press('Escape')

await page.goto(`${BASE}/budgets`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1200)
await sheetOpens('12-sheet-budget', () => page.locator('button.card').first().click())
await page.keyboard.press('Escape')

// ── budgets sub-tabs ──────────────────────────────────────────────────────────
for (const [index, name] of [[1, '13-budgets-recurring'], [2, '14-budgets-goals']]) {
  state.stage = name
  await page.goto(`${BASE}/budgets`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1000)
  await page.getByRole('tab').nth(index).click()
  await page.waitForTimeout(700)
  await shot(name)
}

// ── settings sub-pages, reached the way a user does ───────────────────────────
const SUBPAGES = [
  ['13-formatting', 0],
  ['14-appearance', 1],
  ['15-navigation', 2],
  ['16-security-privacy', 3],
  ['17-backups', 4],
]
for (const [name, index] of SUBPAGES) {
  state.stage = `settings-${name}`
  await page.goto(`${BASE}/settings`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(900)
  const rows = page.locator('.group-row')
  if ((await rows.count()) <= index) {
    problems.push(`[${state.stage}] settings row ${index} missing`)
    continue
  }
  await rows.nth(index).click()
  await page.waitForTimeout(700)
  if (!(await page.locator('.back-btn').count())) {
    problems.push(`[${state.stage}] sub-page has no back button`)
  }
  await shot(`settings-${name}`)
}

// ── the write path: add, edit and delete a transaction through the UI ─────────
state.stage = '20-write-path'
await page.goto(BASE, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1200)
const hasAuditRow = () =>
  page.evaluate(() =>
    [...document.querySelectorAll('.list .row')].some((r) =>
      r.textContent.includes('Audit expense'),
    ),
  )
if (await hasAuditRow()) problems.push('[20-write-path] test row already present before adding')
await page.locator('button.fab').click()
await page.waitForTimeout(800)
await page.locator('.amount-input').fill('12+8')
await page.waitForTimeout(400)
const previewShown = await page.locator('.amount-preview').count()
if (!previewShown) problems.push('[20-write-path] running-sum preview did not appear')
await page.locator('input[maxlength="120"]').fill('Audit expense')
await shot('20-write-add')
await page.getByRole('button', { name: /^save$/i }).click()
await page.waitForTimeout(1400)
if (!(await hasAuditRow())) problems.push('[20-write-path] new transaction did not appear on Home')

const savedAmount = await page.evaluate(() => {
  const row = [...document.querySelectorAll('.list .row')].find((r) =>
    r.textContent.includes('Audit expense'),
  )
  return row ? row.textContent.replace(/\s+/g, ' ') : null
})
if (!savedAmount?.includes('20.00')) {
  problems.push(`[20-write-path] expected 12+8 to save as 20.00, row reads: ${savedAmount}`)
}
await shot('21-write-saved')

// reopen it, confirm the form round-trips, then delete it
state.stage = '22-edit-path'
await page.evaluate(() => {
  const row = [...document.querySelectorAll('.list .row')].find((r) =>
    r.textContent.includes('Audit expense'),
  )
  row?.click()
})
await page.waitForTimeout(900)
const reopened = await page.locator('.amount-input').inputValue()
if (reopened !== '20.00') problems.push(`[22-edit-path] amount round-trip wrong: ${reopened}`)
await shot('22-edit-open')
await page.getByRole('button', { name: /^delete$/i }).first().click()
await page.waitForTimeout(700)
await shot('23-confirm-sheet')
const confirmVisible = await page.evaluate(
  () => document.querySelectorAll('.sheet-panel').length >= 2,
)
if (!confirmVisible) problems.push('[22-edit-path] delete confirmation sheet did not stack')

// ── flows that replaced native confirm()/alert() and the new debt editor ─────
async function confirmSheetAppears(name, open, expectText) {
  state.stage = name
  await open()
  await page.waitForTimeout(800)
  const text = await page.evaluate(() => {
    const panels = [...document.querySelectorAll('.sheet-panel')]
    const panel = panels[panels.length - 1]
    return panel ? panel.textContent.replace(/\s+/g, ' ').trim() : ''
  })
  if (!text) problems.push(`[${name}] no sheet opened`)
  else if (expectText && !expectText.test(text)) {
    problems.push(`[${name}] unexpected sheet content: ${text.slice(0, 120)}`)
  }
  await shot(name)
}

// Goals: delete now goes through ConfirmSheet instead of window.confirm.
state.stage = '30-goal-delete'
await page.goto(`${BASE}/budgets`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1000)
await page.getByRole('tab').nth(2).click()
await page.waitForTimeout(700)
await page.locator('.card-main').first().click()
await page.waitForTimeout(800)
await confirmSheetAppears(
  '30-goal-delete',
  () => page.getByRole('button', { name: /^delete$/i }).first().click(),
  /delete/i,
)

// Recurring: same replacement.
state.stage = '31-recurring-delete'
await page.goto(`${BASE}/budgets`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1000)
await page.getByRole('tab').nth(1).click()
await page.waitForTimeout(700)
const recurringDelete = page.locator('button.icon-btn').last()
if (await recurringDelete.count()) {
  await confirmSheetAppears('31-recurring-delete', () => recurringDelete.click())
} else {
  problems.push('[31-recurring-delete] no recurring row to delete')
}

// Debts: records are now editable, and payments validate against the remainder.
state.stage = '32-debt-edit'
await page.goto(`${BASE}/debts`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1200)
await page.locator('.card-top').first().click()
await page.waitForTimeout(800)
const editTitle = await page.evaluate(
  () => document.querySelector('.modal-title')?.textContent?.trim() ?? '',
)
if (!/edit/i.test(editTitle)) problems.push(`[32-debt-edit] expected the edit modal, saw "${editTitle}"`)
const prefilled = await page.evaluate(() => {
  const inputs = [...document.querySelectorAll('.modal-body input')]
  return inputs.map((i) => i.value)
})
if (!prefilled.some((v) => v && v !== '')) {
  problems.push('[32-debt-edit] edit modal did not prefill the record')
}
await shot('32-debt-edit')
await page.getByRole('button', { name: /cancel/i }).first().click()
await page.waitForTimeout(500)

state.stage = '33-debt-overpay'
await page.locator('.pay-btn').first().click()
await page.waitForTimeout(800)
await page.locator('.sheet-panel input').first().fill('99999')
await page.getByRole('button', { name: /^save$/i }).last().click()
await page.waitForTimeout(600)
const payError = await page.evaluate(
  () => document.querySelector('.sheet-panel .error-msg')?.textContent?.trim() ?? '',
)
if (!payError) problems.push('[33-debt-overpay] overpayment was accepted without an error')
await shot('33-debt-overpay')

// ── themes and locales ────────────────────────────────────────────────────────
async function setMeta(key, value) {
  await page.evaluate(
    async ([k, v]) => {
      const idb = await new Promise((res) => {
        const r = indexedDB.open('wherediditgo')
        r.onsuccess = () => res(r.result)
      })
      await new Promise((res) => {
        const tx = idb.transaction('meta', 'readwrite')
        tx.objectStore('meta').put({ key: k, value: v })
        tx.oncomplete = () => res()
      })
      idb.close()
    },
    [key, value],
  )
}

for (const theme of ['light', 'oled', 'dark']) {
  state.stage = `24-theme-${theme}`
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(800)
  await setMeta('theme', theme)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1300)
  await shot(`24-theme-${theme}`)
}

for (const locale of ['ru', 'tj', 'en']) {
  await setMeta('locale', locale)
  for (const [route, name] of [
    ['/', `25-${locale}-home`],
    ['/activity', `25-${locale}-activity`],
    ['/debts', `25-${locale}-debts`],
    ['/settings', `25-${locale}-settings`],
  ]) {
    state.stage = name
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1300)
    await shot(name)
  }

  // Nav labels must fit: they used to spill out under the centre FAB in ru/tj.
  state.stage = `25-${locale}-nav`
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)
  const nav = await page.evaluate(() => {
    const fab = document.querySelector('.fab').getBoundingClientRect()
    return [...document.querySelectorAll('.tab')].map((tab) => {
      const box = tab.getBoundingClientRect()
      const span = tab.querySelector('span')
      return {
        text: span.textContent.trim(),
        overlapsFab: box.right > fab.left && box.left < fab.right,
        clipped: span.scrollWidth > span.clientWidth + 1,
      }
    })
  })
  for (const tab of nav) {
    if (tab.overlapsFab) problems.push(`[${state.stage}] tab "${tab.text}" runs under the FAB`)
    if (tab.clipped) problems.push(`[${state.stage}] tab "${tab.text}" is truncated`)
  }
}

// Chromium ships no `tg` locale data, so Tajik dates must come from our shim.
state.stage = '25-tj-dates'
await setMeta('locale', 'tj')
await page.goto(`${BASE}/activity`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1400)
const monthText = await page.evaluate(
  () => document.querySelector('.filter-row button, .filter-row select')?.textContent?.trim() ?? '',
)
if (/^(January|February|March|April|May|June|July|August|September|October|November|December)/.test(monthText)) {
  problems.push(`[25-tj-dates] month label fell back to English: "${monthText}"`)
}
await setMeta('locale', 'en')

// ── custom month cycle: the paid "start of month" setting must do something ───
state.stage = '26-cycle'
await setMeta('startOfMonth', '15')
await page.goto(BASE, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1400)
if (!(await page.locator('.cycle-span').count())) {
  problems.push('[26-cycle] start-of-month = 15 produced no cycle range on the month nav')
}
await shot('26-cycle-home')
await setMeta('startOfMonth', '1')

await browser.close()

const report_text = problems.length
  ? problems.join('\n')
  : 'No console errors, page errors or assertion failures.'
await writeFile(path.join(OUT, 'report.txt'), report_text, 'utf8')
console.log('\n──── AUDIT REPORT ────')
console.log(report_text)
console.log(`\nScreenshots: ${OUT}`)
process.exit(problems.length ? 1 : 0)
