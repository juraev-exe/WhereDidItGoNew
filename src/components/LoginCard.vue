<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { ArrowRight, Eye, EyeOff, Lock, Mail } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'

withDefaults(
  defineProps<{
    brandName?: string
    title?: string
    subtitle?: string
    loading?: boolean
  }>(),
  {
    brandName: 'WhereDidItGo',
    title: 'Welcome back',
    subtitle: 'Sign in to sync your data across devices.',
    loading: false,
  },
)

const emit = defineEmits<{
  (e: 'submit', payload: { email: string; password: string; remember: boolean }): void
  (e: 'forgot-password'): void
  (e: 'github'): void
  (e: 'google'): void
  (e: 'create-account'): void
}>()

const email = ref('')
const password = ref('')
const remember = ref(false)
const showPassword = ref(false)

function onSubmit() {
  emit('submit', { email: email.value, password: password.value, remember: remember.value })
}

const canvasRef = ref<HTMLCanvasElement | null>(null)
let raf = 0
let handleResize: (() => void) | null = null

onMounted(() => {
  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return

  type Particle = { x: number; y: number; v: number; o: number }
  let particles: Particle[] = []

  const setSize = () => {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }

  const makeParticle = (): Particle => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    v: Math.random() * 0.25 + 0.05,
    o: Math.random() * 0.35 + 0.15,
  })

  const init = () => {
    particles = []
    const count = Math.floor((canvas.width * canvas.height) / 9000)
    for (let i = 0; i < count; i++) particles.push(makeParticle())
  }

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    particles.forEach((p) => {
      p.y -= p.v
      if (p.y < 0) {
        p.x = Math.random() * canvas.width
        p.y = canvas.height + Math.random() * 40
        p.v = Math.random() * 0.25 + 0.05
        p.o = Math.random() * 0.35 + 0.15
      }
      ctx.fillStyle = `rgba(250,250,250,${p.o})`
      ctx.fillRect(p.x, p.y, 0.7, 2.2)
    })
    raf = requestAnimationFrame(draw)
  }

  setSize()
  init()
  raf = requestAnimationFrame(draw)

  handleResize = () => {
    setSize()
    init()
  }
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (handleResize) window.removeEventListener('resize', handleResize)
  cancelAnimationFrame(raf)
})
</script>

<template>
  <section class="login-overlay">
    <div class="vignette" />

    <div class="accent-lines">
      <div class="hline" />
      <div class="hline" />
      <div class="hline" />
      <div class="vline" />
      <div class="vline" />
      <div class="vline" />
    </div>

    <canvas ref="canvasRef" class="particles" />

    <header class="login-header">
      <span class="brand">{{ brandName }}</span>
      <button type="button" class="header-cta" @click="emit('create-account')">
        <span>Create account</span>
        <ArrowRight :size="16" />
      </button>
    </header>

    <div class="login-stage">
      <div class="login-card">
        <div class="card-head">
          <h1 class="card-title">{{ title }}</h1>
          <p class="card-subtitle">{{ subtitle }}</p>
        </div>

        <form class="card-body" @submit.prevent="onSubmit">
          <div class="field">
            <label for="login-email" class="field-label">Email</label>
            <div class="input-wrap">
              <Mail :size="16" class="input-icon" />
              <input
                id="login-email"
                v-model="email"
                type="email"
                placeholder="you@example.com"
                autocomplete="email"
                class="input"
                required
              />
            </div>
          </div>

          <div class="field">
            <label for="login-password" class="field-label">Password</label>
            <div class="input-wrap">
              <Lock :size="16" class="input-icon" />
              <input
                id="login-password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="••••••••"
                autocomplete="current-password"
                class="input input--with-toggle"
                required
              />
              <button
                type="button"
                class="toggle-visibility"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                @click="showPassword = !showPassword"
              >
                <Eye v-if="!showPassword" :size="16" />
                <EyeOff v-else :size="16" />
              </button>
            </div>
          </div>

          <div class="field-row">
            <label class="remember">
              <input v-model="remember" type="checkbox" class="checkbox" />
              <span>Remember me</span>
            </label>
            <button type="button" class="forgot-link" @click="emit('forgot-password')">
              Forgot password?
            </button>
          </div>

          <AppButton type="submit" block size="lg" variant="filled" :disabled="loading" class="submit-btn">
            {{ loading ? 'Signing in…' : 'Sign in' }}
          </AppButton>

          <div class="divider">
            <span>or</span>
          </div>

          <div class="oauth-row">
            <AppButton type="button" size="lg" variant="outline" class="oauth-btn" @click="emit('github')">
              GitHub
            </AppButton>
            <AppButton type="button" size="lg" variant="outline" class="oauth-btn" @click="emit('google')">
              Google
            </AppButton>
          </div>
        </form>

        <div class="card-foot">
          New here?
          <button type="button" class="link-btn" @click="emit('create-account')">Create an account</button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.login-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: #09090b;
  color: #fafafa;
  overflow: hidden;
}

.vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(80% 60% at 50% 30%, rgba(255, 255, 255, 0.06), transparent 60%);
}

.particles {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0.5;
  mix-blend-mode: screen;
  pointer-events: none;
}

/* Accent grid lines */
.accent-lines {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.7;
}

