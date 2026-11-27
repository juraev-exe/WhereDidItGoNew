/**
 * Renders the WhereDidItGo 30-second launch film (1920x1080, 24fps) from the
 * seeded marketing screenshots, then encodes H.264 MP4s for EN / RU / TJ.
 *
 * Usage:
 *   node scripts/build-launch-reel.mjs --stills   # quick keyframe previews
 *   node scripts/build-launch-reel.mjs            # full render + encode
 */
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const ROOT = process.cwd()
const SHOTS = path.join(ROOT, 'marketing', 'instagram', 'screens')
const OUT_DIRS = [path.join(ROOT, 'public', 'media'), path.join(ROOT, 'docs', 'media')]
const TEMP = path.join(os.tmpdir(), 'wdg-launch-reel')
const FPS = 24
const DURATION = 30
const LOCALES = ['en', 'ru', 'tj']

const FILM = {
  en: {
    eyebrow: ['01 — Private by design', '02 — QuickAdd', '03 — Payday cycles', '04 — OLED & privacy'],
    lines: [
      ['Banks want your password.', 'You just wanted coffee.'],
      ['Log a purchase in 2.8 seconds.', 'Inline math. No menus.'],
      ['Budgets that start on payday.', 'Not on the 1st.'],
      ['Your money. Your device.', 'Zero mandatory cloud.'],
    ],
    sub: [
      'Bank sync is optional. Tracking is not.',
      'Type 13.50 + 4.80. Split a receipt. Done.',
      'Cycle the 15th and watch real daily runway.',
      'Free forever core · Signed 14.4 MB Android APK',
    ],
    chips: {
      hook: [['No bank login', 'Local IndexedDB vault'], ['0 accounts created', 'On-device by default']],
      quickadd: [['13.50 + 4.80', '= $18.30 · logged in 2.8s'], ['Split receipt', 'Exact cent validation']],
      runway: [['Payday cycle', 'Starts on day 15'], ['112 d runway', 'Tokyo goal · 72%']],
      privacy: [['Tap to blur', 'Balances hidden in public'], ['AES-GCM 256', 'Encrypted JSON backups']],
    },
    end: {
      tagline: 'Know where every dollar went.',
      cta: 'Download APK · 14.4 MB',
      sub: 'moneytracker-vert-nu.vercel.app',
    },
    screens: { hook: 'home-light.png' },
  },
  ru: {
    eyebrow: ['01 — Приватность', '02 — QuickAdd', '03 — Зарплатный цикл', '04 — OLED и защита'],
    lines: [
      ['Банку нужен ваш пароль.', 'А вам — просто кофе.'],
      ['Записывайте траты за 2.8 секунды.', 'Математика прямо в строке.'],
      ['Бюджеты со дня зарплаты.', 'А не с 1-го числа.'],
      ['Деньги — на вашем устройстве.', 'Без обязательного облака.'],
    ],
    sub: [
      'Синхронизация — по желанию. Учёт — нет.',
      'Введите 13.50 + 4.80. Разделите чек. Готово.',
      'Цикл с 15-го — честный запас хода на день.',
      'Бесплатное ядро · APK 14.4 МБ с подписью',
    ],
    chips: {
      hook: [['Без входа в банк', 'Локальное хранилище IndexedDB'], ['0 аккаунтов', 'Всё на устройстве']],
      quickadd: [['13.50 + 4.80', '= $18.30 · за 2.8 сек'], ['Сплит чека', 'Точность до копейки']],
      runway: [['Зарплатный цикл', 'Старт 15-го числа'], ['112 дн. запаса', 'Цель Токио · 72%']],
      privacy: [['Коснитесь', 'Суммы скрыты на людях'], ['AES-GCM 256', 'Шифрованные JSON-бэкапы']],
    },
    end: {
      tagline: 'Знайте, куда ушёл каждый рубль.',
      cta: 'Скачать APK · 14.4 МБ',
      sub: 'moneytracker-vert-nu.vercel.app',
    },
    screens: { hook: 'home-ru.png' },
  },
  tj: {
    eyebrow: ['01 — Махфият', '02 — QuickAdd', '03 — Давраи маош', '04 — OLED ва ҳифз'],
    lines: [
      ['Бонк паролро мехоҳад.', 'Шумо танҳо қаҳва мехостед.'],
      ['Хароҷро дар 2.8 сония сабт кунед.', 'Ҳисоб дар сатр.'],
      ['Буҷаҳо аз рӯзи маош.', 'На аз рӯзи 1-ум.'],
      ['Пули шумо — дар дастгоҳи шумо.', 'Бе абри ҳатмӣ.'],
    ],
    sub: [
      'Ҳамоҳангсозӣ ихтиёрӣ аст. Ҳисоб — не.',
      '13.50 + 4.80-ро нависед. Чекро тақсим кунед.',
      'Давра аз рӯзи 15 — захираи воқеии рӯзона.',
      'Ядрои ройгон · APK 14.4 МБ имзошуда',
    ],
    chips: {
      hook: [['Бе вуруди бонк', 'Анбори маҳаллии IndexedDB'], ['0 ҳисоб', 'Ҳама чиз дар дастгоҳ']],
      quickadd: [['13.50 + 4.80', '= $18.30 · дар 2.8с'], ['Тақсими чек', 'Дақиқии пурра']],
      runway: [['Давраи маош', 'Аз рӯзи 15'], ['112 рӯз', 'Ҳадафи Токио · 72%']],
      privacy: [['Пахш кунед', 'Тавозун пинҳон мешавад'], ['AES-GCM 256', 'Нусхаҳои рамзӣ']],
    },
    end: {
      tagline: 'Донед, ки ҳар сомонӣ куҷо рафт.',
      cta: 'Боргирии APK · 14.4 МБ',
      sub: 'moneytracker-vert-nu.vercel.app',
    },
    screens: { hook: 'home-tj.png' },
  },
}

