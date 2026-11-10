import type { VehicleFilter } from '@/types'

export type PlateLookupStatus =
  | 'found'
  | 'not_found'
  | 'incomplete'
  | 'ambiguous'
  | 'unavailable'
  | 'invalid_plate'
  | 'not_in_catalog'

export type PlateLookupSource = 'mock' | 'apiplacas'

export interface PlateLookupCandidate {
  maker: string | null
  model: string | null
  year: string | null
  version: string | null
  engine: string | null
  fuel?: string | null
  transmission?: string | null
  manufacturerId?: string | null
  modelId?: string | null
  versionId?: string | null
}

export interface PlateLookupResult {
  plate: string
  status: PlateLookupStatus
  maker: string | null
  model: string | null
  year: string | null
  version: string | null
  engine: string | null
  fuel: string | null
  transmission: string | null
  manufacturerId: string | null
  modelId: string | null
  versionId: string | null
  vehicleGroup: string | null
  source: PlateLookupSource
  queriedAt: string
  confidence: number | null
  message: string | null
  candidates: PlateLookupCandidate[]
  /** Ambiente de teste — UI deve deixar claro que não é consulta real. */
  isMock: boolean
}

export function plateResultToFilter(result: PlateLookupResult): VehicleFilter {
  const identified = Boolean(result.maker && result.model)
  return {
    maker: result.maker ?? undefined,
    model: result.model ?? undefined,
    year: result.year ?? undefined,
    // Placa sem motor/versão → "" ("Não informado") para o select não ficar em branco
    engine:
      result.engine != null && String(result.engine).trim()
        ? String(result.engine).trim()
        : identified
          ? ''
          : undefined,
    version:
      result.version != null && String(result.version).trim()
        ? String(result.version).trim()
        : identified
          ? ''
          : undefined,
  }
}

export function isPlateLookupSuccess(status: PlateLookupStatus): boolean {
  return status === 'found' || status === 'incomplete'
}

export function requiresManualSelection(status: PlateLookupStatus): boolean {
  return (
    status === 'not_found' ||
    status === 'unavailable' ||
    status === 'invalid_plate'
  )
}

/** Tem dados suficientes para tela de conferência (mesmo se fora do cadastro FAL). */
export function canOpenConfirmation(result: {
  status: PlateLookupStatus
  maker: string | null
  model: string | null
  candidates?: unknown[]
}): boolean {
  if (result.status === 'ambiguous') return true
  if (result.status === 'found' || result.status === 'incomplete') return true
  if (result.status === 'not_in_catalog' && (result.maker || result.model)) return true
  return false
}