.hline,
.vline {
  position: absolute;
  background: #27272a;
  will-change: transform, opacity;
}

.hline {
  left: 0;
  right: 0;
  height: 1px;
  transform: scaleX(0);
  transform-origin: 50% 50%;
  animation: login-draw-x 0.8s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
}

.vline {
  top: 0;
  bottom: 0;
  width: 1px;
  transform: scaleY(0);
  transform-origin: 50% 0%;
  animation: login-draw-y 0.9s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
}

.hline:nth-child(1) {
  top: 18%;
  animation-delay: 0.12s;
}
.hline:nth-child(2) {
  top: 50%;
  animation-delay: 0.22s;
}
.hline:nth-child(3) {
  top: 82%;
  animation-delay: 0.32s;
}
.vline:nth-child(4) {
  left: 22%;
  animation-delay: 0.42s;
}
.vline:nth-child(5) {
  left: 50%;
  animation-delay: 0.54s;
}
.vline:nth-child(6) {
  left: 78%;
  animation-delay: 0.66s;
}

@keyframes login-draw-x {
  0% {
    transform: scaleX(0);
    opacity: 0;
  }
  60% {
    opacity: 0.95;
  }
  100% {
    transform: scaleX(1);
    opacity: 0.7;
  }
}

@keyframes login-draw-y {
  0% {
    transform: scaleY(0);
    opacity: 0;
  }
  60% {
    opacity: 0.95;
  }
  100% {
    transform: scaleY(1);
    opacity: 0.7;
  }
}

/* Header */
.login-header {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.brand {
  font-size: var(--text-caption);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #a1a1aa;
  font-family: var(--font-display);
}

.header-cta {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  height: 36px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-sm);
  border: 1px solid #27272a;
  background: #18181b;
  color: #fafafa;
  font-size: var(--text-label);
  font-weight: 600;
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-standard);
}

.header-cta:hover {
  background: color-mix(in srgb, #18181b 80%, white);
}

/* Centered stage */
.login-stage {
  position: relative;
  height: 100%;
  width: 100%;
  display: grid;
  place-items: center;
  padding: var(--space-4);
}

.login-card {
  width: 100%;
  max-width: 384px;
  border-radius: var(--radius-lg);
  border: 1px solid #27272a;
  background: color-mix(in srgb, #18181b 70%, transparent);
  backdrop-filter: blur(12px);
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  opacity: 0;
  transform: translateY(20px);
  animation: login-fade-up 0.8s cubic-bezier(0.22, 0.61, 0.36, 1) 0.4s forwards;
}

@keyframes login-fade-up {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card-head {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.card-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #fafafa;
}

.card-subtitle {
  font-size: var(--text-label);
  color: #a1a1aa;
  line-height: var(--leading-normal);
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.field-label {
  font-size: var(--text-label);
  font-weight: 500;
  color: #d4d4d8;
}

.input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 12px;
  color: #71717a;
  pointer-events: none;
}

.input {
  width: 100%;
  height: 40px;
  padding: 0 var(--space-3) 0 40px;
  border-radius: var(--radius-sm);
  border: 1px solid #27272a;
  background: #09090b;
  color: #fafafa;
  font-size: var(--text-label);
  transition: border-color var(--duration-fast) var(--ease-standard);
}

.input::placeholder {
  color: #52525b;
}

.input:focus-visible {
  outline: none;
  border-color: #52525b;
}

.input--with-toggle {
  padding-right: 40px;
}

.toggle-visibility {
  position: absolute;
  right: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-xs);
  background: transparent;
  color: #a1a1aa;
  cursor: pointer;
}

.toggle-visibility:hover {
  color: #e4e4e7;
}

.field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.remember {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-label);
  color: #a1a1aa;
  cursor: pointer;
}

.checkbox {
  width: 16px;
  height: 16px;
  accent-color: #fafafa;
  cursor: pointer;
}

.forgot-link {
  background: none;
  border: none;
  padding: 0;
  font-size: var(--text-label);
  color: #d4d4d8;
  cursor: pointer;
}

.forgot-link:hover {
  color: #fafafa;
}

.submit-btn {
  background: #fafafa !important;
  color: #18181b !important;
  border-radius: var(--radius-sm) !important;
}

.divider {
  position: relative;
  display: flex;
  justify-content: center;
  height: 1px;
  background: #27272a;
}

.divider span {
  position: absolute;
  top: -8px;
  padding: 0 var(--space-2);
  background: #18181b;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #71717a;
}

.oauth-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.oauth-btn {
  border-radius: var(--radius-sm) !important;
  border-color: #27272a !important;
  background: #09090b !important;
  color: #fafafa !important;
}

.card-foot {
  text-align: center;
  font-size: var(--text-label);
  color: #a1a1aa;
}

.link-btn {
  background: none;
  border: none;
  padding: 0;
  margin-left: var(--space-1);
  font-size: inherit;
  color: #e4e4e7;
  cursor: pointer;
}

.link-btn:hover {
  text-decoration: underline;
}

@media (prefers-reduced-motion: reduce) {
  .login-card,
  .hline,
  .vline {
    animation: none !important;
    opacity: 1;
    transform: none;
  }
}
</style>
