import {
  Purchases as NativePurchases,
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
  type PurchasesOfferings,
  type PurchasesPackage,
  type CustomerInfo as NativeCustomerInfo,
} from '@revenuecat/purchases-capacitor'
import { RevenueCatUI, PAYWALL_RESULT } from '@revenuecat/purchases-capacitor-ui'
import { Purchases as WebPurchases, type CustomerInfo as WebCustomerInfo } from '@revenuecat/purchases-js'
import { Preferences } from '@capacitor/preferences'
import { isNative, platform } from '@/lib/platform'

const PREMIUM_KEY = 'wdg_is_premium'

/**
 * RevenueCat project API keys.
 * Default configured with user's RevenueCat test key.
 */
const REVENUECAT_API_KEY_ANDROID = 'test_HZFmnPcmetdUSXxTkyPoKnSRkZB'
const REVENUECAT_API_KEY_IOS = 'test_HZFmnPcmetdUSXxTkyPoKnSRkZB'
const REVENUECAT_API_KEY_STRIPE = 'test_HZFmnPcmetdUSXxTkyPoKnSRkZB'

/** Primary Pro Entitlement Identifier in RevenueCat Dashboard */
export const ENTITLEMENT_ID = 'wherediditgo_pro'

export type SubscriptionPlanId = 'lifetime' | 'annual' | 'monthly'

export interface ProductDetails {
  id: string
  title: string
  description: string
  price: string
}

export const PRO_PRODUCT: ProductDetails = {
  id: 'lifetime',
  title: 'WhereDidItGo Pro (Lifetime Access)',
  description: 'Unlock unlimited accounts, unlimited transactions, CSV/JSON backups, and advanced insights.',
  price: '$26.97',
}

