/**
 * Onboarding walk.
 *
 * Runs the four-step first-launch flow end to end: switching the language must
 * re-label the seeded categories and accounts, deselected starter categories
 * must actually be removed, and a category added here must survive to the app.
 *
 *   node scripts/onboarding-check.mjs
 */
import { boot, resetDb, BASE } from './walk-lib.mjs'
import { mkdir } from 'node:fs/promises'

await mkdir('audit-out', { recursive: true })
const { browser, page, problems, state } = await boot()

function check(label, ok, detail = '') {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}${ok ? '' : `  ${detail}`}`)
  if (!ok) problems.push(`[${state.stage}] ${label} ${detail}`)
}

const shot = (name) => page.screenshot({ path: `audit-out/${name}.png` })

/** Pick an option from an AppSelect by the label of the field above it. */
async function selectOption(fieldIndex, optionText) {
  const field = page.locator('.field').nth(fieldIndex)
  await field.locator('button').first().click()
  await page.waitForTimeout(400)
  await page.getByRole('option', { name: optionText }).first().click()
  await page.waitForTimeout(700)
}

const readCategories = () =>
  page.evaluate(async () => {
    const idb = await new Promise((res) => {
      const r = indexedDB.open('wherediditgo')
      r.onsuccess = () => res(r.result)
    })
    const rows = await new Promise((res) => {
      const r = idb.transaction('categories').objectStore('categories').getAll()
      r.onsuccess = () => res(r.result)
    })
    const accounts = await new Promise((res) => {
      const r = idb.transaction('accounts').objectStore('accounts').getAll()
      r.onsuccess = () => res(r.result)
    })
    idb.close()
    return { categories: rows, accounts }
  })

await resetDb(page)
await page.goto(BASE, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1600)

// ── Step 1: language + currency ──────────────────────────────────────────────
state.stage = 'step1'
const bodyText = await page.evaluate(() => document.body.innerText)
check('flow is four steps', /Step 1 of 4/.test(bodyText), bodyText.slice(0, 80))
check('language selector is present', /Language/.test(bodyText))
await shot('onb-1-language')

const beforeSwitch = await readCategories()
await selectOption(0, 'Русский')
const afterSwitch = await readCategories()

check(
  'switching language re-labels the seeded categories',
  afterSwitch.categories.some((c) => /[А-Яа-я]/.test(c.name)),
  afterSwitch.categories.map((c) => c.name).join(', '),
)
check(
  'switching language re-labels the seeded accounts',
  afterSwitch.accounts.some((a) => /[А-Яа-я]/.test(a.name)),
  afterSwitch.accounts.map((a) => a.name).join(', '),
)
check(
  'category count is unchanged by the relabel',
  afterSwitch.categories.length === beforeSwitch.categories.length,
  `${beforeSwitch.categories.length} → ${afterSwitch.categories.length}`,
)
const currencyText = await page.evaluate(() => document.body.innerText)
check('currency follows the language', /RUB/.test(currencyText), currencyText.slice(0, 200))
await shot('onb-1-russian')

// back to English for the rest of the walk
await selectOption(0, 'English')
await page.getByRole('button', { name: /^next$/i }).first().click()
await page.waitForTimeout(700)

// ── Step 2: accounts ─────────────────────────────────────────────────────────
state.stage = 'step2'
check('accounts step shows the starter accounts', (await page.locator('.card').count()) >= 2)
await shot('onb-2-accounts')
await page.getByRole('button', { name: /^next$/i }).first().click()
await page.waitForTimeout(700)

// ── Step 3: categories ───────────────────────────────────────────────────────
state.stage = 'step3'
const pills = page.locator('.cat-pill')
const pillCount = await pills.count()
check('category picker lists the starter categories', pillCount > 0, `${pillCount} pills`)
await shot('onb-3-categories')

// drop two, add one of our own
const droppedNames = []
for (const i of [0, 1]) {
  droppedNames.push((await pills.nth(i).innerText()).trim())
  await pills.nth(i).click()
  await page.waitForTimeout(250)
}
await page.locator('.add-row input').fill('Gym')
await page.locator('.add-btn').click()
await page.waitForTimeout(700)
check('adding a category appends a pill', (await pills.count()) === pillCount + 1)
await shot('onb-3-edited')

await page.getByRole('button', { name: /^next$/i }).first().click()
await page.waitForTimeout(700)

// ── Step 4: budgets ──────────────────────────────────────────────────────────
state.stage = 'step4'
const budgetText = await page.evaluate(() => document.body.innerText)
for (const name of droppedNames) {
  if (name && budgetText.includes(name)) {
    problems.push(`[step4] budget step still offers the dropped category "${name}"`)
  }
}
check('budget step no longer offers dropped categories', !problems.some((p) => p.includes('[step4]')))
await shot('onb-4-budgets')

await page.getByRole('button', { name: /^skip$/i }).first().click()
await page.waitForTimeout(1800)

// ── The app itself ───────────────────────────────────────────────────────────
state.stage = 'after'
const final = await readCategories()
const names = final.categories.map((c) => c.name)
check('custom category survived onboarding', names.includes('Gym'), names.join(', '))
for (const dropped of droppedNames) {
  check(`dropped category "${dropped}" was removed`, !names.includes(dropped), names.join(', '))
}
check('landed on the app', !page.url().includes('/onboarding'), page.url())
await shot('onb-5-home')

await browser.close()
console.log(problems.length ? `\n${problems.length} problems:\n${problems.join('\n')}` : '\nOnboarding walk passed.')
process.exit(problems.length ? 1 : 0)
