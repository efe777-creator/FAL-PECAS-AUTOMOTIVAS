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
 * Ordem: XR (gate) → 2d forçado/sem WebGL → glb se aprovado → procedural → 2d.
 */
export function resolveVisualizationSource(
  input: VisualizationResolveInput,
): VisualizationSource {
  if (input.xrEnabled && input.xrSupported) return 'xr'
  if (input.preferredMode === '2d' || !input.webglOk) return '2d'
  // auto + reduced motion → 2D (baseline E5); pref explícita 3d ainda permite 3D estático
  if (input.reducedMotion && input.preferredMode === 'auto') return '2d'
  if (input.hasApprovedGlb) return 'glb'
  if (input.preferredMode === '3d' || input.preferredMode === 'auto') return 'procedural'
  return '2d'
}

/**
 * E3: glb renderiza de verdade quando WebGL ok.
 * XR ainda degrada para procedural até Fase C.
 */
export function effectiveRenderSource(
  resolved: VisualizationSource,
  webglOk: boolean,
  opts?: { glbLoadFailed?: boolean },
): EffectiveRenderSource {
  if (resolved === '2d' || !webglOk) return '2d'
  if (resolved === 'glb' && !opts?.glbLoadFailed) return 'glb'
  if (resolved === 'glb' && opts?.glbLoadFailed) return 'procedural'
  if (resolved === 'procedural' || resolved === 'xr') return 'procedural'
  return '2d'
}

export function visualizationSourceLabel(source: VisualizationSource): string {
  switch (source) {
    case '2d':
      return '2D'
    case 'procedural':
      return '3D procedural (não é modelo realista)'
    case 'glb':
      return '3D GLB (asset aprovado)'
    case 'xr':
      return 'XR (experimental)'
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
