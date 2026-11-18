/**
 * PLANO 2B Fase B E1 — FAL Vehicle Visualization Engine (contrato).
 * UI não escolhe tecnologia: resolve source a partir de capability + prefs + assets.
 * GLB/XR reservados; B1 só emite 2d | procedural.
 */

export type VisualizationSource = '2d' | 'procedural' | 'glb' | 'xr'

export type VisualizationResolveInput = {
  preferredMode: 'auto' | '2d' | '3d'
  webglOk: boolean
  /** Asset GLB aprovado para este veículo (Fase B E2+). B1 = sempre false. */
  hasApprovedGlb: boolean
  /** Gate Fase C. B1 = sempre false. */
  xrEnabled?: boolean
  xrSupported?: boolean
}

/**
 * Ordem: XR (gate) → 2d forçado/sem WebGL → glb se aprovado → procedural → 2d.
 */
export function resolveVisualizationSource(
  input: VisualizationResolveInput,
): VisualizationSource {
  if (input.xrEnabled && input.xrSupported) return 'xr'
  if (input.preferredMode === '2d' || !input.webglOk) return '2d'
  if (input.hasApprovedGlb) return 'glb'
  if (input.preferredMode === '3d' || input.preferredMode === 'auto') return 'procedural'
  return '2d'
}

/** B1: glb/xr ainda não renderizam — degradam para procedural ou 2d. */
export function effectiveRenderSource(
  resolved: VisualizationSource,
  webglOk: boolean,
): '2d' | 'procedural' {
  if (resolved === '2d' || !webglOk) return '2d'
  if (resolved === 'glb' || resolved === 'procedural') return 'procedural'
  // xr sem suporte de render nesta etapa
  return webglOk ? 'procedural' : '2d'
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

export function glbLoaderAvailable(): false {
  return false
}

export function visualizationNeverWrites2A(): true {
  return true
}
