/**
 * High-Action VFX Renderer for Reel #3 ("Speedrun Your Money" · 140 BPM)
 * and Reel #4 ("Chaos vs. Control" · 128 BPM).
 *
 * Action VFX Engine includes:
 * - Camera Impact Shake & Beat Zoom Punches
 * - Radial Warp Speed Lines & Expanding Shockwave Rings
 * - Particle Burst Explosions & Laser Slice Trails
 * - Animated Tap Cursor Ripples & Targeting Reticles
 * - Live 28-Bar Audio Spectrum Visualizer & Beat-Synced CC Subtitles Bar
 *
 * Usage:
 *   node scripts/generate-promo-video-3-4.mjs
 */
import fs from 'node:fs/promises'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { chromium } from 'playwright'

const ROOT = process.cwd()
const IG_DIR = path.join(ROOT, 'marketing', 'instagram')
const SCREENS_DIR = path.join(IG_DIR, 'screens')
const PROD_DIR = path.join(ROOT, 'productions', 'wherediditgo-launch')

const FPS = 30
const DURATION = 24.0
const TOTAL_FRAMES = Math.round(FPS * DURATION) // 720 frames

async function toDataUri(filePath) {
  const buf = await fs.readFile(filePath)
  const ext = path.extname(filePath).toLowerCase()
  const mime = ext === '.svg' ? 'image/svg+xml' : 'image/png'
  return `data:${mime};base64,${buf.toString('base64')}`
}

