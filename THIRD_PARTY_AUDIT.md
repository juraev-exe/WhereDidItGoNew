# Third-Party SDK & Dependency Audit

**Audit Date**: November 13, 2026  
**Application**: WhereDidItGo (`com.wherediditgo.app`) — v1.1.5  
**Repository**: https://github.com/juraev-exe/WhereDidItGoNew  

This technical audit inventories all runtime libraries, Capacitor native plugins, and network-capable SDKs shipped in WhereDidItGo across Web, Desktop (Electron), Android, and iOS.

## Architecture and Network Scope

By default, WhereDidItGo runs offline and stores all ledger data locally in IndexedDB via `dexie`. No financial records leave the device unless the user explicitly signs into an account in **Settings -> Cloud Vault**, which activates two-way HTTPS synchronization with Supabase (`@supabase/supabase-js`) under PostgreSQL Row-Level Security (`user_id` isolation).

Entitlement checks and optional Pro purchases (`Lifetime`, `Annual`, and `Monthly`) are handled by `@revenuecat/purchases-capacitor`, `@revenuecat/purchases-capacitor-ui`, and `@revenuecat/purchases-js`, which communicate over TLS with RevenueCat and Google Play Billing, Apple In-App Purchase, or Stripe without exposing payment card credentials to the application. Free-tier native mobile builds include Google AdMob (`@capacitor-community/admob`) gated on production unit IDs; upgrading to Pro disables all ad requests, and Web and Desktop builds include zero ad network scripts.

## Runtime Package Inventory

| Package / SDK | Role in Application | Network Traffic | Data Transmitted |
|---|---|---|---|
| `dexie` | Local IndexedDB database engine | None | None |
| `@supabase/supabase-js` | Optional opt-in Cloud Vault sync | TLS HTTPS to Supabase when signed in | Account email + RLS-scoped ledger rows |
| `@revenuecat/purchases-capacitor`, `purchases-capacitor-ui`, `@revenuecat/purchases-js` | Store and Web Pro entitlement validation | TLS HTTPS to RevenueCat / Stripe | Anonymous or linked Supabase UUID + store receipt token |
| `@capacitor-community/admob` | Free-tier native mobile ads | TLS HTTPS to Google AdMob on free mobile tier | Advertising ID (`AD_ID`) and ad request context |
| `tesseract.js` | On-device Receipt OCR (`eng+rus`) | First-run CDN fetch for static `.traineddata.gz` | None (receipt photos stay in local memory) |
| `@aparajita/capacitor-biometric-auth` | Native fingerprint / Face ID verification for PIN lock | None | None (OS keystore / biometric prompt only) |
| `@capawesome/capacitor-haptics`, `@capacitor/status-bar`, `@capacitor/splash-screen`, `@capacitor/preferences`, `@capacitor/filesystem`, `@capacitor/local-notifications`, `@capacitor/share`, `@capacitor/app` | Native OS UI, haptics, file export, and local reminders | None | None |
| `vue`, `pinia`, `vue-i18n`, `vue-router`, `papaparse`, `date-fns`, `@lucide/vue`, `@number-flow/vue`, `qrcode`, `vue-sonner` | Frontend UI, state, CSV parsing, date math, and QR codes | None | None |

## Android Manifest Permissions (`android/app/src/main/AndroidManifest.xml`)

The Android manifest declares `android.permission.INTERNET` (used for RevenueCat billing verification, opt-in Supabase sync, free-tier AdMob ads, and initial OCR language data), `com.google.android.gms.permission.AD_ID` (required by Google Play for AdMob on the free tier), and `android.permission.USE_BIOMETRIC` / `android.permission.USE_FINGERPRINT` (for optional biometric PIN unlock). Camera capture (`CAMERA`), local notifications (`POST_NOTIFICATIONS`), and keypad haptics (`VIBRATE`) are invoked only when triggered by the user. Location (`ACCESS_FINE_LOCATION`), contacts (`READ_CONTACTS`), and microphone (`RECORD_AUDIO`) permissions are never requested.
