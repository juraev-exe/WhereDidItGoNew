/**
 * Generates the full 30-second high-conversion modern promo video (1080x1920 Reel)
 * with animated device mockups, kinetic typography, dynamic VFX (particles, light sweeps,
 * camera zoom/tilt, screen shake, frosted blur), and muxes the custom synthesized
 * stereo electronic soundtrack + SFX into a production MP4.
 *
 * Usage:
 *   node scripts/generate-promo-video.mjs
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const ROOT = process.cwd()
const PROD_DIR = path.join(ROOT, 'productions', 'wherediditgo-launch')
const AUDIO_PATH = path.join(PROD_DIR, 'audio', 'soundtrack.wav')
const OUTPUT_MP4 = path.join(PROD_DIR, 'wherediditgo-launch-reel.mp4')
const MARKETING_MP4 = path.join(ROOT, 'marketing', 'wherediditgo-promo-reel-1080x1920.mp4')

async function toDataUri(filePath) {
  const buf = await fs.readFile(filePath)
  const ext = path.extname(filePath).toLowerCase()
  const mime = ext === '.svg' ? 'image/svg+xml' : 'image/png'
  return `data:${mime};base64,${buf.toString('base64')}`
}

function buildPlayerHtml(assets) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>WhereDidItGo — 30s Launch Reel Canvas</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700;9..144,900&family=Outfit:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #050706;
      color: #fff;
      font-family: 'Outfit', sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      overflow: hidden;
    }
    #c {
      width: 450px;
      height: 800px;
      box-shadow: 0 30px 80px rgba(0,0,0,0.8), 0 0 40px rgba(45,212,191,0.15);
      border-radius: 24px;
      display: block;
      background: #000;
    }
    .controls {
      display: flex;
      gap: 16px;
      margin-top: 16px;
      align-items: center;
    }
    button {
      background: #2dd4bf;
      color: #061e1b;
      font-weight: 700;
      border: 0;
      padding: 10px 20px;
      border-radius: 999px;
      cursor: pointer;
      font-size: 14px;
    }
    .time { font-family: monospace; font-size: 14px; color: #9eb3af; }
  </style>
</head>
<body>
  <canvas id="c" width="1080" height="1920"></canvas>
  <div class="controls">
    <button id="playBtn" onclick="togglePlay()">Play / Pause</button>
    <span class="time" id="timeDisplay">0.00 / 30.00s</span>
  </div>
  <audio id="bgAudio" src="${assets.soundtrackUri}" preload="auto"></audio>

  <script>
    const canvas = document.getElementById('c');
    const ctx = canvas.getContext('2d');
    const audio = document.getElementById('bgAudio');
    const timeDisplay = document.getElementById('timeDisplay');
    const playBtn = document.getElementById('playBtn');

    // Load assets
    const images = {};
    const assetSources = {
      homeDark: "${assets.homeDark}",
      quickadd: "${assets.quickadd}",
      quickaddSplit: "${assets.quickaddSplit}",
      activity: "${assets.activity}",
      budgetsCycle: "${assets.budgetsCycle}",
      goals: "${assets.goals}",
      debts: "${assets.debts}",
      insights: "${assets.insights}",
      homeBlur: "${assets.homeBlur}",
      security: "${assets.security}",
      logo: "${assets.logo}"
    };

    let assetsLoaded = false;
    let loadedCount = 0;
    const totalAssets = Object.keys(assetSources).length;

    for (const [k, src] of Object.entries(assetSources)) {
      const img = new Image();
      img.onload = () => {
        loadedCount++;
        if (loadedCount >= totalAssets) {
          assetsLoaded = true;
          window.assetsReady = true;
          renderFrame(0);
        }
      };
      img.src = src;
      images[k] = img;
    }

    // Mathematical Easing Helpers
    const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
    const easeInOutCubic = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const easeOutBack = (t, s = 1.70158) => {
      const p = t - 1;
      return p * p * ((s + 1) * p + s) + 1;
    };
    const clamp = (v, lo, hi) => Math.max(lo, min(hi, v));
    const min = Math.min;
    const max = Math.max;

    // Ambient floating particles
    const particles = [];
    for (let i = 0; i < 48; i++) {
      particles.push({
        x: Math.random() * 1080,
        y: Math.random() * 1920,
        size: 2 + Math.random() * 4.5,
        speed: 0.35 + Math.random() * 0.75,
        drift: (Math.random() - 0.5) * 0.4,
        alpha: 0.2 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2
      });
    }

    function drawParticles(t) {
      ctx.save();
      for (const p of particles) {
        const py = (p.y - t * 45 * p.speed) % 1920;
        const actualY = py < 0 ? py + 1920 : py;
        const actualX = p.x + Math.sin(t * 1.5 + p.phase) * 35;
        const a = p.alpha * (0.6 + 0.4 * Math.sin(t * 2.5 + p.phase));

        ctx.fillStyle = \`rgba(45, 212, 191, \${a})\`;
        ctx.beginPath();
        ctx.arc(actualX, actualY, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Dynamic background with beat-synced breathing glow
    function drawBackground(t) {
      const beat = (t * (124 / 60)) % 1;
      const kickPulse = Math.exp(-beat * 4.5) * 0.12;

      ctx.fillStyle = '#060a09';
      ctx.fillRect(0, 0, 1080, 1920);

      // Radial teal glow at center/bottom
      const radGrad = ctx.createRadialGradient(
        540, 1100 + Math.sin(t * 0.8) * 60,
        80,
        540, 1100,
        850 + kickPulse * 280
      );
      radGrad.addColorStop(0, \`rgba(20, 184, 166, \${0.28 + kickPulse})\`);
      radGrad.addColorStop(0.5, \`rgba(13, 110, 99, \${0.14 + kickPulse * 0.5})\`);
      radGrad.addColorStop(1, 'rgba(6, 10, 9, 0)');

      ctx.fillStyle = radGrad;
      ctx.fillRect(0, 0, 1080, 1920);

      // Top subtle cyan bloom
      const topGrad = ctx.createRadialGradient(880, 200, 40, 880, 200, 650);
      topGrad.addColorStop(0, 'rgba(45, 212, 191, 0.15)');
      topGrad.addColorStop(1, 'rgba(6, 10, 9, 0)');
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, 1080, 1920);

      // Subtle architectural grid
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
      ctx.lineWidth = 1;
      const gridSize = 100;
      for (let x = 0; x <= 1080; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 1920);
        ctx.stroke();
      }
      for (let y = 0; y <= 1920; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1080, y);
        ctx.stroke();
      }
      ctx.restore();

      drawParticles(t);
    }

    // Top progress bar and brand badge
    function drawTopBar(t, activeTag) {
      // Top progress line
      const progress = clamp(t / 30.0, 0, 1);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(0, 0, 1080, 6);
      ctx.fillStyle = '#2dd4bf';
      ctx.fillRect(0, 0, 1080 * progress, 6);

      // Brand pill header
      ctx.save();
      const headerY = 70;
      
      // Left: Logo & Name
      ctx.fillStyle = 'rgba(20, 31, 29, 0.85)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1.5;
      
      ctx.beginPath();
      ctx.roundRect(70, headerY, 260, 52, 999);
      ctx.fill();
      ctx.stroke();

      if (images.logo) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(76, headerY + 6, 40, 40, 10);
        ctx.clip();
        ctx.drawImage(images.logo, 76, headerY + 6, 40, 40);
        ctx.restore();
      }

      ctx.fillStyle = '#f3f7f6';
      ctx.font = '700 22px Outfit, sans-serif';
      ctx.fillText('WhereDidItGo', 128, headerY + 34);

      // Right: Active Tag
      if (activeTag) {
        ctx.font = '700 15px Outfit, sans-serif';
        const tagWidth = ctx.measureText(activeTag.toUpperCase()).width + 36;
        const tagX = 1010 - tagWidth;

        ctx.fillStyle = 'rgba(45, 212, 191, 0.12)';
        ctx.strokeStyle = 'rgba(45, 212, 191, 0.38)';
        ctx.beginPath();
        ctx.roundRect(tagX, headerY, tagWidth, 52, 999);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#5eead4';
        ctx.fillText(activeTag.toUpperCase(), tagX + 18, headerY + 33);
      }

      ctx.restore();
    }

    // Concentric Device Mockup Drawer
    function drawPhone(img, x, y, width, rotDeg = 0, scale = 1.0, shadowAlpha = 0.55) {
      if (!img) return;
      const height = width * (844 / 390);

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((rotDeg * Math.PI) / 180);
      ctx.scale(scale, scale);

      // Ambient drop shadow
      ctx.shadowColor = \`rgba(0, 0, 0, \${shadowAlpha})\`;
      ctx.shadowBlur = 65;
      ctx.shadowOffsetY = 38;

      // Phone outer chassis: r_outer = 56, pad = 12, r_inner = 44
      const rOuter = 56;
      const pad = 12;
      const rInner = 44;

      ctx.fillStyle = '#17201e';
      ctx.beginPath();
      ctx.roundRect(-width / 2, -height / 2, width, height, rOuter);
      ctx.fill();

      // Reset shadow for inner elements
      ctx.shadowColor = 'transparent';

      // Chassis metallic border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Screen container
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(-width / 2 + pad, -height / 2 + pad, width - pad * 2, height - pad * 2, rInner);
      ctx.clip();

      ctx.drawImage(img, -width / 2 + pad, -height / 2 + pad, width - pad * 2, height - pad * 2);

      // Glass reflection diagonal sweep
      const glassGrad = ctx.createLinearGradient(
        -width / 2, -height / 2,
        width / 2, height / 2
      );
      glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
      glassGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.03)');
      glassGrad.addColorStop(0.36, 'rgba(255, 255, 255, 0.0)');
      glassGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
      ctx.fillStyle = glassGrad;
      ctx.fillRect(-width / 2, -height / 2, width, height);

      ctx.restore();

      // Top speaker grill
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.beginPath();
      ctx.roundRect(-42, -height / 2 + 18, 84, 8, 99);
      ctx.fill();

      ctx.restore();
    }

    // Floating Glass Card
    function drawCard(x, y, w, h, drawContent, borderTint = 'rgba(255,255,255,0.12)', bgTint = 'rgba(18, 29, 27, 0.88)') {
      ctx.save();
      ctx.translate(x, y);

      ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 22;

      ctx.fillStyle = bgTint;
      ctx.strokeStyle = borderTint;
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 28);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.stroke();

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 28);
      ctx.clip();

      drawContent(w, h);

      ctx.restore();
      ctx.restore();
    }

    // Screen Shake Offset
    function getShake(t, hitTime, duration = 0.35, magnitude = 18) {
      if (t < hitTime || t > hitTime + duration) return { x: 0, y: 0 };
      const decay = 1 - (t - hitTime) / duration;
      const angle = (t - hitTime) * 65;
      return {
        x: Math.sin(angle) * magnitude * decay,
        y: Math.cos(angle * 1.3) * magnitude * decay
      };
    }

    // Main Master Render Frame
    window.renderFrame = function(t) {
      if (!assetsLoaded) return;

      // 1. Screen Shake from major SFX drops
      const shake1 = getShake(t, 2.75, 0.45, 18);  // Vault Lock
      const shake2 = getShake(t, 22.5, 0.5, 24);   // Privacy Blur Drop
      const totalShake = { x: shake1.x + shake2.x, y: shake1.y + shake2.y };

      ctx.save();
      ctx.translate(totalShake.x, totalShake.y);

      // Draw standard dynamic background
      drawBackground(t);

      // ----------------------------------------------------
      // ACT 1: THE HOOK & VAULT LOCK (0.0s – 3.5s)
      // ----------------------------------------------------
      if (t >= 0.0 && t < 3.5) {
        drawTopBar(t, 'Local-First Privacy');

        // Staggered Headline reveal
        const p1 = clamp(t / 0.8, 0, 1);
        const p2 = clamp((t - 0.5) / 0.8, 0, 1);
        const p3 = clamp((t - 1.1) / 0.8, 0, 1);

        ctx.textAlign = 'center';
        
        ctx.save();
        ctx.font = '700 68px Fraunces, Georgia, serif';
        ctx.letterSpacing = '-0.02em';
        ctx.fillStyle = '#f3f7f6';
        ctx.globalAlpha = easeOutCubic(p1);
        ctx.fillText('Where did your', 540, 360 + (1 - easeOutCubic(p1)) * 40);

        ctx.fillStyle = '#2dd4bf';
        ctx.globalAlpha = easeOutCubic(p2);
        ctx.fillText('MONEY', 540, 445 + (1 - easeOutCubic(p2)) * 40);

        ctx.fillStyle = '#f3f7f6';
        ctx.globalAlpha = easeOutCubic(p3);
        ctx.fillText('actually go?', 540, 530 + (1 - easeOutCubic(p3)) * 40);
        ctx.restore();

        // Biometric / Vault Shield Graphic
        const shieldT = clamp((t - 1.6) / 1.0, 0, 1);
        const shieldScale = easeOutBack(shieldT, 2.0);
        const isLocked = t >= 2.75;

        ctx.save();
        ctx.translate(540, 960);
        ctx.scale(shieldScale, shieldScale);

        // Outer glow
        const shieldGlow = ctx.createRadialGradient(0, 0, 40, 0, 0, 260);
        shieldGlow.addColorStop(0, isLocked ? 'rgba(45, 212, 191, 0.45)' : 'rgba(255, 255, 255, 0.15)');
        shieldGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = shieldGlow;
        ctx.beginPath();
        ctx.arc(0, 0, 260, 0, Math.PI * 2);
        ctx.fill();

        // Shield Card
        ctx.fillStyle = isLocked ? '#102824' : '#141c1a';
        ctx.strokeStyle = isLocked ? '#2dd4bf' : 'rgba(255,255,255,0.2)';
        ctx.lineWidth = isLocked ? 5 : 3;

        ctx.beginPath();
        ctx.roundRect(-150, -170, 300, 340, 44);
        ctx.fill();
        ctx.stroke();

        // Fingerprint / Lock Icon
        ctx.strokeStyle = isLocked ? '#5eead4' : '#cbd9d6';
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';

        if (isLocked) {
          // Locked Padlock
          ctx.beginPath();
          ctx.roundRect(-55, -20, 110, 110, 22);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, -20, 42, Math.PI, 0);
          ctx.stroke();
          // Keyhole
          ctx.fillStyle = '#5eead4';
          ctx.beginPath();
          ctx.arc(0, 25, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(-5, 25, 10, 28);
        } else {
          // Biometric fingerprint arcs
          for (let r = 25; r <= 85; r += 20) {
            ctx.beginPath();
            ctx.arc(0, 10, r, Math.PI * 0.8, Math.PI * 2.2);
            ctx.stroke();
          }
        }

        // Lock text
        ctx.textAlign = 'center';
        ctx.font = '700 28px Outfit, sans-serif';
        ctx.fillStyle = isLocked ? '#2dd4bf' : '#9eb3af';
        ctx.fillText(isLocked ? 'VAULT LOCKED' : 'SCANNING DEVICE...', 0, 125);

        ctx.restore();

        // Subtitle badge at bottom
        if (t >= 2.0) {
          const badgeP = clamp((t - 2.0) / 0.5, 0, 1);
          ctx.save();
          ctx.globalAlpha = easeOutCubic(badgeP);
          ctx.translate(540, 1420);

          ctx.fillStyle = 'rgba(17, 31, 28, 0.9)';
          ctx.strokeStyle = 'rgba(45, 212, 191, 0.4)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(-360, -45, 720, 90, 999);
          ctx.fill();
          ctx.stroke();

          ctx.textAlign = 'center';
          ctx.font = '700 24px Outfit, sans-serif';
          ctx.fillStyle = '#f3f7f6';
          ctx.fillText('100% On-Device Storage · Zero Bank Logins', 0, 8);
          ctx.restore();
        }
      }

      // ----------------------------------------------------
      // ACT 2: LIQUID GLASS INTERFACE (3.5s – 6.8s)
      // ----------------------------------------------------
      else if (t >= 3.5 && t < 6.8) {
        drawTopBar(t, 'Liquid Glass UI');

        const p = clamp((t - 3.5) / 1.0, 0, 1);
        const phoneY = 1120 + (1 - easeOutCubic(p)) * 600;
        const phoneRot = -4 + Math.sin(t * 1.2) * 1.5;

        // Headline
        ctx.textAlign = 'center';
        ctx.font = '700 58px Fraunces, Georgia, serif';
        ctx.fillStyle = '#f3f7f6';
        ctx.fillText('Your finances in high clarity.', 540, 280);

        ctx.font = '400 26px Outfit, sans-serif';
        ctx.fillStyle = '#9eb3af';
        ctx.fillText('Available balance, multi-wallet cards & month-over-month pace.', 540, 335);

        // Center Phone Mockup
        drawPhone(images.homeDark, 540, phoneY, 680, phoneRot, 1.0);

        // Floating Callout Badge
        if (t >= 4.3) {
          const badgeP = clamp((t - 4.3) / 0.6, 0, 1);
          const badgeScale = easeOutBack(badgeP, 1.6);

          ctx.save();
          ctx.translate(540, 1580);
          ctx.scale(badgeScale, badgeScale);

          drawCard(0, 0, 680, 110, (w, h) => {
            ctx.textAlign = 'left';
            ctx.fillStyle = '#2dd4bf';
            ctx.font = '700 16px Outfit, sans-serif';
            ctx.fillText('LOCAL-FIRST INDEXEDDB', -w / 2 + 34, -12);

            ctx.fillStyle = '#f3f7f6';
            ctx.font = '500 23px Outfit, sans-serif';
            ctx.fillText('Airplane mode ready · No cloud lock-in', -w / 2 + 34, 22);
          }, 'rgba(45,212,191,0.35)');

          ctx.restore();
        }
      }

      // ----------------------------------------------------
      // ACT 3: 2-SECOND QUICKADD & INLINE MATH (6.8s – 10.8s)
      // ----------------------------------------------------
      else if (t >= 6.8 && t < 10.8) {
        drawTopBar(t, '2.8-Second Entry');

        ctx.textAlign = 'center';
        ctx.font = '700 58px Fraunces, Georgia, serif';
        ctx.fillStyle = '#f3f7f6';
        ctx.fillText('Log coffee before the receipt prints.', 540, 270);

        // Camera zooms slightly in
        const pushScale = 1.0 + (t - 6.8) * 0.035;
        drawPhone(images.quickadd, 540, 1160, 690, 0, pushScale);

        // Animated Math Overlay Card
        if (t >= 7.2) {
          const cardP = clamp((t - 7.2) / 0.5, 0, 1);
          ctx.save();
          ctx.translate(540, 660);
          ctx.scale(easeOutBack(cardP, 1.6), easeOutBack(cardP, 1.6));

          drawCard(0, 0, 720, 220, (w, h) => {
            ctx.textAlign = 'left';
            ctx.fillStyle = '#5eead4';
            ctx.font = '700 16px Outfit, sans-serif';
            ctx.fillText('INLINE MATH KEYPAD', -w / 2 + 40, -h / 2 + 45);

            // Typing progression
            let expr = '13.50 + 4.80';
            if (t < 7.5) expr = '13.';
            else if (t < 7.8) expr = '13.50 +';
            else if (t < 8.2) expr = '13.50 + 4.';
            else if (t < 8.6) expr = '13.50 + 4.80';

            ctx.font = '600 32px monospace';
            ctx.fillStyle = '#cbd9d6';
            ctx.fillText(expr + (t < 8.6 ? '|' : ' ='), -w / 2 + 40, -h / 2 + 95);

            // Resolved total
            if (t >= 8.6) {
              const resP = clamp((t - 8.6) / 0.4, 0, 1);
              ctx.save();
              ctx.font = '800 52px Outfit, sans-serif';
              ctx.fillStyle = '#2dd4bf';
              ctx.globalAlpha = resP;
              ctx.fillText('$18.30', -w / 2 + 40, -h / 2 + 165);

              // Category chip
              ctx.fillStyle = 'rgba(45, 212, 191, 0.2)';
              ctx.strokeStyle = '#2dd4bf';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.roundRect(140, -h / 2 + 125, 180, 48, 999);
              ctx.fill();
              ctx.stroke();

              ctx.fillStyle = '#5eead4';
              ctx.font = '700 18px Outfit, sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText('Coffee ✓', 230, -h / 2 + 156);
              ctx.restore();
            }
          }, 'rgba(45,212,191,0.4)');

          ctx.restore();
        }
      }

      // ----------------------------------------------------
      // ACT 4: SPLIT TRANSACTIONS (10.8s – 14.3s)
      // ----------------------------------------------------
      else if (t >= 10.8 && t < 14.3) {
        drawTopBar(t, 'Split Receipts');

        ctx.textAlign = 'center';
        ctx.font = '700 54px Fraunces, Georgia, serif';
        ctx.fillStyle = '#f3f7f6';
        ctx.fillText('One checkout. Three budgets.', 540, 270);

        // Phone tilted left
        drawPhone(images.quickaddSplit, 420, 1180, 640, -4, 0.98);

        // Split Receipt Card on Right
        const rcP = clamp((t - 11.0) / 0.7, 0, 1);
        ctx.save();
        ctx.translate(620, 920);
        ctx.scale(easeOutBack(rcP, 1.4), easeOutBack(rcP, 1.4));

        drawCard(0, 0, 560, 460, (w, h) => {
          ctx.textAlign = 'left';
          ctx.fillStyle = '#0d6e63';
          ctx.font = '700 15px Outfit, sans-serif';
          ctx.fillText('TARGET SUPERSTORE', -w / 2 + 36, -h / 2 + 48);

          ctx.textAlign = 'right';
          ctx.fillStyle = '#f3f7f6';
          ctx.font = '800 36px monospace';
          ctx.fillText('$84.60', w / 2 - 36, -h / 2 + 50);

          // Divider
          ctx.strokeStyle = 'rgba(255,255,255,0.1)';
          ctx.beginPath();
          ctx.moveTo(-w / 2 + 36, -h / 2 + 75);
          ctx.lineTo(w / 2 - 36, -h / 2 + 75);
          ctx.stroke();

          // Bar 1: Groceries ($52.40 - 62%)
          const barP = clamp((t - 11.5) / 0.8, 0, 1);
          ctx.textAlign = 'left';
          ctx.fillStyle = '#f3f7f6';
          ctx.font = '600 20px Outfit, sans-serif';
          ctx.fillText('Groceries', -w / 2 + 36, -h / 2 + 120);
          ctx.textAlign = 'right';
          ctx.fillText('$52.40', w / 2 - 36, -h / 2 + 120);

          ctx.fillStyle = 'rgba(255,255,255,0.08)';
          ctx.beginPath();
          ctx.roundRect(-w / 2 + 36, -h / 2 + 135, w - 72, 12, 99);
          ctx.fill();
          ctx.fillStyle = '#2dd4bf';
          ctx.beginPath();
          ctx.roundRect(-w / 2 + 36, -h / 2 + 135, (w - 72) * 0.62 * barP, 12, 99);
          ctx.fill();

          // Bar 2: Home Essentials ($19.20 - 23%)
          ctx.textAlign = 'left';
          ctx.fillStyle = '#f3f7f6';
          ctx.fillText('Home Essentials', -w / 2 + 36, -h / 2 + 195);
          ctx.textAlign = 'right';
          ctx.fillText('$19.20', w / 2 - 36, -h / 2 + 195);

          ctx.fillStyle = 'rgba(255,255,255,0.08)';
          ctx.beginPath();
          ctx.roundRect(-w / 2 + 36, -h / 2 + 210, w - 72, 12, 99);
          ctx.fill();
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.roundRect(-w / 2 + 36, -h / 2 + 210, (w - 72) * 0.23 * barP, 12, 99);
          ctx.fill();

          // Bar 3: Pharmacy ($13.00 - 15%)
          ctx.textAlign = 'left';
          ctx.fillStyle = '#f3f7f6';
          ctx.fillText('Pharmacy', -w / 2 + 36, -h / 2 + 270);
          ctx.textAlign = 'right';
          ctx.fillText('$13.00', w / 2 - 36, -h / 2 + 270);

          ctx.fillStyle = 'rgba(255,255,255,0.08)';
          ctx.beginPath();
          ctx.roundRect(-w / 2 + 36, -h / 2 + 285, w - 72, 12, 99);
          ctx.fill();
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.roundRect(-w / 2 + 36, -h / 2 + 285, (w - 72) * 0.15 * barP, 12, 99);
          ctx.fill();

          // Bottom Checkmark
          if (t >= 12.3) {
            ctx.fillStyle = '#2dd4bf';
            ctx.font = '700 20px Outfit, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Remaining to assign: $0.00 ✓', 0, -h / 2 + 355);
          }
        }, 'rgba(45,212,191,0.3)', '#121d1b');
        ctx.restore();
      }

      // ----------------------------------------------------
      // ACT 5: ON-DEVICE OCR & BANK ALERT (14.3s – 17.8s)
      // ----------------------------------------------------
      else if (t >= 14.3 && t < 17.8) {
        drawTopBar(t, 'On-Device OCR & SMS');

        ctx.textAlign = 'center';
        ctx.font = '700 54px Fraunces, Georgia, serif';
        ctx.fillStyle = '#f3f7f6';
        ctx.fillText('Scan receipts or parse SMS alerts.', 540, 270);

        // Center Phone
        drawPhone(images.quickadd, 540, 1180, 680, 0, 1.0);

        // SMS Push Card at top
        const smsP = clamp((t - 14.4) / 0.6, 0, 1);
        ctx.save();
        ctx.translate(540, 480);
        ctx.scale(easeOutBack(smsP, 1.4), easeOutBack(smsP, 1.4));

        drawCard(0, 0, 720, 160, (w, h) => {
          ctx.textAlign = 'left';
          ctx.fillStyle = '#9eb3af';
          ctx.font = '600 15px Outfit, sans-serif';
          ctx.fillText('INCOMING BANK SMS · CHASE / ALIF / T-BANK', -w / 2 + 36, -h / 2 + 40);

          ctx.fillStyle = '#f3f7f6';
          ctx.font = '500 20px monospace';
          ctx.fillText('Debit *4821: $64.20 at WHOLE FOODS MARKET', -w / 2 + 36, -h / 2 + 85);

          // Laser scan line sweep across the SMS card
          const scanPos = ((t - 14.6) * 1.6) % 1.0;
          if (t >= 14.6 && t < 16.5) {
            const lineY = -h / 2 + scanPos * h;
            ctx.strokeStyle = '#2dd4bf';
            ctx.shadowColor = '#2dd4bf';
            ctx.shadowBlur = 18;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-w / 2 + 10, lineY);
            ctx.lineTo(w / 2 - 10, lineY);
            ctx.stroke();
            ctx.shadowColor = 'transparent';
          }

          if (t >= 16.0) {
            ctx.fillStyle = '#5eead4';
            ctx.font = '700 17px Outfit, sans-serif';
            ctx.fillText('✓ Parsed locally in 40ms — Zero cloud uploads', -w / 2 + 36, -h / 2 + 130);
          }
        }, 'rgba(45,212,191,0.4)');
        ctx.restore();
      }

      // ----------------------------------------------------
      // ACT 6: PAYDAY BUDGETS & GOALS (17.8s – 21.3s)
      // ----------------------------------------------------
      else if (t >= 17.8 && t < 21.3) {
        drawTopBar(t, 'Payday Cycles & Goals');

        ctx.textAlign = 'center';
        ctx.font = '700 54px Fraunces, Georgia, serif';
        ctx.fillStyle = '#f3f7f6';
        ctx.fillText('Budgets that start on your payday.', 540, 270);

        // Phone with budget cycle
        drawPhone(images.budgetsCycle, 400, 1160, 640, -3, 0.98);

        // Savings Goal Floating Card on Right
        const gP = clamp((t - 18.0) / 0.6, 0, 1);
        ctx.save();
        ctx.translate(650, 940);
        ctx.scale(easeOutBack(gP, 1.4), easeOutBack(gP, 1.4));

        drawCard(0, 0, 540, 280, (w, h) => {
          ctx.textAlign = 'left';
          ctx.fillStyle = '#f3f7f6';
          ctx.font = '700 24px Outfit, sans-serif';
          ctx.fillText('Tokyo Autumn Flight', -w / 2 + 36, -h / 2 + 50);

          ctx.textAlign = 'right';
          ctx.fillStyle = '#5eead4';
          ctx.font = '700 22px monospace';
          ctx.fillText('82%', w / 2 - 36, -h / 2 + 50);

          ctx.textAlign = 'left';
          ctx.fillStyle = '#2dd4bf';
          ctx.font = '800 38px monospace';
          ctx.fillText('$2,450', -w / 2 + 36, -h / 2 + 110);
          ctx.fillStyle = '#9eb3af';
          ctx.font = '500 22px Outfit, sans-serif';
          ctx.fillText('of $3,000 target', -w / 2 + 175, -h / 2 + 108);

          // Goal progress bar animation
          const fillP = clamp((t - 18.4) / 1.0, 0, 1);
          ctx.fillStyle = 'rgba(255,255,255,0.08)';
          ctx.beginPath();
          ctx.roundRect(-w / 2 + 36, -h / 2 + 145, w - 72, 16, 99);
          ctx.fill();

          ctx.fillStyle = '#2dd4bf';
          ctx.beginPath();
          ctx.roundRect(-w / 2 + 36, -h / 2 + 145, (w - 72) * 0.82 * fillP, 16, 99);
          ctx.fill();

          ctx.textAlign = 'center';
          ctx.fillStyle = '#cbd9d6';
          ctx.font = '500 18px Outfit, sans-serif';
          ctx.fillText('Dedicated goal — Never mixed into spending', 0, -h / 2 + 205);
        }, 'rgba(45,212,191,0.35)');
        ctx.restore();
      }

      // ----------------------------------------------------
      // ACT 7: PUBLIC PRIVACY SPOILER (21.3s – 25.3s)
      // ----------------------------------------------------
      else if (t >= 21.3 && t < 25.3) {
        drawTopBar(t, 'Public Privacy Blur');

        ctx.textAlign = 'center';
        ctx.font = '700 54px Fraunces, Georgia, serif';
        ctx.fillStyle = '#f3f7f6';
        ctx.fillText('Share your screen, not your numbers.', 540, 270);

        // Before 22.5s: normal screen. At 22.5s: frosted blur image snaps with drop!
        const isBlurred = t >= 22.5;
        const currentScreen = isBlurred ? images.homeBlur : images.homeDark;

        drawPhone(currentScreen, 540, 1160, 680, 0, 1.0);

        // Big Frosted Glass Badge in Center
        const badgeP = clamp((t - 22.5) / 0.5, 0, 1);
        if (isBlurred) {
          ctx.save();
          ctx.translate(540, 680);
          ctx.scale(easeOutBack(badgeP, 1.5), easeOutBack(badgeP, 1.5));

          drawCard(0, 0, 680, 140, (w, h) => {
            ctx.textAlign = 'center';
            ctx.fillStyle = '#2dd4bf';
            ctx.font = '700 18px Outfit, sans-serif';
            ctx.fillText('ONE-TAP BALANCE SPOILER ACTIVE', 0, -18);

            ctx.fillStyle = '#f3f7f6';
            ctx.font = '600 24px Outfit, sans-serif';
            ctx.fillText('Balances blurred on trains & cafes · Face ID lock', 0, 22);
          }, 'rgba(45,212,191,0.5)', '#0e2420');

          ctx.restore();
        }
      }

      // ----------------------------------------------------
      // ACT 8: GRAND FINALE & CTA (25.3s – 30.0s)
      // ----------------------------------------------------
      else if (t >= 25.3) {
        drawTopBar(t, 'Download Free');

        const endP = clamp((t - 25.3) / 0.8, 0, 1);
        const iconScale = easeOutBack(endP, 1.5);

        // Floating Glossy App Icon
        if (images.logo) {
          ctx.save();
          ctx.translate(540, 420);
          ctx.scale(iconScale, iconScale);

          // Radial light sweep behind icon
          const iconGlow = ctx.createRadialGradient(0, 0, 60, 0, 0, 320);
          iconGlow.addColorStop(0, 'rgba(45, 212, 191, 0.4)');
          iconGlow.addColorStop(1, 'transparent');
          ctx.fillStyle = iconGlow;
          ctx.beginPath();
          ctx.arc(0, 0, 320, 0, Math.PI * 2);
          ctx.fill();

          ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
          ctx.shadowBlur = 50;
          ctx.shadowOffsetY = 25;

          ctx.beginPath();
          ctx.roundRect(-90, -90, 180, 180, 44);
          ctx.clip();
          ctx.drawImage(images.logo, -90, -90, 180, 180);
          ctx.restore();
        }

        // Main Title
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = '900 68px Fraunces, Georgia, serif';
        ctx.fillStyle = '#f3f7f6';
        ctx.fillText('WhereDidItGo', 540, 640);

        ctx.font = '500 28px Outfit, sans-serif';
        ctx.fillStyle = '#9eb3af';
        ctx.fillText('Take back your financial clarity.', 540, 700);

        // 4 Value Checkmarks Card
        drawCard(540, 940, 780, 320, (w, h) => {
          const checks = [
            '100% Free offline core forever',
            'Zero ads & zero data trackers',
            'Android APK & Google Play release',
            'Instant Web & Desktop Vault'
          ];
          ctx.textAlign = 'left';
          ctx.font = '600 24px Outfit, sans-serif';
          checks.forEach((text, i) => {
            const checkY = -h / 2 + 55 + i * 65;
            // Checkmark bullet
            ctx.fillStyle = '#2dd4bf';
            ctx.fillText('✓', -w / 2 + 48, checkY);
            ctx.fillStyle = '#f3f7f6';
            ctx.fillText(text, -w / 2 + 90, checkY);
          });
        }, 'rgba(45,212,191,0.3)');

        // Big Vibrant CTA Button
        const pulse = 1.0 + Math.sin(t * 5.0) * 0.025;
        ctx.save();
        ctx.translate(540, 1260);
        ctx.scale(pulse, pulse);

        ctx.shadowColor = 'rgba(45, 212, 191, 0.45)';
        ctx.shadowBlur = 35;
        ctx.shadowOffsetY = 12;

        ctx.fillStyle = '#2dd4bf';
        ctx.beginPath();
        ctx.roundRect(-340, -48, 680, 96, 999);
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.fillStyle = '#06221f';
        ctx.font = '800 28px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('DOWNLOAD FREE — LINK IN BIO →', 0, 10);
        ctx.restore();

        // Footer version info
        ctx.textAlign = 'center';
        ctx.font = '500 18px Outfit, sans-serif';
        ctx.fillStyle = '#6b827e';
        ctx.fillText('WhereDidItGo v1.1.6 · MIT Open Source · Juraev.exe', 540, 1420);
        ctx.restore();
      }

      ctx.restore();
    };

    // Playback loop for interactive player
    let isPlaying = false;
    let animId = null;

    function animate() {
      if (!isPlaying) return;
      const t = audio.currentTime;
      timeDisplay.innerText = t.toFixed(2) + ' / 30.00s';
      renderFrame(t);
      if (t >= 30.0) {
        togglePlay();
        audio.currentTime = 0;
        return;
      }
      animId = requestAnimationFrame(animate);
    }

    function togglePlay() {
      if (!assetsLoaded) return;
      isPlaying = !isPlaying;
      if (isPlaying) {
        audio.play();
        playBtn.innerText = 'Pause';
        animate();
      } else {
        audio.pause();
        playBtn.innerText = 'Play';
        cancelAnimationFrame(animId);
      }
    }
  </script>
</body>
</html>`;
}

async function renderVideo() {
  console.log('1/5 Gathering high-res app screenshots and brand assets...');
  const screensDir = path.join(ROOT, 'marketing', 'instagram', 'screens')
  const assets = {
    homeDark: await toDataUri(path.join(screensDir, 'home-dark.png')),
    quickadd: await toDataUri(path.join(screensDir, 'quickadd.png')),
    quickaddSplit: await toDataUri(path.join(screensDir, 'quickadd-split.png')),
    activity: await toDataUri(path.join(screensDir, 'activity.png')),
    budgetsCycle: await toDataUri(path.join(screensDir, 'budgets-cycle.png')),
    goals: await toDataUri(path.join(screensDir, 'goals.png')),
    debts: await toDataUri(path.join(screensDir, 'debts.png')),
    insights: await toDataUri(path.join(screensDir, 'insights.png')),
    homeBlur: await toDataUri(path.join(screensDir, 'home-blur.png')),
    security: await toDataUri(path.join(screensDir, 'security.png')),
    logo: await toDataUri(path.join(ROOT, 'docs', 'logo.png')),
    soundtrackUri: await toDataUri(AUDIO_PATH)
  }

  console.log('2/5 Writing interactive HTML5 canvas player...');
  const playerHtml = buildPlayerHtml(assets);
  const playerPath = path.join(PROD_DIR, 'player.html');
  await fs.writeFile(playerPath, playerHtml, 'utf8');

  console.log('3/5 Recording 1080x1920 30fps canvas video in Playwright...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();
  await page.goto(`file:///${playerPath.replace(/\\/g, '/')}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.assetsReady === true, null, { timeout: 30000 });

  // Start MediaRecorder inside browser
  await page.evaluate(() => {
    const c = document.getElementById('c');
    const stream = c.captureStream(30);
    window._chunks = [];
    window._recorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 18000000
    });
    window._recorder.ondataavailable = e => {
      if (e.data.size > 0) window._chunks.push(e.data);
    };
    window._recorder.start();
  });

  // Render 900 frames at exact 30fps (30.0s total)
  const FPS = 30;
  const TOTAL_FRAMES = 900;
  const t0 = Date.now();

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const t = f / FPS;
    await page.evaluate(curT => window.renderFrame(curT), t);
    // Interval matching 30fps capture
    await new Promise(r => setTimeout(r, 33));
    if (f % 150 === 0) {
      console.log(`   Progress: ${(t).toFixed(1)}s / 30.0s (${f}/${TOTAL_FRAMES} frames)...`);
    }
  }

  console.log('   Stopping recorder and extracting WebM buffer...');
  const webmBase64 = await page.evaluate(() => {
    return new Promise(resolve => {
      window._recorder.onstop = async () => {
        const blob = new Blob(window._chunks, { type: 'video/webm' });
        const buf = await blob.arrayBuffer();
        const b64 = btoa(new Uint8Array(buf).reduce((d, b) => d + String.fromCharCode(b), ''));
        resolve(b64);
      };
      window._recorder.stop();
    });
  });

  const rawWebmPath = path.join(PROD_DIR, 'raw-capture.webm');
  await fs.writeFile(rawWebmPath, Buffer.from(webmBase64, 'base64'));
  console.log(`   Captured raw video in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  await browser.close();

  console.log('4/5 Muxing video stream with 48kHz stereo soundtrack & SFX via ffmpeg...');
  await new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-i', rawWebmPath,
      '-i', AUDIO_PATH,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'fast',
      '-crf', '18',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-shortest',
      OUTPUT_MP4
    ];
    const proc = spawn('ffmpeg', args, { stdio: 'inherit' });
    proc.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });

  // Copy to marketing folder
  await fs.copyFile(OUTPUT_MP4, MARKETING_MP4);
  await fs.unlink(rawWebmPath).catch(() => {});

  console.log('5/5 Video Generation Complete!');
  console.log(`   ✓ High-def MP4: ${OUTPUT_MP4}`);
  console.log(`   ✓ Marketing MP4: ${MARKETING_MP4}`);
  console.log(`   ✓ Interactive Player: ${playerPath}`);
}

renderVideo().catch(err => {
  console.error('Error rendering video:', err);
  process.exit(1);
});
