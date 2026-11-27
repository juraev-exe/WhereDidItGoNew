/**
 * Self-contained production builder for the WhereDidItGo Graphite Landing Page.
 * Bundles `scripts/vendor-src/teal-treasury-core.js` + localized (`en` / `ru` / `tj`)
 * React entry into `public/vendor/teal-treasury-app.js` & `docs/vendor/teal-treasury-app.js`,
 * and writes SEO-complete HTML to `public/landing.html`, `docs/landing.html`, and `docs/index.html`.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import * as esbuild from 'esbuild'

const cwd = process.cwd()
const buildDir = path.join(cwd, 'scripts', '.ttl-build')
const corePath = path.join(cwd, 'scripts', 'vendor-src', 'teal-treasury-core.js')

const entryTsx = `import * as React from "react"

type ThemeKey = "graphite" | "wdg-dark"
type LocaleKey = "en" | "ru" | "tj"

const TealTreasuryLanding: React.ComponentType<any> = (window as any).__WDG_TealTreasuryLanding

const CUSTOM_PALETTES: Record<ThemeKey, any> = {
  graphite: "graphite",
  "wdg-dark": {
    page: "#0a0a0c",
    paper: "#151518",
    ink: "#ffffff",
    muted: "#8e8e93",
    rule: "#2c2c30",
    deep: "#062b27",
    deepInk: "#ffffff",
    deepMuted: "#99f6e4",
    gold: "#d4b978",
    lilac: "#1c1c1e",
    lilacInk: "#d4b978",
    accent: "#0a84ff",
    accentInk: "#ffffff",
    good: "#30d158",
    chart: ["#0a84ff", "#2dd4bf", "#bf5af2"],
    glow: ["#16191c", "#003380", "#1f2937"],
  },
}

const LANGS: Array<{ key: LocaleKey; name: string; short: string }> = [
  { key: "en", name: "English", short: "EN" },
  { key: "ru", name: "Русский", short: "RU" },
  { key: "tj", name: "Тоҷикӣ", short: "TJ" },
]

const COPY: Record<LocaleKey, any> = {
  en: {
    metaTitle: "WhereDidItGo — Local-first personal money tracker",
    metaDesc: "Know where every dollar went. Local-first personal finance for Android and web: 2.8s QuickAdd math keypad, bank SMS parser, payday budget cycles, goals, debts, and encrypted backups.",
    fund: "November 2026 · Cycle Day 15",
    nav: {
      products: [
        { label: "QuickAdd, Splits & SMS Inbox", text: "Try inline math (12.50 + 4), split receipts, and Alif/Chase/T-Bank SMS parsing in the hero.", href: "#dashboard" },
        { label: "6 Real Screens & 7-Slot Nav", text: "Interactive Android screen tour, OLED dark mode, and camera receipt OCR.", href: "#features" },
        { label: "Heatmap, Goals & Debts", text: "30-day ActivityCalendar, Tokyo & Rainy Day goals, and I Lent / I Borrowed ledger.", href: "#coverage" },
      ],
      links: [
        { label: "App Screens", href: "#features" },
        { label: "Free vs Pro", href: "#pricing" },
        { label: "FAQ", href: "#faq" },
      ],
      login: { label: "Open Web App", href: "/" },
      cta: { label: "Download APK", href: "/wherediditgo.apk" },
    },
    hero: {
      title: "Know where every\\n*dollar* went.",
      text: "Try the real WhereDidItGo engine below: blur your balance, type 12.50 + 4.00 in + QuickAdd, split a receipt, or parse a bank SMS from Alif, Chase, or T-Bank—100% locally in IndexedDB.",
      primary: { label: "Download Android APK · 14.4 MB", href: "/wherediditgo.apk" },
      secondary: { label: "Launch Full Vue 3 App", href: "/" },
    },
    benefits: {
      label: "Built from real daily friction",
      text: "Every screen in WhereDidItGo is crafted for *real mobile life:* a dead-centered + button between 6 tabs, on-device bank SMS ingestion, ZBB rollover envelopes, split receipts, and local Tesseract OCR.",
      stats: [
        { value: 2.8, decimals: 1, suffix: "s", label: "QuickAdd inline math logging" },
        { value: 100, suffix: "%", label: "Local IndexedDB + AES-GCM backups" },
        { value: 3, label: "Full locales: English, Русский, Тоҷикӣ" },
      ],
    },
    features: {
      label: "Tour the real app",
      items: [
        {
          title: "Six real views on a symmetric 7-slot bar",
          text: "Click through the actual Android screens on the left: Home, Activity, Budgets, Savings Goals, Insights, and True OLED Dark—anchored by the dead-centered + button.",
        },
        {
          title: "OLED Dark Mode, Receipt OCR & Biometric Lock",
          text: "Scan paper receipts offline with self-hosted Tesseract WASM, protect your app with Fingerprint / Face ID + FLAG_SECURE, and tap the eye button to blur balances in public.",
        },
        {
          title: "30-day Heatmap, Savings Goals & Debts Tracker",
          text: "Switch between the November spending intensity heatmap (53.3% savings rate, $83.21/d burn), Tokyo & Rainy Day savings goals, and I Lent vs I Borrowed partial repayments.",
        },
      ],
    },
    coverage: {
      title: "Simulate your *burn-rate runway* and ZBB rollover reserves",
      items: [
        { title: "Bank SMS Parser", text: "Alif, Chase & T-Bank offline regex" },
        { title: "ZBB Rollover Envelopes", text: "Carry surplus across payday cycles" },
        { title: "Data Autocleaning", text: "Split-sum & health score diagnostics" },
        { title: "AES-GCM 256 Backups", text: "Passphrase JSON + safe CSV export" },
      ],
    },
    pricing: {
      label: "Free core forever",
      price: "$0",
      unit: "for the complete local-first app",
      intro: "Included free forever on Android, Web & Desktop",
      items: [
        "Unlimited wallets, split transactions, bank SMS parser, payday cycles, and ZBB rollover",
        "Debts & loans payoff planner, savings goals, 30-day heatmap, Monthly Wrapped, and PIN lock",
        "Passphrase-encrypted AES-GCM JSON backups and formula-sanitized CSV spreadsheet export",
      ],
      addon: {
        title: "WhereDidItGo Pro (Optional Cloud Vault & Camera Receipt OCR)",
        text: "Unlock multi-device Supabase Cloud Vault synchronization, instant camera receipt OCR via local Tesseract WASM, and zero mobile banner ads while keeping local-first storage.",
      },
      note: "MIT open-source codebase · Signed v1.1.6 Android APK (14.4 MB, versionCode 12).",
    },
    faq: {
      label: "FAQ",
      title: "Common questions",
      items: [
        { q: "How does the Bank SMS / Push notification parser work without cloud AI?", a: "DraftsInbox runs an on-device parser (src/services/smsParser.ts) that extracts amounts, currencies (USD, TJS, RUB, EUR), and merchant names from bank notifications like Alif Bank, Chase, and T-Bank completely offline." },
        { q: "Can I split one receipt across multiple categories?", a: "Yes. Toggle Split in QuickAddSheet to divide any purchase across categories and subcategories (for example, $60 Groceries + $40 Household), and our split validator ensures exact minor-unit cent totals." },
        { q: "How do payday budget cycles and ZBB rollover envelopes work?", a: "Set Start of month to any day (1–28) in Settings -> Formatting, and optionally enable Rollover on any budget so unspent surplus or overspent deficits carry cleanly into the next cycle." },
        { q: "What is Monthly Wrapped and Data Autocleaning?", a: "Insights includes a 5-slide Monthly Wrapped story summarizing your top categories, zero-spend streak, and savings rate, while Settings includes a Data Autocleaning engine that verifies database health." },
        { q: "Can I hide my balances when opening the app in public?", a: "Yes. Tap the eye icon on the Home balance card to blur the hero balance, or long-press it for 450ms to mask every monetary figure across the entire app." },
        { q: "Which currencies and languages are included?", a: "Full English, Russian (Русский), and Tajik (Тоҷикӣ) translations—including custom Tajik CLDR date formatting—plus USD, EUR, RUB, TJS, KZT, UZS, or any custom currency symbol." },
      ],
    },
    cta: {
      title: "Ready to track every cent\\n*on your own device?*",
      text: "Download the signed v1.1.6 Android APK (14.4 MB), launch the full Vue 3 web app right now, or get notified when v1.2 lands on Google Play.",
      button: "Notify me on Play Store",
      secondary: { label: "Download Android APK", href: "/wherediditgo.apk" },
    },
    operating: {
      title: "Set your cycle to start on payday, not the 1st.",
      text: "Dial any start day from 1 to 28 in Settings -> Formatting -> Start of month and let WhereDidItGo calculate true daily spending runway.",
      link: { label: "Open the live Vue 3 app", href: "/" },
    },
    resources: {
      title: "Real screens from *WhereDidItGo* v1.1.6",
      items: [
        { title: "Home Dashboard: Wallets, Privacy Blur & SMS Drafts", tag: "01 · Home", art: "dashboard", href: "/" },
        { title: "Monthly Budgets: ZBB Rollover & Pacing Bars", tag: "02 · Budgets", art: "report", href: "/budgets" },
        { title: "Insights: 30-Day Heatmap, KPIs & Monthly Wrapped", tag: "03 · Insights", art: "line", href: "/insights" },
        { title: "True #000000 OLED Dark Theme & PIN Shield", tag: "04 · OLED Dark", art: "multi", href: "/settings" },
      ],
    },
    film: {
      nav: "Watch 30s",
      eyebrow: "Product film · 30 seconds",
      title: "WhereDidItGo in 30 seconds",
      note: "Silent, captioned film rendered from the real app. 100% local — like everything else here.",
      apk: "Download APK · 14.4 MB",
      open: "Open web app",
      close: "Close film",
      lang: "Language",
      theme: "Appearance",
      themeLight: "Graphite",
      themeDark: "OLED Dark",
    },
  },
  ru: {
    metaTitle: "WhereDidItGo — локальный учёт личных финансов",
    metaDesc: "Знайте, куда ушёл каждый рубль. Локальное приложение для Android и Web: калькулятор трат за 2.8 сек, парсер СМС банков, зарплатные циклы, цели, долги и шифрование бэкапов.",
    fund: "Ноябрь 2026 · Цикл с 15-го числа",
    nav: {
      products: [
        { label: "QuickAdd, сплиты и СМС банков", text: "Встроенный калькулятор (12.50 + 4), разделение чеков и парсер СМС Alif / Chase / Т-Банк.", href: "#dashboard" },
        { label: "6 экранов и панель из 7 слотов", text: "Интерактивный обзор экранов Android, OLED-тема и сканер чеков.", href: "#features" },
        { label: "Теплокарта, цели и долги", text: "Календарь трат на 30 дней, цели накоплений и учёт займов.", href: "#coverage" },
      ],
      links: [
        { label: "Экраны", href: "#features" },
        { label: "Тарифы", href: "#pricing" },
        { label: "Вопросы", href: "#faq" },
      ],
      login: { label: "Открыть веб-версию", href: "/" },
      cta: { label: "Скачать APK", href: "/wherediditgo.apk" },
    },
    hero: {
      title: "Знайте, куда ушёл\\nкаждый *рубль*.",
      text: "Попробуйте живой движок WhereDidItGo прямо ниже: размойте баланс, посчитайте 12.50 + 4.00 в + QuickAdd, разделите чек или разберите банковское СМС — 100% локально в IndexedDB.",
      primary: { label: "Скачать Android APK · 14.4 МБ", href: "/wherediditgo.apk" },
      secondary: { label: "Запустить Vue 3 приложение", href: "/" },
    },
    benefits: {
      label: "Сделано для реальной жизни",
      text: "Каждый экран WhereDidItGo создан для *реального телефона:* центральная кнопка + между 6 вкладками, офлайн-парсинг банковских СМС, конверты ZBB, сплит-чеки и локальный OCR.",
      stats: [
        { value: 2.8, decimals: 1, suffix: "с", label: "запись расхода с математикой" },
        { value: 100, suffix: "%", label: "локальная база + шифрование AES-GCM" },
        { value: 3, label: "языка: English, Русский, Тоҷикӣ" },
      ],
    },
    features: {
      label: "Обзор приложения",
      items: [
        {
          title: "Шесть реальных экранов и симметричная навигация",
          text: "Переключайте живые экраны Android слева: Главная, История, Бюджеты, Цели, Аналитика и настоящая чёрная тема OLED с центральной кнопкой +.",
        },
        {
          title: "Тема OLED, сканер чеков OCR и биометрия",
          text: "Сканируйте бумажные чеки офлайн через локальный Tesseract WASM, защищайте вход по отпечатку / Face ID + FLAG_SECURE и скрывайте суммы одним касанием.",
        },
        {
          title: "Теплокарта на 30 дней, цели и книга долгов",
          text: "Смотрите интенсивность трат по дням (норма сбережений 53.3%), копите на подушку безопасности и поездку в Токио и ведите учёт частичных возвратов долгов.",
        },
      ],
    },
    coverage: {
      title: "Рассчитайте *запас хода бюджета* и резервы ZBB",
      items: [
        { title: "Парсер СМС банков", text: "Alif, Chase и Т-Банк полностью офлайн" },
        { title: "Конверты ZBB", text: "Перенос остатка между зарплатами" },
        { title: "Автоочистка базы", text: "Проверка целостности сплитов и сумм" },
        { title: "Бэкапы AES-GCM 256", text: "Шифрование паролем + безопасный CSV" },
      ],
    },
    pricing: {
      label: "Базовая версия бесплатна навсегда",
      price: "$0",
      unit: "за полноценное локальное приложение",
      intro: "Бесплатно навсегда на Android, Web и Desktop",
      items: [
        "Безлимитные кошельки, сплит-чеки, парсер СМС банков, зарплатные циклы и перенос остатка ZBB",
        "Учёт долгов и займов, цели накоплений, теплокарта 30 дней, итоги месяца и PIN-код",
        "Зашифрованные паролем JSON-бэкапы AES-GCM и защищённый экспорт в таблицы CSV",
      ],
      addon: {
        title: "WhereDidItGo Pro (облачное хранилище и камера-сканер чеков)",
        text: "Синхронизация между устройствами через Supabase Cloud Vault, мгновенное распознавание чеков камерой и отключение баннеров при сохранении локальной базы.",
      },
      note: "Открытый код MIT · Подписанный Android APK v1.1.6 (14.4 МБ, versionCode 12).",
    },
    faq: {
      label: "Вопросы",
      title: "Частые вопросы",
      items: [
        { q: "Как работает парсер СМС и уведомлений банков без облачного ИИ?", a: "Модуль DraftsInbox разбирает суммы, валюты (USD, TJS, RUB, EUR) и названия магазинов из уведомлений Alif Bank, Chase и Т-Банка прямо на устройстве." },
        { q: "Можно ли разделить один чек на несколько категорий?", a: "Да. Включите Split в окне быстрого ввода, чтобы распределить покупку между категориями и подкатегориями с точностью до копейки." },
        { q: "Как работают зарплатные циклы и перенос остатка ZBB?", a: "Укажите любой день начала месяца (с 1 по 28) в Настройках и при желании включите перенос неизрасходованного остатка в следующий цикл." },
        { q: "Что такое Итоги месяца (Wrapped) и Автоочистка данных?", a: "В Аналитике доступна история из 5 слайдов с лучшими сериями дней без трат, а в Настройках — диагностика и автоисправление локальной базы." },
        { q: "Как скрыть баланс в общественном месте?", a: "Нажмите на иконку глаза на главной карточке для размытия баланса или удерживайте её 450 мс, чтобы скрыть все суммы в приложении." },
        { q: "Какие валюты и языки поддерживаются?", a: "Полный перевод на русский, английский и таджикский языки, а также USD, RUB, TJS, EUR, KZT, UZS или любой собственный символ валюты." },
      ],
    },
    cta: {
      title: "Готовы контролировать каждую\\nкопейку *на своём устройстве?*",
      text: "Скачайте подписанный Android APK v1.1.6 (14.4 МБ), откройте полную веб-версию Vue 3 прямо сейчас или оставьте почту к релизу в Google Play.",
      button: "Сообщить о выходе в Play",
      secondary: { label: "Скачать Android APK", href: "/wherediditgo.apk" },
    },
    operating: {
      title: "Начните бюджет в день зарплаты, а не 1-го числа.",
      text: "Выберите любой день с 1 по 28 в Настройках -> Форматирование, чтобы приложение считало честный дневной лимит.",
      link: { label: "Открыть веб-приложение Vue 3", href: "/" },
    },
    resources: {
      title: "Живые экраны *WhereDidItGo* v1.1.6",
      items: [
        { title: "Главная: кошельки, скрытие баланса и черновики СМС", tag: "01 · Главная", art: "dashboard", href: "/" },
        { title: "Бюджеты: перенос остатка ZBB и индикатор темпа", tag: "02 · Бюджеты", art: "report", href: "/budgets" },
        { title: "Аналитика: теплокарта 30 дней, KPI и итоги месяца", tag: "03 · Аналитика", art: "line", href: "/insights" },
        { title: "Настоящая чёрная тема OLED #000000 и PIN-защита", tag: "04 · OLED Dark", art: "multi", href: "/settings" },
      ],
    },
    film: {
      nav: "Смотреть 30с",
      eyebrow: "Фильм о продукте · 30 секунд",
      title: "WhereDidItGo за 30 секунд",
      note: "Фильм без звука и с субтитрами, снят по реальному приложению. 100% локально — как и всё здесь.",
      apk: "Скачать APK · 14.4 МБ",
      open: "Открыть веб-версию",
      close: "Закрыть фильм",
      lang: "Язык",
      theme: "Оформление",
      themeLight: "Графит",
      themeDark: "OLED тёмная",
    },
  },
  tj: {
    metaTitle: "WhereDidItGo — ҳисоби маҳаллии молияи шахсӣ",
    metaDesc: "Донед, ки ҳар сомонӣ куҷо рафт. Барномаи маҳаллӣ барои Android ва Web: сабти зуд бо ҳисобкунак дар 2.8с, таҳлили СМС-и бонкҳо, буҷаҳо, ҳадафҳо ва қарзҳо.",
    fund: "Ноябри 2026 · Давра аз рӯзи 15",
    nav: {
      products: [
        { label: "QuickAdd, тақсими чек ва СМС", text: "Ҳисобкунаки дарунсохт (12.50 + 4), тақсими харид ва таҳлили СМС-и Алиф / Chase / Т-Банк.", href: "#dashboard" },
        { label: "6 экран ва панели 7-тугма", text: "Намоиши зиндаи экранҳои Android, мавзӯи OLED ва сканери чекҳо.", href: "#features" },
        { label: "Харитаи хароҷот, ҳадафҳо ва қарзҳо", text: "Тақвими 30-рӯза, ҳадафҳои пасандоз ва дафтари қарзҳо.", href: "#coverage" },
      ],
      links: [
        { label: "Экранҳо", href: "#features" },
        { label: "Нархҳо", href: "#pricing" },
        { label: "Саволҳо", href: "#faq" },
      ],
      login: { label: "Кушодани барномаи веб", href: "/" },
      cta: { label: "Боргирии APK", href: "/wherediditgo.apk" },
    },
    hero: {
      title: "Донед, ки ҳар\\n*сомонӣ* куҷо рафт.",
      text: "Муҳаррики аслии WhereDidItGo-ро дар поён санҷед: тавозунро хира кунед, дар + QuickAdd ифодаи 12.50 + 4.00 нависед, чекро тақсим кунед ё СМС-и бонки Алифро таҳлил кунед — 100% дар дастгоҳи шумо.",
      primary: { label: "Боргирии Android APK · 14.4 МБ", href: "/wherediditgo.apk" },
      secondary: { label: "Кушодани барномаи Vue 3", href: "/" },
    },
    benefits: {
      label: "Сохта барои ҳаёти ҳаррӯза",
      text: "Ҳар экрани WhereDidItGo барои *телефони воқеӣ* сохта шудааст: тугмаи марказии + байни 6 бахш, таҳлили офлайни СМС-и бонкӣ, лифофаҳои ZBB ва сканери маҳаллии OCR.",
      stats: [
        { value: 2.8, decimals: 1, suffix: "с", label: "сабти зуд бо ҳисобкунак" },
        { value: 100, suffix: "%", label: "пойгоҳи маҳаллӣ + рамзгузории AES-GCM" },
        { value: 3, label: "забони пурра: English, Русский, Тоҷикӣ" },
      ],
    },
    features: {
      label: "Намоиши барнома",
      items: [
        {
          title: "Шаш экрани аслӣ дар панели мутаносиби 7-тугма",
          text: "Экранҳои воқеии Android-ро дар тарафи чап иваз кунед: Асосӣ, Таърих, Буҷаҳо, Ҳадафҳо, Таҳлил ва Мавзӯи сиёҳи OLED бо тугмаи марказии +.",
        },
        {
          title: "Мавзӯи OLED, сканери чекҳо OCR ва қулфи биометрӣ",
          text: "Чекҳои коғазиро бе интернет бо Tesseract WASM хонед, барномаро бо изи ангушт / Face ID муҳофизат кунед ва тавозунро дар ҷойи ҷамъиятӣ пинҳон созед.",
        },
        {
          title: "Харитаи 30-рӯза, ҳадафҳои пасандоз ва қарзҳо",
          text: "Шиддати хароҷоти моҳи ноябрро бинед (53.3% пасандоз), барои фонди эҳтиётӣ ва сафари Токио пул ҷамъ кунед ва баргардонидани қисм ба қисми қарзҳоро пайгирӣ намоед.",
        },
      ],
    },
    coverage: {
      title: "*Захираи буҷа* ва лифофаҳои ZBB-и худро санҷед",
      items: [
        { title: "Таҳлили СМС-и бонкҳо", text: "Алиф, Chase ва Т-Банк комилан офлайн" },
        { title: "Лифофаҳои ZBB", text: "Гузаронидани бақия ба моҳи оянда" },
        { title: "Тозакунии худкор", text: "Санҷиши дақиқии маблағҳо ва сплитҳо" },
        { title: "Нусхаҳои AES-GCM 256", text: "JSON бо гузарвожа + содироти бехатари CSV" },
      ],
    },
    pricing: {
      label: "Қисми асосӣ ҳамеша ройгон",
      price: "$0",
      unit: "барои барномаи пурраи маҳаллӣ",
      intro: "Ҳамеша ройгон дар Android, Web ва Desktop",
      items: [
        "Ҳамёнҳои бемаҳдуд, тақсими чекҳо, таҳлили СМС-и бонкӣ, давраҳои маош ва интиқоли бақияи ZBB",
        "Дафтари қарзҳо, ҳадафҳои пасандоз, харитаи 30-рӯза, ҷамъбасти моҳ ва қулфи PIN",
        "Нусхаҳои эҳтиётии рамзгузоришудаи AES-GCM JSON ва содироти бехатар ба CSV",
      ],
      addon: {
        title: "WhereDidItGo Pro (анбори абрӣ ва сканери чекҳо бо камера)",
        text: "Ҳамоҳангсозӣ байни дастгоҳҳо тавассути Supabase Cloud Vault, хондани фаврии чекҳо бо камера ва истифода бе таблиғот.",
      },
      note: "Рамзи кушодаи MIT · Файли имзошудаи Android APK v1.1.6 (14.4 МБ, versionCode 12).",
    },
    faq: {
      label: "Саволҳо",
      title: "Саволҳои маъмул",
      items: [
        { q: "Таҳлили СМС ва огоҳиномаҳои бонкӣ бе зеҳни сунъии абрӣ чӣ гуна кор мекунад?", a: "DraftsInbox маблағ, асъор (TJS, USD, RUB, EUR) ва номи мағозаро аз паёмҳои Алиф Бонк, Chase ва Т-Банк мустақиман дар телефони шумо бе интернет ҷудо мекунад." },
        { q: "Оё як чекро ба чанд категория тақсим кардан мумкин аст?", a: "Бале. Дар равзанаи + QuickAdd ҳолати Split-ро фаъол кунед ва харидро байни категорияҳо бо дақиқии пурра тақсим намоед." },
        { q: "Давраи маош ва лифофаҳои ZBB чӣ гуна кор мекунанд?", a: "Дар Танзимот рӯзи оғози моҳро аз 1 то 28 интихоб кунед ва гузаронидани бақияи сарфашударо ба давраи навбатӣ фаъол созед." },
        { q: "Ҷамъбасти моҳ (Wrapped) ва Тозакунии худкор чист?", a: "Дар бахши Таҳлил ҳикояи 5-слайдаи моҳона ва дар Танзимот санҷиши саломатии пойгоҳи маълумот дастрас аст." },
        { q: "Чӣ тавр тавозунро дар ҷойи ҷамъиятӣ пинҳон кунам?", a: "Тугмаи чашмро дар саҳифаи асосӣ пахш кунед, то тавозун хира шавад, ё онро 450 мс нигоҳ доред, то ҳамаи рақамҳо пинҳон шаванд." },
        { q: "Кадом забонҳо ва асъорҳо мавҷуданд?", a: "Тарҷумаи пурра ба забонҳои Тоҷикӣ, Русӣ ва Англисӣ ва дастгирии TJS, USD, RUB, EUR, UZS, KZT ё ҳар рамзи дилхоҳ." },
      ],
    },
    cta: {
      title: "Омодаед ҳар дирамро *дар\\nдастгоҳи худ* назорат кунед?",
      text: "Файли имзошудаи Android APK v1.1.6 (14.4 МБ)-ро зеркашӣ кунед, барномаи веби Vue 3-ро кушоед ё барои нашри Google Play огоҳинома гиред.",
      button: "Огоҳ кардан дар Play Store",
      secondary: { label: "Боргирии Android APK", href: "/wherediditgo.apk" },
    },
    operating: {
      title: "Давраи буҷаро аз рӯзи маош оғоз кунед, на аз рӯзи 1-ум.",
      text: "Ҳар рӯзро аз 1 то 28 дар Танзимот интихоб кунед, то WhereDidItGo меъёри воқеии хароҷоти рӯзонаро ҳисоб кунад.",
      link: { label: "Кушодани барномаи зиндаи Vue 3", href: "/" },
    },
    resources: {
      title: "Экранҳои аслии *WhereDidItGo* v1.1.6",
      items: [
        { title: "Саҳифаи асосӣ: ҳамёнҳо, хиракунии тавозун ва СМС", tag: "01 · Асосӣ", art: "dashboard", href: "/" },
        { title: "Буҷаҳои моҳона: лифофаҳои ZBB ва суръати хароҷот", tag: "02 · Буҷаҳо", art: "report", href: "/budgets" },
        { title: "Таҳлил: харитаи 30-рӯза, KPI ва ҷамъбасти моҳ", tag: "03 · Таҳлил", art: "line", href: "/insights" },
        { title: "Мавзӯи сиёҳи OLED #000000 ва муҳофизати PIN", tag: "04 · OLED Dark", art: "multi", href: "/settings" },
      ],
    },
    film: {
      nav: "Тамошои 30с",
      eyebrow: "Филми маҳсулот · 30 сония",
      title: "WhereDidItGo дар 30 сония",
      note: "Филми беовоз бо зернавиштҳо, аз рӯи барномаи воқеӣ. 100% маҳаллӣ — мисли ҳама чиз дар ин ҷо.",
      apk: "Боргирии APK · 14.4 МБ",
      open: "Кушодани веб-барнома",
      close: "Пӯшидани филм",
      lang: "Забон",
      theme: "Намуд",
      themeLight: "Графит",
      themeDark: "OLED торик",
    },
  },
}

function detectInitialLocale(): LocaleKey {
  try {
    const q = new URLSearchParams(window.location.search).get("lang")
    if (q === "en" || q === "ru" || q === "tj") return q
    if (q === "tg") return "tj"
  } catch {}
  try {
    const saved = localStorage.getItem("wdg-locale")
    if (saved === "en" || saved === "ru" || saved === "tj") return saved
  } catch {}
  try {
    const nav = (navigator.language || "en").toLowerCase()
    if (nav.startsWith("ru")) return "ru"
    if (nav.startsWith("tg") || nav.startsWith("tj")) return "tj"
  } catch {}
  return "en"
}

function detectInitialTheme(): ThemeKey {
  try {
    const saved = localStorage.getItem("wdg-landing-theme")
    if (saved === "graphite" || saved === "wdg-dark") return saved
  } catch {}
  return "graphite"
}

const ReactDOM = (window as any).ReactDOM
const createPortal: (node: any, container: Element) => any = ReactDOM.createPortal

const ICON = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as any

function GlobeIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="6.1" {...ICON} />
      <path d="M2.2 8h11.6M8 1.9c1.7 1.7 2.5 3.8 2.5 6.1S9.7 12.4 8 14.1C6.3 12.4 5.5 10.3 5.5 8S6.3 3.6 8 1.9Z" {...ICON} />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M13.6 9.6A5.9 5.9 0 0 1 6.4 2.4a5.9 5.9 0 1 0 7.2 7.2Z" {...ICON} />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="3.1" {...ICON} />
      <path d="M8 1.4v1.5M8 13.1v1.5M1.4 8h1.5M13.1 8h1.5M3.3 3.3l1.1 1.1M11.6 11.6l1.1 1.1M12.7 3.3l-1.1 1.1M4.4 11.6l-1.1 1.1" {...ICON} />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 10 10" aria-hidden="true">
      <path d="M2.4 1.5 8.4 5 2.4 8.5Z" fill="currentColor" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="wdg-check">
      <path d="m3.5 8.4 3 3 6-6.6" {...ICON} />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="wdg-chev">
      <path d="m5 6.5 3 3 3-3" {...ICON} />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="m4 4 8 8M12 4l-8 8" {...ICON} />
    </svg>
  )
}

function useNavSlots() {
  const [slots, setSlots] = React.useState<{ nav: HTMLElement | null; sheet: HTMLElement | null }>({ nav: null, sheet: null })

  React.useEffect(() => {
    let navHolder: HTMLElement | null = null
    let sheetHolder: HTMLElement | null = null
    let raf = 0
    let disposed = false

    const attach = (selector: string, className: string, prev: HTMLElement | null) => {
      const host = document.querySelector(selector)
      if (!host) return prev
      if (prev && prev.parentElement === host) return prev
      const holder = document.createElement("div")
      holder.className = className
      host.insertBefore(holder, host.firstChild)
      return holder
    }

    const scan = () => {
      raf = 0
      if (disposed) return
      const nextNav = attach(".ttl-nav-end", "wdg-nav-holder", navHolder)
      const nextSheet = attach(".ttl-sheet", "wdg-sheet-holder", sheetHolder)
      if (nextNav !== navHolder || nextSheet !== sheetHolder) {
        navHolder = nextNav
        sheetHolder = nextSheet
        setSlots({ nav: navHolder, sheet: sheetHolder })
      }
    }

    const schedule = () => {
      if (!raf) raf = window.requestAnimationFrame(scan)
    }

    scan()
    const observer = new MutationObserver(schedule)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => {
      disposed = true
      observer.disconnect()
      if (raf) window.cancelAnimationFrame(raf)
    }
  }, [])

  return slots
}

function NavSlotControls({ theme, locale, setTheme, setLocale, onWatch }: any) {
  const f = COPY[locale].film
  const [open, setOpen] = React.useState(false)
  const wrapRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const themeLabel = theme === "graphite" ? f.themeDark : f.themeLight

  return (
    <div className="wdg-nav-ctl">
      <div className="wdg-lang" ref={wrapRef}>
        <button
          type="button"
          className="wdg-iconbtn"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={f.lang}
          title={f.lang}
          onClick={() => setOpen((o: boolean) => !o)}
        >
          <GlobeIcon />
          <span className="wdg-lang-code">{LANGS.find((l) => l.key === locale)!.short}</span>
          <ChevronIcon />
        </button>
        {open && (
          <div className="wdg-lang-menu" role="menu" aria-label={f.lang}>
            {LANGS.map((l) => (
              <button
                key={l.key}
                type="button"
                role="menuitemradio"
                aria-checked={locale === l.key}
                className="wdg-lang-item"
                onClick={() => {
                  setLocale(l.key)
                  setOpen(false)
                }}
              >
                <span>{l.name}</span>
                {locale === l.key && <CheckIcon />}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        type="button"
        className="wdg-iconbtn"
        onClick={() => setTheme(theme === "graphite" ? "wdg-dark" : "graphite")}
        aria-label={themeLabel}
        title={themeLabel}
      >
        {theme === "graphite" ? <MoonIcon /> : <SunIcon />}
      </button>
      <button type="button" className="wdg-watch" onClick={onWatch}>
        <span className="wdg-play"><PlayIcon /></span>
        <span className="wdg-watch-label">{f.nav}</span>
      </button>
    </div>
  )
}

function SheetSlotControls({ theme, locale, setTheme, setLocale, onWatch }: any) {
  const f = COPY[locale].film
  const themeLabel = theme === "graphite" ? f.themeDark : f.themeLight

  return (
    <div className="wdg-sheet-ctl">
      <div className="wdg-sheet-row">
        <span className="wdg-sheet-label">{f.lang}</span>
        <div className="wdg-seg" role="group" aria-label={f.lang}>
          {LANGS.map((l) => (
            <button key={l.key} type="button" aria-pressed={locale === l.key} onClick={() => setLocale(l.key)}>
              {l.short}
            </button>
          ))}
        </div>
      </div>
      <div className="wdg-sheet-row">
        <span className="wdg-sheet-label">{f.theme}</span>
        <button
          type="button"
          className="wdg-sheet-theme"
          onClick={() => setTheme(theme === "graphite" ? "wdg-dark" : "graphite")}
        >
          {theme === "graphite" ? <MoonIcon /> : <SunIcon />}
          <span>{themeLabel}</span>
        </button>
      </div>
      <button type="button" className="wdg-sheet-watch" onClick={onWatch}>
        <span className="wdg-play"><PlayIcon /></span>
        <span>{f.nav}</span>
      </button>
    </div>
  )
}

function FilmModal({ lang, setLang, onClose }: any) {
  const f = COPY[lang].film
  const closeRef = React.useRef<HTMLButtonElement | null>(null)

  React.useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    if (closeRef.current) closeRef.current.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener("keydown", onKey)
    }
  }, [onClose])

  return createPortal(
    <div className="wdg-film-backdrop" onClick={onClose}>
      <div
        className="wdg-film"
        role="dialog"
        aria-modal="true"
        aria-label={f.title}
        onClick={(e: any) => e.stopPropagation()}
      >
        <div className="wdg-film-head">
          <div>
            <div className="wdg-film-eyebrow">{f.eyebrow}</div>
            <h2 className="wdg-film-title">{f.title}</h2>
          </div>
          <button ref={closeRef} type="button" className="wdg-film-x" onClick={onClose} aria-label={f.close} title={f.close}>
            <CloseIcon />
          </button>
        </div>
        <div className="wdg-film-frame">
          <video
            key={lang}
            src={"/media/launch-30s-" + lang + ".mp4"}
            poster={"/media/launch-30s-" + lang + "-poster.jpg"}
            autoPlay
            muted
            loop
            playsInline
            controls
            preload="metadata"
          />
        </div>
        <div className="wdg-film-foot">
          <div className="wdg-film-langs" role="group" aria-label={f.lang}>
            {LANGS.map((l) => (
              <button key={l.key} type="button" aria-pressed={lang === l.key} onClick={() => setLang(l.key)}>
                {l.short}
              </button>
            ))}
          </div>
          <div className="wdg-film-actions">
            <a className="wdg-film-apk" href="/wherediditgo.apk">{f.apk}</a>
            <a className="wdg-film-open" href="/">{f.open} →</a>
          </div>
        </div>
        <p className="wdg-film-note">{f.note}</p>
      </div>
    </div>,
    document.body
  )
}

function App() {
  const [theme, setTheme] = React.useState<ThemeKey>(detectInitialTheme)
  const [locale, setLocale] = React.useState<LocaleKey>(detectInitialLocale)
  const [filmOpen, setFilmOpen] = React.useState(false)
  const [filmLang, setFilmLang] = React.useState<LocaleKey>(detectInitialLocale)
  const slots = useNavSlots()

  const openFilm = React.useCallback(() => {
    setFilmLang(locale)
    setFilmOpen(true)
  }, [locale])
  const closeFilm = React.useCallback(() => setFilmOpen(false), [])

  React.useEffect(() => {
    try {
      localStorage.setItem("wdg-landing-theme", theme)
      document.body.style.background = theme === "wdg-dark" ? "#0a0a0c" : "#f2f3f4"
      document.body.style.color = theme === "wdg-dark" ? "#ffffff" : "#16191c"
    } catch {}
  }, [theme])

  React.useEffect(() => {
    const copy = COPY[locale]
    try {
      localStorage.setItem("wdg-locale", locale)
      document.documentElement.lang = locale === "tj" ? "tg" : locale
      document.title = copy.metaTitle
      const desc = document.querySelector('meta[name="description"]')
      if (desc) desc.setAttribute("content", copy.metaDesc)
    } catch {}
  }, [locale])

  const c = COPY[locale]

  const wdgLogo = (
    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 8, overflow: "hidden", border: "1px solid rgba(22,25,28,0.14)" }}>
      <img src="./logo.png" alt="WhereDidItGo" width={28} height={28} style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }} />
    </span>
  )

  return (
    <>
      <TealTreasuryLanding
        key={theme + "-" + locale}
        brand="WhereDidItGo"
        logo={wdgLogo}
        palette={CUSTOM_PALETTES[theme]}
        fund={c.fund}
        nav={c.nav}
        hero={c.hero}
        accounts={[
          { id: "checking", name: "Checking Account", kind: "Daily spending · Salary & rent", balance: 3420 },
          { id: "savings", name: "High-Yield Savings", kind: "Emergency & Tokyo goal reserve", balance: 12500 },
          { id: "cash", name: "Cash Wallet", kind: "Pocket cash · Coffee & books", balance: 280 },
        ]}
        activity={[
          { id: "tx1", date: "Nov 17", text: "Hardcover Design Books · Shopping", account: "Cash Wallet", amount: -32.00, status: "Settled" },
          { id: "tx2", date: "Nov 16", text: "Trader Joe Weekly Restock · Food", account: "Checking Account", amount: -118.30, status: "Settled" },
          { id: "tx3", date: "Nov 14", text: "Running Shoes & Sports Gear", account: "Sapphire Credit Card", amount: -129.99, status: "Settled" },
          { id: "tx4", date: "Nov 05", text: "Freelance UI Design Milestone", account: "Checking Account", amount: 850.00, status: "Settled" },
          { id: "tx5", date: "Nov 01", text: "Apartment Rent (Nov) · Housing", account: "Checking Account", amount: -1650.00, status: "Settled" },
        ]}
        benefits={c.benefits}
        features={c.features}
        coverage={{
          title: c.coverage.title,
          limit: 15000,
          perBank: 50,
          items: c.coverage.items,
        }}
        pricing={{
          ...c.pricing,
          annual: 0,
        }}
        faq={{
          ...c.faq,
          contact: "https://github.com/juraev-exe/WhereDidItGoNew/issues",
        }}
        cta={c.cta}
        operating={c.operating}
        resources={c.resources}
        footer={{
          columns: [
            { title: "WhereDidItGo", links: [{ label: "Launch Live Web App", href: "/" }, { label: "Download Android APK", href: "/wherediditgo.apk" }, { label: "v1.1.6 Release", href: "#get-started" }] },
            { title: "Live App Routes", links: [{ label: "Home Dashboard", href: "/" }, { label: "Activity Search", href: "/activity" }, { label: "Debts & Loans", href: "/debts" }, { label: "Budgets & Goals", href: "/budgets" }, { label: "Heatmap Insights", href: "/insights" }] },
            { title: "Privacy & Security", links: [{ label: "Local IndexedDB", href: "#benefits" }, { label: "4-Digit PIN & Biometrics", href: "#features" }, { label: "Encrypted JSON Backup", href: "#coverage" }, { label: "Opt-in Cloud Vault", href: "#coverage" }] },
            { title: "Open Source", links: [{ label: "GitHub Repo", href: "https://github.com/juraev-exe/WhereDidItGoNew" }, { label: "Stack Viewer", href: "/stack-viewer.html" }] },
            { title: "Legal", links: [{ label: "Privacy Policy", href: "/legal/privacy.html" }, { label: "Terms of Service", href: "/legal/terms.html" }, { label: "Refund Policy", href: "/legal/refund.html" }, { label: "Cookie Policy", href: "/legal/cookies.html" }, { label: "Data Deletion", href: "/legal/data-deletion.html" }] },
          ],
          legal: "WhereDidItGo v1.1.6 (versionCode 12) · Built by Juraev.exe · MIT License. All financial records are stored on your device in IndexedDB by default; Cloud Vault sync via Supabase is strictly opt-in.",
        }}
      />

      {slots.nav && createPortal(
        <NavSlotControls theme={theme} locale={locale} setTheme={setTheme} setLocale={setLocale} onWatch={openFilm} />,
        slots.nav
      )}

      {slots.sheet && createPortal(
        <SheetSlotControls theme={theme} locale={locale} setTheme={setTheme} setLocale={setLocale} onWatch={openFilm} />,
        slots.sheet
      )}

      {filmOpen && <FilmModal lang={filmLang} setLang={setFilmLang} onClose={closeFilm} />}
    </>
  )
}

const rootEl = document.getElementById("root")
if (rootEl) {
  const createRoot = (window as any).ReactDOM.createRoot
  createRoot(rootEl).render(<App />)
}
`

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content"
    />
    <title>WhereDidItGo — Local-first personal money tracker</title>
    <meta
      name="description"
      content="Know where every dollar went. Local-first personal finance for Android and web: 2.8s QuickAdd math keypad, bank SMS parser, payday budget cycles, goals, debts, and encrypted backups."
    />
    <meta name="theme-color" media="(prefers-color-scheme: light)" content="#f2f3f4" />
    <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#15181b" />
    <meta name="color-scheme" content="light dark" />
    <link rel="icon" type="image/svg+xml" href="./favicon.svg" />
    <link rel="canonical" href="https://moneytracker-vert-nu.vercel.app/landing" />
    <link rel="alternate" hreflang="en" href="https://moneytracker-vert-nu.vercel.app/landing?lang=en" />
    <link rel="alternate" hreflang="ru" href="https://moneytracker-vert-nu.vercel.app/landing?lang=ru" />
    <link rel="alternate" hreflang="tg" href="https://moneytracker-vert-nu.vercel.app/landing?lang=tj" />
    <link rel="alternate" hreflang="x-default" href="https://moneytracker-vert-nu.vercel.app/landing" />

    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="WhereDidItGo" />
    <meta property="og:title" content="WhereDidItGo — Know where every dollar went." />
    <meta
      property="og:description"
      content="100% local-first personal finance for Android & Web: QuickAdd inline math, split receipts, offline bank SMS parser, payday budget cycles, 30-day heatmap, and AES-GCM backups."
    />
    <meta property="og:url" content="https://moneytracker-vert-nu.vercel.app/landing" />
    <meta property="og:image" content="https://moneytracker-vert-nu.vercel.app/screens/01-home.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="WhereDidItGo — Local-first personal money tracker" />
    <meta
      name="twitter:description"
      content="Track spending in 2.8s with inline math, split receipts, bank SMS parsing, and zero mandatory cloud signups."
    />
    <meta name="twitter:image" content="https://moneytracker-vert-nu.vercel.app/screens/01-home.png" />

    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "WhereDidItGo",
        "operatingSystem": "Android 8.0+, Web, Windows",
        "applicationCategory": "FinanceApplication",
        "softwareVersion": "1.1.6",
        "url": "https://moneytracker-vert-nu.vercel.app/landing",
        "downloadUrl": "https://moneytracker-vert-nu.vercel.app/wherediditgo.apk",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        }
      }
    </script>

    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Outfit:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
    <style>
      html {
        -webkit-tap-highlight-color: transparent;
        -webkit-text-size-adjust: 100%;
      }
      body {
        margin: 0;
        padding: 0;
        background: #f2f3f4;
        color: #16191c;
      }
      button, a, [role="button"] {
        touch-action: manipulation;
        user-select: none;
        -webkit-user-select: none;
      }
      input, textarea, select {
        font-size: 16px;
      }
      /* WDG nav controls (injected into the core nav) */
      .wdg-nav-holder { display: flex; align-items: center; }
      .wdg-nav-ctl { display: flex; align-items: center; gap: 6px; }
      .ttl-root .wdg-iconbtn {
        display: inline-flex; align-items: center; justify-content: center; gap: 6px;
        height: 34px; min-width: 34px; padding: 0 9px; border-radius: 999px;
        border: 1px solid var(--ttl-rule); background: var(--ttl-paper); color: var(--ttl-ink);
        font: 500 12px/1 'Outfit', system-ui, sans-serif; cursor: pointer;
        transition: background-color .2s, border-color .2s, color .2s;
      }
      .ttl-root .wdg-iconbtn:hover { background: var(--ttl-page); border-color: color-mix(in srgb, var(--ttl-ink) 22%, var(--ttl-rule)); }
      .wdg-iconbtn:focus-visible, .wdg-watch:focus-visible, .wdg-lang-item:focus-visible,
      .wdg-seg button:focus-visible, .wdg-sheet-theme:focus-visible, .wdg-sheet-watch:focus-visible,
      .wdg-film-x:focus-visible, .wdg-film-langs button:focus-visible, .wdg-film-apk:focus-visible {
        outline: 2px solid var(--ttl-gold); outline-offset: 2px;
      }
      .wdg-iconbtn svg { width: 15px; height: 15px; flex: none; }
      .wdg-lang { position: relative; }
      .wdg-lang-code { font-weight: 600; letter-spacing: .04em; }
      .wdg-chev { width: 12px; height: 12px; opacity: .55; margin-left: -2px; }
      .wdg-lang-menu {
        position: absolute; top: calc(100% + 8px); right: 0; z-index: 60; min-width: 178px;
        padding: 6px; border-radius: 14px; background: var(--ttl-paper);
        border: 1px solid var(--ttl-rule); box-shadow: 0 26px 60px -28px rgba(16, 41, 45, .45);
        display: flex; flex-direction: column; gap: 2px; animation: wdg-pop .16s ease-out;
      }
      @keyframes wdg-pop { from { opacity: 0; transform: translateY(-4px) scale(.98); } to { opacity: 1; transform: none; } }
      .ttl-root .wdg-lang-item {
        display: flex; align-items: center; justify-content: space-between; gap: 10px;
        padding: 9px 10px; border-radius: 9px; border: 0; background: transparent;
        color: var(--ttl-ink); font: 500 13px 'Outfit', system-ui, sans-serif; text-align: left; cursor: pointer;
      }
      .ttl-root .wdg-lang-item:hover { background: var(--ttl-page); }
      .wdg-lang-item[aria-checked="true"] { font-weight: 600; }
      .wdg-lang-item svg { width: 14px; height: 14px; color: var(--ttl-gold); }
      .ttl-root .wdg-watch {
        display: inline-flex; align-items: center; gap: 8px; height: 34px; padding: 0 14px 0 8px;
        border-radius: 999px; border: 1px solid color-mix(in srgb, var(--ttl-gold) 52%, var(--ttl-rule));
        background: color-mix(in srgb, var(--ttl-gold) 8%, transparent); color: var(--ttl-ink);
        font: 600 12px/1 'Outfit', system-ui, sans-serif; white-space: nowrap; cursor: pointer;
        transition: background-color .2s, border-color .2s, box-shadow .2s;
      }
      .ttl-root .wdg-watch:hover {
        background: color-mix(in srgb, var(--ttl-gold) 16%, transparent);
        border-color: var(--ttl-gold);
        box-shadow: 0 8px 20px -12px color-mix(in srgb, var(--ttl-gold) 70%, transparent);
      }
      .wdg-play { display: inline-grid; place-items: center; width: 20px; height: 20px; border-radius: 50%; background: var(--ttl-gold); color: #fff; flex: none; }
      .wdg-play svg { width: 9px; height: 9px; margin-left: 1px; }
      .wdg-sheet-holder { display: block; }
      .wdg-sheet-ctl { display: flex; flex-direction: column; gap: 10px; padding: 10px 6px 14px; margin-bottom: 4px; border-bottom: 1px solid var(--ttl-rule); }
      .wdg-sheet-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 0 6px; }
      .wdg-sheet-label { font: 600 10.5px/1 'Outfit', system-ui, sans-serif; letter-spacing: .1em; text-transform: uppercase; color: color-mix(in srgb, var(--ttl-ink) 52%, transparent); }
      .wdg-seg { display: inline-flex; padding: 3px; border-radius: 999px; background: var(--ttl-page); border: 1px solid var(--ttl-rule); }
      .ttl-root .wdg-seg button {
        padding: 6px 13px; border-radius: 999px; border: 0; background: transparent; color: var(--ttl-ink);
        font: 500 12px 'Outfit', system-ui, sans-serif; cursor: pointer; transition: background-color .2s, color .2s;
      }
      .ttl-root .wdg-seg button[aria-pressed="true"] { background: var(--ttl-accent); color: var(--ttl-accent-ink); font-weight: 600; }
      .ttl-root .wdg-sheet-theme {
        display: inline-flex; align-items: center; gap: 7px; padding: 7px 12px; border-radius: 999px;
        border: 1px solid var(--ttl-rule); background: var(--ttl-paper); color: var(--ttl-ink);
        font: 500 12.5px 'Outfit', system-ui, sans-serif; cursor: pointer;
      }
      .wdg-sheet-theme svg, .wdg-sheet-watch svg { width: 14px; height: 14px; }
      .ttl-root .wdg-sheet-watch {
        display: flex; align-items: center; justify-content: center; gap: 9px; padding: 13px;
        border-radius: 12px; border: 1px solid color-mix(in srgb, var(--ttl-gold) 60%, var(--ttl-rule));
        background: color-mix(in srgb, var(--ttl-gold) 10%, transparent); color: var(--ttl-ink);
        font: 600 14px 'Outfit', system-ui, sans-serif; cursor: pointer;
      }
      .ttl-root .wdg-sheet-watch:hover { background: color-mix(in srgb, var(--ttl-gold) 18%, transparent); }
      @media (max-width: 900px) { .wdg-nav-holder { display: none; } }
      @media (min-width: 901px) and (max-width: 1160px) {
        .ttl-root .wdg-watch { padding: 0; width: 34px; justify-content: center; }
        .wdg-watch-label { display: none; }
      }
      /* film modal */
      .wdg-film-backdrop {
        position: fixed; inset: 0; z-index: 120; display: grid; place-items: center; padding: 18px;
        background: rgba(8, 9, 11, .8); -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px);
        animation: wdg-fade .18s ease-out;
      }
      @keyframes wdg-fade { from { opacity: 0; } to { opacity: 1; } }
      .wdg-film {
        width: min(980px, 100%); max-height: calc(100dvh - 36px); overflow: auto; border-radius: 22px;
        background: #0c0e10; border: 1px solid rgba(255, 255, 255, .1);
        box-shadow: 0 60px 140px -40px rgba(0, 0, 0, .85); color: #f2f3f4;
        font-family: 'Outfit', system-ui, sans-serif; animation: wdg-rise .26s cubic-bezier(.2, .8, .2, 1);
      }
      @keyframes wdg-rise { from { opacity: 0; transform: translateY(14px) scale(.985); } to { opacity: 1; transform: none; } }
      .wdg-film-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 20px 22px 14px; }
      .wdg-film-eyebrow { font: 600 10.5px/1.4 'Outfit', system-ui, sans-serif; letter-spacing: .16em; text-transform: uppercase; color: #c8a96a; }
      .wdg-film-title { margin: 6px 0 0; font-family: 'Fraunces', Georgia, serif; font-size: clamp(20px, 2.6vw, 27px); font-weight: 700; letter-spacing: -.02em; }
      .wdg-film-x {
        display: inline-grid; place-items: center; width: 36px; height: 36px; flex: none; border-radius: 50%;
        border: 1px solid rgba(255, 255, 255, .14); background: rgba(255, 255, 255, .06); color: #f2f3f4;
        cursor: pointer; transition: background-color .2s;
      }
      .wdg-film-x:hover { background: rgba(255, 255, 255, .14); }
      .wdg-film-x svg { width: 15px; height: 15px; }
      .wdg-film-frame { padding: 0 22px; }
      .wdg-film-frame video { display: block; width: 100%; aspect-ratio: 16/9; border-radius: 14px; background: #000; border: 1px solid rgba(255, 255, 255, .08); }
      .wdg-film-foot { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; padding: 16px 22px 4px; }
      .wdg-film-langs { display: inline-flex; padding: 3px; border-radius: 999px; background: rgba(255, 255, 255, .06); border: 1px solid rgba(255, 255, 255, .12); }
      .wdg-film-langs button {
        padding: 7px 15px; border-radius: 999px; border: 0; background: transparent; color: rgba(242, 243, 244, .75);
        font: 600 12px 'Outfit', system-ui, sans-serif; cursor: pointer; transition: background-color .2s, color .2s;
      }
      .wdg-film-langs button[aria-pressed="true"] { background: #d4b978; color: #141414; }
      .wdg-film-actions { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
      .wdg-film-apk {
        padding: 11px 20px; border-radius: 999px; background: #d4b978; color: #141414;
        font: 600 13px 'Outfit', system-ui, sans-serif; text-decoration: none; transition: background-color .2s;
      }
      .wdg-film-apk:hover { background: #e2cb92; }
      .wdg-film-open { color: rgba(242, 243, 244, .78); font: 500 13px 'Outfit', system-ui, sans-serif; text-decoration: none; }
      .wdg-film-open:hover { color: #fff; }
      .wdg-film-note { margin: 6px 0 0; padding: 0 22px 20px; font-size: 11.5px; line-height: 1.5; color: rgba(242, 243, 244, .48); }
      @media (max-width: 640px) {
        .wdg-film-backdrop { padding: 10px; }
        .wdg-film-head { padding: 16px 16px 10px; }
        .wdg-film-frame { padding: 0 10px; }
        .wdg-film-foot { padding: 12px 16px 2px; }
        .wdg-film-note { padding: 4px 16px 16px; }
        .wdg-film-actions { gap: 12px; }
        .wdg-film-apk { padding: 10px 16px; }
      }
      @media (prefers-reduced-motion: reduce) {
        .wdg-lang-menu, .wdg-film-backdrop, .wdg-film { animation: none; }
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script src="./vendor/react.min.js"></script>
    <script src="./vendor/react-dom.min.js"></script>
    <script src="./vendor/gsap.min.js"></script>
    <script src="./vendor/ScrollTrigger.min.js"></script>
    <script src="./vendor/teal-treasury-app.js"></script>
  </body>
</html>
`

async function main() {
  await fs.mkdir(buildDir, { recursive: true })

  await fs.writeFile(
    path.join(buildDir, 'shim-react.js'),
    `const R = window.React;
export default R;
export const {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useMemo,
  useCallback,
  useId,
  Fragment,
  createElement,
  cloneElement,
  createContext,
  useContext,
  forwardRef,
} = R;
`,
    'utf8',
  )

  await fs.writeFile(path.join(buildDir, 'entry.tsx'), entryTsx, 'utf8')

  const result = await esbuild.build({
    entryPoints: [path.join(buildDir, 'entry.tsx')],
    bundle: true,
    write: false,
    format: 'iife',
    target: ['es2020'],
    jsx: 'transform',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    alias: {
      react: path.join(buildDir, 'shim-react.js'),
    },
    minify: true,
  })

  const coreJs = await fs.readFile(corePath, 'utf8')
  const entryJs = result.outputFiles[0].text
  const combinedBundle = coreJs + '\n' + entryJs

  await fs.mkdir(path.join(cwd, 'public', 'vendor'), { recursive: true })
  await fs.mkdir(path.join(cwd, 'docs', 'vendor'), { recursive: true })
  await fs.writeFile(path.join(cwd, 'public', 'vendor', 'teal-treasury-app.js'), combinedBundle, 'utf8')

  await fs.writeFile(path.join(cwd, 'public', 'landing.html'), html, 'utf8')
  await fs.writeFile(path.join(cwd, 'docs', 'landing.html'), html, 'utf8')
  await fs.writeFile(path.join(cwd, 'docs', 'index.html'), html, 'utf8')

  for (const f of ['react.min.js', 'react-dom.min.js', 'gsap.min.js', 'ScrollTrigger.min.js', 'teal-treasury-app.js']) {
    await fs.copyFile(path.join(cwd, 'public', 'vendor', f), path.join(cwd, 'docs', 'vendor', f))
  }

  const mediaSrc = path.join(cwd, 'public', 'media')
  const mediaDst = path.join(cwd, 'docs', 'media')
  const mediaFiles = await fs.readdir(mediaSrc).catch(() => [])
  const launchMedia = mediaFiles.filter((f) => f.startsWith('launch-30s-'))
  if (launchMedia.length) {
    await fs.mkdir(mediaDst, { recursive: true })
    for (const f of launchMedia) {
      await fs.copyFile(path.join(mediaSrc, f), path.join(mediaDst, f))
    }
  }

  await fs.rm(buildDir, { recursive: true, force: true })
  console.log('Successfully built production Graphite landing (EN/RU/TJ) to public/landing.html, docs/landing.html, and docs/index.html!')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
