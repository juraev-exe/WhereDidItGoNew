# Google Play Console — Data Safety Form Answers

Use the values below when completing the **Data Safety** questionnaire in Google Play Console for **WhereDidItGo** (`com.wherediditgo.app`, v1.1.5).

## 1. General Data Collection, Encryption, and Deletion Answers

In the top-level overview questions, answer **Yes** to data collection (because optional Cloud Vault sync collects an email address and synced ledger rows when a user signs in, and RevenueCat validates purchase history; free-tier AdMob `AD_ID` is stripped in `releaseNoAds` builds until live AdMob IDs are configured). Answer **Yes** to encryption in transit (all Supabase and RevenueCat / Play Billing traffic uses HTTPS/TLS).

For data deletion, answer **Yes** and provide `https://moneytracker-vert-nu.vercel.app/legal/data-deletion.html`. Users can wipe all local IndexedDB records immediately via **Settings -> Danger Zone -> Reset all local data** (or by uninstalling the app), and users who opt into Cloud Vault sync can request permanent deletion of their Supabase account and synced database rows by emailing `support@wherediditgo.app`.

## 2. Disclosed Data Types Matrix

| Category | Data Type | Collected / Shared | Purpose and User Control |
|---|---|---|---|
| **Financial info** | Purchase history | Collected; shared with Google Play / RevenueCat | App functionality — verifies `wherediditgo_pro` entitlement without accessing payment card numbers |
| **Financial info** | Other financial info (ledger entries, splits, budgets, debts) | Collected (Optional); not shared with third parties | App functionality — stays in local IndexedDB unless the user signs into optional Supabase Cloud Vault sync (RLS isolated) |
| **Personal info** | Email address | Collected (Optional); not shared with third parties | Account management and App functionality — used only when the user registers for optional Cloud Vault sync |
| **Device or other IDs** | Advertising ID (`AD_ID`) & app instance ID | Not collected / Not shared while AdMob is unset (`releaseNoAds`); enable if live AdMob IDs are configured | Used for free-tier mobile ads only when live AdMob IDs are configured |
| **Photos and videos** | Receipt images (camera / photo picker) | Not collected / Not shared | Processed 100% on-device in local memory via Tesseract.js OCR; receipt photos are never uploaded |

## 3. Financial Features Declaration Note

In the Play Console Financial Features form, declare WhereDidItGo as a manual expense and budget tracker with optional user-initiated cloud backup: the app does not link to banking institutions, aggregate bank credentials, issue credit, or transfer money.
