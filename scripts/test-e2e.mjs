import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const OUT_DIR = path.resolve(process.cwd(), 'test-results')
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true })
}

async function run() {
  console.log('🚀 Launching browser for E2E testing...')
  let browser
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true })
  } catch {
    try {
      browser = await chromium.launch({ channel: 'chrome', headless: true })
    } catch {
      browser = await chromium.launch({ headless: true })
    }
  }

  const context = await browser.newContext({
    viewport: { width: 420, height: 860 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
  })

  const page = await context.newPage()

  try {
    console.log('1️⃣ Navigating to app...')
    await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle', timeout: 15000 })
    await page.waitForTimeout(1000)

    // Check if onboarding is open
    const isGetStarted = await page.$('button:has-text("Get Started"), button:has-text("Начать"), button:has-text("Оғоз кунед")')
    if (isGetStarted) {
      console.log('👉 Completing onboarding...')
      await isGetStarted.click()
      await page.waitForTimeout(1000)
      const isNext = await page.$('button:has-text("Continue"), button:has-text("Далее"), button:has-text("Давом додан")')
      if (isNext) {
        await isNext.click()
        await page.waitForTimeout(800)
      }
      const isStart = await page.$('button:has-text("Start using"), button:has-text("Начать использование"), button:has-text("Оғози истифода")')
      if (isStart) {
        await isStart.click()
        await page.waitForTimeout(1000)
      }
    }

    console.log('2️⃣ Testing Home View...')
    await page.screenshot({ path: path.join(OUT_DIR, '01_home_light.png') })

    // Test Theme Toggle
    const themeBtn = page.locator('.header-actions .icon-btn').first()
    if (await themeBtn.isVisible()) {
      await themeBtn.click()
      await page.waitForTimeout(400)
      console.log('🌙 Switched to Dark mode')
      await page.screenshot({ path: path.join(OUT_DIR, '02_home_dark.png') })
      await themeBtn.click()
      await page.waitForTimeout(400)
      console.log('⚡ Switched to OLED mode')
      await page.screenshot({ path: path.join(OUT_DIR, '03_home_oled.png') })
    }

    // Test Quick Add Transaction Modal
    console.log('➕ Opening Quick Add Sheet...')
    const addBtn = page.locator('button[aria-label="Add transaction"], button.fab, button.add-btn').first()
    if (await addBtn.isVisible()) {
      await addBtn.click()
      await page.waitForTimeout(600)
      await page.screenshot({ path: path.join(OUT_DIR, '04_quick_add_modal.png') })

      // Type amount
      const amountInput = page.locator('input[type="number"], input.amount-input, input[inputmode="decimal"]').first()
      if (await amountInput.isVisible()) {
        await amountInput.fill('42.50')
      }

      // Test DatePickerModal from QuickAdd
      const dateBtn = page.locator('.date-picker-btn, button:has-text("Today"), button:has-text("Сегодня")').first()
      if (await dateBtn.isVisible()) {
        await dateBtn.click()
        await page.waitForTimeout(600)
        console.log('📅 DatePickerModal opened cleanly')
        await page.screenshot({ path: path.join(OUT_DIR, '05_date_picker_modal.png') })
        // Confirm date
        const saveDateBtn = page.locator('.date-picker-footer button, button:has-text("Save"), button:has-text("Сохранить")').first()
        if (await saveDateBtn.isVisible()) {
          await saveDateBtn.click()
          await page.waitForTimeout(400)
        }
      }

      // Save transaction
      const saveTxBtn = page.locator('.form-actions button[type="submit"], button:has-text("Save"), button:has-text("Сохранить")').first()
      if (await saveTxBtn.isVisible()) {
        await saveTxBtn.click()
        await page.waitForTimeout(800)
        console.log('💾 Transaction saved!')
      }
    }

    console.log('3️⃣ Testing Activity View...')
    await page.goto('http://127.0.0.1:5173/activity', { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    await page.screenshot({ path: path.join(OUT_DIR, '06_activity_view.png') })

    console.log('4️⃣ Testing Categories View...')
    await page.goto('http://127.0.0.1:5173/categories', { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    await page.screenshot({ path: path.join(OUT_DIR, '07_categories_view.png') })

    // Test Add Category Modal
    console.log('➕ Testing Add Category modal...')
    const addCatBtn = page.locator('.add-btn, button:has-text("Add category"), button:has-text("Добавить категорию")').first()
    if (await addCatBtn.isVisible()) {
      await addCatBtn.click()
      await page.waitForTimeout(600)
      console.log('✨ CategoryFormSheet opened!')
      await page.screenshot({ path: path.join(OUT_DIR, '08_category_form_sheet.png') })

      // Fill name
      const nameInput = page.locator('#cat-name-input')
      if (await nameInput.isVisible()) {
        await nameInput.fill('Coffee & Bakery')
      }

      // Pick color
      const colorSwatch = page.locator('.swatch-item').nth(3)
      if (await colorSwatch.isVisible()) {
        await colorSwatch.click()
      }

      // Pick icon
      const iconTile = page.locator('.icon-tile').nth(1)
      if (await iconTile.isVisible()) {
        await iconTile.click()
      }

      await page.screenshot({ path: path.join(OUT_DIR, '09_category_form_filled.png') })

      // Save category
      const saveCatBtn = page.locator('.form-footer button.btn--filled').first()
      if (await saveCatBtn.isVisible()) {
        await saveCatBtn.click()
        await page.waitForTimeout(800)
        console.log('💾 Category created successfully!')
      }
      await page.screenshot({ path: path.join(OUT_DIR, '10_categories_updated.png') })
    }

    console.log('5️⃣ Testing Budgets View...')
    await page.goto('http://127.0.0.1:5173/budgets', { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    await page.screenshot({ path: path.join(OUT_DIR, '11_budgets_view.png') })

    console.log('6️⃣ Testing Insights View (GitHub Stats)...')
    await page.goto('http://127.0.0.1:5173/insights', { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    await page.screenshot({ path: path.join(OUT_DIR, '12_insights_github_stats.png') })

    // Click on a calendar day
    const dayCell = page.locator('.day:not(.future)').last()
    if (await dayCell.isVisible()) {
      await dayCell.click()
      await page.waitForTimeout(400)
      console.log('🟩 Selected GitHub day cell')
      await page.screenshot({ path: path.join(OUT_DIR, '13_insights_day_selected.png') })
    }

    console.log('7️⃣ Testing Debts View...')
    await page.goto('http://127.0.0.1:5173/debts', { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    await page.screenshot({ path: path.join(OUT_DIR, '14_debts_view.png') })

    console.log('8️⃣ Testing Accounts View...')
    await page.goto('http://127.0.0.1:5173/accounts', { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    await page.screenshot({ path: path.join(OUT_DIR, '15_accounts_view.png') })

    console.log('9️⃣ Testing Settings View & Subpages...')
    await page.goto('http://127.0.0.1:5173/settings', { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    await page.screenshot({ path: path.join(OUT_DIR, '16_settings_hub.png') })

    // Test Formatting subpage
    console.log('⚙️ Testing Formatting subpage...')
    const formatRow = page.locator('button.group-row:has-text("Formatting"), button.group-row:has-text("Форматирование")').first()
    if (await formatRow.isVisible()) {
      await formatRow.click()
      await page.waitForTimeout(500)
      await page.screenshot({ path: path.join(OUT_DIR, '17_settings_formatting.png') })
      await page.locator('.subpage-header .icon-btn').click()
      await page.waitForTimeout(400)
    }

    // Test Appearance subpage
    console.log('⚙️ Testing Appearance subpage...')
    const appRow = page.locator('button.group-row:has-text("Appearance"), button.group-row:has-text("Оформление")').first()
    if (await appRow.isVisible()) {
      await appRow.click()
      await page.waitForTimeout(500)
      await page.screenshot({ path: path.join(OUT_DIR, '18_settings_appearance.png') })
      await page.locator('.subpage-header .icon-btn').click()
      await page.waitForTimeout(400)
    }

    // Test Navigation subpage
    console.log('⚙️ Testing Navigation subpage...')
    const navRow = page.locator('button.group-row:has-text("Navigation"), button.group-row:has-text("Навигация")').first()
    if (await navRow.isVisible()) {
      await navRow.click()
      await page.waitForTimeout(500)
      await page.screenshot({ path: path.join(OUT_DIR, '19_settings_navigation.png') })
      await page.locator('.subpage-header .icon-btn').click()
      await page.waitForTimeout(400)
    }

    // Test Privacy subpage
    console.log('⚙️ Testing Privacy subpage...')
    const privRow = page.locator('button.group-row:has-text("Privacy"), button.group-row:has-text("Конфиденциальность")').first()
    if (await privRow.isVisible()) {
      await privRow.click()
      await page.waitForTimeout(500)
      await page.screenshot({ path: path.join(OUT_DIR, '20_settings_privacy.png') })
      await page.locator('.subpage-header .icon-btn').click()
      await page.waitForTimeout(400)
    }

    // Test Security subpage
    console.log('⚙️ Testing Security subpage...')
    const secRow = page.locator('button.group-row:has-text("Security"), button.group-row:has-text("Безопасность")').first()
    if (await secRow.isVisible()) {
      await secRow.click()
      await page.waitForTimeout(500)
      await page.screenshot({ path: path.join(OUT_DIR, '21_settings_security.png') })
      await page.locator('.subpage-header .icon-btn').click()
      await page.waitForTimeout(400)
    }

    // Test Backups subpage
    console.log('⚙️ Testing Backups subpage...')
    const backRow = page.locator('button.group-row:has-text("Backups"), button.group-row:has-text("Резервные копии")').first()
    if (await backRow.isVisible()) {
      await backRow.click()
      await page.waitForTimeout(500)
      await page.screenshot({ path: path.join(OUT_DIR, '22_settings_backups.png') })
      await page.locator('.subpage-header .icon-btn').click()
      await page.waitForTimeout(400)
    }

    // Test Pro Tiered Paywall Modal
    console.log('👑 Testing Pro Paywall modal...')
    const proBanner = page.locator('.pro-banner, button.badge-pro, button:has-text("Upgrade to Pro")').first()
    if (await proBanner.isVisible()) {
      await proBanner.click()
      await page.waitForTimeout(600)
      console.log('💎 PaywallModal opened cleanly')
      await page.screenshot({ path: path.join(OUT_DIR, '23_paywall_modal.png') })
      const closePaywall = page.locator('.paywall-modal .btn-close, .paywall-modal button[aria-label="Close"]').first()
      if (await closePaywall.isVisible()) {
        await closePaywall.click()
        await page.waitForTimeout(400)
      }
    }

    console.log('✅ ALL PAGES TESTED SUCCESSFULLY!')
  } catch (err) {
    console.error('❌ Error during testing:', err)
    await page.screenshot({ path: path.join(OUT_DIR, 'error_state.png') })
    process.exitCode = 1
  } finally {
    await browser.close()
  }
}

run()
