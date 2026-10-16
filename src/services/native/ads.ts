import {
  AdMob,
  AdmobConsentStatus,
  RewardAdPluginEvents,
  type AdOptions,
  type AdMobRewardItem,
} from '@capacitor-community/admob'
import { isNative, platform } from '@/lib/platform'

// Official Google AdMob Test Ad Unit IDs
const TEST_IDS = {
  android: {
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
    rewarded: 'ca-app-pub-3940256099942544/5224354917',
    banner: 'ca-app-pub-3940256099942544/6300978111',
  },
  ios: {
    interstitial: 'ca-app-pub-3940256099942544/4411468910',
    rewarded: 'ca-app-pub-3940256099942544/1712485313',
    banner: 'ca-app-pub-3940256099942544/2934735716',
  },
}

// Configurable Ad Unit IDs (read from environment or fallback to official Google test IDs)
function getAdUnitId(type: 'interstitial' | 'rewarded'): string {
  const currentPlatform = platform() === 'ios' ? 'ios' : 'android'
  if (type === 'interstitial') {
    return import.meta.env.VITE_ADMOB_INTERSTITIAL_ID || TEST_IDS[currentPlatform].interstitial
  }
  return import.meta.env.VITE_ADMOB_REWARDED_ID || TEST_IDS[currentPlatform].rewarded
}

let isInitialized = false
let interstitialReady = false
let rewardedReady = false
let lastInterstitialShowTime = 0
const MIN_INTERSTITIAL_INTERVAL_MS = 90 * 1000 // At most once every 90 seconds
const TRANSACTIONS_BETWEEN_ADS = 4 // Show ad on every 4th logged transaction for free users

/**
 * Initialize Google AdMob SDK and request user consent
 */
export async function initializeAds(): Promise<void> {
  if (!isNative() || isInitialized) return

  try {
    await AdMob.initialize({
      testingDevices: ['2077ef9a63d2b398840261c8221a0c9b'],
      initializeForTesting: true,
    })

    // Request consent (GDPR / UMP)
    try {
      const consentInfo = await AdMob.requestConsentInfo()
      if (
        consentInfo.isConsentFormAvailable &&
        consentInfo.status === AdmobConsentStatus.REQUIRED
      ) {
        await AdMob.showConsentForm()
      }
    } catch {
      // Consent form fallback (e.g. outside EEA or offline)
    }

    isInitialized = true

    // Preload first ad
    void prepareInterstitial()
    void prepareRewarded()
  } catch (err) {
    console.warn('[AdMob] initialization error:', err)
  }
}

/**
 * Preload Interstitial Ad
 */
export async function prepareInterstitial(): Promise<void> {
  if (!isNative()) return
  try {
    const adId = getAdUnitId('interstitial')
    const options: AdOptions = {
      adId,
      isTesting: true,
    }
    await AdMob.prepareInterstitial(options)
    interstitialReady = true
  } catch (err) {
    interstitialReady = false
    console.warn('[AdMob] prepareInterstitial error:', err)
  }
}

/**
 * Display Interstitial Ad if ready and interval has elapsed
 */
export async function showInterstitialAd(): Promise<boolean> {
  if (!isNative()) return false

  const now = Date.now()
  if (now - lastInterstitialShowTime < MIN_INTERSTITIAL_INTERVAL_MS) {
    return false
  }

  try {
    if (!interstitialReady) {
      await prepareInterstitial()
    }
    await AdMob.showInterstitial()
    lastInterstitialShowTime = Date.now()
    interstitialReady = false
    // Preload next one
    setTimeout(() => void prepareInterstitial(), 5000)
    return true
  } catch (err) {
    console.warn('[AdMob] showInterstitial error:', err)
    interstitialReady = false
    void prepareInterstitial()
    return false
  }
}

/**
 * Preload Rewarded Video Ad
 */
export async function prepareRewarded(): Promise<void> {
  if (!isNative()) return
  try {
    const adId = getAdUnitId('rewarded')
    const options: AdOptions = {
      adId,
      isTesting: true,
    }
    await AdMob.prepareRewardVideoAd(options)
    rewardedReady = true
  } catch (err) {
    rewardedReady = false
    console.warn('[AdMob] prepareRewarded error:', err)
  }
}

/**
 * Show Rewarded Ad and resolve true if user earned the reward
 */
export async function showRewardedAd(): Promise<boolean> {
  if (!isNative()) {
    // In dev / web mode, simulate successful ad watch
    grant24HourProPass()
    return true
  }

  try {
    if (!rewardedReady) {
      await prepareRewarded()
    }

    let earned = false
    const listener = await AdMob.addListener(
      RewardAdPluginEvents.Rewarded,
      (reward: AdMobRewardItem) => {
        if (reward) earned = true
      }
    )

    const result = await AdMob.showRewardVideoAd()
    if (result) earned = true
    await listener.remove()

    rewardedReady = false
    setTimeout(() => void prepareRewarded(), 5000)

    if (earned) {
      grant24HourProPass()
      return true
    }
    return false
  } catch (err) {
    console.warn('[AdMob] showRewardVideoAd error:', err)
    rewardedReady = false
    void prepareRewarded()
    return false
  }
}

/**
 * Increment transaction counter for free users and trigger interstitial ad on milestone
 */
export function recordTransactionForAdPacing(isPremium: boolean): void {
  if (isPremium || !isNative()) return

  const currentCount = Number(localStorage.getItem('wdg_tx_ad_counter') || '0') + 1
  localStorage.setItem('wdg_tx_ad_counter', String(currentCount))

  if (currentCount % TRANSACTIONS_BETWEEN_ADS === 0) {
    void showInterstitialAd()
  }
}

const REWARDED_PASS_KEY = 'wdg_rewarded_pass_expires'

/**
 * Grant a 24-hour temporary Pro pass for watching a rewarded ad
 */
export function grant24HourProPass(): void {
  const expires = Date.now() + 24 * 60 * 60 * 1000 // 24 hours from now
  localStorage.setItem(REWARDED_PASS_KEY, String(expires))
}

/**
 * Check if the user currently holds an active 24-hour Rewarded Pro pass
 */
export function hasActiveRewardedPass(): boolean {
  const expires = Number(localStorage.getItem(REWARDED_PASS_KEY) || '0')
  return Date.now() < expires
}

/**
 * Get remaining hours on the active Rewarded Pro pass (0 if expired)
 */
export function getRewardedPassHoursRemaining(): number {
  const expires = Number(localStorage.getItem(REWARDED_PASS_KEY) || '0')
  const diff = expires - Date.now()
  if (diff <= 0) return 0
  return Math.ceil(diff / (1000 * 60 * 60))
}
