/**
 * Home-screen Android Widgets Synchronization Service.
 *
 * Writes plain, already-formatted display strings into the SharedPreferences file
 * used by @capacitor/preferences on Android ("CapacitorStorage") so native
 * AppWidgetProviders (BalanceWidgetProvider, QuickAddWidgetProvider, StreakWidgetProvider, BudgetWidgetProvider)
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
const KEY_BUDGET_SPENT = 'widget_budget_spent'
const KEY_BUDGET_LIMIT = 'widget_budget_limit'
const KEY_BUDGET_PERCENT = 'widget_budget_percent'
const KEY_BUDGET_STATUS = 'widget_budget_status'
const KEY_BUDGET_REMAINING = 'widget_budget_remaining'
const KEY_BUDGET_DAYS_LEFT = 'widget_budget_days_left'

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
  /** Monthly budget total limit, in minor units (cents). Optional. */
  budgetLimit?: number
  /** Monthly budget spent amount, in minor units (cents). Optional. */
  budgetSpent?: number
  /** Monthly budget remaining amount, in minor units (cents). Optional. */
  budgetRemaining?: number
  /** Spend percentage 0..100. Optional. */
  budgetPercent?: number
  /** Budget status: 'on_track' | 'at_risk' | 'over'. Optional. */
  budgetStatus?: 'on_track' | 'at_risk' | 'over'
  /** Days left in current billing cycle / month. Optional. */
  budgetDaysLeft?: number
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
 * Pushes full balance, expense, income, streak, and budget metrics to Android home-screen widgets.
 */
export async function updateAppWidgets(data: WidgetSyncData): Promise<void> {
  if (!isNative()) return
  try {
    const promises: Promise<unknown>[] = [
      Preferences.set({ key: KEY_TOTAL_BALANCE, value: formatAmount(data.totalBalance) }),
      Preferences.set({ key: KEY_MONTH_SPEND, value: formatAmount(data.monthSpend) }),
      Preferences.set({ key: KEY_MONTH_INCOME, value: formatAmount(data.monthIncome) }),
      Preferences.set({ key: KEY_CURRENCY_SYMBOL, value: data.currencySymbol }),
      Preferences.set({ key: KEY_STREAK_CURRENT, value: String(Math.max(0, data.streakCount)) }),
      Preferences.set({ key: KEY_STREAK_ACTIVE_TODAY, value: String(Boolean(data.streakActiveToday)) }),
    ]

    if (data.budgetSpent !== undefined) {
      promises.push(
        Preferences.set({ key: KEY_BUDGET_SPENT, value: formatAmount(data.budgetSpent) }),
      )
    }
    if (data.budgetLimit !== undefined) {
      promises.push(
        Preferences.set({ key: KEY_BUDGET_LIMIT, value: formatAmount(data.budgetLimit) }),
      )
    }
    if (data.budgetPercent !== undefined) {
      promises.push(
        Preferences.set({ key: KEY_BUDGET_PERCENT, value: String(Math.round(data.budgetPercent)) }),
      )
    }
    if (data.budgetStatus !== undefined) {
      promises.push(
        Preferences.set({ key: KEY_BUDGET_STATUS, value: data.budgetStatus }),
      )
    }
    if (data.budgetRemaining !== undefined) {
      promises.push(
        Preferences.set({ key: KEY_BUDGET_REMAINING, value: formatAmount(data.budgetRemaining) }),
      )
    }
    if (data.budgetDaysLeft !== undefined) {
      promises.push(
        Preferences.set({ key: KEY_BUDGET_DAYS_LEFT, value: String(data.budgetDaysLeft) }),
      )
    }

    await Promise.all(promises)
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