export interface PurchaseResult {
  success: boolean
  cancelled: boolean
  error?: any
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

/** Configures the SDK at most once, lazily on first call. */
async function ensureConfigured(): Promise<void> {
  if (configurePromise) return configurePromise

  if (isNative()) {
    configurePromise = (async () => {
      await NativePurchases.setLogLevel({ level: LOG_LEVEL.DEBUG })
      await NativePurchases.configure({ apiKey: currentApiKey() })

      // Real-time listener for customer updates
      await NativePurchases.addCustomerInfoUpdateListener((customerInfo: NativeCustomerInfo) => {
        const active = customerInfo.entitlements?.active?.[ENTITLEMENT_ID] !== undefined
        void PremiumManager.setPremium(active)
      })
    })()
  } else {
    // Web fallback for browser preview / Electron
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

/** Helper to locate corresponding package by plan identifier */
export function findPackageForPlan(
  offering: PurchasesOfferings['current'],
  plan: SubscriptionPlanId,
): PurchasesPackage | null {
  if (!offering) return null

  if (plan === 'lifetime') {
    return (
      offering.lifetime ||
      offering.availablePackages.find(
        (p) =>
          p.identifier === '$rc_lifetime' ||
          p.identifier.toLowerCase().includes('lifetime') ||
          p.product?.identifier?.toLowerCase().includes('lifetime'),
      ) ||
      null
    )
  }
  if (plan === 'annual') {
    return (
      offering.annual ||
      offering.availablePackages.find(
        (p) =>
          p.identifier === '$rc_annual' ||
          p.identifier.toLowerCase().includes('annual') ||
          p.identifier.toLowerCase().includes('yearly') ||
          p.product?.identifier?.toLowerCase().includes('yearly'),
      ) ||
      null
    )
  }
  if (plan === 'monthly') {
    return (
      offering.monthly ||
      offering.availablePackages.find(
        (p) =>
          p.identifier === '$rc_monthly' ||
          p.identifier.toLowerCase().includes('monthly') ||
          p.product?.identifier?.toLowerCase().includes('monthly'),
      ) ||
      null
    )
  }
  return null
}

export class PremiumManager {
  private static cachedState: boolean | null = null

  /** Check if user has active Pro entitlement. Cached locally for offline access. */
  static async checkStatus(): Promise<boolean> {
    if (this.cachedState !== null) return this.cachedState

    if (isConfigured()) {
      try {
        await ensureConfigured()

        let active = false
        if (isNative()) {
          const res = await NativePurchases.getCustomerInfo()
          active = res.customerInfo.entitlements?.active?.[ENTITLEMENT_ID] !== undefined
        } else if (webPurchases) {
          const customerInfo: WebCustomerInfo = await webPurchases.getCustomerInfo()
          active = customerInfo.entitlements?.active?.[ENTITLEMENT_ID]?.isActive ?? false
        }

        await this.setPremium(active)
        return active
      } catch (e) {
        console.warn('RevenueCat status check failed, falling back to cached value:', e)
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

  /** Set local purchase status cache. */
  static async setPremium(status: boolean): Promise<void> {
    this.cachedState = status
    await Preferences.set({ key: PREMIUM_KEY, value: status ? 'true' : 'false' })
  }

  /** Fetch available offerings from RevenueCat */
  static async getOfferings(): Promise<PurchasesOfferings | null> {
    if (!isConfigured()) return null
    try {
      await ensureConfigured()
      if (isNative()) {
        return await NativePurchases.getOfferings()
      } else if (webPurchases) {
        return (await webPurchases.getOfferings()) as any
      }
      return null
    } catch (e) {
      console.error('Failed to get offerings:', e)
      return null
    }
  }

  /**
   * Present the native RevenueCat Paywall.
   * Uses paywall configured in the RevenueCat dashboard.
   */
  static async presentPaywall(): Promise<boolean> {
    if (!isNative()) return false
    try {
      await ensureConfigured()
      const { result } = await RevenueCatUI.presentPaywall()
      const active = await this.checkStatus()
      return result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED || active
    } catch (e) {
      console.error('Failed to present paywall:', e)
      return false
    }
  }

  /**
   * Present the native RevenueCat Paywall only if the user does NOT have the pro entitlement.
   */
  static async presentPaywallIfNeeded(): Promise<boolean> {
    if (!isNative()) return false
    try {
      await ensureConfigured()
      const { result } = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: ENTITLEMENT_ID,
      })
      const active = await this.checkStatus()
      return result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED || active
    } catch (e) {
      console.error('Failed to present paywall if needed:', e)
      return false
    }
  }

  /**
   * Open the native RevenueCat Customer Center for managing subscriptions.
   */
  static async presentCustomerCenter(): Promise<void> {
    if (!isNative()) return
    try {
      await ensureConfigured()
      await RevenueCatUI.presentCustomerCenter()
      await this.checkStatus()
    } catch (e) {
      console.error('Failed to present customer center:', e)
    }
  }

  /**
   * Purchase a specific plan ('lifetime' | 'annual' | 'monthly') or specific package.
   */
  static async purchasePlan(plan: SubscriptionPlanId = 'lifetime'): Promise<PurchaseResult> {
    if (!isConfigured()) {
      console.warn('RevenueCat is not configured (no API key set).')
      return { success: false, cancelled: false, error: new Error('Not configured') }
    }

    try {
      await ensureConfigured()
      const offerings = await this.getOfferings()
      const pkg = findPackageForPlan(offerings?.current ?? null, plan) || offerings?.current?.availablePackages?.[0]

      if (!pkg) {
        console.error(`No package found for plan ${plan}. Check dashboard configuration.`)
        return { success: false, cancelled: false, error: new Error('Package not found') }
      }

      return await this.purchasePackage(pkg)
    } catch (e: any) {
      if (e?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
        return { success: false, cancelled: true }
      }
      return { success: false, cancelled: false, error: e }
    }
  }

  /**
   * Purchase a direct PurchasesPackage instance.
   */
  static async purchasePackage(pkg: PurchasesPackage): Promise<PurchaseResult> {
    try {
      await ensureConfigured()
      let active = false

      if (isNative()) {
        const { customerInfo } = await NativePurchases.purchasePackage({ aPackage: pkg })
        active = customerInfo.entitlements?.active?.[ENTITLEMENT_ID] !== undefined
      } else if (webPurchases) {
        const { customerInfo } = await webPurchases.purchasePackage(pkg as any)
        active = customerInfo.entitlements?.active?.[ENTITLEMENT_ID]?.isActive ?? false
      }

      await this.setPremium(active)
      return { success: active, cancelled: false }
    } catch (e: any) {
      if (e?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
        return { success: false, cancelled: true }
      }
      console.error('Purchase failed:', e)
      return { success: false, cancelled: false, error: e }
    }
  }

  /**
   * Legacy method for backwards compatibility with existing UI calls.
   */
  static async purchasePro(plan: SubscriptionPlanId = 'lifetime'): Promise<boolean> {
    const result = await this.purchasePlan(plan)
    return result.success
  }

  /** Restore past purchases */
  static async restorePurchases(): Promise<boolean> {
    if (!isConfigured()) return this.checkStatus()
    try {
      await ensureConfigured()

      let active = false
      if (isNative()) {
        const { customerInfo } = await NativePurchases.restorePurchases()
        active = customerInfo.entitlements?.active?.[ENTITLEMENT_ID] !== undefined
      } else if (webPurchases) {
        const customerInfo = await webPurchases.getCustomerInfo()
        active = customerInfo.entitlements?.active?.[ENTITLEMENT_ID]?.isActive ?? false
      }

      await this.setPremium(active)
      return active
    } catch (e) {
      console.error('Restore failed:', e)
      return false
    }
  }
}
