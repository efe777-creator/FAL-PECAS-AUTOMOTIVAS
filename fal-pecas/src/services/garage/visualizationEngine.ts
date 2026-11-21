/**
 * PLANO 2B Fase B — FAL Vehicle Visualization Engine (contrato).
 * Fundação 2026-11-21: 2D-first; procedural só com preferência 3d explícita; falha GLB → 2d.
 */

export type VisualizationSource = '2d' | 'procedural' | 'glb' | 'xr'

export type VisualizationResolveInput = {
  preferredMode: 'auto' | '2d' | '3d'
  webglOk: boolean
  /** Asset GLB aprovado e não-smoke para este veículo. */
  hasApprovedGlb: boolean
  /** Gate Fase C — UI cliente oculta nesta onda; engine mantém contrato. */
  xrEnabled?: boolean
  xrSupported?: boolean
  /** E5: em `auto`, reduced motion prefere 2D (perf/a11y). */
  reducedMotion?: boolean
}

export type EffectiveRenderSource = '2d' | 'procedural' | 'glb'

/**
 * Ordem (fundação): 2d forçado/sem WebGL/reduced-motion+auto → glb aprovado →
 * procedural só se pref 3d sem GLB → senão 2d.
 * XR só com gate+suporte e pref não-2d (UI não liga nesta onda).
 */
export function resolveVisualizationSource(
  input: VisualizationResolveInput,
): VisualizationSource {
  if (input.preferredMode === '2d' || !input.webglOk) return '2d'
  if (input.reducedMotion && input.preferredMode === 'auto') return '2d'
  if (
    input.xrEnabled &&
    input.xrSupported &&
    !input.reducedMotion &&
    input.preferredMode === '3d'
  ) {
    return 'xr'
  }
  if (input.hasApprovedGlb) return 'glb'
  if (input.preferredMode === '3d') return 'procedural'
  // auto sem GLB → 2d (não procedural)
  return '2d'
}

/**
 * Canvas real: 2d | procedural | glb.
 * Falha GLB → 2d (não procedural). XR base: glb → 2d.
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
        : '2d'
      : resolved

  if (base === '2d' || !webglOk) return '2d'
  if (base === 'glb' && !opts?.glbLoadFailed) return 'glb'
  if (base === 'glb' && opts?.glbLoadFailed) return '2d'
  if (base === 'procedural') return 'procedural'
  return '2d'
}

/** Smoke / placeholder admin não conta como GLB “real” no cliente. */
export function isSmokeOrPlaceholderGlb(code: string | null | undefined): boolean {
  const c = (code ?? '').toLowerCase()
  return c.includes('smoke') || c.includes('placeholder')
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
