<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { X } from '@lucide/vue'
import { animateSpring, projectMomentum, rubberband, VelocityTracker, type SpringControl } from '@/lib/motion'
import { closeFeedback, openFeedback } from '@/services/native/haptics'
import { useUiStore } from '@/stores/ui'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    /** Fill a fixed height and let the slot manage scrolling (e.g. add-transaction). */
    contain?: boolean
  }>(),
  {
    title: '',
    contain: false,
  },
)

const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()
const ui = useUiStore()

const panelRef = ref<HTMLElement | null>(null)
const dragY = ref(0)
const dragging = ref(false)
const isSpringSettling = ref(false)
let startY = 0
let pointerId: number | null = null
let previouslyFocusedElement: HTMLElement | null = null
const tracker = new VelocityTracker()
let activeSpring: SpringControl | null = null

function getFocusableElements(): HTMLElement[] {
  if (!panelRef.value) return []
  return Array.from(
    panelRef.value.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true')
}

function onKey(e: KeyboardEvent) {
  if (!props.open) return
  if (e.key === 'Escape') {
    emit('close')
    return
  }
  if (e.key === 'Tab') {
    const focusables = getFocusableElements()
    if (focusables.length === 0) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }
}

function onPointerDown(e: PointerEvent) {
  if (e.button !== 0) return
  // Interrupt ongoing spring seamlessly from live presentation coordinate
  if (activeSpring) {
    activeSpring.stop()
    activeSpring = null
    isSpringSettling.value = false
  }
  dragging.value = true
  startY = e.clientY - dragY.value
  pointerId = e.pointerId
  tracker.reset(e.clientX, e.clientY)
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value || e.pointerId !== pointerId) return
  tracker.addSample(e.clientX, e.clientY)
  const rawDelta = e.clientY - startY
  if (rawDelta < 0) {
    // Apple Rubber-banding when pulled upwards past sheet top bound
    dragY.value = rubberband(rawDelta, 360, 0.45)
  } else {
    // Direct 1:1 manipulation tracking
    dragY.value = rawDelta
  }
}

function finishDrag() {
  if (!dragging.value) return
  dragging.value = false
  pointerId = null

  const { vy } = tracker.getVelocity() // px/ms
  const currentY = dragY.value

  // Apple WWDC 2018 momentum projection: calculate resting position based on deceleration
  const projectedY = currentY + projectMomentum(vy, 0.997)

  // Dismiss if projected landing exceeds threshold or strong downward flick
  const shouldClose = projectedY > 135 || (currentY > 40 && vy > 0.42)

  if (shouldClose) {
    isSpringSettling.value = true
    activeSpring = animateSpring({
      from: currentY,
      to: 500,
      initialVelocity: Math.max(vy, 0.3),
      dampingRatio: 0.95,
      response: 0.32,
      onUpdate: (val) => {
        dragY.value = val
      },
      onComplete: () => {
        isSpringSettling.value = false
        activeSpring = null
        dragY.value = 0
        emit('close')
      },
    })
    return
  }

  // Otherwise, spring back to 0 using Apple spring physics with velocity handoff
  isSpringSettling.value = true
  const hasMomentum = Math.abs(vy) > 0.22
  activeSpring = animateSpring({
    from: currentY,
    to: 0,
    initialVelocity: vy,
    dampingRatio: hasMomentum ? 0.82 : 1.0,
    response: 0.34,
    onUpdate: (val) => {
      dragY.value = val
    },
    onComplete: () => {
      isSpringSettling.value = false
      activeSpring = null
      dragY.value = 0
    },
  })
}

function onPointerUp(e: PointerEvent) {
  if (e.pointerId !== pointerId) return
  finishDrag()
}

