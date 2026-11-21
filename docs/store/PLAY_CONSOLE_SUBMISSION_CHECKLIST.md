# Google Play Console Submission Checklist

This guide covers building the signed Android App Bundle (`.aab`), configuring production environment variables, and completing the Google Play Console declarations for **WhereDidItGo** (`com.wherediditgo.app`, v1.1.5).

## 1. Production Build and Release Bundle (`.aab`)

Before building a production release, configure your production environment variables in `.env` (see [`.env.example`](../../.env.example)) and signing credentials in `android/keystore.properties` (see [`android/keystore.properties.example`](../../android/keystore.properties.example)). Set `admobAppId` in `android/keystore.properties` (or `ADMOB_APP_ID` / `VITE_ADMOB_ANDROID_APP_ID` in the environment) so [`android/app/build.gradle`](../../android/app/build.gradle) injects your live Google AdMob Application ID into [`AndroidManifest.xml`](../../android/app/src/main/AndroidManifest.xml), and set `VITE_ADMOB_INTERSTITIAL_ID` and `VITE_ADMOB_REWARDED_ID` if serving free-tier mobile ads.

```bash
npm run check
npm run release:android
```

The signed bundle is written to `android/app/build/outputs/bundle/release/app-release.aab`.

## 2. Play Console App Content Declarations

In [Google Play Console](https://play.google.com/console), create or open **WhereDidItGo** (Default language: `English (US)`, Type: `App`, Pricing: `Free` with in-app purchases) and complete the **Policy -> App content** sections using the values below:

| Play Console Section | Setting / Value |
|---|---|
| **Privacy Policy** | `https://moneytracker-vert-nu.vercel.app/legal/privacy.html` (source: [`PRIVACY_POLICY.md`](../../PRIVACY_POLICY.md)) |
| **App Access** | All functionality is available without special access restrictions (core ledger works offline; Cloud Vault sync is optional) |
| **Ads** | **No** while `admobAppId` / `VITE_ADMOB_*` are unset (`releaseNoAds` strips `AD_ID` & `MobileAdsInitProvider`); switch to **Yes** if live AdMob IDs are configured |
| **Content Rating (IARC)** | Utility / Productivity / Personal Finance — Everyone / PEGI 3 |
| **Target Audience** | **18 and over** |
| **Data Safety** | Copy answers from [`./PLAY_STORE_DATA_SAFETY.md`](./PLAY_STORE_DATA_SAFETY.md); Data deletion URL: `https://moneytracker-vert-nu.vercel.app/legal/data-deletion.html` |
| **Financial Features** | Manual personal finance tracker — no bank connections, no money transfers, no lending |

## 3. In-App Products, RevenueCat, and Rollout

Under **Monetize -> Products**, create the one-time **Lifetime** in-app product and the **Annual** and **Monthly** subscriptions, then map them to the `lifetime`, `annual`, and `monthly` packages inside your RevenueCat **Offerings** attached to the `wherediditgo_pro` entitlement. Verify that your Google Play service account JSON is connected in the RevenueCat Dashboard, upload `app-release.aab` to **Testing -> Internal testing** to test license purchases and offline/cloud flows, and promote the build to **Production** once verified.
