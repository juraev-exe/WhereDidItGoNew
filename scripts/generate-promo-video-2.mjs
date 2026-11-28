/**
 * Renders Reel #2 ("Where Did It Go? — The 365-Day Money Habit"):
 * A 24-second 1080x1920 (9:16 Instagram Reel) with 7 distinct VFX acts spotlighting
 * the live balance drain hook, 365-day contribution heatmap, Snowball debt payoff
 * slider simulator, 3-language trilingual fan (RU / EN / TJ), 64% Net Savings Rate
 * radial ring gauge, diagonal Light/Dark theme wipe, and encore CTA.
 *
 * Usage:
 *   node scripts/generate-promo-video-2.mjs
 */
import fs from 'node:fs/promises'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { chromium } from 'playwright'

const ROOT = process.cwd()
const IG_DIR = path.join(ROOT, 'marketing', 'instagram')
const SCREENS_DIR = path.join(IG_DIR, 'screens')
const PROD_DIR = path.join(ROOT, 'productions', 'wherediditgo-launch')
const AUDIO_WAV = path.join(PROD_DIR, 'audio', 'soundtrack-reel2.wav')
const OUT_MP4 = path.join(IG_DIR, 'wherediditgo-reel-2-9x16.mp4')
const OUT_PROD_MP4 = path.join(PROD_DIR, 'wherediditgo-reel-2.mp4')
const KEYFRAMES_PNG = path.join(IG_DIR, 'reel-2-keyframes.png')

const FPS = 30
const DURATION = 24.0
const TOTAL_FRAMES = Math.round(FPS * DURATION) // 720 frames

async function toDataUri(filePath) {
  const buf = await fs.readFile(filePath)
  const ext = path.extname(filePath).toLowerCase()
  const mime = ext === '.svg' ? 'image/svg+xml' : 'image/png'
  return `data:${mime};base64,${buf.toString('base64')}`
}

function buildRendererHtml(assets) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #000; overflow: hidden; }
    canvas { display: block; width: 1080px; height: 1920px; }
  </style>
