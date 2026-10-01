# Third-Party SDK & Dependency Audit

**Audit Date**: October 1, 2026  
**Application**: WhereDidItGo (`com.wherediditgo.app`)  
**Version**: 1.1.0  
**Auditor**: Project Security & Privacy Compliance  

This audit evaluates all external libraries, native plugins, and frontend packages integrated into WhereDidItGo to ensure full compliance with Google Play, Apple App Store, GDPR, and COPPA data minimization standards.

---

## 1. Executive Summary

* **Personal Financial Data Transmission**: **NONE (0%)**. No financial numbers, notes, categories, accounts, or budgets leave the client device under any circumstance.
* **Advertising / Tracking SDKs**: **NONE (0%)**. No AdMob, Meta, Firebase, AppsFlyer, or other advertising/tracking SDKs are present.
* **Telemetry / Profiling**: **NONE**. No behavioral fingerprinting or user session profiling.

---

## 2. In-Depth SDK & Plugin Breakdown

| Package / SDK | Source | Purpose | Network Activity? | Data Transmitted | Privacy Assessment |
|---|---|---|---|---|---|
| `@revenuecat/purchases-capacitor` | RevenueCat | In-app purchase receipt verification for Pro unlock. | Yes (TLS HTTPS to RevenueCat API) | Anonymous randomized App User ID & Google Play / Apple receipt token. | ✅ Compliant. No financial records, category names, or notes sent. |
| `@capawesome/capacitor-haptics` | Capawesome | Native haptic feedback during numeric keypad tapping. | No | None. Executes locally on device vibrator. | ✅ Compliant. Zero network code. |
| `@capacitor/status-bar` | Ionic / Capacitor | Configures mobile status bar color and dark/light mode overlay. | No | None. Native window styling only. | ✅ Compliant. |
| `@capacitor/splash-screen` | Ionic / Capacitor | Shows and hides initial application launch splash screen. | No | None. Native splash handler only. | ✅ Compliant. |
| `@capacitor/preferences` | Ionic / Capacitor | Persists simple user settings (e.g. active currency, language, theme). | No | None. Stored in Android `SharedPreferences` / iOS `UserDefaults`. | ✅ Compliant. |
| `@capacitor/filesystem` | Ionic / Capacitor | Writes user-initiated backup files (.json / .csv) to device cache/downloads. | No | None. Scoped strictly to local storage. | ✅ Compliant. |
| `@capacitor/local-notifications` | Ionic / Capacitor | Dispatches local daily/weekly budget reminder notifications if scheduled by user. | No | None. Scheduled locally via Android `AlarmManager`. | ✅ Compliant. |
| `dexie` | Dexie.js | IndexedDB wrapper for transaction and budget storage. | No | None. Runs 100% inside client browser sandbox. | ✅ Compliant. |
| `@number-flow/vue` | NumberFlow | Smooth micro-animations for balance updates. | No | None. Visual presentation layer only. | ✅ Compliant. |
| `@lucide/vue` | Lucide | Clean, accessible SVG iconography. | No | None. Static UI assets. | ✅ Compliant. |
| `date-fns` | Date-fns | Local date formatting and monthly period calculations. | No | None. Pure mathematical utility. | ✅ Compliant. |
| `papaparse` | PapaParse | Client-side CSV parser for user-initiated spreadsheet import/export. | No | None. In-memory data parsing only. | ✅ Compliant. |
| `vue`, `pinia`, `vue-i18n`, `vue-router` | Vue Core Team | Application architecture, state management, and multi-language routing. | No | None. Client-side application framework. | ✅ Compliant. |

---

## 3. Native Android Permissions Verification

Audited in `android/app/src/main/AndroidManifest.xml`:
* `android.permission.INTERNET`: Required solely for Google Play Billing validation.
* `android.permission.VIBRATE`: Required for keypad haptics.
* `android.permission.POST_NOTIFICATIONS`: Declared by notification plugin; strictly requested only when the user explicitly schedules budget alerts.
* **Declined / Forbidden Permissions**: No `ACCESS_FINE_LOCATION`, `READ_CONTACTS`, `CAMERA`, `READ_PHONE_STATE`, or `RECORD_AUDIO`.

---

## 4. Conclusion

WhereDidItGo complies with the highest standards of data minimization. The app contains zero tracking SDKs, zero hidden background collectors, and zero unnecessary device permissions.
