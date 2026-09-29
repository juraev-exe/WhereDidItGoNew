<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    /** Size in pixels (default: 20) */
    size?: number | string
    /** Custom color (defaults to currentColor) */
    color?: string
    /** Variant: 'ios' (discrete 8-petal tick spinner) or 'ring' (smooth liquid arc) */
    variant?: 'ios' | 'ring'
    /** Accessible label */
    label?: string
  }>(),
  {
    size: 20,
    color: 'currentColor',
    variant: 'ios',
    label: 'Loading…',
  },
)

const dimension = computed(() => (typeof props.size === 'number' ? `${props.size}px` : props.size))
</script>

<template>
  <div
    class="spinner"
    :class="`spinner--${variant}`"
    :style="{ width: dimension, height: dimension, color }"
    role="status"
    :aria-label="label"
  >
    <!-- Apple iOS 8-Petal Activity Indicator -->
    <svg
      v-if="variant === 'ios'"
      class="spinner-svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="11" y="2" width="2" height="5" rx="1" opacity="1.0" />
      <rect x="11" y="2" width="2" height="5" rx="1" transform="rotate(45 12 12)" opacity="0.875" />
      <rect x="11" y="2" width="2" height="5" rx="1" transform="rotate(90 12 12)" opacity="0.75" />
      <rect x="11" y="2" width="2" height="5" rx="1" transform="rotate(135 12 12)" opacity="0.625" />
      <rect x="11" y="2" width="2" height="5" rx="1" transform="rotate(180 12 12)" opacity="0.5" />
      <rect x="11" y="2" width="2" height="5" rx="1" transform="rotate(225 12 12)" opacity="0.375" />
      <rect x="11" y="2" width="2" height="5" rx="1" transform="rotate(270 12 12)" opacity="0.25" />
      <rect x="11" y="2" width="2" height="5" rx="1" transform="rotate(315 12 12)" opacity="0.125" />
    </svg>

    <!-- Apple Smooth Circular Arc Spinner -->
    <svg
      v-else
      class="spinner-ring-svg"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        class="ring-bg"
        cx="16"
        cy="16"
        r="13"
        stroke="currentColor"
        stroke-width="3"
        opacity="0.18"
      />
      <circle
        class="ring-arc"
        cx="16"
        cy="16"
        r="13"
        stroke="currentColor"
        stroke-width="3"
        stroke-linecap="round"
        stroke-dasharray="80"
        stroke-dashoffset="56"
      />
    </svg>
  </div>
</template>

<style scoped>
.spinner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  vertical-align: middle;
}

/* Apple iOS 8-Petal Discrete Tick Animation */
.spinner--ios .spinner-svg {
  width: 100%;
  height: 100%;
  animation: appleIosSpin 0.8s steps(8, end) infinite;
  transform-origin: center;
}

@keyframes appleIosSpin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Apple Smooth Ring Animation */
.spinner--ring .spinner-ring-svg {
  width: 100%;
  height: 100%;
  animation: appleRingRotate 0.9s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  transform-origin: center;
}

@keyframes appleRingRotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .spinner--ios .spinner-svg,
  .spinner--ring .spinner-ring-svg {
    animation-duration: 2.4s;
  }
}
</style>
