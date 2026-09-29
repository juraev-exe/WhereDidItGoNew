/**
 * Apple Design System & Fluid Motion Physics
 *
 * Implements core fluid motion principles from Apple WWDC:
 * - Designing Fluid Interfaces (WWDC 2018)
 * - The Details of UI Typography (WWDC 2020)
 * - Principles of Great Design (WWDC 2026)
 *
 * Provides:
 * 1. Rubberband resistance for physical boundaries
 * 2. Momentum projection for natural release snap-points
 * 3. Velocity tracking for seamless gesture-to-animation handoffs
 * 4. Analytical, interruptible spring solver (closed-form, zero drift)
 */

/**
 * Apple asymptotic rubberband resistance curve.
 *
 * Real physical boundaries resist progressively rather than halting hard.
 * At an edge, the further past the boundary the user drags, the stiffer
 * the resistance becomes.
 *
 * @param overshoot Distance past the boundary (px)
 * @param dimension Dimension of the surface or travel distance (px)
 * @param constant Elasticity constant (Apple UIKit default ≈ 0.55)
 */
export function rubberband(overshoot: number, dimension = 320, constant = 0.55): number {
  if (overshoot === 0) return 0
  const sign = overshoot < 0 ? -1 : 1
  const absOvershoot = Math.abs(overshoot)
  return sign * ((absOvershoot * dimension * constant) / (dimension + constant * absOvershoot))
}

/**
 * Apple momentum projection equation (WWDC 2018).
 *
 * Predicts the resting endpoint of a moving gesture based on its release velocity,
 * using exponential deceleration decay (rather than crude v²/2a).
 *
 * @param velocityPxPerMs Release velocity in px/ms
 * @param decelerationRate Deceleration constant (0.998 for standard iOS feel, 0.99 for snappier)
 */
export function projectMomentum(velocityPxPerMs: number, decelerationRate = 0.998): number {
  const vPxPerSec = velocityPxPerMs * 1000
  return (vPxPerSec / 1000) * decelerationRate / (1 - decelerationRate)
}

/**
 * Sliding-window pointer velocity tracker.
 *
 * Tracks the last 100ms of pointer samples to compute clean, jitter-free
 * instantaneous velocity on pointerup/release.
 */
export class VelocityTracker {
  private samples: Array<{ t: number; x: number; y: number }> = []

  reset(x = 0, y = 0, t = performance.now()): void {
    this.samples = [{ t, x, y }]
  }

  addSample(x: number, y: number, t = performance.now()): void {
    this.samples.push({ t, x, y })
    const cutoff = t - 100
    while (this.samples.length > 2 && this.samples[0].t < cutoff) {
      this.samples.shift()
    }
  }

  /**
   * Compute velocity in px/ms.
   */
  getVelocity(): { vx: number; vy: number } {
    if (this.samples.length < 2) return { vx: 0, vy: 0 }
    const first = this.samples[0]
    const last = this.samples[this.samples.length - 1]
    const dt = Math.max(last.t - first.t, 1)
    return {
      vx: (last.x - first.x) / dt,
      vy: (last.y - first.y) / dt,
    }
  }
}

export interface SpringConfig {
  from: number
  to: number
  /** Velocity at release in px/ms */
  initialVelocity?: number
  /** Damping ratio ζ: 1.0 = critically damped (no overshoot), ~0.82 = momentum bounce */
  dampingRatio?: number
  /** Response time T in seconds: lower is snappier (Apple defaults: 0.3 - 0.4s) */
  response?: number
  /** Called every animation frame with current position and velocity */
  onUpdate: (val: number, vel: number) => void
  /** Called when spring settles or is finalized */
  onComplete?: () => void
}

export interface SpringControl {
  stop: () => void
  currentValue: () => number
}

/**
 * Closed-form Analytical Apple Spring Solver.
 *
 * Unconditionally stable across variable frame rates (60Hz, 120Hz ProMotion).
 * Seamlessly inherits gesture release velocity and allows instant mid-flight interruption.
 */
export function animateSpring(config: SpringConfig): SpringControl {
  const {
    from,
    to,
    initialVelocity = 0,
    dampingRatio = 1.0,
    response = 0.35,
    onUpdate,
    onComplete,
  } = config

  // Reduced motion check: settle immediately if user requested reduced motion
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    onUpdate(to, 0)
    onComplete?.()
    return {
      stop: () => {},
      currentValue: () => to,
    }
  }

  let rafId: number | null = null
  let stopped = false
  let currentVal = from
  let currentVel = initialVelocity * 1000 // Convert px/ms to px/s

  const startTime = performance.now()
  const omega0 = (2 * Math.PI) / Math.max(response, 0.05)
  const v0 = currentVel
  const x0 = from - to

  function step(now: number) {
    if (stopped) return

    const t = Math.max((now - startTime) / 1000, 0)

    let x: number
    let v: number

    if (Math.abs(dampingRatio - 1.0) < 0.001) {
      // Critically damped (ζ = 1.0)
      const c1 = x0
      const c2 = v0 + omega0 * c1
      const decay = Math.exp(-omega0 * t)
      x = (c1 + c2 * t) * decay
      v = (c2 - omega0 * (c1 + c2 * t)) * decay
    } else if (dampingRatio < 1.0) {
      // Underdamped (ζ < 1.0) — momentum bounce
      const omegaD = omega0 * Math.sqrt(1 - dampingRatio * dampingRatio)
      const c1 = x0
      const c2 = (v0 + dampingRatio * omega0 * c1) / omegaD
      const decay = Math.exp(-dampingRatio * omega0 * t)
      const cosVal = Math.cos(omegaD * t)
      const sinVal = Math.sin(omegaD * t)
      x = decay * (c1 * cosVal + c2 * sinVal)
      v =
        decay *
        ((omegaD * c2 - dampingRatio * omega0 * c1) * cosVal -
          (omegaD * c1 + dampingRatio * omega0 * c2) * sinVal)
    } else {
      // Overdamped (ζ > 1.0)
      const alpha = omega0 * Math.sqrt(dampingRatio * dampingRatio - 1)
      const gamma1 = -dampingRatio * omega0 + alpha
      const gamma2 = -dampingRatio * omega0 - alpha
      const c2 = (v0 - gamma1 * x0) / (gamma2 - gamma1)
      const c1 = x0 - c2
      x = c1 * Math.exp(gamma1 * t) + c2 * Math.exp(gamma2 * t)
      v = c1 * gamma1 * Math.exp(gamma1 * t) + c2 * gamma2 * Math.exp(gamma2 * t)
    }

    currentVal = to + x
    currentVel = v

    // Check convergence: close to target and minimal velocity, or elapsed limit
    const distance = Math.abs(x)
    const speed = Math.abs(v)

    if ((distance < 0.25 && speed < 5) || t > 1.4) {
      currentVal = to
      currentVel = 0
      onUpdate(to, 0)
      onComplete?.()
      return
    }

    onUpdate(currentVal, currentVel / 1000)
    rafId = requestAnimationFrame(step)
  }

  rafId = requestAnimationFrame(step)

  return {
    stop: () => {
      stopped = true
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
    },
    currentValue: () => currentVal,
  }
}
