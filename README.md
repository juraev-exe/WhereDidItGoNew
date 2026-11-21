<div align="center">

  <img src="public/logo.png" alt="WhereDidItGo Logo" width="120" style="border-radius: 24px; margin-bottom: 16px;" />

  # WhereDidItGo

  **A local-first personal finance tracker built for Web, Desktop & Mobile.**  
  *On-device IndexedDB storage by default with optional encrypted Cloud Vault sync. Material 3 & Liquid Glass UI.*

  [![Vue 3](https://img.shields.io/badge/Vue-3.5-4fc08d?style=for-the-badge&logo=vuedotjs&logoColor=white)](https://vuejs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Vite](https://img.shields.io/badge/Vite-7.3-646cff?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
  [![Capacitor](https://img.shields.io/badge/Capacitor-8.5-119eee?style=for-the-badge&logo=capacitor&logoColor=white)](https://capacitorjs.com/)
  [![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)
  [![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](#license)

  [**Website & Policies**](https://juraev-exe.github.io/WhereDidItGoNew/) • [**Features**](#-highlights) • [**Tech Stack**](#-tech-stack) • [**Getting Started**](#-getting-started) • [**Deployment**](#-deployment--installation)

</div>

---

## ✨ Highlights

* 🔒 **Local-First by Default + Optional Cloud Sync**: Transactions, accounts, budgets, and debts live in IndexedDB (Dexie) on your device and work offline without an account. Sign into optional **Cloud Vault** (Supabase RLS) whenever you want cross-device sync.
* 🧾 **On-Device Receipt OCR & Split Transactions**: Scan paper receipts locally in the browser/device via self-hosted Tesseract.js (`eng+rus`) and split a single purchase across multiple categories.
* 🎨 **Material 3 & Translucent Glass**: Dynamic theme accents, accessible touch targets, and Light/Dark modes.
* ⚡ **Fast Offline-First Ledger**: Works cleanly offline with reactive monthly totals, recurring bills, and cycle-aware start-of-month dates.
* 📊 **Financial Insights**: Activity calendar heatmap, category breakdowns, month-over-month pacing, and savings goals.
* 💸 **Debts & Loans Management**: Track lent and borrowed money, partial repayments, and settled status separately from daily spending.
* 🌐 **Multi-Language Support (i18n)**: Localized in **English**, **Русский**, and **Тоҷикӣ**.
* 🔐 **PIN Lock & Biometric Security**: Protect access with a hashed 4-digit PIN and optional native biometric unlock.
* 📦 **Full Backup & Export**: Export/import full JSON snapshots and CSV spreadsheets anytime.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | [Vue 3](https://vuejs.org/) (Composition API, `<script setup lang="ts">`) |
| **State Management** | [Pinia 4](https://pinia.vuejs.org/) |
| **Local Database** | [Dexie.js 4](https://dexie.org/) (IndexedDB wrapper) |
| **Native Runtime** | [Capacitor 8](https://capacitorjs.com/) (Android / iOS / PWA) |
| **Build Tool** | [Vite 7](https://vitejs.dev/) + `vue-tsc` strict TypeScript checking |
| **Icons & Visuals** | [Lucide Vue](https://lucide.dev/) + [Chart.js](https://www.chartjs.org/) |
| **Localization** | [vue-i18n 11](https://vue-i18n.intlify.dev/) |

---

## 🚀 Getting Started

### Prerequisites

* [Node.js](https://nodejs.org/) `>= 18.0.0`
* `npm` `>= 9.0.0`

### Installation & Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/juraev-exe/WhereDidItGoNew.git
   cd WhereDidItGoNew
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start local development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

4. **Run verification checks**:
   ```bash
   npm run check
   ```

5. **Build for production**:
   ```bash
   npm run build
   ```

---

## 🚀 Deployment & Installation

### 🌐 Deploy on Vercel

This repository includes a pre-configured [`vercel.json`](./vercel.json) for single-page application deployment with CSP headers and self-hosted OCR/legal static routes:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fjuraev-exe%2FWhereDidItGoNew)

### 📲 Install as a PWA (Web App)

When hosted on Vercel or any HTTPS server, WhereDidItGo includes a full [Web App Manifest](public/manifest.json):
* **Android**: Open the web app in Chrome and tap **"Install App"**.
* **iOS**: Open in Safari and tap **Share → Add to Home Screen**.

### 🤖 Android Native APK

To build a standalone native Android package:

```bash
# Build web app and sync with Capacitor Android
npm run sync

# Generate release APK
cd android
./gradlew assembleRelease
```
The APK will be generated at `android/app/build/outputs/apk/release/app-release-unsigned.apk`.

---

## 📂 Project Structure

```text
wherediditgo/
├── android/                   # Capacitor Android native project
├── public/                    # PWA manifest, logos, favicons
├── src/
│   ├── app/                   # AppShell, MobileBottomNav, layouts
│   ├── components/            # Reusable UI primitives (BottomSheet, Buttons, Keypad)
│   ├── composables/           # Reusable logic (useNetworkStatus, useDebouncedSearch)
│   ├── db/                    # Dexie database schemas & tables
│   ├── features/              # Feature modules (activity, budgets, debts, home, insights, settings)
│   ├── i18n/                  # Localization bundles (en, ru, tj)
│   ├── lib/                   # Utilities (dates, money, platform detection)
│   ├── services/              # Native plugins & backup engine
│   ├── stores/                # Pinia state stores (accounts, categories, transactions, settings)
│   └── styles/                # Tokens, glass styling, global CSS
├── vercel.json                # Vercel SPA routing configuration
└── vite.config.ts             # Vite configuration
```

---

## 🔒 Privacy & Security

WhereDidItGo uses a **local-first** model with user-controlled cloud options:
* **Local-First Storage**: Transactions, balances, budgets, and debts live on-device in IndexedDB and work completely offline.
* **Optional Cloud Vault**: Explicitly opt into Supabase Cloud Vault sync (RLS-isolated per user) when you want multi-device backups.
* **App Security**: Optional 4-digit hashed PIN lock with native biometric unlock.
* **Full Data Ownership**: Export your dataset anytime as JSON or CSV. See [PRIVACY_POLICY.md](./PRIVACY_POLICY.md) and [THIRD_PARTY_AUDIT.md](./THIRD_PARTY_AUDIT.md).

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.

<div align="center">
  Crafted with ❤️ by Juraev.exe & Contributors
</div>
