/**
 * Home-screen "this month" balance widget (Android).
 *
 * Writes plain, already-formatted display strings into the same SharedPreferences file
 * @capacitor/preferences uses on Android ("CapacitorStorage") so the native
 * BalanceWidgetProvider (android/app/src/main/java/com/wherediditgo/app/BalanceWidgetProvider.java)
 * can read them directly without going through the WebView/Capacitor bridge, which isn't
 * available to an AppWidgetProvider.
 *
 * No-op on web/dev and on iOS (there's no widget provider there yet), matching the pattern
 * used by other native-only services in this folder (see haptics.ts, chrome.ts).
 */
import { Preferences } from '@capacitor/preferences'
import { isNative } from '@/lib/platform'

const KEY_MONTH_SPEND = 'widget_month_spend'
const KEY_MONTH_INCOME = 'widget_month_income'
const KEY_CURRENCY_SYMBOL = 'widget_currency_symbol'

export interface WidgetBalanceData {
  /** This month's total spend, in minor units (cents). */
  monthSpend: number
  /** This month's total income, in minor units (cents). */
  monthIncome: number
  /** Currency symbol to prefix the formatted amounts with, e.g. "$". */
  currencySymbol: string
}

function formatMinorUnits(minorUnits: number): string {
  const value = Number.isFinite(minorUnits) ? minorUnits / 100 : 0
  return value.toFixed(2)
}

/** Pushes fresh balance figures to the Android home-screen widget's storage. */
export async function updateBalanceWidget(data: WidgetBalanceData): Promise<void> {
  if (!isNative()) return
  try {
    await Promise.all([
      Preferences.set({ key: KEY_MONTH_SPEND, value: formatMinorUnits(data.monthSpend) }),
      Preferences.set({ key: KEY_MONTH_INCOME, value: formatMinorUnits(data.monthIncome) }),
      Preferences.set({ key: KEY_CURRENCY_SYMBOL, value: data.currencySymbol }),
    ])
  } catch {
    // Preferences unavailable — widget will keep showing its last known/placeholder values.
  }
}
