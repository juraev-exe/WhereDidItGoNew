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
 * In production release builds, Google Play requires a public production key starting with "goog_".
 * Test keys (test_...) cause RevenueCat's native Android SDK to force-close the app in release mode.
 */
const env = (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {}) as Record<string, any>

const REVENUECAT_API_KEY_ANDROID =
  env.VITE_REVENUECAT_ANDROID_KEY || 'goog_jsxFosZXptnMUILBUeVnPlzePQS'
const REVENUECAT_API_KEY_IOS =
  env.VITE_REVENUECAT_IOS_KEY || 'test_HZFmnPcmetdUSXxTkyPoKnSRkZB'
const REVENUECAT_API_KEY_STRIPE =
  env.VITE_REVENUECAT_STRIPE_KEY || 'test_HZFmnPcmetdUSXxTkyPoKnSRkZB'

/** Primary Pro Entitlement Identifier in RevenueCat Dashboard */
export const ENTITLEMENT_ID =
  env.VITE_REVENUECAT_ENTITLEMENT_ID || 'wherediditgo_pro'

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

export function isProEntitlementActive(entitlements: Record<string, any> | undefined | null): boolean {
  if (!entitlements) return false
  if (entitlements[ENTITLEMENT_ID] !== undefined) return true
  if (entitlements['pro'] !== undefined || entitlements['premium'] !== undefined) return true
  return Object.keys(entitlements).length > 0
}

export function isWebEntitlementActive(entitlements: Record<string, any> | undefined | null): boolean {
  if (!entitlements) return false
  if (entitlements[ENTITLEMENT_ID]?.isActive) return true
  if (entitlements['pro']?.isActive || entitlements['premium']?.isActive) return true
  return Object.values(entitlements).some((e: any) => Boolean(e?.isActive))
}

function currentApiKey(): string {
  if (isNative()) {
    return platform() === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID
  }
  return REVENUECAT_API_KEY_STRIPE
}

export function isConfigured(): boolean {
  if (isNative()) {
    const key = platform() === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID
    if (!key) return false
    // In a native release build, RevenueCat Android SDK will force-close the app if given a test_ key.
    if (Boolean(env.PROD) && key.startsWith('test_')) {
      return false
    }
    return true
  }
  // Web / Electron: configured if any Stripe / Web key is provided
  const stripeKey = REVENUECAT_API_KEY_STRIPE
  return Boolean(stripeKey)
}

export const isBillingConfigured = isConfigured

let configurePromise: Promise<void> | null = null
let webPurchases: WebPurchases | null = null

