/**
 * Settings Store — manages theme, locale, privacy mode, and application preferences.
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { db } from '@/db'
import { ensureSeeded } from '@/db/seed'
import { detectDefaultLocale, isAppLocale, setI18nLocale, toIntlLocale, type AppLocale } from '@/i18n'
import { defaultCurrencyForLocale } from '@/lib/currencies'
import { monthKey, setCycleStartDay } from '@/lib/dates'
import { createId } from '@/lib/id'
import { getCurrencySymbol } from '@/lib/money'
import { applyStatusBar } from '@/services/native/chrome'
import type { AppFont, ColorScheme, CurrencyPosition, HeroMetric, NavLabelStyle, PrivacyMode, ThemeMode } from '@/types/finance'

const VALID_COLOR_SCHEMES: ColorScheme[] = [
  'teal', 'blue', 'purple', 'rose', 'amber', 'obsidian',
  'luxury-navy', 'violet-peach', 'navy-cyan',
  'tiffany', 'true-pink', 'cyber-violet', 'lime-canopy', 'milky-mantis',
]

function isColorScheme(value: string | undefined | null): value is ColorScheme {
  return VALID_COLOR_SCHEMES.includes(value as ColorScheme)
}

const PIN_PBKDF2_ITERATIONS = 100_000



function isCurrencyPosition(value: string | undefined | null): value is CurrencyPosition {
  return value === 'before' || value === 'after'
}

function isHeroMetric(value: string | undefined | null): value is HeroMetric {
  return value === 'balance' || value === 'budget'
}

function isPrivacyMode(value: string | undefined | null): value is PrivacyMode {
  return value === 'none' || value === 'hero' || value === 'all'
}

function privacyFromStored(map: Record<string, string>): PrivacyMode {
  if (isPrivacyMode(map.privacyMode)) return map.privacyMode
  return map.hideAmounts === 'true' ? 'all' : 'none'
}

export const useSettingsStore = defineStore('settings', () => {
  const ready = ref(false)
  const onboardingDone = ref(false)
  const currency = ref('USD')
  const currencyPosition = ref<CurrencyPosition>('before')
  const heroMetric = ref<HeroMetric>('balance')
  const privacyMode = ref<PrivacyMode>('none')
  const hideAmounts = computed(() => privacyMode.value === 'all')
  const blurHero = computed(() => privacyMode.value === 'hero')
  const locale = ref<AppLocale>('en')
  const theme = ref<ThemeMode>('dark')
  const resolvedTheme = ref<'light' | 'dark' | 'oled'>('dark')
  const colorScheme = ref<ColorScheme>('teal')
  const fontFamily = ref<AppFont>('system')
  const lastAccountId = ref('')
  const lastToAccountId = ref('')
  const lastExpenseCategoryId = ref('')
  const lastIncomeCategoryId = ref('')
  const lastBackupAt = ref('')
  const pinEnabled = ref(false)
  const pinHash = ref('')
  const pinSalt = ref('')
  const biometricEnabled = ref(false)
  const isUnlocked = ref(true)
  const showActivityTab = ref(true)
  const showCategoriesTab = ref(true)
  const showDebtsTab = ref(true)
  const showBudgetsTab = ref(true)
  const showInsightsTab = ref(true)
  const navLabelStyle = ref<NavLabelStyle>('labels')
  const hideCents = ref(false)
  const startOfMonth = ref(1)
  const firstDayOfWeek = ref<0 | 1>(1)
  const hideInRecents = ref(false)

  const intlLocale = computed(() => toIntlLocale(locale.value))

  /** Legacy single-pass SHA-256 hash (for backward-compatible verification only). */
  async function legacyHashPin(pin: string): Promise<string> {
    const msgUint8 = new TextEncoder().encode('wdg_pin_' + pin)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  /** PBKDF2-SHA256 hash with random salt — resistant to brute-force. */
  async function hashPinPbkdf2(pin: string, salt: Uint8Array): Promise<string> {
    const enc = new TextEncoder()
    const baseKey = await crypto.subtle.importKey(
      'raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits'],
    )
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations: PIN_PBKDF2_ITERATIONS, hash: 'SHA-256' },
      baseKey, 256,
    )
    const hashArray = Array.from(new Uint8Array(bits))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  function hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2)
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
    }
    return bytes
  }

  async function load() {
    const storedLocaleRow = await db.meta.get('locale')
    const localeCode = isAppLocale(storedLocaleRow?.value)
      ? storedLocaleRow.value
      : detectDefaultLocale()
    const storedCurrencyRow = await db.meta.get('currency')
    const currencyCode = storedCurrencyRow?.value || defaultCurrencyForLocale(localeCode)
    await ensureSeeded(currencyCode, localeCode)
    const rows = await db.meta.toArray()
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]))
    onboardingDone.value = map.onboardingDone === 'true'
    currency.value = map.currency ?? currencyCode
    theme.value = (map.theme === 'light' || map.theme === 'oled') ? map.theme : 'dark'
    currencyPosition.value = isCurrencyPosition(map.currencyPosition)
      ? map.currencyPosition
      : 'before'
    if (!isCurrencyPosition(map.currencyPosition)) {
      await db.meta.put({ key: 'currencyPosition', value: currencyPosition.value })
    }
    heroMetric.value = isHeroMetric(map.heroMetric) ? map.heroMetric : 'balance'
    if (!isHeroMetric(map.heroMetric)) {
      await db.meta.put({ key: 'heroMetric', value: heroMetric.value })
    }
    privacyMode.value = privacyFromStored(map)
    lastAccountId.value = map.lastAccountId ?? ''
    lastToAccountId.value = map.lastToAccountId ?? ''
    lastExpenseCategoryId.value = map.lastExpenseCategoryId ?? ''
    lastIncomeCategoryId.value = map.lastIncomeCategoryId ?? ''
    lastBackupAt.value = map.lastBackupAt ?? ''
    pinEnabled.value = map.pinEnabled === 'true'
    pinHash.value = map.pinHash ?? ''
    pinSalt.value = map.pinSalt ?? ''
    biometricEnabled.value = map.biometricEnabled === 'true'
    showActivityTab.value = map.showActivityTab !== 'false'
    showCategoriesTab.value = map.showCategoriesTab !== 'false'
    showDebtsTab.value = map.showDebtsTab !== 'false'
    showBudgetsTab.value = map.showBudgetsTab !== 'false'
    showInsightsTab.value = map.showInsightsTab !== 'false'
    navLabelStyle.value = map.navLabelStyle === 'icons' ? 'icons' : 'labels'
    hideCents.value = map.hideCents === 'true'
    startOfMonth.value = Number.parseInt(map.startOfMonth || '1', 10) || 1
    setCycleStartDay(startOfMonth.value)
    firstDayOfWeek.value = map.firstDayOfWeek === '0' ? 0 : 1
    hideInRecents.value = map.hideInRecents === 'true'
    if (pinEnabled.value && pinHash.value) {
      isUnlocked.value = false
    } else {
      isUnlocked.value = true
    }
    colorScheme.value = isColorScheme(map.colorScheme) ? map.colorScheme : 'teal'
    fontFamily.value = (map.fontFamily as AppFont) || 'system'
    locale.value = localeCode
    setI18nLocale(locale.value)
    applyTheme(theme.value)
    // Auto-migrate legacy single-pass PIN hash to PBKDF2 on next unlock
    // (done in verifyPin)
    applyColorScheme(colorScheme.value)
    applyFontFamily(fontFamily.value)
    ready.value = true
  }

  async function setShowActivityTab(val: boolean) {
    showActivityTab.value = val
    await db.meta.put({ key: 'showActivityTab', value: val ? 'true' : 'false' })
  }

  async function setShowCategoriesTab(val: boolean) {
    showCategoriesTab.value = val
    await db.meta.put({ key: 'showCategoriesTab', value: val ? 'true' : 'false' })
  }

  async function setShowDebtsTab(val: boolean) {
    showDebtsTab.value = val
    await db.meta.put({ key: 'showDebtsTab', value: val ? 'true' : 'false' })
  }

  async function setShowBudgetsTab(val: boolean) {
    showBudgetsTab.value = val
    await db.meta.put({ key: 'showBudgetsTab', value: val ? 'true' : 'false' })
  }

  async function setShowInsightsTab(val: boolean) {
    showInsightsTab.value = val
    await db.meta.put({ key: 'showInsightsTab', value: val ? 'true' : 'false' })
  }

  async function setPin(pinCode: string) {
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const saltHex = bytesToHex(salt)
    const hash = await hashPinPbkdf2(pinCode, salt)
    pinEnabled.value = true
    pinHash.value = hash
    pinSalt.value = saltHex
    isUnlocked.value = true
    await db.meta.bulkPut([
      { key: 'pinEnabled', value: 'true' },
      { key: 'pinHash', value: hash },
      { key: 'pinSalt', value: saltHex },
    ])
  }

  async function removePin() {
    pinEnabled.value = false
    pinHash.value = ''
    pinSalt.value = ''
    biometricEnabled.value = false
    isUnlocked.value = true
    await db.meta.bulkPut([
      { key: 'pinEnabled', value: 'false' },
      { key: 'pinHash', value: '' },
      { key: 'pinSalt', value: '' },
      { key: 'biometricEnabled', value: 'false' },
    ])
  }

  async function verifyPin(pinCode: string): Promise<boolean> {
    if (!pinHash.value) return true

    // Try PBKDF2 verification first (new format with salt)
    if (pinSalt.value) {
      const salt = hexToBytes(pinSalt.value)
      const hash = await hashPinPbkdf2(pinCode, salt)
      if (hash === pinHash.value) {
        isUnlocked.value = true
        return true
      }
      return false
    }

    // Fall back to legacy SHA-256 verification and auto-migrate
    const legacyHash = await legacyHashPin(pinCode)
    if (legacyHash === pinHash.value) {
      isUnlocked.value = true
      // Auto-migrate to PBKDF2 on successful legacy verification
      await setPin(pinCode)
      return true
    }
    return false
  }

  async function setBiometricEnabled(val: boolean) {
    biometricEnabled.value = val
    await db.meta.put({ key: 'biometricEnabled', value: val ? 'true' : 'false' })
  }

  function unlockApp() {
    isUnlocked.value = true
  }

  function lockApp() {
    if (pinEnabled.value) {
      isUnlocked.value = false
    }
  }

  function applyTheme(mode: ThemeMode) {
    theme.value = mode
    resolvedTheme.value = mode
    document.documentElement.setAttribute('data-theme', mode)
    void applyStatusBar(mode)
  }

  async function setTheme(mode: ThemeMode) {
    applyTheme(mode)
    await db.meta.put({ key: 'theme', value: mode })
  }

  function applyColorScheme(scheme: ColorScheme) {
    colorScheme.value = scheme
    document.documentElement.setAttribute('data-color-scheme', scheme)
  }

  async function setColorScheme(scheme: ColorScheme) {
    applyColorScheme(scheme)
    await db.meta.put({ key: 'colorScheme', value: scheme })
  }

  function applyFontFamily(font: AppFont) {
    fontFamily.value = font
    document.documentElement.setAttribute('data-font', font)
    if (document.body) {
      document.body.setAttribute('data-font', font)
    }
  }

  async function setFontFamily(font: AppFont) {
    applyFontFamily(font)
    await db.meta.put({ key: 'fontFamily', value: font })
  }

  async function setCurrency(code: string) {
    currency.value = code
    await db.meta.put({ key: 'currency', value: code })
  }

  async function setCurrencyPosition(position: CurrencyPosition) {
    currencyPosition.value = position
    await db.meta.put({ key: 'currencyPosition', value: position })
  }

  async function setHeroMetric(metric: HeroMetric) {
    heroMetric.value = metric
    await db.meta.put({ key: 'heroMetric', value: metric })
  }

  async function setPrivacyMode(mode: PrivacyMode) {
    privacyMode.value = mode
    await db.meta.bulkPut([
      { key: 'privacyMode', value: mode },
      { key: 'hideAmounts', value: mode === 'all' ? 'true' : 'false' },
    ])
  }

  async function setLocale(code: AppLocale) {
    locale.value = code
    setI18nLocale(code)
    await db.meta.put({ key: 'locale', value: code })
  }

  async function rememberLastUsed(input: {
    accountId: string
    toAccountId?: string
    expenseCategoryId?: string
    incomeCategoryId?: string
  }) {
    const rows: { key: string; value: string }[] = [
      { key: 'lastAccountId', value: input.accountId },
    ]
    lastAccountId.value = input.accountId
    if (input.toAccountId) {
      lastToAccountId.value = input.toAccountId
      rows.push({ key: 'lastToAccountId', value: input.toAccountId })
    }
    if (input.expenseCategoryId) {
      lastExpenseCategoryId.value = input.expenseCategoryId
      rows.push({ key: 'lastExpenseCategoryId', value: input.expenseCategoryId })
    }
    if (input.incomeCategoryId) {
      lastIncomeCategoryId.value = input.incomeCategoryId
      rows.push({ key: 'lastIncomeCategoryId', value: input.incomeCategoryId })
    }
    await db.meta.bulkPut(rows)
  }

  async function completeOnboarding(input: {
    currency: string
    accounts?: Array<{ id: string; name: string; balance: number }>
    budgets?: Array<{ categoryId: string; limitAmount: number }>
    /** Starter categories the user deselected during onboarding. */
    removeCategoryIds?: string[]
  }) {
    const selectedCurrency = input.currency
    currency.value = selectedCurrency
    onboardingDone.value = true
    await db.meta.bulkPut([
      { key: 'currency', value: selectedCurrency },
      { key: 'onboardingDone', value: 'true' },
      { key: 'locale', value: locale.value },
      { key: 'currencyPosition', value: currencyPosition.value },
      { key: 'heroMetric', value: heroMetric.value },
      { key: 'privacyMode', value: privacyMode.value },
      { key: 'hideAmounts', value: privacyMode.value === 'all' ? 'true' : 'false' },
    ])
    if (input.removeCategoryIds?.length) {
      await db.categories.bulkDelete(input.removeCategoryIds)
    }
    const accounts = await db.accounts.toArray()
    await Promise.all(
      accounts.map((a) => {
        const patch = input.accounts?.find((row) => row.id === a.id)
        return db.accounts.update(a.id, {
          currency: selectedCurrency,
          ...(patch
            ? { name: patch.name.trim() || a.name, balance: patch.balance }
            : {}),
        })
      }),
    )
    if (input.budgets?.length) {
      const month = monthKey()
      await db.budgets.bulkAdd(
        input.budgets
          .filter((b) => b.limitAmount > 0 && b.categoryId)
          .map((b) => ({
            id: createId('bud'),
            categoryId: b.categoryId,
            month,
            limitAmount: b.limitAmount,
            rollover: false,
          })),
      )
    }
  }

  async function markBackupNow() {
    const at = new Date().toISOString()
    lastBackupAt.value = at
    await db.meta.put({ key: 'lastBackupAt', value: at })
  }

  async function setHideCents(val: boolean) {
    hideCents.value = val
    await db.meta.put({ key: 'hideCents', value: val ? 'true' : 'false' })
  }

  async function setStartOfMonth(val: number) {
    const clamped = Math.max(1, Math.min(28, val))
    startOfMonth.value = clamped
    setCycleStartDay(clamped)
    await db.meta.put({ key: 'startOfMonth', value: String(clamped) })
  }

  async function setFirstDayOfWeek(val: 0 | 1) {
    firstDayOfWeek.value = val
    await db.meta.put({ key: 'firstDayOfWeek', value: String(val) })
  }

  async function setNavLabelStyle(style: NavLabelStyle) {
    navLabelStyle.value = style
    await db.meta.put({ key: 'navLabelStyle', value: style })
  }

  async function setHideInRecents(val: boolean) {
    hideInRecents.value = val
    await db.meta.put({ key: 'hideInRecents', value: val ? 'true' : 'false' })
  }

  const currencySymbol = computed(() =>
    getCurrencySymbol(currency.value, intlLocale.value),
  )

  return {
    ready,
    onboardingDone,
    currency,
    currencyPosition,
    heroMetric,
    privacyMode,
    hideAmounts,
    blurHero,
    locale,
    intlLocale,
    theme,
    resolvedTheme,
    colorScheme,
    fontFamily,
    lastAccountId,
    lastToAccountId,
    lastExpenseCategoryId,
    lastIncomeCategoryId,
    lastBackupAt,
    pinEnabled,
    pinHash,
    biometricEnabled,
    isUnlocked,
    showActivityTab,
    showCategoriesTab,
    showDebtsTab,
    showBudgetsTab,
    showInsightsTab,
    navLabelStyle,
    hideCents,
    startOfMonth,
    firstDayOfWeek,
    hideInRecents,
    currencySymbol,
    load,
    setTheme,
    applyColorScheme,
    setColorScheme,
    applyFontFamily,
    setFontFamily,
    setCurrency,
    setCurrencyPosition,
    setHeroMetric,
    setPrivacyMode,
    setLocale,
    rememberLastUsed,
    completeOnboarding,
    markBackupNow,
    applyTheme,
    setPin,
    removePin,
    verifyPin,
    setBiometricEnabled,
    setShowActivityTab,
    setShowCategoriesTab,
    setShowDebtsTab,
    setShowBudgetsTab,
    setShowInsightsTab,
    setNavLabelStyle,
    setHideCents,
    setStartOfMonth,
    setFirstDayOfWeek,
    setHideInRecents,
    unlockApp,
    lockApp,
  }
})
