/**
 * PLANO 2B Fase B — FAL Vehicle Visualization Engine (contrato).
 * UI não escolhe tecnologia: resolve source a partir de capability + prefs + assets.
 */

export type VisualizationSource = '2d' | 'procedural' | 'glb' | 'xr'

export type VisualizationResolveInput = {
  preferredMode: 'auto' | '2d' | '3d'
  webglOk: boolean
  /** Asset GLB aprovado para este veículo. */
  hasApprovedGlb: boolean
  /** Gate Fase C. */
  xrEnabled?: boolean
  xrSupported?: boolean
  /** E5: em `auto`, reduced motion prefere 2D (perf/a11y). */
  reducedMotion?: boolean
}

export type EffectiveRenderSource = '2d' | 'procedural' | 'glb'

/**
 * Ordem: XR (gate+suporte, sem reduced-motion) → 2d forçado/sem WebGL → glb → procedural → 2d.
 */
export function resolveVisualizationSource(
  input: VisualizationResolveInput,
): VisualizationSource {
  if (input.xrEnabled && input.xrSupported && !input.reducedMotion) return 'xr'
  if (input.preferredMode === '2d' || !input.webglOk) return '2d'
  // auto + reduced motion → 2D (baseline E5); pref explícita 3d ainda permite 3D estático
  if (input.reducedMotion && input.preferredMode === 'auto') return '2d'
  if (input.hasApprovedGlb) return 'glb'
  if (input.preferredMode === '3d' || input.preferredMode === 'auto') return 'procedural'
  return '2d'
}

/**
 * Canvas real: 2d | procedural | glb.
 * XR (C1) envolve o canvas base via launcher; base = glb → procedural → 2d.
 */
export function effectiveRenderSource(
  resolved: VisualizationSource,
  webglOk: boolean,
  opts?: { glbLoadFailed?: boolean; hasApprovedGlb?: boolean },
): EffectiveRenderSource {
  const base: VisualizationSource =
    resolved === 'xr'
      ? opts?.hasApprovedGlb && !opts?.glbLoadFailed
        ? 'glb'
        : webglOk
          ? 'procedural'
          : '2d'
      : resolved

  if (base === '2d' || !webglOk) return '2d'
  if (base === 'glb' && !opts?.glbLoadFailed) return 'glb'
  if (base === 'glb' && opts?.glbLoadFailed) return 'procedural'
  if (base === 'procedural') return 'procedural'
  return '2d'
}

/** Copy humana para o cliente (sem jargão Engine/GLB/2B). */
export function visualizationSourceLabel(source: VisualizationSource): string {
  switch (source) {
    case '2d':
      return 'Imagem ilustrativa'
    case 'procedural':
      return 'Modelo 3D provisório'
    case 'glb':
      return 'Modelo 3D'
    case 'xr':
      return 'Realidade aumentada (experimental)'
    default:
      return source
  }
}

export function glbLoaderAvailable(): true {
  return true
}

export function visualizationNeverWrites2A(): true {
  return true
}
