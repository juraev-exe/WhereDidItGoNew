# Privacy Policy for WhereDidItGo

**Effective Date**: November 13, 2026  
**Developer**: WhereDidItGo (Juraev.exe) — support@wherediditgo.app  
**Website**: https://juraev-exe.github.io/WhereDidItGoNew/  
**Repository**: https://github.com/juraev-exe/WhereDidItGoNew  

WhereDidItGo ("we", "our", or "us") is a personal finance application for Web, Desktop, Android, and iOS. This policy describes how the app and website store financial records, which operating system permissions are requested, when optional cloud synchronization or billing services are contacted, and how you can export or erase your data under GDPR, CCPA, and store rules.

## Local-First Storage and Optional Cloud Vault

By default, WhereDidItGo stores every account balance, income or expense entry, split transaction, budget allocation, savings goal, recurring bill, and debt record inside your device's isolated IndexedDB database via Dexie. You do not need to register an account, pick a username, or supply an email address to run the application offline.

If you explicitly sign up or sign in to the optional Cloud Vault feature, your authentication session and ledger tables (`accounts`, `categories`, `budgets`, `goals`, `debts`, `recurring`, and `transactions`) are transmitted over TLS and stored in a Supabase PostgreSQL database protected by Row-Level Security (`user_id` isolation). Offline users never connect to or upload financial records to Supabase.

## Device Permissions and On-Device Receipt OCR

WhereDidItGo never requests access to GPS location, contacts, or microphone audio. When you open the Receipt Scanner, photos captured with your camera (`CAMERA`) or selected from your device stay in local memory and are recognized on-device using self-hosted Tesseract.js WebAssembly workers (`eng+rus`). Receipt images are never uploaded to our servers; on first scan, static OCR training files (`*.traineddata.gz`) are fetched over HTTPS from jsDelivr / Project Naptha CDN without attaching personal data.

Other Android and iOS capabilities are limited to `VIBRATE` for keypad haptics, `POST_NOTIFICATIONS` when you schedule local budget reminders, `USE_BIOMETRIC` / `USE_FINGERPRINT` when you enable biometric unlock for the local 4-digit PIN lock, `INTERNET` for store/web billing, optional Cloud Vault sync, and free-tier mobile ads, and `com.google.android.gms.permission.AD_ID` for Google AdMob on free-tier native mobile builds.

## Pro Purchases, Subscriptions, and Free-Tier Mobile Ads

Optional WhereDidItGo Pro plans (Lifetime one-time unlock, Annual subscription, and Monthly subscription) are billed through Google Play Billing on Android, Apple In-App Purchase on iOS, or RevenueCat Web Billing / Stripe on the Web. We never receive or store payment card numbers, CVV codes, or bank account credentials. Upfront prices and renewal intervals are shown before checkout, and auto-renewing plans can be canceled anytime through Google Play, Apple ID settings, or your Stripe billing receipt link.

We use RevenueCat to verify store receipts and active `wherediditgo_pro` entitlements. Offline users are assigned an anonymous RevenueCat app user ID, whereas users signed into Cloud Vault have their Supabase account UUID linked in RevenueCat so Pro access carries across signed-in devices. Free native mobile builds integrate Google AdMob (`@capacitor-community/admob`); upgrading to Pro disables all ad requests permanently, and Web and Desktop builds contain no ad SDKs. Full package details are listed in [THIRD_PARTY_AUDIT.md](./THIRD_PARTY_AUDIT.md).

## Children's Privacy, Cookies, and Data Deletion Rights

WhereDidItGo is intended for adults aged 18 and older and does not knowingly collect personal information from children under 13 (or under 16 in the EEA). Our website and web app do not use third-party advertising or cross-site tracking cookies; browser `localStorage` holds only interface state (`wdg-theme`, `wdg-locale`, `wdg-cookie-consent`) plus a Supabase session token (`sb-*-auth-token`) if you sign into Cloud Vault, as documented in our [Cookie Policy](https://juraev-exe.github.io/WhereDidItGoNew/cookies.html).

Under GDPR (Articles 15–22) and CCPA, you can export your full ledger as JSON or CSV at any time, or wipe all on-device data immediately via **Settings -> Danger Zone -> Reset all local data** (or by uninstalling the app). If you enabled Cloud Vault sync or emailed support, you can request permanent deletion of your Supabase account, synced cloud rows, and support correspondence by emailing `support@wherediditgo.app` with subject `Cloud Vault Account Deletion` or `Data Deletion Request`; requests are completed within 30 calendar days as detailed in [DATA_DELETION.md](./DATA_DELETION.md).
