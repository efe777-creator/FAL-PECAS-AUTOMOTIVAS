export type VisualViewerMode = 'auto' | '2d' | '3d'

const KEY = 'fal-garage-visual-viewer-v1'

export function readVisualViewerMode(): VisualViewerMode {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw === '2d' || raw === '3d' || raw === 'auto') return raw
  } catch {
    /* ignore */
  }
  // Fundação: default 2d (auto legado ainda válido se gravado)
  return '2d'
}

export function writeVisualViewerMode(mode: VisualViewerMode): void {
  try {
    localStorage.setItem(KEY, mode)
  } catch {
    /* ignore */
  }
}

/** Resolve modo efetivo: 3D só com pref explícita `3d` + WebGL (fundação 2D-first). */
export function resolveViewerMode(
  preferred: VisualViewerMode,
  webglOk: boolean,
): '2d' | '3d' {
  if (!webglOk) return '2d'
  if (preferred === '3d') return '3d'
  return '2d'
}
