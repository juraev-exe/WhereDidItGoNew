# Cookie & Local Storage Policy for WhereDidItGo

**Effective Date**: November 13, 2026  
**Developer**: WhereDidItGo (Juraev.exe) — support@wherediditgo.app  
**Website**: https://juraev-exe.github.io/WhereDidItGoNew/  

WhereDidItGo does not use third-party advertising cookies, cross-site tracking pixels (such as Meta Pixel, Google Ads, or TikTok Pixel), or behavioral analytics scripts on either the promotional website or the web application. Visitor browsing activity is never sold, rented, or shared with data brokers.

## Browser Local Storage and IndexedDB Keys

Instead of tracking cookies, the website and web application rely on standard client-side `localStorage` and IndexedDB (`wherediditgo`) to store your interface settings and local financial ledger on your device. When you initiate an optional Web Pro purchase, Stripe loads strictly necessary fraud-prevention and checkout session state during the payment flow.

| Storage Key | Purpose | Category | Retention |
|---|---|---|---|
| `wdg-theme` | Saves your Light, Dark, or OLED appearance setting | Strictly Necessary | Until cleared by user |
| `wdg-locale` | Saves your selected language (`en`, `ru`, or `tj`) | Strictly Necessary | Until cleared by user |
| `wdg-cookie-consent` | Records dismissal of the informational storage banner | Strictly Necessary | Until cleared by user |
| `sb-*-auth-token` | Holds your Supabase session token only if you sign into Cloud Vault | Strictly Necessary (Opt-In) | Until sign-out or clear |

## Managing or Clearing Browser Storage

You can inspect or delete stored keys at any time through your browser's "Clear browsing data" settings, by running the in-app **Settings -> Danger Zone -> Reset all local data** command, or by using a Private / Incognito browser window so all storage is discarded when the tab closes. Direct any questions about browser storage to `support@wherediditgo.app`.