/** Configures the SDK at most once, lazily on first call. */
async function ensureConfigured(): Promise<void> {
  if (configurePromise) return configurePromise

  if (isNative()) {
    const key = currentApiKey()
    // Guard: Prevent RevenueCat native SDK from force-closing the app with an AlertDialog in release builds when using a test key
    if (!key || (Boolean(env.PROD) && key.startsWith('test_'))) {
      console.warn(
        '[RevenueCat] Test API key detected in production build. RevenueCat disabled to prevent app termination. Provide a production Google Play key (goog_...) to enable Play Store billing.',
      )
      configurePromise = Promise.resolve()
      return configurePromise
    }

    configurePromise = (async () => {
      try {
        await NativePurchases.setLogLevel({ level: env.PROD ? LOG_LEVEL.WARN : LOG_LEVEL.DEBUG })
        await NativePurchases.configure({ apiKey: key })

        // Real-time listener for customer updates
        await NativePurchases.addCustomerInfoUpdateListener((customerInfo: NativeCustomerInfo) => {
          const active = isProEntitlementActive(customerInfo.entitlements?.active)
          void PremiumManager.setPremium(active)
        })
      } catch (err) {
        console.error('[RevenueCat] Failed to configure native purchases:', err)
      }
    })()
  } else {
    const stripeKey = REVENUECAT_API_KEY_STRIPE
    if (!stripeKey) {
      configurePromise = Promise.resolve()
      return configurePromise
    }
    // Web fallback for browser preview / Electron
    let webUserId = localStorage.getItem('wdg_web_uid')
    if (!webUserId) {
      webUserId = 'web_' + Math.random().toString(36).substring(2, 15)
      localStorage.setItem('wdg_web_uid', webUserId)
    }
    try {
      webPurchases = WebPurchases.configure(stripeKey, webUserId)
    } catch (err) {
      console.warn('[RevenueCat] Failed to configure web purchases:', err)
    }
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
          p.product?.identifier?.toLowerCase().includes('lifetime') ||
          p.identifier.toLowerCase().includes('pro') ||
          p.product?.identifier?.toLowerCase().includes('pro'),
      ) ||
      offering.availablePackages[0] ||
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
  static async checkStatus(force = false): Promise<boolean> {
    if (!force && this.cachedState !== null) return this.cachedState

    if (isConfigured()) {
      try {
        await ensureConfigured()

        let active = false
        if (isNative()) {
          const res = await NativePurchases.getCustomerInfo()
          active = isProEntitlementActive(res.customerInfo.entitlements?.active)
        } else if (webPurchases) {
          const customerInfo: WebCustomerInfo = await webPurchases.getCustomerInfo()
          active = isWebEntitlementActive(customerInfo.entitlements?.active)
        }

        if (active) {
          await this.setPremium(true)
          return true
        } else {
          // Entitlement is not active in RevenueCat, sync local cache to false
          await this.setPremium(false)
          return false
        }
      } catch (e) {
        console.warn('[RevenueCat] Status check failed, falling back to cached value:', e)
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

  /** Reset local purchase status cache back to free tier. */
  static async resetPremium(): Promise<void> {
    this.cachedState = false
    try {
      await Preferences.remove({ key: PREMIUM_KEY })
    } catch {}
    try {
      localStorage.removeItem(PREMIUM_KEY)
    } catch {}
  }

  /** Fetch available offerings from RevenueCat */
  static async getOfferings(): Promise<PurchasesOfferings | null> {
    if (!isConfigured()) return null
    try {
      await ensureConfigured()
      let offerings: PurchasesOfferings | null = null
      if (isNative()) {
        offerings = await NativePurchases.getOfferings()
      } else if (webPurchases) {
        offerings = (await webPurchases.getOfferings()) as any
      }
      // If current offering is not designated in dashboard, fallback to the first offering in all
      if (offerings && !offerings.current && offerings.all && Object.keys(offerings.all).length > 0) {
        const firstKey = Object.keys(offerings.all)[0]
        return {
          ...offerings,
          current: offerings.all[firstKey],
        }
      }
      return offerings
    } catch (e) {
      console.warn('[RevenueCat] Failed to get offerings:', e)
      return null
    }
  }

  /**
   * Present the native RevenueCat Paywall.
   * Uses paywall configured in the RevenueCat dashboard.
   */
  static async presentPaywall(): Promise<boolean> {
    const res = await this.presentPaywallWithDetails()
    return res.success
  }

  /**
   * Present the native RevenueCat Paywall with detailed error output.
   */
  static async presentPaywallWithDetails(): Promise<{ success: boolean; error?: any }> {
    if (!isNative() || !isConfigured()) {
      return { success: false, error: new Error('RevenueCat native paywall is only available on iOS/Android native builds.') }
    }
    try {
      await ensureConfigured()
      const offerings = await this.getOfferings()
      if (!offerings?.current || !offerings.current.availablePackages?.length) {
        return {
          success: false,
          error: new Error(
            'No packages found in RevenueCat Default Offering. In RevenueCat dashboard, go to Product Catalog → Offerings → default → "+ New Package" and link your Google Play product.',
          ),
        }
      }
      const { result } = await RevenueCatUI.presentPaywall()
      const active = await this.checkStatus()
      return { success: result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED || active }
    } catch (e: any) {
      console.error('Failed to present paywall:', e)
      return { success: false, error: e }
    }
  }

  /**
   * Present the native RevenueCat Paywall only if the user does NOT have the pro entitlement.
   */
  static async presentPaywallIfNeeded(): Promise<boolean> {
    if (!isNative() || !isConfigured()) return false
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
    if (!isNative() || !isConfigured()) return
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
      console.warn('[RevenueCat] Billing is not configured (no API key set).')
      return { success: false, cancelled: false, error: new Error('RevenueCat billing is not configured.') }
    }

    try {
      await ensureConfigured()
      const offerings = await this.getOfferings()
      const pkg = findPackageForPlan(offerings?.current ?? null, plan) || offerings?.current?.availablePackages?.[0]

      if (!pkg) {
        console.error(`No package found for plan ${plan}. Check dashboard configuration.`)
        return {
          success: false,
          cancelled: false,
          error: new Error(
            `No package found for "${plan}". In the RevenueCat dashboard, go to Product Catalog → Offerings → default, click "+ New Package", and link your Google Play product to $rc_lifetime.`,
          ),
        }
      }

      return await this.purchasePackage(pkg)
    } catch (e: any) {
      const isCancelled =
        e?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR ||
        e?.errorCode === 1 ||
        String(e?.message || '').toLowerCase().includes('cancel')
      if (isCancelled) {
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
        active = isProEntitlementActive(customerInfo.entitlements?.active)
      } else if (webPurchases) {
        const { customerInfo } = await webPurchases.purchasePackage(pkg as any)
        active = isWebEntitlementActive(customerInfo.entitlements?.active)
      }

      await this.setPremium(active)
      return { success: active, cancelled: false }
    } catch (e: any) {
      const isCancelled =
        e?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR ||
        e?.errorCode === 1 ||
        String(e?.message || '').toLowerCase().includes('cancel')
      if (isCancelled) {
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
        active = isProEntitlementActive(customerInfo.entitlements?.active)
      } else if (webPurchases) {
        const customerInfo = await webPurchases.getCustomerInfo()
        active = isWebEntitlementActive(customerInfo.entitlements?.active)
      }

      await this.setPremium(active)
      return active
    } catch (e) {
      console.error('Restore failed:', e)
      return false
    }
  }

  /** Simulate Pro unlock for dev testing */
  static async simulateDevPurchase(): Promise<PurchaseResult> {
    await this.setPremium(true)
    return { success: true, cancelled: false }
  }

  /** Retrieve live diagnostics about RevenueCat configuration and offerings */
  static async getBillingDiagnostics(): Promise<{
    configured: boolean
    isNative: boolean
    platform: string
    apiKeyPrefix: string
    offeringsLoaded: boolean
    currentOfferingId: string | null
    packagesCount: number
    packageIdentifiers: string[]
    entitlementActive: boolean
    error?: string
  }> {
    const configured = isConfigured()
    const currentPlatform = platform()
    const native = isNative()
    const key = currentApiKey()
    const apiKeyPrefix = key ? key.substring(0, 8) + '...' : 'none'

    try {
      await ensureConfigured()
      const offerings = await this.getOfferings()
      const current = offerings?.current
      const pkgs = current?.availablePackages || []
      const active = await this.checkStatus(true)

      return {
        configured,
        isNative: native,
        platform: currentPlatform,
        apiKeyPrefix,
        offeringsLoaded: Boolean(offerings),
        currentOfferingId: current?.identifier || null,
        packagesCount: pkgs.length,
        packageIdentifiers: pkgs.map((p) => p.identifier),
        entitlementActive: active,
      }
    } catch (e: any) {
      return {
        configured,
        isNative: native,
        platform: currentPlatform,
        apiKeyPrefix,
        offeringsLoaded: false,
        currentOfferingId: null,
        packagesCount: 0,
        packageIdentifiers: [],
        entitlementActive: false,
        error: e?.message || String(e),
      }
    }
  }
}
