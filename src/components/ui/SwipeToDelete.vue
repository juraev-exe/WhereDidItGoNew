<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Trash2 } from '@lucide/vue'
import { animateSpring, projectMomentum, rubberband, VelocityTracker, type SpringControl } from '@/lib/motion'
import { tickFeedback } from '@/services/native/haptics'

const ACTION = 76

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [boolean]
  delete: []
}>()

const { t } = useI18n()
const offset = ref(0)
const dragging = ref(false)
const isSpringSettling = ref(false)
let startX = 0
let startY = 0
let startOffset = 0
let axis: 'h' | 'v' | null = null
let pointerId: number | null = null
const tracker = new VelocityTracker()
let activeSpring: SpringControl | null = null

watch(
  () => props.open,
  (v) => {
    if (activeSpring) {
      activeSpring.stop()
      activeSpring = null
    }
    isSpringSettling.value = false
    if (!dragging.value) offset.value = v ? -ACTION : 0
  },
)

function onPointerDown(e: PointerEvent) {
  if (e.button !== 0) return
  // Interrupt ongoing spring seamlessly from live presentation coordinate
  if (activeSpring) {
    activeSpring.stop()
    activeSpring = null
    isSpringSettling.value = false
  }
  dragging.value = true
  startX = e.clientX
  startY = e.clientY
  startOffset = offset.value
  axis = null
  pointerId = e.pointerId
  tracker.reset(e.clientX, e.clientY)
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value || e.pointerId !== pointerId) return
  const dx = e.clientX - startX
  const dy = e.clientY - startY
  if (!axis) {
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
    axis = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
    if (axis === 'h') void tickFeedback()
  }
  if (axis !== 'h') return

  tracker.addSample(e.clientX, e.clientY)
  const rawOffset = startOffset + dx

  // Apple Rubber-banding on boundaries
  if (rawOffset > 0) {
    // Over-drag to the right: soft elastic resistance
    offset.value = rubberband(rawOffset, 80, 0.45)
  } else if (rawOffset < -ACTION) {
    // Over-drag past action button width: soft elastic resistance
    const overshoot = rawOffset - -ACTION
    offset.value = -ACTION + rubberband(overshoot, 110, 0.45)
  } else {
    // Direct 1:1 manipulation
    offset.value = rawOffset
  }
}

function finishDrag() {
  dragging.value = false
  pointerId = null
  if (axis !== 'h') {
    axis = null
    return
  }
  axis = null

  const { vx } = tracker.getVelocity() // px/ms
  const currentX = offset.value

  // Apple momentum projection: calculate projected resting endpoint
  const projectedX = currentX + projectMomentum(vx, 0.997)

  // Commit rule: decide if row should snap open or closed
  const shouldOpen = projectedX < -ACTION * 0.45 || (currentX < -15 && vx < -0.32)

  const target = shouldOpen ? -ACTION : 0
  isSpringSettling.value = true
  const hasMomentum = Math.abs(vx) > 0.22

  activeSpring = animateSpring({
    from: currentX,
    to: target,
    initialVelocity: vx,
    dampingRatio: hasMomentum ? 0.82 : 1.0,
    response: 0.32,
    onUpdate: (val) => {
      offset.value = val
    },
    onComplete: () => {
      isSpringSettling.value = false
      activeSpring = null
      offset.value = target
      emit('update:open', shouldOpen)
    },
  })
}

function onPointerUp(e: PointerEvent) {
  if (e.pointerId !== pointerId) return
  finishDrag()
}

function onFrontClick(e: MouseEvent) {
  if (props.open || Math.abs(offset.value) > 4) {
    e.preventDefault()
    e.stopPropagation()
    if (activeSpring) {
      activeSpring.stop()
      activeSpring = null
    }
    isSpringSettling.value = true
    activeSpring = animateSpring({
      from: offset.value,
      to: 0,
      initialVelocity: 0,
      dampingRatio: 1.0,
      response: 0.3,
      onUpdate: (val) => {
        offset.value = val
      },
      onComplete: () => {
        isSpringSettling.value = false
        activeSpring = null
        offset.value = 0
        emit('update:open', false)
      },
    })
  }
}

onUnmounted(() => {
  if (activeSpring) {
    activeSpring.stop()
    activeSpring = null
  }
})
</script>

<template>
  <div class="swipe">
    <button type="button" class="action" :aria-label="t('activity.deleteAria')" @click="emit('delete')">
      <Trash2 :size="18" />
    </button>
    <div
      class="front"
      :class="{ 'front--dragging': dragging || isSpringSettling }"
      :style="{ transform: `translate3d(${offset}px, 0, 0)` }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @click.capture="onFrontClick"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped>
/*
 * Both layers occupy the same grid cell so the reveal is exactly as tall as the
 * row — absolute positioning left a 1px sliver of the action colour on each edge.
 */
.swipe {
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template: minmax(0, 1fr) / minmax(0, 1fr);
}

.action {
  grid-area: 1 / 1;
  justify-self: end;
  width: 76px;
  display: grid;
  place-items: center;
  background: var(--color-tertiary-container);
  color: var(--color-error);
  border-radius: var(--radius-lg);
}

.front {
  grid-area: 1 / 1;
  position: relative;
  z-index: 1;
  background: var(--color-surface);
  touch-action: pan-y;
  transition: transform var(--duration-normal) var(--ease-emphasized);
}

.front--dragging {
  transition: none;
}

@media (prefers-reduced-motion: reduce) {
  .front {
    transition: none;
  }
}
</style>