watch(
  () => props.open,
  async (v) => {
    document.body.style.overflow = v ? 'hidden' : ''
    if (activeSpring) {
      activeSpring.stop()
      activeSpring = null
    }
    isSpringSettling.value = false
    dragY.value = 0
    dragging.value = false
    pointerId = null

    if (v) {
      ui.registerModalOpen()
      previouslyFocusedElement = document.activeElement as HTMLElement | null
      void openFeedback()
      await nextTick()
      const focusables = getFocusableElements()
      if (focusables.length > 0) {
        const bodyInput = panelRef.value?.querySelector<HTMLElement>(
          '.sheet-body input:not([type="hidden"]):not([disabled]), .sheet-body select:not([disabled]), .sheet-body textarea:not([disabled])',
        )
        if (bodyInput) {
          bodyInput.focus()
        } else {
          const nonClose = focusables.find((el) => !el.classList.contains('sheet-close'))
          if (nonClose) nonClose.focus()
          else focusables[0].focus()
        }
      } else {
        panelRef.value?.focus()
      }
    } else {
      ui.registerModalClose()
      void closeFeedback()
      if (previouslyFocusedElement && typeof previouslyFocusedElement.focus === 'function') {
        previouslyFocusedElement.focus()
      }
      previouslyFocusedElement = null
    }
  },
)

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  if (activeSpring) {
    activeSpring.stop()
    activeSpring = null
  }
  if (props.open) {
    ui.registerModalClose()
  }
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="open" class="sheet-root" role="presentation">
        <button
          class="sheet-scrim"
          :class="{ 'sheet-scrim--dragging': dragging || isSpringSettling }"
          :style="dragY !== 0 ? { opacity: String(Math.max(0, 1 - Math.max(0, dragY) / 380)) } : undefined"
          :aria-label="t('common.close')"
          type="button"
          @click="emit('close')"
        />
        <div
          ref="panelRef"
          class="sheet-panel surface-glass"
          :class="{ 'sheet-panel--contain': contain, 'sheet-panel--dragging': dragging || isSpringSettling }"
          :style="dragY !== 0 ? { transform: `translateY(${dragY}px)` } : undefined"
          role="dialog"
          aria-modal="true"
          :aria-label="title || t('common.close')"
          tabindex="-1"
        >
          <div
            class="sheet-handle-hit"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
          >
            <div class="sheet-handle" aria-hidden="true" />
          </div>
          <header v-if="title" class="sheet-header">
            <h2 class="sheet-title">{{ title }}</h2>
            <button type="button" class="sheet-close" :aria-label="t('common.close')" @click="emit('close')">
              <X :size="20" />
            </button>
          </header>
          <div class="sheet-body">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-root {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.sheet-scrim {
  position: absolute;
  inset: 0;
  background: color-mix(in srgb, #000 45%, transparent);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border: none;
  cursor: pointer;
}

.sheet-scrim--dragging {
  transition: none;
}

.sheet-panel {
  position: relative;
  width: min(100%, 560px);
  max-height: min(85dvh, 720px);
  background: color-mix(in srgb, var(--color-surface) 92%, transparent);
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  border: 1px solid color-mix(in srgb, var(--color-outline) 14%, transparent);
  border-bottom: none;
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  /* Apple specular rim catch-light along top edge */
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, white 28%, transparent),
    var(--shadow-lg);
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding-bottom: calc(var(--space-3) + var(--safe-bottom));
  will-change: transform;
  transition: transform var(--duration-normal) var(--ease-emphasized);
}

@supports not (backdrop-filter: blur(1px)) {
  .sheet-panel {
    background: var(--color-surface);
  }
}

.sheet-panel:focus {
  outline: none;
}

.sheet-panel--contain {
  height: min(88dvh, 680px);
  max-height: min(88dvh, 680px);
}

@media (max-height: 640px) {
  .sheet-panel--contain {
    height: min(94dvh, 100%);
    max-height: min(94dvh, 100%);
  }
}

.sheet-panel--dragging {
  transition: none;
}

.sheet-handle-hit {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  min-height: 36px;
  padding: var(--space-2) var(--space-8) var(--space-1);
  touch-action: none;
  cursor: grab;
}

.sheet-handle-hit:active {
  cursor: grabbing;
}

.sheet-handle {
  width: 38px;
  height: 4.5px;
  border-radius: var(--radius-full);
  background: var(--color-outline-variant);
  pointer-events: none;
  transition: background var(--duration-fast), transform var(--duration-fast);
}

.sheet-handle-hit:active .sheet-handle {
  transform: scaleX(1.12);
  background: var(--color-secondary);
}

.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  padding: var(--space-1) var(--space-4) var(--space-2);
  gap: var(--space-2);
}

.sheet-title {
  font-size: 1.125rem;
}

.sheet-close {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-full);
  color: var(--color-on-surface-variant);
}

.sheet-body {
  overflow: auto;
  padding: 0 var(--space-4) var(--space-2);
  flex: 1;
  min-height: 0;
}

.sheet-panel--contain .sheet-body {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  padding-bottom: 0;
  scrollbar-width: none;
}

.sheet-enter-active,
.sheet-leave-active {
  transition: opacity var(--duration-normal) var(--ease-standard);
}

.sheet-enter-active .sheet-panel,
.sheet-leave-active .sheet-panel {
  transition: transform var(--duration-slow) var(--ease-emphasized),
              opacity var(--duration-normal) var(--ease-standard);
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

.sheet-enter-from .sheet-panel {
  transform: translateY(100%) scale(0.97);
  opacity: 0;
}

.sheet-leave-to .sheet-panel {
  transform: translateY(100%);
}

@media (prefers-reduced-motion: reduce) {
  .sheet-enter-active,
  .sheet-leave-active,
  .sheet-enter-active .sheet-panel,
  .sheet-leave-active .sheet-panel,
  .sheet-panel {
    transition: none;
  }
}
</style>
