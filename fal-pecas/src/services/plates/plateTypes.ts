import type { VehicleFilter } from '@/types'
import type { PlateConfidenceBand } from '@/services/plates/plateIdentityAssert'
import { isModelNameClean, splitApiModelo } from '@/services/plates/splitApiModelo'
import {
  buildPlateSourceSnapshot,
  type PlateSourceSnapshot,
} from '@/services/plates/plateSourceSnapshot'

export type { PlateConfidenceBand }

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

export type PlateIdentificationStatus =
  | 'identified'
  | 'partially_identified'
  | 'ambiguous'
  | 'unidentified'

export interface PlateLookupResult {
  plate: string
  status: PlateLookupStatus
  maker: string | null
  model: string | null
  /** Ano canônico do filtro (preferência: ano-modelo). */
  year: string | null
  /** Ano-modelo comercial (peças / VV). */
  yearModel?: string | null
  /** Ano de fabricação (informativo; não predicado PVC). */
  yearFabrication?: string | null
  version: string | null
  engine: string | null
  /** Bruto quando sanitize zerou — não usar no filtro de peças. */
  engineRaw?: string | null
  versionRaw?: string | null
  fuel: string | null
  transmission: string | null
  manufacturerId: string | null
  modelId: string | null
  versionId: string | null
  vehicleGroup: string | null
  source: PlateLookupSource
  queriedAt: string
  confidence: number | null
  /** INV / assertividade no catálogo (A–D). */
  confidenceBand?: PlateConfidenceBand | null
  /** Nível de identificação (estilo AutoUncle). */
  identificationStatus?: PlateIdentificationStatus | null
  message: string | null
  candidates: PlateLookupCandidate[]
  /** Ambiente de teste — UI deve deixar claro que não é consulta real. */
  isMock: boolean
  /** R3 — snapshot congelado da consulta (opcional; montado no client se ausente). */
  sourceSnapshot?: PlateSourceSnapshot | null
  /** Client passou por `assertPlateAgainstCatalog`. */
  identityAsserted?: boolean
  /** Assistência LLM aplicada (merge validado no catálogo). */
  identityLlmAssisted?: boolean
}

export function plateResultToFilter(result: PlateLookupResult): VehicleFilter {
  const identified = Boolean(result.maker && result.model)
  let model = result.model ?? undefined
  let engine =
    result.engine != null && String(result.engine).trim()
      ? String(result.engine).trim()
      : undefined
  let version =
    result.version != null && String(result.version).trim()
      ? String(result.version).trim()
      : undefined

  // Nunca deixar versão/motor colados no modelo do filtro (cache legado / API).
  if (model && !isModelNameClean(model)) {
    const split = splitApiModelo(model)
    model = split.model || model
    if (!engine && split.engine) engine = split.engine
    if (!version && split.version) version = split.version
  }

  const yearModel = result.yearModel ?? result.year
  const yearFabrication = result.yearFabrication ?? null
  // Filtro de peças = ano-modelo (não fabricação).
  const year = yearModel ?? result.year

  const sourceSnapshot =
    result.sourceSnapshot ??
    buildPlateSourceSnapshot({
      plate: result.plate,
      queriedAt: result.queriedAt,
      source: result.source,
      status: result.status,
      maker: result.maker,
      model,
      year,
      yearModel,
      yearFabrication,
      engine: engine ?? result.engine,
      version: version ?? result.version,
      engineRaw: result.engineRaw,
      versionRaw: result.versionRaw,
      fuel: result.fuel,
      transmission: result.transmission,
      confidence: result.confidence,
    })

  return {
    maker: result.maker ?? undefined,
    model,
    year: year ?? undefined,
    // Placa sem motor/versão → "" ("Não informado") para o select não ficar em branco
    engine: engine ?? (identified ? '' : undefined),
    version: version ?? (identified ? '' : undefined),
    plate: result.plate || undefined,
    manufacturerId: result.manufacturerId ?? undefined,
    modelId: result.modelId ?? undefined,
    versionId: result.versionId ?? undefined,
    engineRaw: result.engineRaw?.trim() || undefined,
    versionRaw: result.versionRaw?.trim() || undefined,
    sourceSnapshot,
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
