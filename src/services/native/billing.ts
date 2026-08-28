import { Purchases } from '@revenuecat/purchases-capacitor'
import { Preferences } from '@capacitor/preferences'
import { isNative, platform } from '@/lib/platform'

const PREMIUM_KEY = 'wdg_is_premium'

/**
 * RevenueCat project API keys (public SDK keys — safe to ship in the client,
 * they only identify the app to RevenueCat; real entitlement checks happen
 * server-side). Get these from dashboard.revenuecat.com → Project → API keys,
 * after creating an Android (Play Billing) and/or iOS (App Store) app there.
 * Left blank, the app runs in "not configured" mode: purchases are refused
 * instead of silently granting Pro for free.
 */
const REVENUECAT_API_KEY_ANDROID = ''
const REVENUECAT_API_KEY_IOS = ''

/** Must match the entitlement identifier configured in the RevenueCat dashboard. */
const ENTITLEMENT_ID = 'pro'

export interface ProductDetails {
  id: string
  title: string
  description: string
  price: string
}

export const PRO_PRODUCT: ProductDetails = {
  id: 'com.wherediditgo.pro',
  title: 'WhereDidItGo Pro (Lifetime Access)',
  description: 'Unlock unlimited accounts, unlimited transactions, CSV/JSON backups, and advanced insights.',
  price: '$4.99',
}

function currentApiKey(): string {
  return platform() === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID
}

function isConfigured(): boolean {
  return isNative() && currentApiKey().length > 0
}

let configurePromise: Promise<void> | null = null

/** Configures the SDK at most once, lazily, on first purchase-related call. */
function ensureConfigured(): Promise<void> {
  if (!configurePromise) {
    configurePromise = Purchases.configure({ apiKey: currentApiKey() })
  }
  return configurePromise
}

export class PremiumManager {
  private static cachedState: boolean | null = null

  /** Check if user is Pro user. Cached locally for offline access. */
  static async checkStatus(): Promise<boolean> {
    if (this.cachedState !== null) return this.cachedState
    if (isConfigured()) {
      try {
        await ensureConfigured()
        const { customerInfo } = await Purchases.getCustomerInfo()
        const active = customerInfo.entitlements.active[ENTITLEMENT_ID]?.isActive ?? false
        this.cachedState = active
        await Preferences.set({ key: PREMIUM_KEY, value: active ? 'true' : 'false' })
        return active
      } catch (e) {
        console.error('RevenueCat status check failed, falling back to cached value:', e)
      }
    }
    try {
      const { value } = await Preferences.get({ key: PREMIUM_KEY })
      this.cachedState = value === 'true'
      return this.cachedState
    } catch {
      return false
    }
  }

  /** Set local purchase status (also used as the offline/dev-mode cache). */
  static async setPremium(status: boolean): Promise<void> {
    this.cachedState = status
    await Preferences.set({ key: PREMIUM_KEY, value: status ? 'true' : 'false' })
  }

  /** Trigger purchase flow via RevenueCat (Google Play Billing / App Store). */
  static async purchasePro(): Promise<boolean> {
    if (!isConfigured()) {
      console.warn('RevenueCat is not configured (no API key set in billing.ts) — purchase refused.')
      return false
    }
    try {
      await ensureConfigured()
      const offerings = await Purchases.getOfferings()
      const pkg = offerings.current?.availablePackages[0]
      if (!pkg) {
        console.error('No RevenueCat offering package available — check the dashboard configuration.')
        return false
      }
      const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg })
      const active = customerInfo.entitlements.active[ENTITLEMENT_ID]?.isActive ?? false
      await this.setPremium(active)
      return active
    } catch (e) {
      console.error('Purchase failed:', e)
      return false
    }
  }

  /** Restore purchases for reinstallation. */
  static async restorePurchases(): Promise<boolean> {
    if (!isConfigured()) return this.checkStatus()
    try {
      await ensureConfigured()
      const { customerInfo } = await Purchases.restorePurchases()
      const active = customerInfo.entitlements.active[ENTITLEMENT_ID]?.isActive ?? false
      await this.setPremium(active)
      return active
    } catch (e) {
      console.error('Restore failed:', e)
      return false
    }
  }
}
