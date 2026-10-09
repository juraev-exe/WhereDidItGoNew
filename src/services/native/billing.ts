import { Purchases as NativePurchases } from '@revenuecat/purchases-capacitor'
import { Purchases as WebPurchases, type CustomerInfo } from '@revenuecat/purchases-js'
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
const REVENUECAT_API_KEY_STRIPE = '' // Get this public key from RevenueCat (do NOT use your acct_... Stripe ID here)

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
  if (isNative()) return currentApiKey().length > 0
  return REVENUECAT_API_KEY_STRIPE.length > 0
}

let configurePromise: Promise<void> | null = null
let webPurchases: WebPurchases | null = null

/** Configures the SDK at most once, lazily, on first purchase-related call. */
async function ensureConfigured(): Promise<void> {
  if (configurePromise) return configurePromise

  if (isNative()) {
    configurePromise = NativePurchases.configure({ apiKey: currentApiKey() })
  } else {
    // Generate a unique anonymous App User ID for the web user based on local storage
    // Since there are no user accounts, this ensures their purchase stays linked to their browser
    let webUserId = localStorage.getItem('wdg_web_uid')
    if (!webUserId) {
      webUserId = 'web_' + Math.random().toString(36).substring(2, 15)
      localStorage.setItem('wdg_web_uid', webUserId)
    }
    webPurchases = WebPurchases.configure(REVENUECAT_API_KEY_STRIPE, webUserId)
    configurePromise = Promise.resolve()
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
        
        let customerInfo: CustomerInfo | any
        if (isNative()) {
          const res = await NativePurchases.getCustomerInfo()
          customerInfo = res.customerInfo
        } else {
          customerInfo = await webPurchases!.getCustomerInfo()
        }
        
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
      
      let active = false
      if (isNative()) {
        const offerings = await NativePurchases.getOfferings()
        const pkg = offerings.current?.availablePackages[0]
        if (!pkg) {
          console.error('No RevenueCat offering package available — check the dashboard configuration.')
          return false
        }
        const { customerInfo } = await NativePurchases.purchasePackage({ aPackage: pkg })
        active = customerInfo.entitlements.active[ENTITLEMENT_ID]?.isActive ?? false
      } else {
        const offerings = await webPurchases!.getOfferings()
        const pkg = offerings.current?.availablePackages[0]
        if (!pkg) {
          console.error('No RevenueCat offering package available — check the dashboard configuration.')
          return false
        }
        const { customerInfo } = await webPurchases!.purchasePackage(pkg)
        active = customerInfo.entitlements.active[ENTITLEMENT_ID]?.isActive ?? false
      }
      
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
      
      let active = false
      if (isNative()) {
        const { customerInfo } = await NativePurchases.restorePurchases()
        active = customerInfo.entitlements.active[ENTITLEMENT_ID]?.isActive ?? false
      } else {
        // Web Purchases doesn't need a specific restore method; getting customer info syncs it.
        const customerInfo = await webPurchases!.getCustomerInfo()
        active = customerInfo.entitlements.active[ENTITLEMENT_ID]?.isActive ?? false
      }
      
      await this.setPremium(active)
      return active
    } catch (e) {
      console.error('Restore failed:', e)
      return false
    }
  }
}