const img = (name) => pathToFileURL(path.join(SHOTS, name)).href
const logoUrl = pathToFileURL(path.join(ROOT, 'docs', 'logo.png')).href

function buildHtml() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>WhereDidItGo — 30s launch film</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 1920px; height: 1080px; overflow: hidden; background: #07090b; }
  body { font-family: "Outfit", "Segoe UI", system-ui, sans-serif; color: #f2f5f4; }
  #reel { position: relative; width: 1920px; height: 1080px; overflow: hidden; background: #0a0c0f; }
  .bg { position: absolute; inset: 0; background:
      radial-gradient(900px 620px at 74% 34%, rgba(45,212,191,0.16), transparent 62%),
      radial-gradient(760px 520px at 18% 92%, rgba(212,185,120,0.10), transparent 60%),
      linear-gradient(180deg, #0b0e12 0%, #080a0d 100%); }
  .grid { position: absolute; inset: 0; opacity: .05;
    background-image: linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px);
    background-size: 160px 160px; mask-image: radial-gradient(1100px 700px at 62% 46%, #000 30%, transparent 78%); }
  .vignette { position: absolute; inset: 0; background: radial-gradient(1500px 900px at 50% 44%, transparent 55%, rgba(0,0,0,0.55) 100%); }

  .topbar { position: absolute; left: 72px; right: 72px; top: 44px; display: flex; align-items: center; justify-content: space-between; z-index: 6; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand img { width: 34px; height: 34px; border-radius: 9px; border: 1px solid rgba(255,255,255,0.16); }
  .brand b { font-weight: 600; font-size: 20px; letter-spacing: -0.01em; }
  .pill { font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase; color: #b9c4c2; padding: 8px 14px; border: 1px solid rgba(255,255,255,0.12); border-radius: 999px; background: rgba(255,255,255,0.03); }

  .stage { position: absolute; left: 96px; right: 96px; top: 150px; bottom: 120px; display: flex; align-items: center; justify-content: space-between; gap: 40px; }
  .copy { width: 800px; padding-left: 8px; }
  .eyebrow { display: inline-flex; align-items: center; gap: 10px; font-size: 14px; letter-spacing: 0.22em; text-transform: uppercase; color: #d4b978; font-weight: 600; }
  .eyebrow::before { content: ""; width: 26px; height: 1px; background: #d4b978; opacity: .8; }
  h1 { font-family: "Fraunces", Georgia, "Times New Roman", serif; font-weight: 500; font-size: 84px; line-height: 1.02; letter-spacing: -0.03em; margin-top: 26px; }
  h1 .accent { color: #d4b978; }
  .sub { margin-top: 26px; font-size: 25px; line-height: 1.5; color: #a7b1af; max-width: 660px; font-weight: 400; }
  .counter { position: absolute; left: 8px; bottom: 26px; font-size: 13px; letter-spacing: 0.22em; color: #6d7876; }

  .device-wrap { position: relative; width: 520px; height: 980px; display: grid; place-items: center; }
  .glow { position: absolute; width: 620px; height: 620px; top: 150px; left: -50px; border-radius: 50%;
    background: radial-gradient(closest-side, rgba(45,212,191,0.28), rgba(45,212,191,0.08) 55%, transparent 72%); filter: blur(6px); }
  .device { position: relative; width: 452px; height: 940px; border-radius: 68px; padding: 15px;
    background: linear-gradient(160deg, #2b3036 0%, #14171b 42%, #23272c 100%);
    box-shadow: 0 60px 120px -40px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.10), inset 0 0 0 2px rgba(255,255,255,0.04); }
  .screen { position: relative; width: 100%; height: 100%; border-radius: 55px; overflow: hidden; background: #0e1114; }
  .screen img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .screen .shotB { opacity: 0; }
  .notch { position: absolute; top: 16px; left: 50%; transform: translateX(-50%); width: 108px; height: 26px; border-radius: 999px; background: #05070a; z-index: 5; }

  .chip { position: absolute; z-index: 8; padding: 14px 18px; border-radius: 16px; background: rgba(15,19,22,0.9);
    border: 1px solid rgba(255,255,255,0.13); box-shadow: 0 24px 50px -24px rgba(0,0,0,0.9); opacity: 0; }
  .chip b { display: block; font-size: 22px; font-weight: 600; letter-spacing: -0.01em; color: #f4f7f6; }
  .chip span { display: block; margin-top: 3px; font-size: 13.5px; color: #8f9a97; letter-spacing: 0.01em; }
  .chip.gold b { color: #e3c98d; }
  .chip.teal b { color: #5eead4; }
  .chip-a { right: -18px; top: 108px; }
  .chip-b { left: -66px; bottom: 132px; }

  .caption-wrap { position: absolute; left: 96px; right: 96px; bottom: 17px; z-index: 7; display: flex; align-items: center; gap: 20px; }
  .progress { position: relative; flex: 1; height: 3px; border-radius: 999px; background: rgba(255,255,255,0.10); overflow: hidden; }
  .progress i { position: absolute; inset: 0; transform-origin: 0 50%; background: linear-gradient(90deg, #d4b978, #5eead4); }
  .tc { font-size: 12.5px; letter-spacing: 0.18em; color: #7c8785; font-variant-numeric: tabular-nums; }

  .endcard { position: absolute; inset: 0; z-index: 20; display: grid; place-items: center; background: radial-gradient(900px 600px at 50% 30%, #10151a 0%, #07090b 70%); opacity: 0; visibility: hidden; }
  .endcard .inner { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 22px; }
  .endcard img { width: 84px; height: 84px; border-radius: 22px; border: 1px solid rgba(255,255,255,0.16); }
  .endcard h2 { font-family: "Fraunces", Georgia, serif; font-weight: 500; font-size: 64px; letter-spacing: -0.03em; }
  .endcard p { font-size: 23px; color: #a7b1af; }
  .endcard .cta { margin-top: 10px; display: inline-flex; align-items: center; gap: 12px; padding: 18px 30px; border-radius: 999px; background: #d4b978; color: #131610; font-weight: 600; font-size: 22px; }
  .endcard .url { margin-top: 4px; font-size: 15px; letter-spacing: 0.16em; color: #77817f; text-transform: uppercase; }

  .fade { position: absolute; inset: 0; background: #05070a; z-index: 40; pointer-events: none; }
</style>
</head>
<body>
<div id="reel">
  <div class="bg"></div><div class="grid"></div><div class="vignette"></div>

  <div class="topbar">
    <div class="brand"><img src="${logoUrl}" alt="" /><b>WhereDidItGo</b></div>
    <div class="pill" id="topPill">Local-first finance · v1.1.6</div>
  </div>

  <div class="stage">
    <div class="copy">
      <div class="eyebrow" id="eyebrow"></div>
      <h1 id="headline"></h1>
      <p class="sub" id="subline"></p>
      <div class="counter" id="counter"></div>
    </div>
    <div class="device-wrap" id="deviceWrap">
      <div class="glow" id="glow"></div>
      <div class="device">
        <div class="screen">
          <img class="shotA" id="shotA" alt="" />
          <img class="shotB" id="shotB" alt="" />
          <div class="notch"></div>
        </div>
      </div>
      <div class="chip chip-a" id="chipA"></div>
      <div class="chip chip-b" id="chipB"></div>
    </div>
  </div>

  <div class="caption-wrap">
    <div class="progress"><i id="bar"></i></div>
    <div class="tc" id="timecode">00:00 / 00:30</div>
  </div>

  <div class="endcard" id="endcard">
    <div class="inner">
      <img src="${logoUrl}" alt="" />
      <h2>WhereDidItGo</h2>
      <p id="endTagline"></p>
      <div class="cta" id="endCta"></div>
      <div class="url" id="endUrl"></div>
    </div>
  </div>

  <div class="fade" id="fade"></div>
</div>

<script>
const LOCALES = ${JSON.stringify(FILM)};
const SHOT = {
  home: ${JSON.stringify(img('home-light.png'))},
  homeRu: ${JSON.stringify(img('home-ru.png'))},
  homeTj: ${JSON.stringify(img('home-tj.png'))},
  quickadd: ${JSON.stringify(img('quickadd.png'))},
  budgets: ${JSON.stringify(img('budgets-cycle.png'))},
  goals: ${JSON.stringify(img('goals.png'))},
  insights: ${JSON.stringify(img('insights.png'))},
  dark: ${JSON.stringify(img('home-dark.png'))},
  blur: ${JSON.stringify(img('home-blur.png'))}
};
const BOUNDS = [0, 6, 13.5, 22, 30];
const KEYS = ['hook', 'quickadd', 'runway', 'privacy'];
const SCREENS = [
  { name: 'home', from: -1, to: 6.2 },
  { name: 'quickadd', from: 5.9, to: 13.7 },
  { name: 'budgets', from: 13.4, to: 17.6 },
  { name: 'goals', from: 17.3, to: 19.9 },
  { name: 'insights', from: 19.6, to: 22.1 },
  { name: 'dark', from: 21.8, to: 24.2 },
  { name: 'blur', from: 23.9, to: 99 }
];
const $ = (id) => document.getElementById(id);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (p) => 1 - Math.pow(1 - clamp(p), 3);
const easeInOut = (p) => { p = clamp(p); return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2 };

let loc = 'en';

function sceneIndexAt(t) {
  for (let i = KEYS.length - 1; i >= 0; i--) if (t >= BOUNDS[i]) return i;
  return 0;
}
function screenFor(t) {
  let cur = 0;
  for (let i = 0; i < SCREENS.length; i++) if (t >= SCREENS[i].from) cur = i;
  const s = SCREENS[cur];
  if (cur > 0 && t < s.from + 0.45) {
    return { base: SCREENS[cur - 1].name, over: s.name, alpha: ease((t - s.from) / 0.45) };
  }
  return { base: s.name, over: null, alpha: 0 };
}
function chipHtml(pair) {
  return '<b>' + pair[0] + '</b><span>' + pair[1] + '</span>';
}
function chipWindow(key, t) {
  const wins = {
    hook: [[1.1, 3.9], [2.1, 5.6]],
    quickadd: [[6.7, 10.2], [9.9, 13.2]],
    runway: [[14.2, 18.4], [17.8, 21.7]],
    privacy: [[24.6, 28.2], [25.4, 28.6]]
  };
  return wins[key];
}
function setChip(el, pair, win, t, dy = 14) {
  const [a, b] = win;
  if (!pair || t < a - 0.25 || t > b + 0.35) { el.style.opacity = 0; return; }
  const pin = ease((t - a) / 0.5);
  const pout = 1 - ease((t - (b - 0.35)) / 0.35);
  el.innerHTML = chipHtml(pair);
  el.style.opacity = String(Math.max(0, Math.min(pin, pout)));
  el.style.transform = 'translateY(' + ((1 - pin) * dy).toFixed(2) + 'px)';
}

function renderAt(t) {
  const copy = LOCALES[loc];
  const idx = sceneIndexAt(t);
  const key = KEYS[idx];
  const local = t - BOUNDS[idx];
  const enter = ease(local / 0.6);
  const exit = 1 - ease((t - (BOUNDS[idx + 1] - 0.35)) / 0.35);
  const vis = Math.min(enter, idx === 3 ? 1 : exit);

  $('eyebrow').textContent = copy.eyebrow[idx];
  $('eyebrow').style.opacity = vis;
  $('headline').innerHTML = copy.lines[idx][0] + '<br><span class="accent">' + copy.lines[idx][1] + '</span>';
  $('headline').style.opacity = vis;
  $('headline').style.transform = 'translateY(' + ((1 - enter) * 26).toFixed(2) + 'px)';
  $('subline').textContent = copy.sub[idx];
  $('subline').style.opacity = vis * 0.95;
  $('subline').style.transform = 'translateY(' + ((1 - enter) * 18).toFixed(2) + 'px)';
  $('counter').textContent = '0' + (idx + 1) + ' / 04';

  const sc = screenFor(t);
  const map = { home: SHOT.home, homeRu: SHOT.homeRu, homeTj: SHOT.homeTj, quickadd: SHOT.quickadd, budgets: SHOT.budgets, goals: SHOT.goals, insights: SHOT.insights, dark: SHOT.dark, blur: SHOT.blur };
  let baseSrc = map[sc.base];
  if (key === 'hook' && loc === 'ru') baseSrc = SHOT.homeRu;
  if (key === 'hook' && loc === 'tj') baseSrc = SHOT.homeTj;
  $('shotA').src = baseSrc;
  if (sc.over && sc.alpha > 0.001) {
    $('shotB').src = map[sc.over];
    $('shotB').style.opacity = sc.alpha;
  } else {
    $('shotB').style.opacity = 0;
  }

  const chips = copy.chips[key];
  const win = chipWindow(key, t);
  setChip($('chipA'), chips[0], win[0], t);
  setChip($('chipB'), chips[1], win[1], t, 20);

  const floatY = Math.sin(t * 0.72) * 5 - 3;
  $('deviceWrap').style.transform = 'translateY(' + floatY.toFixed(2) + 'px)';
  $('glow').style.opacity = '0.9';

  $('bar').style.transform = 'scaleX(' + clamp(t / 30) + ')';
  const mm = Math.floor(t / 60), ss = Math.floor(t % 60);
  $('timecode').textContent = String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0') + ' / 00:30';

  const fadeIn = 1 - ease(t / 0.7);
  const fadeOut = ease((t - 29.45) / 0.5);
  $('fade').style.opacity = Math.max(fadeIn, fadeOut);

  const end = clamp((t - 27.15) / 0.75);
  const ec = $('endcard');
  ec.style.opacity = end;
  ec.style.visibility = end > 0.01 ? 'visible' : 'hidden';
  $('endTagline').textContent = copy.end.tagline;
  $('endCta').textContent = copy.end.cta;
  $('endUrl').textContent = copy.end.sub;
}

window.setLocale = (l) => { loc = l; };
window.renderAt = renderAt;
window.__reelReady = true;
</script>
</body>
</html>`
}

function ffmpeg(args) {
  const r = spawnSync('ffmpeg', args, { stdio: 'inherit' })
  if (r.status !== 0) throw new Error('ffmpeg failed')
}

async function main() {
  const stillsOnly = process.argv.includes('--stills')
  const only = (process.argv.find((a) => a.startsWith('--locale=')) || '').split('=')[1]
  const locales = only ? [only] : LOCALES

  await fs.mkdir(TEMP, { recursive: true })
  const htmlPath = path.join(TEMP, 'reel.html')
  await fs.writeFile(htmlPath, buildHtml(), 'utf8')
  for (const d of OUT_DIRS) await fs.mkdir(d, { recursive: true })

  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' })
  await page.evaluate(() => Promise.race([document.fonts.ready.catch(() => {}), new Promise((r) => setTimeout(r, 3000))]))
  await page.waitForTimeout(400)

  if (stillsOnly) {
    const stamps = [1.6, 3.4, 7.6, 10.6, 15.2, 18.4, 20.8, 25.2, 28.4]
    const dir = path.join(TEMP, 'stills')
    await fs.mkdir(dir, { recursive: true })
    for (const l of locales) {
      await page.evaluate((ll) => window.setLocale(ll), l)
      for (const t of stamps) {
        await page.evaluate((tt) => window.renderAt(tt), t)
        await page.screenshot({ path: path.join(dir, `${l}-${t.toFixed(1)}.png`) })
      }
    }
    console.log('STILLS', dir)
    await browser.close()
    return
  }

  const totalFrames = FPS * DURATION
  for (const l of locales) {
    await page.evaluate((ll) => window.setLocale(ll), l)
    const framesDir = path.join(TEMP, 'frames-' + l)
    await fs.rm(framesDir, { recursive: true, force: true })
    await fs.mkdir(framesDir, { recursive: true })
    console.log(`Rendering ${l.toUpperCase()} (${totalFrames} frames @ ${FPS}fps)...`)
    for (let f = 0; f < totalFrames; f++) {
      const t = f / FPS
      await page.evaluate((tt) => window.renderAt(tt), t)
      await page.screenshot({ path: path.join(framesDir, `f${String(f).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 93 })
      if (f % 120 === 0) process.stdout.write(`  ${f}/${totalFrames}\r`)
    }
    console.log(`  ${totalFrames}/${totalFrames} frames`)

    const out = path.join(OUT_DIRS[0], `launch-30s-${l}.mp4`)
    console.log(`Encoding ${path.basename(out)}...`)
    ffmpeg([
      '-y', '-loglevel', 'error',
      '-framerate', String(FPS),
      '-i', path.join(framesDir, 'f%04d.jpg'),
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '19',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
      '-r', String(FPS),
      out,
    ])
    const posterFrame = path.join(framesDir, `f${String(Math.round(26.8 * FPS)).padStart(4, '0')}.jpg`)
    await fs.copyFile(posterFrame, path.join(OUT_DIRS[0], `launch-30s-${l}-poster.jpg`))
    for (const d of OUT_DIRS.slice(1)) {
      await fs.copyFile(out, path.join(d, path.basename(out)))
      await fs.copyFile(path.join(OUT_DIRS[0], `launch-30s-${l}-poster.jpg`), path.join(d, `launch-30s-${l}-poster.jpg`))
    }
    const size = (await fs.stat(out)).size
    console.log(`  ✓ ${path.basename(out)} (${(size / 1024 / 1024).toFixed(1)} MB)`)
    await fs.rm(framesDir, { recursive: true, force: true })
  }
  await browser.close()
  console.log('Done: public/media + docs/media')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
