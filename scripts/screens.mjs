/**
 * Screenshot walk: every page and every sheet, on a seeded database.
 *   node scripts/screens.mjs
 */
import { bootSeeded, BASE } from './walk-lib.mjs'
import { mkdir } from 'node:fs/promises'

const OUT = 'audit-out'
await mkdir(OUT, { recursive: true })

const { browser, page, problems, state } = await bootSeeded()

async function go(route, name, fn) {
  state.stage = name
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1300)
  if (fn) await fn()
  await page.screenshot({ path: `${OUT}/${name}.png` })
}

await go('/', 'm-home')
await go('/', 'm-quickadd', async () => {
  await page.locator('button.fab').click()
  await page.waitForTimeout(800)
})
await go('/activity', 'm-activity')
await go('/categories', 'm-categories')
await go('/categories', 'm-catform', async () => {
  await page.locator('.edit-icon').first().click()
  await page.waitForTimeout(800)
})
await go('/budgets', 'm-budgets')
await go('/budgets', 'm-recurring', async () => {
  await page.getByRole('tab').nth(1).click()
  await page.waitForTimeout(700)
})
await go('/budgets', 'm-goals', async () => {
  await page.getByRole('tab').nth(2).click()
  await page.waitForTimeout(700)
})
await go('/debts', 'm-debts')
await go('/debts', 'm-debtform', async () => {
  await page.getByRole('button', { name: /add debt/i }).first().click()
  await page.waitForTimeout(800)
})
await go('/insights', 'm-insights')
await go('/accounts', 'm-accounts')
await go('/accounts', 'm-accountform', async () => {
  await page.locator('button.card').first().click()
  await page.waitForTimeout(800)
})
await go('/settings', 'm-settings')

await browser.close()
console.log(problems.length ? problems.join('\n') : 'clean')
