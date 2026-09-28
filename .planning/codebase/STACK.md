# Technology Stack

**Analysis Date:** 2026-09-28

## Languages

**Primary:**
- TypeScript 5.9 - All frontend and core application logic (`src/**/*.ts`, `src/**/*.vue`)
- Vue 3.5 - Single-file components with Composition API (`<script setup lang="ts">`)

**Secondary:**
- JavaScript / ESM - Build tooling, audit scripts (`scripts/*.mjs`), Vite config
- HTML5 / CSS3 - Vanilla CSS design system with CSS custom properties and liquid glassmorphism

## Runtime

**Environment:**
- Node.js (v20+ / v26.x supported in dev tooling)
- Modern Web Browsers (Chrome/Chromium, Safari, Firefox, Edge)
- Capacitor 8 Hybrid Mobile Runtime (Android & iOS)
- Electron 44 (Desktop wrapper)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Vue 3.5 (Composition API, `<script setup>`)
- Pinia 4.0 - Centralized reactive state management
- Vue Router 5.2 - Client-side SPA routing
- Vue i18n 11.4 - Internationalization (English `en`, Russian `ru`, Tajik `tj`)

**Testing & Auditing:**
- Playwright 1.62 - End-to-end browser walkthroughs and screenshot audits (`scripts/audit.mjs`)
- tsx 4.23 - Direct TypeScript test execution for unit checks (`scripts/unit-check.mjs`)
- vue-tsc 3.3 - Static type checking for Vue single-file components

**Build/Dev:**
- Vite 7.3 - Fast development server and production bundler
- Capacitor CLI 8.5 - Native mobile platform synchronization

## Key Dependencies

**Critical:**
- `dexie` 4.4 - Client-side IndexedDB wrapper for local-first zero-backend persistence
- `@capacitor/core` & `@capacitor/android` & `@capacitor/ios` 8.5 - Cross-platform mobile bridge
- `@capawesome/capacitor-haptics` 0.1 - Native tactile haptic feedback
- `@lucide/vue` 1.31 - SVG icon system
- `date-fns` 4.4 - Date arithmetic and formatting
- `papaparse` 5.7 - CSV backup import/export parsing
- `vue-sonner` 2.0 - Toast notifications

## Configuration

**Environment:**
- Client-side local-first: no mandatory external backend environment variables
- `capacitor.config.json` - Mobile app ID (`com.wherediditgo.app`), app name, and webDir
- `vite.config.ts` - Vite bundling, Vue plugin, server host config
- `tsconfig.json` - Strict TypeScript configuration

## Platform Requirements

**Development:**
- Node.js 20+
- Android Studio / Android SDK (for Android APK builds)
- Xcode (for iOS builds on macOS)

**Production:**
- Web: Static hosting (Vercel, Netlify, or any static HTTP server)
- Android: APK / AAB installed on Android 8.0+ devices
- Desktop: Electron executable / NSIS installer for Windows

---

*Stack analysis: 2026-09-28*
*Update after major dependency changes*
