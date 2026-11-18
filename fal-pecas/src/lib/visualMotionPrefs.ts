/** A11y / performance: respeitar prefers-reduced-motion. */

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/** Cap de DPR para viewers 3D (mobile/perf). */
export function visualPixelRatioCap(reducedMotion: boolean): number {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  if (reducedMotion) return 1
  return Math.min(dpr, 2)
}