</head>
<body>
  <canvas id="stage" width="1080" height="1920"></canvas>
  <script>
    const ASSETS = ${JSON.stringify(assets)};
    const IMAGES = {};

    window.preloadAll = async () => {
      await document.fonts.ready;
      await Promise.all(Object.entries(ASSETS).map(([k, src]) => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => { IMAGES[k] = img; resolve(); };
        img.onerror = reject;
        img.src = src;
      })));
    };

    const canvas = document.getElementById('stage');
    const ctx = canvas.getContext('2d');
    const W = 1080;
    const H = 1920;
    const BPM = 132.0;
    const BEAT = 60.0 / BPM;

    const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const prog = (t, t0, t1) => clamp((t - t0) / Math.max(0.0001, t1 - t0), 0, 1);
    const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
    const easeOutQuint = (x) => 1 - Math.pow(1 - x, 5);
    const easeInOutCubic = (x) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    const springPop = (x) => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      return 1 - Math.exp(-6.5 * x) * Math.cos(11.5 * x);
    };

    function roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
    }

    const STARS = Array.from({ length: 64 }, (_, i) => ({
      x: ((i * 211) % 1000) / 1000 * W,
      y: ((i * 389) % 1000) / 1000 * H,
      r: 1.5 + (i % 4) * 1.1,
      speed: 35 + (i % 6) * 16,
      phase: i * 0.75,
      color: i % 4 === 0 ? '#5eead4' : (i % 4 === 1 ? '#38bdf8' : (i % 4 === 2 ? '#a78bfa' : '#2dd4bf'))
    }));

    function drawStudioStage(t, mode = 'obsidian', flash = 0) {
      const beatPhase = t >= 3.18 ? ((t / BEAT) % 1.0) : 1.0;
      const beatPulse = t >= 3.18 ? Math.exp(-beatPhase * 5.2) : 0;

      if (mode === 'cream') {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#f5f3ed');
        g.addColorStop(1, '#e8e4da');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        const orb = ctx.createRadialGradient(W * 0.5, H * 0.62, 10, W * 0.5, H * 0.62, 700 + beatPulse * 70);
        orb.addColorStop(0, 'rgba(13, 110, 99, 0.16)');
        orb.addColorStop(1, 'rgba(13, 110, 99, 0)');
        ctx.fillStyle = orb;
        ctx.fillRect(0, 0, W, H);
      } else {
        // Pure OLED #030605 base with dual neon aurora clouds
        ctx.fillStyle = '#030605';
        ctx.fillRect(0, 0, W, H);

        const ax = W * 0.5 + Math.cos(t * 0.8) * 110;
        const ay = H * 0.56 + Math.sin(t * 0.6) * 80;
        const aura1 = ctx.createRadialGradient(ax, ay, 30, ax, ay, 740 + beatPulse * 100);
        aura1.addColorStop(0, mode === 'crimson' ? 'rgba(225, 29, 72, 0.28)' : 'rgba(20, 184, 166, 0.28)');
        aura1.addColorStop(0.5, mode === 'crimson' ? 'rgba(245, 158, 11, 0.10)' : 'rgba(56, 189, 248, 0.11)');
        aura1.addColorStop(1, 'rgba(3, 6, 5, 0)');
        ctx.fillStyle = aura1;
        ctx.fillRect(0, 0, W, H);

        const aura2 = ctx.createRadialGradient(W * 0.18, H * 0.2, 10, W * 0.18, H * 0.2, 480);
        aura2.addColorStop(0, 'rgba(45, 212, 191, 0.14)');
        aura2.addColorStop(1, 'rgba(3, 6, 5, 0)');
        ctx.fillStyle = aura2;
        ctx.fillRect(0, 0, W, H);
      }

      // Perspective horizon grid lines
      ctx.save();
      ctx.strokeStyle = mode === 'cream' ? 'rgba(16, 25, 24, 0.048)' : 'rgba(94, 234, 212, 0.052)';
      ctx.lineWidth = 1;
      const step = 90;
      const shift = (t * 28) % step;
      for (let x = 0; x <= W; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = -step + shift; y <= H; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      ctx.restore();

      // Particle field
      ctx.save();
      for (const s of STARS) {
        const py = (s.y - t * s.speed * 1.3 + H * 5) % H;
        const px = (s.x + Math.cos(t * 1.4 + s.phase) * 24 + W) % W;
        ctx.globalAlpha = (0.2 + 0.25 * Math.sin(t * 2.8 + s.phase)) * (mode === 'cream' ? 0.45 : 1);
        ctx.fillStyle = mode === 'cream' ? '#0d6e63' : s.color;
        ctx.beginPath();
        ctx.arc(px, py, s.r * (1 + beatPulse * 0.4), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      if (flash > 0.001) {
        ctx.save();
        ctx.fillStyle = \`rgba(94, 234, 212, \${flash * 0.34})\`;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    }

    function drawTopHud(t, badge, mode = 'obsidian') {
      const isCream = mode === 'cream';
      ctx.save();

      // Segmented 7-Act Progress Bar at top
      const segs = 7;
      const totalW = W - 144;
      const gap = 10;
      const segW = (totalW - gap * (segs - 1)) / segs;
      const actBounds = [0, 3.2, 6.6, 10.2, 13.8, 17.2, 20.4, 24.0];

      for (let i = 0; i < segs; i++) {
        const sx = 72 + i * (segW + gap);
        const sy = 54;
        roundRect(ctx, sx, sy, segW, 7, 3.5);
        ctx.fillStyle = isCream ? 'rgba(13, 110, 99, 0.15)' : 'rgba(255, 255, 255, 0.12)';
        ctx.fill();

        const p = prog(t, actBounds[i], actBounds[i + 1]);
        if (p > 0) {
          roundRect(ctx, sx, sy, segW * p, 7, 3.5);
          ctx.fillStyle = isCream ? '#0d6e63' : '#2dd4bf';
          ctx.fill();
        }
      }

      // Brand header
      const y = 94;
      roundRect(ctx, 72, y, 48, 48, 14);
      ctx.fillStyle = isCream ? 'rgba(13, 110, 99, 0.12)' : 'rgba(45, 212, 191, 0.16)';
      ctx.fill();
      ctx.strokeStyle = isCream ? 'rgba(13, 110, 99, 0.25)' : 'rgba(94, 234, 212, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = isCream ? '#0d6e63' : '#5eead4';
      ctx.font = '800 24px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('W', 96, y + 25);

      ctx.fillStyle = isCream ? '#101918' : '#f3f7f6';
      ctx.font = '700 28px "Outfit", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('WhereDidItGo', 136, y + 25);

      // Right pill
      ctx.font = '700 17px "Outfit", sans-serif';
      const bw = ctx.measureText(badge).width + 38;
      const bx = W - 72 - bw;
      roundRect(ctx, bx, y + 4, bw, 40, 20);
      ctx.fillStyle = isCream ? 'rgba(13, 110, 99, 0.11)' : 'rgba(45, 212, 191, 0.14)';
      ctx.fill();
      ctx.strokeStyle = isCream ? 'rgba(13, 110, 99, 0.25)' : 'rgba(94, 234, 212, 0.32)';
      ctx.stroke();
      ctx.fillStyle = isCream ? '#0b5d53' : '#5eead4';
      ctx.textAlign = 'center';
      ctx.fillText(badge, bx + bw / 2, y + 25);
      ctx.restore();
    }

    function drawHeadline(lines, subtitle, yStart, enterProg, mode = 'obsidian', align = 'left') {
      const isCream = mode === 'cream';
      const x = align === 'center' ? W / 2 : 76;
      ctx.save();
      ctx.textAlign = align;
      ctx.textBaseline = 'top';

      lines.forEach((line, i) => {
        const lp = clamp((enterProg - i * 0.14) / 0.72, 0, 1);
        const eased = easeOutCubic(lp);
        ctx.save();
        ctx.globalAlpha = eased;
        const y = yStart + i * 76 + (1 - eased) * 32;
        ctx.font = '700 68px "Fraunces", Georgia, serif';
        ctx.fillStyle = line.accent
          ? (isCream ? '#0d6e63' : (line.crimson ? '#fb7185' : '#2dd4bf'))
          : (isCream ? '#101918' : '#f4f8f7');
        ctx.fillText(line.text, x, y);
        ctx.restore();
      });

      if (subtitle) {
        const sp = clamp((enterProg - 0.22) / 0.75, 0, 1);
        const eased = easeOutCubic(sp);
        ctx.globalAlpha = eased;
        ctx.font = '400 29px "Outfit", sans-serif';
        ctx.fillStyle = isCream ? '#4b5a57' : '#9eb3af';
        const subY = yStart + lines.length * 76 + 18 + (1 - eased) * 22;
        const subLines = Array.isArray(subtitle) ? subtitle : [subtitle];
        subLines.forEach((sl, idx) => {
          ctx.fillText(sl, x, subY + idx * 40);
        });
      }
      ctx.restore();
    }

    function drawPhone(imgKey, opts = {}) {
      const img = IMAGES[imgKey];
      if (!img) return;
      const {
        x = W / 2,
        y = 1120,
        w = 540,
        rot = 0,
        scale = 1,
        alpha = 1,
        bezel = 'obsidian',
        glow = 0.32,
      } = opts;
      const h = w * (844 / 390);
      const pad = Math.round(w * 0.024);
      const rOuter = Math.round(w * 0.11);
      const rInner = rOuter - pad;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.rotate((rot * Math.PI) / 180);
      ctx.scale(scale, scale);

      if (glow > 0) {
        const g = ctx.createRadialGradient(0, 0, w * 0.15, 0, 0, w * 0.85);
        g.addColorStop(0, \`rgba(20, 184, 166, \${glow})\`);
        g.addColorStop(1, 'rgba(20, 184, 166, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(-w, -h * 0.7, w * 2, h * 1.4);
      }

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.70)';
      ctx.shadowBlur = 72;
      ctx.shadowOffsetY = 34;
      roundRect(ctx, -w / 2, -h / 2, w, h, rOuter);
      const frameGrad = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
      if (bezel === 'silver') {
        frameGrad.addColorStop(0, '#ffffff');
        frameGrad.addColorStop(0.5, '#dfe5e3');
        frameGrad.addColorStop(1, '#b8c4c1');
      } else {
        frameGrad.addColorStop(0, '#2b3835');
        frameGrad.addColorStop(0.5, '#121917');
        frameGrad.addColorStop(1, '#080c0b');
      }
      ctx.fillStyle = frameGrad;
      ctx.fill();
      ctx.restore();

      roundRect(ctx, -w / 2, -h / 2, w, h, rOuter);
      ctx.strokeStyle = bezel === 'silver' ? 'rgba(255,255,255,0.9)' : 'rgba(255, 255, 255, 0.24)';
      ctx.lineWidth = 2.2;
      ctx.stroke();

      ctx.save();
      roundRect(ctx, -w / 2 + pad, -h / 2 + pad, w - pad * 2, h - pad * 2, rInner);
      ctx.clip();
      ctx.drawImage(img, -w / 2 + pad, -h / 2 + pad, w - pad * 2, h - pad * 2);

      const sheen = ctx.createLinearGradient(-w / 2, -h / 2, w * 0.35, h * 0.25);
      sheen.addColorStop(0, 'rgba(255, 255, 255, 0.10)');
      sheen.addColorStop(0.45, 'rgba(255, 255, 255, 0.02)');
      sheen.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = sheen;
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.restore();

      roundRect(ctx, -40, -h / 2 + pad + 10, 80, 7, 4);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.fill();
      ctx.restore();
    }

    function drawCard(x, y, w, h, opts = {}) {
      const {
        r = 30,
        bg = 'rgba(15, 26, 24, 0.94)',
        border = 'rgba(45, 212, 191, 0.38)',
        alpha = 1,
        scale = 1,
      } = opts;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x + w / 2, y + h / 2);
      ctx.scale(scale, scale);
      ctx.translate(-(x + w / 2), -(y + h / 2));

      ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
      ctx.shadowBlur = 46;
      ctx.shadowOffsetY = 20;
      roundRect(ctx, x, y, w, h, r);
      ctx.fillStyle = bg;
      ctx.fill();

      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = border;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // ============================================================================
    // 7 CHOREOGRAPHED ACTS (0.0s -> 24.0s)
    // ============================================================================

    // ACT 1 (0.0s - 3.2s): Mystery Balance Drain -> Tape-Stop Slam at 2.20s
    function renderAct1(t) {
      const stopped = t >= 2.20;
      const slamFlash = stopped && t < 2.6 ? Math.exp(-(t - 2.20) * 10) : 0;
      drawStudioStage(t, stopped ? 'obsidian' : 'crimson', slamFlash);
      drawTopHud(t, 'THE PAYCHECK MYSTERY', 'obsidian');

      drawHeadline(
        [
          { text: 'Payday was two' },
          { text: 'weeks ago.', accent: false },
          { text: stopped ? 'Where did it go?' : 'Wait... where is it?', accent: true, crimson: !stopped },
        ],
        ['Small daily leaks drain your balance quietly', 'when your tracker takes too much effort to open.'],
        200,
        prog(t, 0.05, 0.8),
        'obsidian'
      );

      // Giant Live Draining Balance Card
      const drainP = easeInOutCubic(prog(t, 0.12, 2.15));
      const balanceVal = stopped ? 15750.50 : lerp(3450.00, 142.80, drainP);
      const cardScale = stopped ? 1 + 0.09 * Math.exp(-(t - 2.20) * 11) : 1;

      const cx = 76;
      const cy = 780;
      const cw = W - 152;
      const ch = 460;
      drawCard(cx, cy, cw, ch, {
        r: 38,
        scale: cardScale,
        bg: stopped ? 'rgba(13, 38, 34, 0.96)' : 'rgba(36, 15, 22, 0.94)',
        border: stopped ? '#2dd4bf' : 'rgba(251, 113, 133, 0.65)'
      });

      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = '700 22px "Outfit", sans-serif';
      ctx.fillStyle = stopped ? '#5eead4' : '#fda4af';
      ctx.fillText(
        stopped ? '✓ CLARITY RESTORED WITH WHEREDIDITGO' : '⚠ UNTRACKED MONTHLY LEAKS',
        W / 2,
        cy + 78
      );

      ctx.font = '800 116px "Outfit", sans-serif';
      ctx.fillStyle = stopped ? '#2dd4bf' : '#fb7185';
      const formatted = '$' + balanceVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      ctx.fillText(formatted, W / 2, cy + 210);

      // Leak items vs Tracked wallets pills
      const items = stopped
        ? [
            { label: 'Checking $9,840.50', col: '#2dd4bf' },
            { label: 'Savings $5,200.00', col: '#38bdf8' },
            { label: 'Cash $710.00', col: '#fbbf24' },
          ]
        : [
            { label: '−$18.40 Delivery', col: '#fb7185' },
            { label: '−$49.99 Forgotten Sub', col: '#fb7185' },
            { label: '−$64.20 Impulse Run', col: '#fb7185' },
          ];

      let px = cx + 48;
      const py = cy + 335;
      ctx.font = '700 23px "Outfit", sans-serif';
      ctx.textAlign = 'left';
      for (const it of items) {
        const pw = ctx.measureText(it.label).width + 38;
        roundRect(ctx, px, py, pw, 56, 28);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
        ctx.fill();
        ctx.strokeStyle = it.col;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = it.col;
        ctx.fillText(it.label, px + 19, py + 36);
        px += pw + 16;
      }
      ctx.restore();

      // Bottom Peek of Home Phone rising on the 2.20s slam
      if (t >= 2.0) {
        const pp = springPop(prog(t, 2.15, 2.95));
        drawPhone('homeDark', {
          x: W / 2,
          y: 1710 + (1 - pp) * 240,
          w: 580,
          scale: pp,
          alpha: pp,
          glow: 0.45
        });
      }
    }

    // ACT 2 (3.2s - 6.6s): 365-Day Contribution Heatmap & 82-Day Streak
    function renderAct2(t) {
      const lt = t - 3.2;
      drawStudioStage(t, 'obsidian', lt < 0.25 ? Math.exp(-lt * 10) : 0);
      drawTopHud(t, '365-DAY RHYTHM', 'obsidian');

      drawHeadline(
        [
          { text: 'Build a money habit' },
          { text: 'you can actually see.', accent: true },
        ],
        ['Watch your 365-day contribution heatmap fill up', 'and search any note or category in milliseconds.'],
        200,
        prog(lt, 0.0, 0.55),
        'obsidian'
      );

      // Bottom Phone: Activity Screen
      const pPhone = springPop(prog(lt, 0.12, 0.85));
      drawPhone('activity', {
        x: 540,
        y: 1475 + (1 - pPhone) * 180,
        w: 535,
        rot: 0,
        alpha: pPhone,
        glow: 0.38
      });

      // Top Floating Interactive Heatmap Matrix Card (lights up with synth blips!)
      const cp = springPop(prog(lt, 0.08, 0.72));
      const hx = 72;
      const hy = 655;
      const hw = W - 144;
      const hh = 340;
      drawCard(hx, hy, hw, hh, {
        scale: cp,
        alpha: cp,
        bg: 'rgba(13, 25, 23, 0.96)',
        border: 'rgba(45, 212, 191, 0.52)'
      });

      ctx.save();
      ctx.globalAlpha = cp;
      ctx.textAlign = 'left';
      ctx.font = '800 32px "Outfit", sans-serif';
      ctx.fillStyle = '#f3f7f6';
      ctx.fillText('107 Transactions · 82-Day Streak 🔥', hx + 38, hy + 62);

      ctx.textAlign = 'right';
      ctx.font = '700 22px "Outfit", sans-serif';
      ctx.fillStyle = '#2dd4bf';
      ctx.fillText('SEP · OCT · NOV', hx + hw - 38, hy + 62);

      // 16 cols x 5 rows glowing matrix cells
      const cols = 16;
      const rows = 5;
      const cellS = 38;
      const cellGap = 11;
      const gridStartX = hx + 78;
      const gridStartY = hy + 96;
      const fillWave = prog(lt, 0.2, 1.9) * (cols + rows);

      const shades = [
        'rgba(255, 255, 255, 0.08)',
        '#0f524a',
        '#0d7a6d',
        '#14b8a6',
        '#2dd4bf',
      ];

      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const cx = gridStartX + c * (cellS + cellGap);
          const cy = gridStartY + r * (cellS + cellGap);
          const lit = (c + r * 0.6) <= fillWave;
          const level = lit ? (((c * 7 + r * 13) % 4) + 1) : 0;

          roundRect(ctx, cx, cy, cellS, cellS, 9);
          ctx.fillStyle = shades[level];
          ctx.fill();
        }
      }
      ctx.restore();
    }

    // ACT 3 (6.6s - 10.2s): Debts, IOUs & Live Snowball Payoff Slider (Cream)
    function renderAct3(t) {
      const lt = t - 6.6;
      const chimeFlash = t >= 8.62 && t <= 9.05 ? Math.exp(-(t - 8.62) * 9) : 0;
      drawStudioStage(t, 'cream', chimeFlash);
      drawTopHud(t, 'DEBTS & SNOWBALL', 'cream');

      drawHeadline(
        [
          { text: 'Track who owes who.' },
          { text: 'Project your payoff.', accent: true },
        ],
        ['Separate "I Lent" from "I Borrowed" and drag', 'the Snowball slider to see your debt-free date.'],
        200,
        prog(lt, 0.0, 0.55),
        'cream'
      );

      // Left Phone: Debts & Loans screen
      const pPhone = springPop(prog(lt, 0.08, 0.8));
      drawPhone('debts', {
        x: 335,
        y: 1295,
        w: 495,
        rot: -2.5,
        alpha: pPhone,
        glow: 0.16
      });

      // Right Top Card: Interactive Snowball Repayment Slider (drags during 7.2s..8.6s!)
      const sx = 475;
      const sw = 532;
      const c1P = springPop(prog(lt, 0.18, 0.85));
      const slideP = easeInOutCubic(prog(t, 7.25, 8.55));
      const budgetMo = Math.round(lerp(25, 85, slideP));
      const lockedIn = t >= 8.62;

      drawCard(sx, 710, sw, 340, {
        scale: c1P * (lockedIn ? 1 + 0.05 * Math.exp(-(t - 8.62) * 10) : 1),
        alpha: c1P,
        bg: '#0c2320',
        border: lockedIn ? '#2dd4bf' : 'rgba(45, 212, 191, 0.45)'
      });

      ctx.save();
      ctx.globalAlpha = c1P;
      ctx.textAlign = 'left';
      ctx.font = '700 17px "Outfit", sans-serif';
      ctx.fillStyle = '#5eead4';
      ctx.fillText('SNOWBALL & AVALANCHE SIMULATOR', sx + 34, 765);

      ctx.font = '600 24px "Outfit", sans-serif';
      ctx.fillStyle = '#cbd9d6';
      ctx.fillText('Monthly Repayment Budget:', sx + 34, 818);

      ctx.textAlign = 'right';
      ctx.font = '800 34px "Outfit", sans-serif';
      ctx.fillStyle = '#2dd4bf';
      ctx.fillText(\`$\${budgetMo} / mo\`, sx + sw - 34, 818);

      // Slider Track + Knob
      const tx = sx + 34;
      const ty = 858;
      const tw = sw - 68;
      roundRect(ctx, tx, ty, tw, 16, 8);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fill();

      const fillW = tw * (0.22 + 0.68 * slideP);
      roundRect(ctx, tx, ty, fillW, 16, 8);
      ctx.fillStyle = '#2dd4bf';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(tx + fillW, ty + 8, 18, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#14b8a6';
      ctx.lineWidth = 5;
      ctx.stroke();

      // Projected Debt-Free Date Banner
      roundRect(ctx, tx, 912, tw, 102, 22);
      ctx.fillStyle = lockedIn ? 'rgba(45, 212, 191, 0.20)' : 'rgba(255, 255, 255, 0.07)';
      ctx.fill();

      ctx.textAlign = 'left';
      ctx.font = '600 21px "Outfit", sans-serif';
      ctx.fillStyle = '#b4c7c3';
      ctx.fillText('Projected Debt-Free Date', tx + 24, 952);

      ctx.font = '800 36px "Outfit", sans-serif';
      ctx.fillStyle = lockedIn ? '#5eead4' : '#f3f7f6';
      ctx.fillText(lockedIn ? 'Jan 2027 · 4 Mo Faster ✓' : (slideP > 0.5 ? 'Feb 2027' : 'May 2027'), tx + 24, 996);
      ctx.restore();

      // Right Bottom Card: Alex Rivera I LENT
      const c2P = springPop(prog(lt, 0.45, 1.15));
      drawCard(sx, 1085, sw, 235, {
        scale: c2P,
        alpha: c2P,
        bg: '#ffffff',
        border: 'rgba(13, 110, 99, 0.22)'
      });
      ctx.save();
      ctx.globalAlpha = c2P;
      ctx.textAlign = 'left';
      ctx.font = '700 28px "Outfit", sans-serif';
      ctx.fillStyle = '#101918';
      ctx.fillText('Alex Rivera · Cabin Split', sx + 34, 1146);

      ctx.font = '800 50px "Outfit", sans-serif';
      ctx.fillStyle = '#0d6e63';
      ctx.fillText('$150.00 left', sx + 34, 1216);

      ctx.font = '500 22px "Outfit", sans-serif';
      ctx.fillStyle = '#4b5a57';
      ctx.fillText('I LENT · $90.00 repaid of $240.00', sx + 34, 1272);
      ctx.restore();
    }

    // ACT 4 (10.2s - 13.8s): 3-Phone Trilingual Fan (Русский · English · Тоҷикӣ)
    function renderAct4(t) {
      const lt = t - 10.2;
      drawStudioStage(t, 'obsidian', lt < 0.25 ? Math.exp(-lt * 10) : 0);
      drawTopHud(t, '3 LANGUAGES & CURRENCIES', 'obsidian');

      drawHeadline(
        [
          { text: 'Fluent in English,' },
          { text: 'Русский & Тоҷикӣ.', accent: true },
        ],
        ['Native localization and world currencies formatted', 'the way you actually read and spend money.'],
        200,
        prog(lt, 0.0, 0.55),
        'obsidian',
        'center'
      );

      // Currency Pills Row
      const pills = [
        { label: '🇺🇸 English · $ USD', t0: 0.15 },
        { label: '🇷🇺 Русский · ₽ RUB', t0: 0.45 },
        { label: '🇹🇯 Тоҷикӣ · с. TJS', t0: 0.75 },
      ];
      ctx.save();
      ctx.font = '700 23px "Outfit", sans-serif';
      const positions = [195, 540, 885];
      pills.forEach((pl, i) => {
        const pp = springPop(prog(lt, pl.t0, pl.t0 + 0.6));
        if (pp <= 0.01) return;
        const pw = 290;
        const px = positions[i] - pw / 2;
        const py = 540;
        drawCard(px, py, pw, 64, {
          r: 32,
          scale: pp,
          alpha: pp,
          bg: 'rgba(18, 36, 33, 0.94)',
          border: 'rgba(45, 212, 191, 0.55)'
        });
        ctx.save();
        ctx.globalAlpha = pp;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#e2efec';
        ctx.fillText(pl.label, positions[i], py + 40);
        ctx.restore();
      });
      ctx.restore();

      // 3-Phone Fan synced to Left (10.35s), Center (10.85s), Right (11.35s) whoosh pops!
      const pLeft = springPop(prog(t, 10.35, 11.15));
      const pRight = springPop(prog(t, 11.30, 12.10));
      const pCenter = springPop(prog(t, 10.82, 11.65));

      drawPhone('homeRu', {
        x: 230 - (1 - pLeft) * 140,
        y: 1320 + (1 - pLeft) * 200,
        w: 410,
        rot: -8.0 * pLeft,
        scale: 0.9 + 0.1 * pLeft,
        alpha: pLeft,
        glow: 0.25
      });

      drawPhone('homeTj', {
        x: 850 + (1 - pRight) * 140,
        y: 1320 + (1 - pRight) * 200,
        w: 410,
        rot: 8.0 * pRight,
        scale: 0.9 + 0.1 * pRight,
        alpha: pRight,
        glow: 0.25
      });

      drawPhone('homeDark', {
        x: 540,
        y: 1245 + (1 - pCenter) * 220,
        w: 465,
        rot: 0,
        scale: 0.92 + 0.08 * pCenter,
        alpha: pCenter,
        glow: 0.45
      });
    }

    // ACT 5 (13.8s - 17.2s): Executive 30-Day Insights & 64% Net Savings Rate Gauge
    function renderAct5(t) {
      const lt = t - 13.8;
      const bellFlash = t >= 15.32 && t <= 15.8 ? Math.exp(-(t - 15.32) * 9) : 0;
      drawStudioStage(t, 'obsidian', bellFlash);
      drawTopHud(t, 'EXECUTIVE INSIGHTS', 'obsidian');

      drawHeadline(
        [
          { text: 'Insights that answer,' },
          { text: 'not dump pie charts.', accent: true },
        ],
        ['Know your net savings rate, daily burn rate,', 'and biggest category shift in one view.'],
        200,
        prog(lt, 0.0, 0.55),
        'obsidian'
      );

      // Left Phone: Insights screen
      const pPhone = springPop(prog(lt, 0.08, 0.8));
      drawPhone('insights', {
        x: 335,
        y: 1295,
        w: 495,
        rot: -2.0,
        alpha: pPhone,
        glow: 0.38
      });

      // Right Animated Circular Ring Gauge Card (sweeps to 64% during 14.15s..15.35s)
      const gx = 485;
      const gy = 695;
      const gw = 525;
      const gh = 490;
      const cp = springPop(prog(lt, 0.18, 0.85));
      const sweepP = easeOutQuint(prog(t, 14.15, 15.40));
      const rateVal = Math.round(64 * sweepP);

      drawCard(gx, gy, gw, gh, {
        scale: cp,
        alpha: cp,
        bg: 'rgba(13, 28, 25, 0.96)',
        border: 'rgba(45, 212, 191, 0.62)'
      });

      ctx.save();
      ctx.globalAlpha = cp;
      ctx.textAlign = 'center';
      ctx.font = '700 18px "Outfit", sans-serif';
      ctx.fillStyle = '#5eead4';
      ctx.fillText('30-DAY NET SAVINGS RATE', gx + gw / 2, gy + 56);

      // Ring Arc
      const rcx = gx + gw / 2;
      const rcy = gy + 245;
      const rad = 132;
      ctx.beginPath();
      ctx.arc(rcx, rcy, rad, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
      ctx.lineWidth = 24;
      ctx.stroke();

      if (sweepP > 0) {
        const startAng = -Math.PI / 2;
        const endAng = startAng + Math.PI * 2 * (0.64 * sweepP);
        ctx.beginPath();
        ctx.arc(rcx, rcy, rad, startAng, endAng);
        ctx.strokeStyle = '#2dd4bf';
        ctx.lineWidth = 24;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      ctx.font = '800 72px "Outfit", sans-serif';
      ctx.fillStyle = '#f3f7f6';
      ctx.fillText(\`\${rateVal}%\`, rcx, rcy + 20);

      ctx.font = '600 23px "Outfit", sans-serif';
      ctx.fillStyle = '#9eb3af';
      ctx.fillText('You kept +$2,707.53 of $4,250.00', rcx, gy + 436);
      ctx.restore();

      // Daily Burn Rate Mini Card
      const b2P = springPop(prog(lt, 0.55, 1.2));
      drawCard(gx, 1220, gw, 170, {
        scale: b2P,
        alpha: b2P,
        bg: 'rgba(16, 26, 24, 0.95)',
        border: 'rgba(255, 255, 255, 0.16)'
      });
      ctx.save();
      ctx.globalAlpha = b2P;
      ctx.textAlign = 'left';
      ctx.font = '600 22px "Outfit", sans-serif';
      ctx.fillStyle = '#9eb3af';
      ctx.fillText('Daily Burn Rate · 42% Lower Stretch', gx + 36, 1278);
      ctx.font = '800 46px "Outfit", sans-serif';
      ctx.fillStyle = '#2dd4bf';
      ctx.fillText('$57.13 / day', gx + 36, 1342);
      ctx.restore();
    }

    // ACT 6 (17.2s - 20.4s): Themes & Portable JSON / CSV Data Ownership (Cream)
    function renderAct6(t) {
      const lt = t - 17.2;
      drawStudioStage(t, 'cream', 0);
      drawTopHud(t, 'THEMES & OPEN DATA', 'cream');

      drawHeadline(
        [
          { text: 'Light, Dark & OLED.' },
          { text: 'And your raw data.', accent: true },
        ],
        ['Switch themes anytime and export portable', 'JSON backups or clean CSV spreadsheets in one tap.'],
        200,
        prog(lt, 0.0, 0.55),
        'cream'
      );

      const p1 = springPop(prog(lt, 0.08, 0.78));
      const p2 = springPop(prog(lt, 0.22, 0.92));

      drawPhone('homeLight', {
        x: 320,
        y: 1270,
        w: 465,
        rot: -4.0,
        alpha: p1,
        bezel: 'silver',
        glow: 0.15
      });

      drawPhone('homeDark', {
        x: 760,
        y: 1295,
        w: 465,
        rot: 4.0,
        alpha: p2,
        bezel: 'obsidian',
        glow: 0.25
      });

      // Center Floating Export Badge
      const ep = springPop(prog(lt, 0.4, 1.05));
      if (ep > 0.01) {
        const ew = 680;
        const ex = (W - ew) / 2;
        drawCard(ex, 675, ew, 92, {
          r: 46,
          scale: ep,
          alpha: ep,
          bg: '#0c2320',
          border: '#2dd4bf'
        });
        ctx.save();
        ctx.globalAlpha = ep;
        ctx.textAlign = 'center';
        ctx.font = '700 26px "Outfit", sans-serif';
        ctx.fillStyle = '#5eead4';
        ctx.fillText('⬇ 1-Tap JSON Vault Backup & CSV Export', W / 2, 730);
        ctx.restore();
      }
    }

    // ACT 7 (20.4s - 24.0s): Grand Encore Finale & Download CTA
    function renderAct7(t) {
      const lt = t - 20.4;
      const flash = lt < 0.3 ? Math.exp(-lt * 10) : 0;
      drawStudioStage(t, 'obsidian', flash);
      drawTopHud(t, 'GET STARTED FREE', 'obsidian');

      const cp = springPop(prog(lt, 0.05, 0.75));
      const cx = 72;
      const cy = 215;
      const cw = W - 144;
      const ch = 810;

      drawCard(cx, cy, cw, ch, {
        r: 42,
        scale: cp,
        alpha: cp,
        bg: 'rgba(11, 32, 29, 0.96)',
        border: 'rgba(45, 212, 191, 0.62)'
      });

      ctx.save();
      ctx.globalAlpha = cp;

      if (IMAGES.logo) {
        ctx.save();
        roundRect(ctx, cx + 56, cy + 56, 128, 128, 32);
        ctx.clip();
        ctx.drawImage(IMAGES.logo, cx + 56, cy + 56, 128, 128);
        ctx.restore();
      }

      ctx.textAlign = 'left';
      ctx.font = '700 20px "Outfit", sans-serif';
      ctx.fillStyle = '#5eead4';
      ctx.fillText('WHEREDIDITGO · LOCAL-FIRST FINANCE', cx + 214, cy + 94);

      ctx.font = '700 54px "Fraunces", Georgia, serif';
      ctx.fillStyle = '#f3f7f6';
      ctx.fillText('Stop guessing', cx + 214, cy + 150);
      ctx.fillStyle = '#2dd4bf';
      ctx.fillText('where it went.', cx + 214, cy + 212);

      const bullets = [
        '365-Day Heatmap & Instant Search',
        'Debts & Snowball Payoff Simulator',
        'English, Русский & Тоҷикӣ Native',
        'Free Offline Forever · Zero Ads',
      ];
      bullets.forEach((b, idx) => {
        const iy = cy + 302 + idx * 74;
        ctx.beginPath();
        ctx.arc(cx + 84, iy, 20, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(45, 212, 191, 0.22)';
        ctx.fill();

        ctx.textAlign = 'center';
        ctx.font = '800 22px "Outfit", sans-serif';
        ctx.fillStyle = '#2dd4bf';
        ctx.fillText('✓', cx + 84, iy + 8);

        ctx.textAlign = 'left';
        ctx.font = '600 30px "Outfit", sans-serif';
        ctx.fillStyle = '#e2efec';
        ctx.fillText(b, cx + 126, iy + 10);
      });

      const pulse = 1 + 0.025 * Math.sin(t * 7.5);
      const bx = cx + 56;
      const by = cy + 638;
      const bw = cw - 112;
      const bh = 114;
      ctx.save();
      ctx.translate(bx + bw / 2, by + bh / 2);
      ctx.scale(pulse, pulse);
      roundRect(ctx, -bw / 2, -bh / 2, bw, bh, 57);
      const btnGrad = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0);
      btnGrad.addColorStop(0, '#2dd4bf');
      btnGrad.addColorStop(1, '#14b8a6');
      ctx.fillStyle = btnGrad;
      ctx.fill();

      ctx.textAlign = 'center';
      ctx.font = '800 36px "Outfit", sans-serif';
      ctx.fillStyle = '#04201d';
      ctx.fillText('Try WhereDidItGo Free — Link in Bio →', 0, 12);
      ctx.restore();
      ctx.restore();

      // 3-Phone Encore Cascade at bottom
      const pPhones = springPop(prog(lt, 0.2, 0.9));
      drawPhone('activity', {
        x: 245,
        y: 1545 + (1 - pPhones) * 180,
        w: 400,
        rot: -6.0,
        alpha: pPhones,
        glow: 0.25
      });
      drawPhone('debts', {
        x: 835,
        y: 1545 + (1 - pPhones) * 180,
        w: 400,
        rot: 6.0,
        alpha: pPhones,
        glow: 0.25
      });
      drawPhone('homeDark', {
        x: 540,
        y: 1500 + (1 - pPhones) * 180,
        w: 440,
        rot: 0,
        alpha: pPhones,
        glow: 0.42
      });
    }

    window.renderAtTime = (t) => {
      ctx.clearRect(0, 0, W, H);
      if (t < 3.2) renderAct1(t);
      else if (t < 6.6) renderAct2(t);
      else if (t < 10.2) renderAct3(t);
      else if (t < 13.8) renderAct4(t);
      else if (t < 17.2) renderAct5(t);
      else if (t < 20.4) renderAct6(t);
      else renderAct7(t);

      const cuts = [3.2, 6.6, 10.2, 13.8, 17.2, 20.4];
      for (const c of cuts) {
        const dt = Math.abs(t - c);
        if (dt < 0.11) {
          const a = (1 - dt / 0.11) * 0.22;
          ctx.fillStyle = \`rgba(255, 255, 255, \${a})\`;
          ctx.fillRect(0, 0, W, H);
        }
      }
    };

    window.renderBatchJpegs = (times) => {
      return times.map((t) => {
        window.renderAtTime(t);
        return canvas.toDataURL('image/jpeg', 0.96).split(',')[1];
      });
    };
  </script>
</body>
</html>`
}

async function main() {
  console.log('1/4 Loading retina screen assets for Reel #2...')
  const assets = {
    homeDark: await toDataUri(path.join(SCREENS_DIR, 'home-dark.png')),
    homeLight: await toDataUri(path.join(SCREENS_DIR, 'home-light.png')),
    homeRu: await toDataUri(path.join(SCREENS_DIR, 'home-ru.png')),
    homeTj: await toDataUri(path.join(SCREENS_DIR, 'home-tj.png')),
    activity: await toDataUri(path.join(SCREENS_DIR, 'activity.png')),
    debts: await toDataUri(path.join(SCREENS_DIR, 'debts.png')),
    insights: await toDataUri(path.join(SCREENS_DIR, 'insights.png')),
    logo: await toDataUri(path.join(ROOT, 'docs', 'logo.png')),
  }

  const tempHtml = path.join(IG_DIR, '.reel2-renderer.html')
  await fs.writeFile(tempHtml, buildRendererHtml(assets), 'utf8')

  const browser = await chromium.launch({ headless: true })
  try {
    const context = await browser.newContext({
      viewport: { width: 1080, height: 1920 },
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()
    await page.goto(`file:///${tempHtml.replace(/\\/g, '/')}`, { waitUntil: 'networkidle' })
    await page.evaluate(() => window.preloadAll())

    console.log(`2/4 Rendering ${TOTAL_FRAMES} frames (24s @ ${FPS}fps, 1080x1920) & piping to FFmpeg...`)
    const ffmpegArgs = [
      '-y',
      '-f', 'image2pipe',
      '-vcodec', 'mjpeg',
      '-framerate', String(FPS),
      '-i', 'pipe:0',
      '-i', AUDIO_WAV,
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '17',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-movflags', '+faststart',
      '-shortest',
      OUT_MP4,
    ]

    const ff = spawn('ffmpeg', ffmpegArgs, { stdio: ['pipe', 'ignore', 'pipe'] })
    let ffErr = ''
    ff.stderr.on('data', (d) => { ffErr += d.toString() })
    const ffDone = new Promise((resolve, reject) => {
      ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`FFmpeg exited ${code}:\n${ffErr.slice(-800)}`))))
    })

    const BATCH = 15
    for (let start = 0; start < TOTAL_FRAMES; start += BATCH) {
      const times = []
      for (let f = start; f < Math.min(TOTAL_FRAMES, start + BATCH); f++) {
        times.push(f / FPS)
      }
      const b64List = await page.evaluate((ts) => window.renderBatchJpegs(ts), times)
      for (const b64 of b64List) {
        const buf = Buffer.from(b64, 'base64')
        if (!ff.stdin.write(buf)) {
          await new Promise((r) => ff.stdin.once('drain', r))
        }
      }
      if ((start / BATCH) % 8 === 0) {
        console.log(`   ... frame ${Math.min(TOTAL_FRAMES, start + BATCH)} / ${TOTAL_FRAMES}`)
      }
    }
    ff.stdin.end()
    await ffDone
    await fs.copyFile(OUT_MP4, OUT_PROD_MP4)
    console.log(`   ✓ Saved ${OUT_MP4}`)

    console.log('3/4 Rendering 8-frame keyframe proof sheet for Reel #2...')
    const keyTimes = [1.2, 2.6, 5.2, 8.9, 12.2, 15.6, 18.8, 22.2]
    const keyB64s = await page.evaluate((ts) => window.renderBatchJpegs(ts), keyTimes)

    const sheetPage = await browser.newPage({ viewport: { width: 1760, height: 1120 } })
    await sheetPage.setContent(`<!doctype html>
      <html>
      <body style="margin:0;padding:32px;background:#060a09;font-family:system-ui,sans-serif;color:#e2efec;">
        <div style="display:grid;grid-template-columns:repeat(8,1fr);gap:16px;">
          ${keyB64s
            .map(
              (b, i) => `
            <div style="display:flex;flex-direction:column;gap:8px;align-items:center;">
              <img src="data:image/jpeg;base64,${b}" style="width:100%;border-radius:12px;border:1px solid rgba(255,255,255,0.15);" />
              <span style="font-size:13px;color:#5eead4;font-weight:700;">t = ${keyTimes[i].toFixed(1)}s</span>
            </div>`,
            )
            .join('')}
        </div>
      </body>
      </html>`)
    await sheetPage.screenshot({ path: KEYFRAMES_PNG, fullPage: true })
    await context.close()
  } finally {
    await browser.close()
    await fs.unlink(tempHtml).catch(() => {})
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
