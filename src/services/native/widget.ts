/**
 * Home-screen Android Widgets Synchronization Service.
 *
 * Writes plain, already-formatted display strings into the SharedPreferences file
 * used by @capacitor/preferences on Android ("CapacitorStorage") so native
 * AppWidgetProviders (BalanceWidgetProvider, QuickAddWidgetProvider, StreakWidgetProvider)
 * can read them directly without going through the WebView/Capacitor bridge.
 */
import { Preferences } from '@capacitor/preferences'
import { isNative } from '@/lib/platform'

const KEY_TOTAL_BALANCE = 'widget_total_balance'
const KEY_MONTH_SPEND = 'widget_month_spend'
const KEY_MONTH_INCOME = 'widget_month_income'
const KEY_CURRENCY_SYMBOL = 'widget_currency_symbol'
const KEY_STREAK_CURRENT = 'widget_streak_current'
const KEY_STREAK_ACTIVE_TODAY = 'widget_streak_active_today'

export interface WidgetSyncData {
  /** Overall balance across all active accounts, in minor units (cents). */
  totalBalance: number
  /** This month's total spend, in minor units (cents). */
  monthSpend: number
  /** This month's total income, in minor units (cents). */
  monthIncome: number
  /** Currency symbol to prefix the formatted amounts with, e.g. "$". */
  currencySymbol: string
  /** Current consecutive active daily streak count. */
  streakCount: number
  /** Whether a transaction has already been logged today. */
  streakActiveToday: boolean
}

export interface WidgetBalanceData {
  /** This month's total spend, in minor units (cents). */
  monthSpend: number
  /** This month's total income, in minor units (cents). */
  monthIncome: number
  /** Currency symbol to prefix the formatted amounts with, e.g. "$". */
  currencySymbol: string
}

function formatAmount(minorUnits: number): string {
  const value = Number.isFinite(minorUnits) ? Math.round(minorUnits) / 100 : 0
  return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

/**
 * Pushes full balance, expense, income, and streak metrics to Android home-screen widgets.
 */
export async function updateAppWidgets(data: WidgetSyncData): Promise<void> {
  if (!isNative()) return
  try {
    await Promise.all([
      Preferences.set({ key: KEY_TOTAL_BALANCE, value: formatAmount(data.totalBalance) }),
      Preferences.set({ key: KEY_MONTH_SPEND, value: formatAmount(data.monthSpend) }),
      Preferences.set({ key: KEY_MONTH_INCOME, value: formatAmount(data.monthIncome) }),
      Preferences.set({ key: KEY_CURRENCY_SYMBOL, value: data.currencySymbol }),
      Preferences.set({ key: KEY_STREAK_CURRENT, value: String(Math.max(0, data.streakCount)) }),
      Preferences.set({ key: KEY_STREAK_ACTIVE_TODAY, value: String(Boolean(data.streakActiveToday)) }),
    ])
  } catch {
    // Preferences unavailable — widgets will retain last cached values
  }
}

/**
 * Backwards-compatible alias for updating balance figures.
 */
export async function updateBalanceWidget(data: WidgetBalanceData): Promise<void> {
  if (!isNative()) return
  try {
    await Promise.all([
      Preferences.set({ key: KEY_MONTH_SPEND, value: formatAmount(data.monthSpend) }),
      Preferences.set({ key: KEY_MONTH_INCOME, value: formatAmount(data.monthIncome) }),
      Preferences.set({ key: KEY_CURRENCY_SYMBOL, value: data.currencySymbol }),
    ])
  } catch {
    // Preferences unavailable
  }
}