function buildActionHtml(assets) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700&family=Outfit:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
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

    const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const prog = (t, t0, t1) => clamp((t - t0) / Math.max(0.0001, t1 - t0), 0, 1);
    const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
    const easeOutQuint = (x) => 1 - Math.pow(1 - x, 5);
    const easeInOutCubic = (x) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    const springPop = (x) => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      return 1 - Math.exp(-7.0 * x) * Math.cos(13.0 * x);
    };

    function roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
    }

    // --- Shared Action VFX Primitives ---

    function applyCameraAction(t, impactTimes, bpm) {
      const beat = 60.0 / bpm;
      const beatPhase = (t / beat) % 1.0;
      const beatZoom = t >= 1.7 ? Math.exp(-beatPhase * 6.5) * 0.014 : 0;

      let shakeX = 0;
      let shakeY = 0;
      let punchZoom = 0;

      for (const imp of impactTimes) {
        const dt = t - imp.t;
        if (dt >= 0 && dt < 0.45) {
          const decay = Math.exp(-dt * 13.0) * (imp.power || 1.0);
          shakeX += Math.sin(dt * 135.0) * 22.0 * decay;
          shakeY += Math.cos(dt * 112.0) * 18.0 * decay;
          punchZoom += 0.048 * decay;
        }
      }

      const totalScale = 1.0 + beatZoom + punchZoom;
      ctx.translate(W / 2 + shakeX, H / 2 + shakeY);
      ctx.scale(totalScale, totalScale);
      ctx.translate(-W / 2, -H / 2);
    }

    function drawWarpSpeedLines(t, intensity = 0.5, color = '#2dd4bf') {
      if (intensity <= 0.01) return;
      ctx.save();
      ctx.translate(W / 2, H * 0.54);
      const count = 36;
      for (let i = 0; i < count; i++) {
        const ang = (i / count) * Math.PI * 2 + (i % 3) * 0.11;
        const speed = 650 + (i * 173) % 550;
        const cycle = ((t * speed + i * 97) % 780);
        const r0 = 140 + cycle;
        const r1 = r0 + 85 + (i % 4) * 35;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * r0, Math.sin(ang) * r0);
        ctx.lineTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
        ctx.strokeStyle = i % 3 === 0 ? '#5eead4' : (i % 3 === 1 ? color : '#38bdf8');
        ctx.globalAlpha = intensity * clamp((cycle / 780) * (1 - cycle / 780) * 3.2, 0, 0.75);
        ctx.lineWidth = 2.5 + (i % 3);
        ctx.lineCap = 'round';
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawShockwaves(t, events) {
      ctx.save();
      for (const ev of events) {
        const dt = t - ev.t;
        if (dt > 0 && dt < 0.75) {
          const p = dt / 0.75;
          const r = 40 + easeOutCubic(p) * (ev.maxR || 640);
          ctx.beginPath();
          ctx.arc(ev.x ?? W / 2, ev.y ?? H * 0.55, r, 0, Math.PI * 2);
          ctx.strokeStyle = ev.color || '#2dd4bf';
          ctx.globalAlpha = (1 - p) * 0.85;
          ctx.lineWidth = (1 - p) * 18 + 2;
          ctx.stroke();

          // Particle burst sparks
          const sparks = 22;
          for (let s = 0; s < sparks; s++) {
            const a = (s / sparks) * Math.PI * 2 + ev.t;
            const sr = 30 + easeOutCubic(p) * ((ev.maxR || 540) * (0.65 + (s % 4) * 0.16));
            const sx = (ev.x ?? W / 2) + Math.cos(a) * sr;
            const sy = (ev.y ?? H * 0.55) + Math.sin(a) * sr;
            ctx.beginPath();
            ctx.arc(sx, sy, (1 - p) * 7.5, 0, Math.PI * 2);
            ctx.fillStyle = s % 2 === 0 ? '#5eead4' : '#fbbf24';
            ctx.fill();
          }
        }
      }
      ctx.restore();
    }

    function drawTapRipple(t, tapTime, x, y, label = '') {
      const dt = t - tapTime;
      if (dt < -0.15 || dt > 0.85) return;
      ctx.save();
      if (dt < 0) {
        // Incoming cursor reticle
        const p = 1 + dt / 0.15;
        const r = lerp(70, 26, p);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.strokeStyle = '#5eead4';
        ctx.lineWidth = 4;
        ctx.stroke();
      } else {
        const p = dt / 0.85;
        for (let k = 0; k < 2; k++) {
          const kp = clamp((p - k * 0.15) / 0.85);
          if (kp > 0) {
            ctx.beginPath();
            ctx.arc(x, y, 22 + easeOutCubic(kp) * 145, 0, Math.PI * 2);
            ctx.strokeStyle = '#2dd4bf';
            ctx.globalAlpha = (1 - kp) * 0.9;
            ctx.lineWidth = (1 - kp) * 10 + 2;
            ctx.stroke();
          }
        }
        ctx.globalAlpha = Math.max(0, 1 - p * 1.4);
        ctx.beginPath();
        ctx.arc(x, y, 24, 0, Math.PI * 2);
        ctx.fillStyle = '#5eead4';
        ctx.fill();

        if (label) {
          ctx.font = '800 22px "Outfit", sans-serif';
          ctx.fillStyle = '#04201d';
          ctx.textAlign = 'center';
          ctx.fillText(label, x, y + 8);
        }
      }
      ctx.restore();
    }

    function drawMusicVisualizerAndCC(t, bpm, captions) {
      const beat = 60.0 / bpm;
      const beatPulse = Math.exp(-((t / beat) % 1.0) * 4.5);

      ctx.save();
      // 1. Live 32-Bar Stereo Audio Equalizer at bottom edge (y = 1858)
      const bars = 32;
      const barW = 18;
      const gap = 10;
      const totalW = bars * barW + (bars - 1) * gap;
      const startX = (W - totalW) / 2;
      const baseY = 1882;

      for (let i = 0; i < bars; i++) {
        const centerDist = 1 - Math.abs(i - (bars - 1) / 2) / (bars / 2);
        const wave1 = Math.abs(Math.sin(t * 11.0 + i * 0.55));
        const wave2 = Math.abs(Math.cos(t * 17.5 - i * 0.35));
        const h = 10 + (wave1 * 0.55 + wave2 * 0.45 + beatPulse * 0.65) * 52 * (0.45 + 0.55 * centerDist);
        roundRect(ctx, startX + i * (barW + gap), baseY - h, barW, h, 5);
        ctx.fillStyle = i % 3 === 0 ? '#5eead4' : (i % 3 === 1 ? '#14b8a6' : '#38bdf8');
        ctx.globalAlpha = 0.72;
        ctx.fill();
      }

      // 2. Beat-Synced Kinetic Closed-Caption (CC) Bar at y = 1735
      const activeCap = captions.find((c) => t >= c.t0 && t < c.t1);
      if (activeCap) {
        const cp = springPop(prog(t, activeCap.t0, activeCap.t0 + 0.25));
        const words = activeCap.text.split(' ');
        const wordProg = prog(t, activeCap.t0, activeCap.t1 - 0.15);
        const activeWordIdx = Math.min(words.length - 1, Math.floor(wordProg * words.length));

        ctx.save();
        ctx.translate(W / 2, 1765);
        ctx.scale(0.92 + 0.08 * cp, 0.92 + 0.08 * cp);

        ctx.font = '800 32px "Outfit", sans-serif';
        const fullW = Math.min(940, ctx.measureText(activeCap.text).width + 135);
        roundRect(ctx, -fullW / 2, -44, fullW, 88, 44);
        ctx.fillStyle = 'rgba(7, 15, 14, 0.92)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(45, 212, 191, 0.68)';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // CC Badge on left inside pill
        roundRect(ctx, -fullW / 2 + 20, -22, 54, 44, 14);
        ctx.fillStyle = '#2dd4bf';
        ctx.fill();
        ctx.font = '900 20px "Outfit", sans-serif';
        ctx.fillStyle = '#04201d';
        ctx.textAlign = 'center';
        ctx.fillText('CC', -fullW / 2 + 47, 7);

        // Render words with active word highlighted in glowing mint/amber
        ctx.font = '800 30px "Outfit", sans-serif';
        ctx.textAlign = 'left';
        const textW = ctx.measureText(activeCap.text).width;
        let wx = -textW / 2 + 28;
        words.forEach((w, idx) => {
          const isCurrent = idx === activeWordIdx;
          const isPast = idx < activeWordIdx;
          ctx.fillStyle = isCurrent ? '#fbbf24' : (isPast ? '#5eead4' : '#f3f7f6');
          ctx.fillText(w, wx, 10);
          wx += ctx.measureText(w + ' ').width;
        });

        ctx.restore();
      }
      ctx.restore();
    }

    function drawPhone(imgKey, opts = {}) {
      const img = IMAGES[imgKey];
      if (!img) return;
      const {
        x = W / 2,
        y = 1120,
        w = 530,
        rot = 0,
        scale = 1,
        alpha = 1,
        bezel = 'obsidian',
        glow = 0.4,
        glowColor = '20, 184, 166',
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
        const g = ctx.createRadialGradient(0, 0, w * 0.12, 0, 0, w * 0.9);
        g.addColorStop(0, \`rgba(\${glowColor}, \${glow})\`);
        g.addColorStop(1, \`rgba(\${glowColor}, 0)\`);
        ctx.fillStyle = g;
        ctx.fillRect(-w, -h * 0.7, w * 2, h * 1.4);
      }

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.72)';
      ctx.shadowBlur = 70;
      ctx.shadowOffsetY = 32;
      roundRect(ctx, -w / 2, -h / 2, w, h, rOuter);
      const frameGrad = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
      if (bezel === 'silver') {
        frameGrad.addColorStop(0, '#ffffff');
        frameGrad.addColorStop(0.5, '#dfe5e3');
        frameGrad.addColorStop(1, '#b8c4c1');
      } else {
        frameGrad.addColorStop(0, '#2d3b38');
        frameGrad.addColorStop(0.5, '#121917');
        frameGrad.addColorStop(1, '#070b0a');
      }
      ctx.fillStyle = frameGrad;
      ctx.fill();
      ctx.restore();

      roundRect(ctx, -w / 2, -h / 2, w, h, rOuter);
      ctx.strokeStyle = bezel === 'silver' ? 'rgba(255,255,255,0.9)' : 'rgba(94, 234, 212, 0.35)';
      ctx.lineWidth = 2.4;
      ctx.stroke();

      ctx.save();
      roundRect(ctx, -w / 2 + pad, -h / 2 + pad, w - pad * 2, h - pad * 2, rInner);
      ctx.clip();
      ctx.drawImage(img, -w / 2 + pad, -h / 2 + pad, w - pad * 2, h - pad * 2);

      const sheen = ctx.createLinearGradient(-w / 2, -h / 2, w * 0.4, h * 0.25);
      sheen.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
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
        bg = 'rgba(13, 26, 24, 0.94)',
        border = 'rgba(45, 212, 191, 0.48)',
        alpha = 1,
        scale = 1,
      } = opts;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x + w / 2, y + h / 2);
      ctx.scale(scale, scale);
      ctx.translate(-(x + w / 2), -(y + h / 2));

      ctx.shadowColor = 'rgba(0, 0, 0, 0.58)';
      ctx.shadowBlur = 46;
      ctx.shadowOffsetY = 20;
      roundRect(ctx, x, y, w, h, r);
      ctx.fillStyle = bg;
      ctx.fill();

      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = border;
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.restore();
    }

    function drawActionStage(t, bpm, accentColor = '20, 184, 166') {
      const beat = 60.0 / bpm;
      const pulse = Math.exp(-((t / beat) % 1.0) * 5.0);

      ctx.fillStyle = '#030706';
      ctx.fillRect(-80, -80, W + 160, H + 160);

      const cx = W * 0.5 + Math.sin(t * 1.1) * 120;
      const cy = H * 0.52 + Math.cos(t * 0.9) * 90;
      const orb = ctx.createRadialGradient(cx, cy, 20, cx, cy, 760 + pulse * 120);
      orb.addColorStop(0, \`rgba(\${accentColor}, \${0.30 + pulse * 0.10})\`);
      orb.addColorStop(0.5, 'rgba(56, 189, 248, 0.11)');
      orb.addColorStop(1, 'rgba(3, 7, 6, 0)');
      ctx.fillStyle = orb;
      ctx.fillRect(0, 0, W, H);

      // Moving cyber perspective grid
      ctx.save();
      ctx.strokeStyle = 'rgba(94, 234, 212, 0.065)';
      ctx.lineWidth = 1;
      const gs = 90;
      const oy = (t * 55) % gs;
      for (let x = 0; x <= W; x += gs) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = -gs + oy; y <= H; y += gs) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawTopActionHeader(t, tag, bpm) {
      ctx.save();
      roundRect(ctx, 72, 76, 48, 48, 14);
      ctx.fillStyle = 'rgba(45, 212, 191, 0.18)';
      ctx.fill();
      ctx.strokeStyle = '#2dd4bf';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#5eead4';
      ctx.font = '900 24px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('W', 96, 101);

      ctx.fillStyle = '#f3f7f6';
      ctx.font = '800 28px "Outfit", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('WhereDidItGo', 136, 101);

      // Right action badge
      ctx.font = '800 17px "Outfit", sans-serif';
      const tw = ctx.measureText(tag).width + 40;
      const tx = W - 72 - tw;
      roundRect(ctx, tx, 80, tw, 40, 20);
      ctx.fillStyle = 'rgba(45, 212, 191, 0.18)';
      ctx.fill();
      ctx.strokeStyle = '#2dd4bf';
      ctx.stroke();
      ctx.fillStyle = '#5eead4';
      ctx.textAlign = 'center';
      ctx.fillText(tag, tx + tw / 2, 101);
      ctx.restore();
    }

    // ============================================================================
    // REEL #3: "SPEEDRUN YOUR MONEY" (140 BPM High-Action Synthwave / Future-Bass)
    // ============================================================================
    const REEL3_IMPACTS = [
      { t: 1.71, power: 1.35 },
      { t: 3.50, power: 0.95 },
      { t: 4.10, power: 0.75 },
      { t: 6.20, power: 1.10 },
      { t: 7.50, power: 0.95 },
      { t: 8.10, power: 0.70 },
      { t: 8.60, power: 0.75 },
      { t: 9.10, power: 0.85 },
      { t: 11.50, power: 1.00 },
      { t: 13.40, power: 1.05 },
      { t: 15.50, power: 1.00 },
      { t: 16.50, power: 1.00 },
      { t: 17.50, power: 1.00 },
      { t: 18.50, power: 1.00 },
      { t: 20.00, power: 1.35 },
    ];

    const REEL3_SHOCKWAVES = [
      { t: 1.71, x: 540, y: 1050, maxR: 720, color: '#2dd4bf' },
      { t: 6.20, x: 740, y: 950, maxR: 540, color: '#fbbf24' },
      { t: 9.65, x: 340, y: 1050, maxR: 540, color: '#2dd4bf' },
      { t: 13.40, x: 350, y: 1120, maxR: 560, color: '#38bdf8' },
      { t: 15.50, x: 540, y: 1120, maxR: 600, color: '#2dd4bf' },
      { t: 16.50, x: 540, y: 1120, maxR: 600, color: '#fbbf24' },
      { t: 17.50, x: 540, y: 1120, maxR: 600, color: '#a78bfa' },
      { t: 18.50, x: 540, y: 1120, maxR: 600, color: '#38bdf8' },
      { t: 20.00, x: 540, y: 650, maxR: 780, color: '#2dd4bf' },
    ];

    const REEL3_CAPTIONS = [
      { t0: 0.10, t1: 1.70, text: 'READY? 3... 2... 1... SPEEDRUN YOUR MONEY!' },
      { t0: 1.71, t1: 3.50, text: 'ZERO BANK LOGINS · 100% ON-DEVICE VAULT' },
      { t0: 3.50, t1: 7.50, text: 'TAP + · TYPE 13.50 + 4.80 · LOGGED IN 2.8 SECONDS!' },
      { t0: 7.50, t1: 11.50, text: 'SLICE ONE RECEIPT ACROSS THREE CLEAN BUDGETS' },
      { t0: 11.50, t1: 15.50, text: 'LASER OCR & BANK SMS PARSED LOCALLY IN 40MS' },
      { t0: 15.50, t1: 19.50, text: 'PAYDAY CYCLES · GOALS · 1-TAP BLUR · 3 LANGUAGES' },
      { t0: 19.50, t1: 23.90, text: 'FREE OFFLINE FOREVER · DOWNLOAD FROM LINK IN BIO!' },
    ];

    function renderReel3(t) {
      ctx.save();
      applyCameraAction(t, REEL3_IMPACTS, 140.0);
      drawActionStage(t, 140.0, '20, 184, 166');
      drawWarpSpeedLines(t, t >= 1.71 ? 0.65 : 0.25, '#2dd4bf');

      if (t < 3.5) {
        // ACT 1: Countdown -> Sonic Boom Collision
        drawTopActionHeader(t, '140 BPM SPEEDRUN', 140);
        const dropped = t >= 1.71;

        if (!dropped) {
          const num = t < 0.6 ? '3' : (t < 1.15 ? '2' : '1');
          const subT = (t % 0.55) / 0.55;
          const sc = 1.35 - easeOutCubic(subT) * 0.35;
          ctx.save();
          ctx.translate(W / 2, 860);
          ctx.scale(sc, sc);
          ctx.font = '900 320px "Outfit", sans-serif';
          ctx.fillStyle = '#2dd4bf';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(num, 0, 0);
          ctx.restore();

          ctx.font = '800 52px "Fraunces", Georgia, serif';
          ctx.fillStyle = '#f3f7f6';
          ctx.textAlign = 'center';
          ctx.fillText('How fast can you log an expense?', W / 2, 1180);
        } else {
          const p = springPop(prog(t, 1.71, 2.35));
          ctx.save();
          ctx.textAlign = 'center';
          ctx.font = '700 72px "Fraunces", Georgia, serif';
          ctx.fillStyle = '#f3f7f6';
          ctx.fillText('Faster than the', W / 2, 230);
          ctx.fillStyle = '#2dd4bf';
          ctx.fillText('receipt prints.', W / 2, 310);
          ctx.restore();

          // Two phones whipping in from opposite sides and colliding into place!
          drawPhone('insights', {
            x: lerp(1350, 740, p),
            y: 1150,
            w: 465,
            rot: lerp(32, 9, p),
            alpha: clamp(p * 1.4),
            glow: 0.45
          });
          drawPhone('homeDark', {
            x: lerp(-250, 360, p),
            y: 1120,
            w: 505,
            rot: lerp(-32, -5, p),
            alpha: clamp(p * 1.4),
            glow: 0.55
          });
        }
      } else if (t < 7.5) {
        // ACT 2: 2.8s QuickAdd Stopwatch Speedrun + Tap Ripple + Particle Victory
        const lt = t - 3.5;
        drawTopActionHeader(t, '2.8s QUICKADD', 140);

        // Giant Live Neon Stopwatch Badge top-right
        const timerVal = Math.min(2.80, Math.max(0, (t - 3.8) * 1.18));
        const done = timerVal >= 2.79;
        drawCard(630, 175, 378, 128, {
          r: 28,
          bg: done ? 'rgba(13, 52, 44, 0.96)' : 'rgba(18, 28, 26, 0.95)',
          border: done ? '#fbbf24' : '#2dd4bf',
          scale: done ? 1 + 0.08 * Math.exp(-(t - 6.18) * 10) : 1
        });
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = '800 17px "Outfit", sans-serif';
        ctx.fillStyle = done ? '#fbbf24' : '#5eead4';
        ctx.fillText(done ? '⚡ NEW PERSONAL BEST!' : '⏱ LIVE ENTRY TIMER', 819, 212);
        ctx.font = '900 58px "Outfit", sans-serif';
        ctx.fillStyle = '#f3f7f6';
        ctx.fillText(timerVal.toFixed(2) + 's', 819, 276);
        ctx.restore();

        ctx.save();
        ctx.textAlign = 'left';
        ctx.font = '700 62px "Fraunces", Georgia, serif';
        ctx.fillStyle = '#f3f7f6';
        ctx.fillText('Tap +. Type math.', 76, 235);
        ctx.fillStyle = '#2dd4bf';
        ctx.fillText('Done in 2.8s.', 76, 308);
        ctx.restore();

        const pPhone = springPop(prog(lt, 0.0, 0.55));
        drawPhone('quickadd', {
          x: 330,
          y: 1175,
          w: 495,
          rot: -2.5,
          scale: pPhone,
          glow: 0.45
        });

        // Live Math Speed Card
        const expr = '13.50 + 4.80';
        const tp = prog(t, 4.45, 5.85);
        const shown = expr.slice(0, Math.max(1, Math.floor(tp * expr.length)));
        const solved = t >= 6.18;

        drawCard(490, 740, 520, 390, {
          scale: springPop(prog(lt, 0.15, 0.7)) * (solved ? 1 + 0.09 * Math.exp(-(t - 6.18) * 11) : 1),
          bg: 'rgba(13, 28, 25, 0.96)',
          border: solved ? '#fbbf24' : '#2dd4bf'
        });

        ctx.save();
        ctx.textAlign = 'left';
        ctx.font = '800 20px "Outfit", sans-serif';
        ctx.fillStyle = solved ? '#fbbf24' : '#5eead4';
        ctx.fillText(solved ? '✓ LOGGED TO MAIN CHECKING' : 'INLINE MATH KEYPAD', 526, 800);

        ctx.font = '700 34px "Outfit", sans-serif';
        ctx.fillStyle = '#9eb3af';
        ctx.fillText(shown + (solved ? ' =' : ' _'), 526, 858);

        ctx.font = '900 84px "Outfit", sans-serif';
        ctx.fillStyle = solved ? '#2dd4bf' : '#f3f7f6';
        ctx.fillText(solved ? '$18.30' : '$' + shown, 526, 955);

        roundRect(ctx, 526, 1010, 310, 62, 31);
        ctx.fillStyle = solved ? 'rgba(251, 191, 36, 0.22)' : 'rgba(45, 212, 191, 0.18)';
        ctx.fill();
        ctx.strokeStyle = solved ? '#fbbf24' : '#2dd4bf';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.font = '800 24px "Outfit", sans-serif';
        ctx.fillStyle = solved ? '#fde68a' : '#5eead4';
        ctx.fillText('☕ Food & Drink · Coffee', 554, 1049);
        ctx.restore();

        drawTapRipple(t, 4.10, 330, 1060, '+');
        drawTapRipple(t, 6.15, 680, 1040, '✓');
      } else if (t < 11.5) {
        // ACT 3: Triple-Split Combo Action (3 Laser Slices at 8.1s, 8.6s, 9.1s!)
        const lt = t - 7.5;
        drawTopActionHeader(t, 'TRIPLE-SPLIT COMBO', 140);

        ctx.save();
        ctx.textAlign = 'left';
        ctx.font = '700 66px "Fraunces", Georgia, serif';
        ctx.fillStyle = '#f3f7f6';
        ctx.fillText('One Target run.', 76, 225);
        ctx.fillStyle = '#2dd4bf';
        ctx.fillText('3x Split Combo.', 76, 302);
        ctx.restore();

        drawPhone('quickaddSplit', {
          x: 755,
          y: 1185,
          w: 475,
          rot: 3.5,
          scale: springPop(prog(lt, 0.05, 0.65)),
          glow: 0.42
        });

        // 3 Flying Split Cards whipping in on 8.1s, 8.6s, 9.1s!
        const splits = [
          { t0: 8.05, title: '🛒 Groceries', amt: '$52.40', pct: '62%', col: '#2dd4bf', y: 610 },
          { t0: 8.55, title: '🏠 Home Goods', amt: '$19.20', pct: '23%', col: '#fbbf24', y: 845 },
          { t0: 9.05, title: '💊 Pharmacy', amt: '$13.00', pct: '15%', col: '#fb7185', y: 1080 },
        ];

        splits.forEach((sp, idx) => {
          const p = springPop(prog(t, sp.t0, sp.t0 + 0.55));
          if (p <= 0.01) return;
          const sx = lerp(-560, 68, p);
          drawCard(sx, sp.y, 520, 200, {
            bg: 'rgba(13, 27, 25, 0.96)',
            border: sp.col
          });

          ctx.save();
          ctx.textAlign = 'left';
          ctx.font = '800 30px "Outfit", sans-serif';
          ctx.fillStyle = '#f3f7f6';
          ctx.fillText(sp.title, sx + 34, sp.y + 62);

          ctx.textAlign = 'right';
          ctx.font = '900 42px "Outfit", sans-serif';
          ctx.fillStyle = sp.col;
          ctx.fillText(sp.amt, sx + 486, sp.y + 66);

          roundRect(ctx, sx + 34, sp.y + 115, 452, 22, 11);
          ctx.fillStyle = 'rgba(255,255,255,0.10)';
          ctx.fill();
          roundRect(ctx, sx + 34, sp.y + 115, 452 * parseFloat(sp.pct) / 100 * p, 22, 11);
          ctx.fillStyle = sp.col;
          ctx.fill();
          ctx.restore();

          // Glowing laser slash line right as card lands
          const dt = t - sp.t0;
          if (dt > 0 && dt < 0.25) {
            ctx.save();
            ctx.strokeStyle = '#ffffff';
            ctx.shadowColor = sp.col;
            ctx.shadowBlur = 30;
            ctx.lineWidth = (1 - dt / 0.25) * 14;
            ctx.beginPath();
            ctx.moveTo(40, sp.y + 100 - 40);
            ctx.lineTo(660, sp.y + 100 + 40);
            ctx.stroke();
            ctx.restore();
          }
        });

        // Combo Complete Banner at 9.65s
        if (t >= 9.60) {
          const cp = springPop(prog(t, 9.60, 10.15));
          drawCard(68, 1325, 520, 110, {
            r: 55,
            scale: cp,
            bg: 'rgba(16, 62, 54, 0.98)',
            border: '#fbbf24'
          });
          ctx.save();
          ctx.textAlign = 'center';
          ctx.font = '900 30px "Outfit", sans-serif';
          ctx.fillStyle = '#fde68a';
          ctx.fillText('⚡ $84.60 SPLIT · $0.00 REMAINDER ✓', 328, 1390);
          ctx.restore();
        }
      } else if (t < 15.5) {
        // ACT 4: Laser OCR & Bank SMS Target Lock
        const lt = t - 11.5;
        drawTopActionHeader(t, 'ON-DEVICE LASER OCR', 140);

        ctx.save();
        ctx.textAlign = 'left';
        ctx.font = '700 66px "Fraunces", Georgia, serif';
        ctx.fillStyle = '#f3f7f6';
        ctx.fillText('Snap a receipt.', 76, 225);
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('Or intercept SMS.', 76, 302);
        ctx.restore();

        drawPhone('quickadd', {
          x: 760,
          y: 1185,
          w: 475,
          rot: 3.0,
          scale: springPop(prog(lt, 0.05, 0.65)),
          glow: 0.42,
          glowColor: '56, 189, 248'
        });

        // Target-locked SMS Box
        const sx = 68;
        const sy = 560;
        const sw = 545;
        const sh = 310;
        drawCard(sx, sy, sw, sh, {
          bg: 'rgba(12, 24, 32, 0.96)',
          border: '#38bdf8'
        });

        ctx.save();
        ctx.font = '700 19px "Outfit", sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('🎯 TARGET LOCKED · RAW BANK SMS', sx + 34, sy + 54);

        ctx.font = '600 24px Consolas, monospace';
        ctx.fillStyle = '#e2efec';
        ctx.fillText('Alif Bank: Pokupka 78.50 TJS', sx + 34, sy + 124);
        ctx.fillText('v "Paykar Supermarket".', sx + 34, sy + 166);
        ctx.fillText('Balans: 3,450.00 TJS', sx + 34, sy + 208);

        // Dual High-Intensity Laser Scan Beams
        const scanY = sy + 40 + ((lt * 1.4) % 1.0) * (sh - 80);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.fillRect(sx + 10, scanY - 22, sw - 20, 44);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx + 10, scanY - 3, sw - 20, 6);
        ctx.restore();

        // Blasted Parsed Output Card at 13.4s
        if (t >= 12.8) {
          const pp = springPop(prog(t, 12.8, 13.45));
          drawCard(sx, 945, sw, 330, {
            scale: pp,
            bg: 'rgba(13, 45, 42, 0.98)',
            border: '#2dd4bf'
          });
          ctx.save();
          ctx.globalAlpha = pp;
          ctx.font = '800 20px "Outfit", sans-serif';
          ctx.fillStyle = '#5eead4';
          ctx.fillText('⚡ EXTRACTED ON-DEVICE · ZERO SERVER UPLOAD', sx + 34, 1005);
          ctx.font = '800 42px "Outfit", sans-serif';
          ctx.fillStyle = '#f3f7f6';
          ctx.fillText('Paykar Supermarket', sx + 34, 1074);
          ctx.font = '600 25px "Outfit", sans-serif';
          ctx.fillStyle = '#9eb3af';
          ctx.fillText('Food & Drink · Groceries', sx + 34, 1124);
          ctx.font = '900 62px "Outfit", sans-serif';
          ctx.fillStyle = '#2dd4bf';
          ctx.fillText('−78.50 TJS', sx + 34, 1218);
          ctx.restore();
        }
      } else if (t < 19.5) {
        // ACT 5: Rapid-Fire 4-Cut Superpower Montage (1.0s per cut!)
        const subIdx = Math.min(3, Math.floor(t - 15.5));
        const subT = (t - 15.5) - subIdx;
        const p = springPop(prog(subT, 0.0, 0.45));

        const specs = [
          {
            badge: '1/4 · PAYDAY CYCLES',
            h1: 'Start budgets on',
            h2: 'your 15th payday.',
            img: 'budgetsCycle',
            pill: '🗓 Cycle: Nov 15 – Dec 14 Active',
            col: '#2dd4bf',
          },
          {
            badge: '2/4 · SAVINGS GOALS',
            h1: 'Dedicated targets.',
            h2: '82% to Tokyo Flight.',
            img: 'goals',
            pill: '✈ $2,450 / $3,000 Saved',
            col: '#fbbf24',
          },
          {
            badge: '3/4 · PUBLIC PRIVACY',
            h1: 'One tap blurs every',
            h2: 'number in public.',
            img: 'homeBlur',
            pill: '👁 Spoiler Blur + Face ID & PIN',
            col: '#a78bfa',
          },
          {
            badge: '4/4 · TRILINGUAL',
            h1: 'English, Русский',
            h2: 'and Тоҷикӣ native.',
            img: 'homeRu',
            pill: '🌍 USD · EUR · RUB · TJS',
            col: '#38bdf8',
          },
        ];
        const cur = specs[subIdx];
        drawTopActionHeader(t, cur.badge, 140);

        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = '700 68px "Fraunces", Georgia, serif';
        ctx.fillStyle = '#f3f7f6';
        ctx.fillText(cur.h1, W / 2, 220);
        ctx.fillStyle = cur.col;
        ctx.fillText(cur.h2, W / 2, 298);
        ctx.restore();

        drawPhone(cur.img, {
          x: W / 2,
          y: 1185,
          w: 525,
          rot: (subIdx % 2 === 0 ? -3.5 : 3.5) * p,
          scale: 0.85 + 0.15 * p,
          glow: 0.55
        });

        drawCard(170, 520, 740, 102, {
          r: 51,
          scale: p,
          bg: 'rgba(11, 27, 25, 0.96)',
          border: cur.col
        });
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = '800 32px "Outfit", sans-serif';
        ctx.fillStyle = '#f3f7f6';
        ctx.fillText(cur.pill, W / 2, 582);
        ctx.restore();
      } else {
        // ACT 6 (19.5s - 24.0s): Grand Finale Drop & CTA
        const lt = t - 19.5;
        drawTopActionHeader(t, 'FREE OFFLINE FOREVER', 140);

        const cp = springPop(prog(lt, 0.05, 0.7));
        drawCard(72, 195, W - 144, 790, {
          r: 42,
          scale: cp,
          bg: 'rgba(11, 34, 30, 0.96)',
          border: '#2dd4bf'
        });

        ctx.save();
        ctx.globalAlpha = cp;
        if (IMAGES.logo) {
          ctx.save();
          roundRect(ctx, 128, 250, 130, 130, 32);
          ctx.clip();
          ctx.drawImage(IMAGES.logo, 128, 250, 130, 130);
          ctx.restore();
        }

        ctx.textAlign = 'left';
        ctx.font = '800 21px "Outfit", sans-serif';
        ctx.fillStyle = '#fbbf24';
        ctx.fillText('⚡ WHEREDIDITGO V1.1.6 · ANDROID & WEB', 286, 288);

        ctx.font = '700 54px "Fraunces", Georgia, serif';
        ctx.fillStyle = '#f3f7f6';
        ctx.fillText('Speedrun your', 286, 345);
        ctx.fillStyle = '#2dd4bf';
        ctx.fillText('financial clarity.', 286, 405);

        const perks = [
          '100% Free Offline Core Forever',
          '2.8s QuickAdd + Split + Laser OCR',
          'Zero Bank Logins · Zero Ads Ever',
          '14 MB Android APK & Web Vault',
        ];
        perks.forEach((pk, idx) => {
          const py = 490 + idx * 70;
          ctx.font = '800 30px "Outfit", sans-serif';
          ctx.fillStyle = '#2dd4bf';
          ctx.fillText('⚡', 136, py);
          ctx.fillStyle = '#e2efec';
          ctx.fillText(pk, 186, py);
        });

        const pulse = 1 + 0.03 * Math.sin(t * 9.0);
        ctx.save();
        ctx.translate(W / 2, 868);
        ctx.scale(pulse, pulse);
        roundRect(ctx, -420, -56, 840, 112, 56);
        ctx.fillStyle = '#2dd4bf';
        ctx.fill();
        ctx.textAlign = 'center';
        ctx.font = '900 36px "Outfit", sans-serif';
        ctx.fillStyle = '#04201d';
        ctx.fillText('DOWNLOAD FREE — LINK IN BIO →', 0, 12);
        ctx.restore();
        ctx.restore();

        const pPhones = springPop(prog(lt, 0.2, 0.85));
        drawPhone('homeLight', { x: 260, y: 1460, w: 410, rot: -6, scale: pPhones, bezel: 'silver' });
        drawPhone('insights', { x: 820, y: 1460, w: 410, rot: 6, scale: pPhones });
        drawPhone('homeDark', { x: 540, y: 1420, w: 450, rot: 0, scale: pPhones, glow: 0.55 });
      }

      drawShockwaves(t, REEL3_SHOCKWAVES);
      drawMusicVisualizerAndCC(t, 140.0, REEL3_CAPTIONS);
      ctx.restore();
    }


    // ============================================================================
    // REEL #4: "CHAOS VS. CONTROL" (128 BPM Melodic Electro-Bass Groove)
    // ============================================================================
    const REEL4_IMPACTS = [
      { t: 2.34, power: 1.45 },
      { t: 4.15, power: 0.85 },
      { t: 4.75, power: 0.85 },
      { t: 5.35, power: 0.90 },
      { t: 7.60, power: 1.00 },
      { t: 9.70, power: 1.25 },
      { t: 11.60, power: 1.00 },
      { t: 13.70, power: 1.15 },
      { t: 15.60, power: 1.00 },
      { t: 17.10, power: 0.95 },
      { t: 19.65, power: 1.40 },
    ];

    const REEL4_SHOCKWAVES = [
      { t: 2.34, x: 540, y: 1080, maxR: 820, color: '#2dd4bf' },
      { t: 4.25, x: 300, y: 780, maxR: 420, color: '#2dd4bf' },
      { t: 4.85, x: 780, y: 960, maxR: 420, color: '#38bdf8' },
      { t: 5.45, x: 320, y: 1160, maxR: 420, color: '#fbbf24' },
      { t: 9.70, x: 720, y: 920, maxR: 620, color: '#2dd4bf' },
      { t: 13.70, x: 540, y: 780, maxR: 640, color: '#fbbf24' },
      { t: 19.65, x: 540, y: 640, maxR: 820, color: '#2dd4bf' },
    ];

    const REEL4_CAPTIONS = [
      { t0: 0.10, t1: 2.33, text: 'TIRED OF MYSTERY CHARGES & BANK SYNC ERRORS?' },
      { t0: 2.34, t1: 3.60, text: 'SNAP EVERY DOLLAR INTO INSTANT LOCAL CONTROL!' },
      { t0: 3.60, t1: 7.60, text: 'CHECKING · SAVINGS · CASH — UNIFIED IN ONE VAULT' },
      { t0: 7.60, t1: 11.60, text: 'CRUSH DEBTS 4 MONTHS FASTER WITH SNOWBALL PLANNER' },
      { t0: 11.60, t1: 15.60, text: 'IGNITE YOUR 82-DAY STREAK ON THE 365-DAY HEATMAP' },
      { t0: 15.60, t1: 19.60, text: 'WORKS IN AIRPLANE MODE · LIGHT, DARK & OLED THEMES' },
      { t0: 19.60, t1: 23.90, text: '100% FREE OFFLINE CORE · TAP THE LINK IN BIO!' },
    ];

    const CHAOS_CARDS = [
      { text: '−$49.99 Forgotten Trial?!', col: '#fb7185', ang: 0.2, r: 340 },
      { text: '⚠ Bank Sync Disconnected', col: '#f59e0b', ang: 1.25, r: 390 },
      { text: '−$18.40 Late Night Delivery', col: '#fb7185', ang: 2.3, r: 310 },
      { text: 'Wait... who owes me $150?', col: '#f43f5e', ang: 3.4, r: 380 },
      { text: '−$84.60 Target Mystery Run', col: '#fb923c', ang: 4.5, r: 350 },
      { text: '⚠ Subscription Price Hike', col: '#fb7185', ang: 5.5, r: 370 },
    ];

    function renderReel4(t) {
      ctx.save();
      applyCameraAction(t, REEL4_IMPACTS, 128.0);
      const isChaos = t < 2.34;
      drawActionStage(t, 128.0, isChaos ? '225, 29, 72' : '20, 184, 166');
      drawWarpSpeedLines(t, isChaos ? 0.45 : 0.65, isChaos ? '#fb7185' : '#2dd4bf');

      if (t < 3.6) {
        // ACT 1: Swirling Expense Storm -> 2.34s Magnetic Snap Into Order!
        drawTopActionHeader(t, isChaos ? 'FINANCIAL CHAOS' : 'INSTANT CONTROL', 128);

        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = '700 70px "Fraunces", Georgia, serif';
        ctx.fillStyle = '#f3f7f6';
        ctx.fillText(isChaos ? 'Subscriptions. IOUs.' : 'Every dollar.', W / 2, 220);
        ctx.fillStyle = isChaos ? '#fb7185' : '#2dd4bf';
        ctx.fillText(isChaos ? 'Mystery charges.' : 'Under your control.', W / 2, 300);
        ctx.restore();

        if (isChaos) {
          // Swirling storm of red chaos cards accelerating toward center
          const pull = Math.pow(prog(t, 1.5, 2.34), 2.5);
          CHAOS_CARDS.forEach((cc, i) => {
            const a = cc.ang + t * (2.2 + i * 0.25);
            const rad = cc.r * (1 - pull * 0.88);
            const cx = W / 2 + Math.cos(a) * rad;
            const cy = 1060 + Math.sin(a) * rad * 1.15;

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(Math.sin(t * 5 + i) * 0.22);
            roundRect(ctx, -210, -44, 420, 88, 24);
            ctx.fillStyle = 'rgba(38, 12, 19, 0.92)';
            ctx.fill();
            ctx.strokeStyle = cc.col;
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.font = '800 25px "Outfit", sans-serif';
            ctx.fillStyle = '#ffe4e6';
            ctx.textAlign = 'center';
            ctx.fillText(cc.text, 0, 9);
            ctx.restore();
          });
        } else {
          // 2.34s Magnetic Slam: Sleek Home Phone locks dead-center!
          const p = springPop(prog(t, 2.34, 3.05));
          drawPhone('homeDark', {
            x: W / 2,
            y: 1140,
            w: 545,
            scale: 0.75 + 0.25 * p,
            glow: 0.65
          });
        }
      } else if (t < 7.6) {
        // ACT 2: Wallet Command Center (3 Orbiting 3D Wallet Cards with Energy Tethers)
        const lt = t - 3.6;
        drawTopActionHeader(t, 'MULTI-WALLET VAULT', 128);

        ctx.save();
        ctx.textAlign = 'left';
        ctx.font = '700 66px "Fraunces", Georgia, serif';
        ctx.fillStyle = '#f3f7f6';
        ctx.fillText('Three wallets.', 76, 220);
        ctx.fillStyle = '#2dd4bf';
        ctx.fillText('One crystal total.', 76, 298);
        ctx.restore();

        drawPhone('homeDark', {
          x: 540,
          y: 1210,
          w: 485,
          rot: Math.sin(t * 1.5) * 2.0,
          glow: 0.45
        });

        const wallets = [
          { t0: 4.15, name: '🏦 Main Checking', amt: '$9,840.50', col: '#2dd4bf', x: 64, y: 540 },
          { t0: 4.75, name: '🛡 Vault Savings', amt: '$5,200.00', col: '#38bdf8', x: 516, y: 740 },
          { t0: 5.35, name: '💵 Cash Wallet', amt: '$710.00', col: '#fbbf24', x: 64, y: 940 },
        ];

        wallets.forEach((w) => {
          const p = springPop(prog(t, w.t0, w.t0 + 0.55));
          if (p <= 0.01) return;

          // Glowing energy tether to phone center
          ctx.save();
          ctx.strokeStyle = w.col;
          ctx.globalAlpha = p * 0.55;
          ctx.lineWidth = 3;
          ctx.setLineDash([10, 10]);
          ctx.beginPath();
          ctx.moveTo(w.x + 245, w.y + 85);
          ctx.lineTo(540, 1050);
          ctx.stroke();
          ctx.restore();

          drawCard(w.x, w.y, 495, 165, {
            scale: p,
            alpha: p,
            bg: 'rgba(12, 26, 24, 0.96)',
            border: w.col
          });
          ctx.save();
          ctx.globalAlpha = p;
          ctx.textAlign = 'left';
          ctx.font = '700 24px "Outfit", sans-serif';
          ctx.fillStyle = '#cbd9d6';
          ctx.fillText(w.name, w.x + 32, w.y + 58);

          ctx.font = '900 54px "Outfit", sans-serif';
          ctx.fillStyle = w.col;
          ctx.fillText(w.amt, w.x + 32, w.y + 126);
          ctx.restore();
        });
      } else if (t < 11.6) {
        // ACT 3: Crush Your Debts (Snowball Rocket Acceleration!)
        const lt = t - 7.6;
        drawTopActionHeader(t, 'SNOWBALL PAYOFF', 128);

        ctx.save();
        ctx.textAlign = 'left';
        ctx.font = '700 66px "Fraunces", Georgia, serif';
        ctx.fillStyle = '#f3f7f6';
        ctx.fillText('Crush your debts', 76, 220);
        ctx.fillStyle = '#fbbf24';
        ctx.fillText('4 months faster.', 76, 298);
        ctx.restore();

        drawPhone('debts', {
          x: 325,
          y: 1215,
          w: 485,
          rot: -3.0,
          scale: springPop(prog(lt, 0.05, 0.65)),
          glow: 0.38
        });

        const rocketP = easeOutQuint(prog(t, 8.10, 9.70));
        const hit = t >= 9.68;
        drawCard(475, 650, 535, 520, {
          scale: springPop(prog(lt, 0.15, 0.75)) * (hit ? 1 + 0.08 * Math.exp(-(t - 9.68) * 10) : 1),
          bg: 'rgba(13, 27, 25, 0.97)',
          border: hit ? '#2dd4bf' : '#fbbf24'
        });

        ctx.save();
        ctx.textAlign = 'left';
        ctx.font = '800 19px "Outfit", sans-serif';
        ctx.fillStyle = hit ? '#5eead4' : '#fbbf24';
        ctx.fillText('🚀 LIVE SNOWBALL PAYOFF ACCELERATOR', 512, 712);

        const moAmt = Math.round(lerp(30, 95, rocketP));
        ctx.font = '800 58px "Outfit", sans-serif';
        ctx.fillStyle = '#f3f7f6';
        ctx.fillText(\`$\${moAmt} / month\`, 512, 790);

        // Rocket Bar
        roundRect(ctx, 512, 835, 460, 26, 13);
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fill();
        roundRect(ctx, 512, 835, 460 * rocketP, 26, 13);
        ctx.fillStyle = hit ? '#2dd4bf' : '#fbbf24';
        ctx.fill();

        roundRect(ctx, 512, 910, 460, 210, 26);
        ctx.fillStyle = hit ? 'rgba(45, 212, 191, 0.18)' : 'rgba(251, 191, 36, 0.12)';
        ctx.fill();

        ctx.font = '700 22px "Outfit", sans-serif';
        ctx.fillStyle = '#cbd9d6';
        ctx.fillText('PROJECTED DEBT-FREE DATE:', 542, 965);

        ctx.font = '900 56px "Outfit", sans-serif';
        ctx.fillStyle = hit ? '#2dd4bf' : '#fbbf24';
        ctx.fillText(hit ? 'JAN 2027 ✓' : (rocketP > 0.5 ? 'MAR 2027' : 'MAY 2027'), 542, 1040);

        ctx.font = '700 23px "Outfit", sans-serif';
        ctx.fillStyle = '#e2efec';
        ctx.fillText('Alex Rivera ($150) + Samir K. ($75)', 542, 1092);
        ctx.restore();
      } else if (t < 15.6) {
        // ACT 4: 365-Day Streak Equalizer Ignition + 82-Day Flame Boom (13.7s)
        const lt = t - 11.6;
        drawTopActionHeader(t, '82-DAY STREAK 🔥', 128);

        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = '700 68px "Fraunces", Georgia, serif';
        ctx.fillStyle = '#f3f7f6';
        ctx.fillText('Turn consistency', W / 2, 215);
        ctx.fillStyle = '#fbbf24';
        ctx.fillText('into a superpower.', W / 2, 292);
        ctx.restore();

        drawPhone('activity', {
          x: 540,
          y: 1385,
          w: 525,
          scale: springPop(prog(lt, 0.05, 0.65)),
          glow: 0.48
        });

        // Glowing Equalizer Heatmap Matrix + 82-Day Streak Crown at 13.7s
        const boom = t >= 13.68;
        drawCard(68, 495, W - 136, 390, {
          scale: boom ? 1 + 0.07 * Math.exp(-(t - 13.68) * 10) : 1,
          bg: 'rgba(12, 26, 24, 0.96)',
          border: boom ? '#fbbf24' : '#2dd4bf'
        });

        ctx.save();
        ctx.textAlign = 'left';
        ctx.font = '900 40px "Outfit", sans-serif';
        ctx.fillStyle = boom ? '#fbbf24' : '#f3f7f6';
        ctx.fillText('🔥 82-DAY LOGGING STREAK!', 110, 568);

        const cols = 16;
        const rows = 5;
        const cs = 40;
        const cg = 11;
        const gx = 128;
        const gy = 615;
        const colProg = prog(lt, 0.15, 1.95) * cols;

        for (let c = 0; c < cols; c++) {
          for (let r = 0; r < rows; r++) {
            const lit = c <= colProg;
            roundRect(ctx, gx + c * (cs + cg), gy + r * (cs + cg), cs, cs, 9);
            if (!lit) {
              ctx.fillStyle = 'rgba(255,255,255,0.08)';
            } else {
              const palette = ['#0d7a6d', '#14b8a6', '#2dd4bf', '#fbbf24'];
              ctx.fillStyle = palette[(c * 3 + r * 5) % (boom ? 4 : 3)];
            }
            ctx.fill();
          }
        }
        ctx.restore();
      } else if (t < 19.6) {
        // ACT 5: Airplane Mode Flyby + Triple Theme Showcase (Light · Dark · Privacy Blur)
        const lt = t - 15.6;
        drawTopActionHeader(t, '✈ AIRPLANE MODE READY', 128);

        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = '700 66px "Fraunces", Georgia, serif';
        ctx.fillStyle = '#f3f7f6';
        ctx.fillText('Works at 35,000 feet.', W / 2, 215);
        ctx.fillStyle = '#2dd4bf';
        ctx.fillText('In any theme or language.', W / 2, 292);
        ctx.restore();

        // Flying Airplane Mode Banner
        const pBanner = springPop(prog(lt, 0.05, 0.65));
        drawCard(140, 495, 800, 96, {
          r: 48,
          scale: pBanner,
          bg: 'rgba(13, 45, 40, 0.96)',
          border: '#2dd4bf'
        });
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = '800 30px "Outfit", sans-serif';
        ctx.fillStyle = '#5eead4';
        ctx.fillText('✈ AIRPLANE MODE ON · 100% LOCAL INDEXEDDB', W / 2, 553);
        ctx.restore();

        // 3 Phones: Light Silver (left), Dark Obsidian (center), Privacy Blurred (right)
        const p1 = springPop(prog(lt, 0.1, 0.7));
        const p2 = springPop(prog(lt, 0.3, 0.9));
        const p3 = springPop(prog(lt, 0.5, 1.1));

        drawPhone('homeLight', { x: 225, y: 1255, w: 410, rot: -8, scale: p1, bezel: 'silver' });
        drawPhone('homeBlur', { x: 855, y: 1255, w: 410, rot: 8, scale: p3 });
        drawPhone('homeDark', { x: 540, y: 1190, w: 465, rot: 0, scale: p2, glow: 0.55 });
      } else {
        // ACT 6 (19.6s - 24.0s): Stadium Finale Drop & CTA
        const lt = t - 19.6;
        drawTopActionHeader(t, 'GET WHEREDIDITGO FREE', 128);

        const cp = springPop(prog(lt, 0.05, 0.7));
        drawCard(72, 195, W - 144, 790, {
          r: 42,
          scale: cp,
          bg: 'rgba(11, 34, 30, 0.97)',
          border: '#fbbf24'
        });

        ctx.save();
        ctx.globalAlpha = cp;
        if (IMAGES.logo) {
          ctx.save();
          roundRect(ctx, 128, 250, 130, 130, 32);
          ctx.clip();
          ctx.drawImage(IMAGES.logo, 128, 250, 130, 130);
          ctx.restore();
        }

        ctx.textAlign = 'left';
        ctx.font = '800 21px "Outfit", sans-serif';
        ctx.fillStyle = '#fbbf24';
        ctx.fillText('🔥 WHEREDIDITGO · ZERO-CLOUD PRIVACY', 286, 288);

        ctx.font = '700 54px "Fraunces", Georgia, serif';
        ctx.fillStyle = '#f3f7f6';
        ctx.fillText('Turn money chaos', 286, 345);
        ctx.fillStyle = '#2dd4bf';
        ctx.fillText('into total control.', 286, 405);

        const perks = [
          'Multi-Wallet Balances & Payday Cycles',
          'Snowball Debt Planner & Savings Goals',
          '365-Day Heatmap + Receipt OCR',
          '100% Free Offline Core · No Ads',
        ];
        perks.forEach((pk, idx) => {
          const py = 490 + idx * 70;
          ctx.font = '800 30px "Outfit", sans-serif';
          ctx.fillStyle = '#fbbf24';
          ctx.fillText('★', 136, py);
          ctx.fillStyle = '#e2efec';
          ctx.fillText(pk, 186, py);
        });

        const pulse = 1 + 0.03 * Math.sin(t * 8.5);
        ctx.save();
        ctx.translate(W / 2, 868);
        ctx.scale(pulse, pulse);
        roundRect(ctx, -420, -56, 840, 112, 56);
        const g = ctx.createLinearGradient(-420, 0, 420, 0);
        g.addColorStop(0, '#2dd4bf');
        g.addColorStop(1, '#fbbf24');
        ctx.fillStyle = g;
        ctx.fill();
        ctx.textAlign = 'center';
        ctx.font = '900 36px "Outfit", sans-serif';
        ctx.fillStyle = '#04201d';
        ctx.fillText('GET WHEREDIDITGO FREE — LINK IN BIO →', 0, 12);
        ctx.restore();
        ctx.restore();

        const pPhones = springPop(prog(lt, 0.2, 0.85));
        drawPhone('debts', { x: 250, y: 1460, w: 410, rot: -6, scale: pPhones });
        drawPhone('activity', { x: 830, y: 1460, w: 410, rot: 6, scale: pPhones });
        drawPhone('homeDark', { x: 540, y: 1420, w: 450, rot: 0, scale: pPhones, glow: 0.55 });
      }

      drawShockwaves(t, REEL4_SHOCKWAVES);
      drawMusicVisualizerAndCC(t, 128.0, REEL4_CAPTIONS);
      ctx.restore();
    }

    window.renderReelBatch = (reelNum, times) => {
      return times.map((t) => {
        ctx.clearRect(0, 0, W, H);
        if (reelNum === 3) renderReel3(t);
        else renderReel4(t);
        return canvas.toDataURL('image/jpeg', 0.96).split(',')[1];
      });
    };
  </script>
</body>
</html>`
}

async function renderOneReel(browser, page, reelNum, audioWav, outMp4, prodMp4, keyframesPng, keyTimes) {
  console.log(`\n▶ Rendering Reel #${reelNum} (${TOTAL_FRAMES} frames @ ${FPS}fps, 1080x1920)...`)
  const ffmpegArgs = [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'mjpeg',
    '-framerate', String(FPS),
    '-i', 'pipe:0',
    '-i', audioWav,
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '17',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-movflags', '+faststart',
    '-shortest',
    outMp4,
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
    const b64List = await page.evaluate(
      ({ rNum, ts }) => window.renderReelBatch(rNum, ts),
      { rNum: reelNum, ts: times },
    )
    for (const b64 of b64List) {
      const buf = Buffer.from(b64, 'base64')
      if (!ff.stdin.write(buf)) {
        await new Promise((r) => ff.stdin.once('drain', r))
      }
    }
    if ((start / BATCH) % 8 === 0) {
      console.log(`   ... Reel #${reelNum} frame ${Math.min(TOTAL_FRAMES, start + BATCH)} / ${TOTAL_FRAMES}`)
    }
  }
  ff.stdin.end()
  await ffDone
  await fs.copyFile(outMp4, prodMp4)
  console.log(`   ✓ Saved ${outMp4}`)

  const keyB64s = await page.evaluate(
    ({ rNum, ts }) => window.renderReelBatch(rNum, ts),
    { rNum: reelNum, ts: keyTimes },
  )
  const sheetPage = await browser.newPage({ viewport: { width: 1760, height: 1120 } })
  await sheetPage.setContent(`<!doctype html>
    <html>
    <body style="margin:0;padding:32px;background:#050807;font-family:system-ui,sans-serif;color:#e2efec;">
      <div style="display:grid;grid-template-columns:repeat(${keyTimes.length},1fr);gap:16px;">
        ${keyB64s
          .map(
            (b, i) => `
          <div style="display:flex;flex-direction:column;gap:8px;align-items:center;">
            <img src="data:image/jpeg;base64,${b}" style="width:100%;border-radius:12px;border:1px solid rgba(255,255,255,0.16);" />
            <span style="font-size:13px;color:#5eead4;font-weight:700;">t = ${keyTimes[i].toFixed(1)}s</span>
          </div>`,
          )
          .join('')}
      </div>
    </body>
    </html>`)
  await sheetPage.screenshot({ path: keyframesPng, fullPage: true })
  await sheetPage.close()
}

async function main() {
  console.log('Loading retina screen assets for Reels #3 and #4...')
  const assets = {
    homeDark: await toDataUri(path.join(SCREENS_DIR, 'home-dark.png')),
    homeLight: await toDataUri(path.join(SCREENS_DIR, 'home-light.png')),
    homeBlur: await toDataUri(path.join(SCREENS_DIR, 'home-blur.png')),
    homeRu: await toDataUri(path.join(SCREENS_DIR, 'home-ru.png')),
    quickadd: await toDataUri(path.join(SCREENS_DIR, 'quickadd.png')),
    quickaddSplit: await toDataUri(path.join(SCREENS_DIR, 'quickadd-split.png')),
    budgetsCycle: await toDataUri(path.join(SCREENS_DIR, 'budgets-cycle.png')),
    goals: await toDataUri(path.join(SCREENS_DIR, 'goals.png')),
    activity: await toDataUri(path.join(SCREENS_DIR, 'activity.png')),
    debts: await toDataUri(path.join(SCREENS_DIR, 'debts.png')),
    insights: await toDataUri(path.join(SCREENS_DIR, 'insights.png')),
    logo: await toDataUri(path.join(ROOT, 'docs', 'logo.png')),
  }

  const tempHtml = path.join(IG_DIR, '.reels-3-4-renderer.html')
  await fs.writeFile(tempHtml, buildActionHtml(assets), 'utf8')

  const browser = await chromium.launch({ headless: true })
  try {
    const context = await browser.newContext({
      viewport: { width: 1080, height: 1920 },
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()
    await page.goto(`file:///${tempHtml.replace(/\\/g, '/')}`, { waitUntil: 'networkidle' })
    await page.evaluate(() => window.preloadAll())

    await renderOneReel(
      browser,
      page,
      3,
      path.join(PROD_DIR, 'audio', 'soundtrack-reel3.wav'),
      path.join(IG_DIR, 'wherediditgo-reel-3-9x16.mp4'),
      path.join(PROD_DIR, 'wherediditgo-reel-3.mp4'),
      path.join(IG_DIR, 'reel-3-keyframes.png'),
      [0.8, 2.3, 6.4, 9.8, 13.6, 16.0, 18.0, 21.5],
    )

    await renderOneReel(
      browser,
      page,
      4,
      path.join(PROD_DIR, 'audio', 'soundtrack-reel4.wav'),
      path.join(IG_DIR, 'wherediditgo-reel-4-9x16.mp4'),
      path.join(PROD_DIR, 'wherediditgo-reel-4.mp4'),
      path.join(IG_DIR, 'reel-4-keyframes.png'),
      [1.4, 2.8, 5.8, 9.9, 14.0, 16.8, 18.5, 21.8],
    )

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
