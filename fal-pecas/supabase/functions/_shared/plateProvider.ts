/** Contrato provider-agnostic de consulta por placa (Edge). */

export type PlateLookupStatus =
  | 'found'
  | 'not_found'
  | 'incomplete'
  | 'ambiguous'
  | 'unavailable'
  | 'invalid_plate'
  | 'not_in_catalog'

export type PlateLookupSource = 'mock' | 'apiplacas'

export interface PlateProviderRaw {
  maker: string | null
  model: string | null
  year: string | null
  version: string | null
  engine: string | null
  fuel: string | null
  transmission: string | null
  status: PlateLookupStatus
  message: string | null
  confidence: number | null
  vehicleGroup: string | null
  candidates?: Array<{
    maker: string | null
    model: string | null
    year: string | null
    version: string | null
    engine: string | null
  }>
}

export interface PlateLookupProvider {
  readonly source: PlateLookupSource
  lookupByPlate(plate: string): Promise<PlateProviderRaw>
}

export interface NormalizedPlateLookupResult {
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
  candidates: Array<{
    maker: string | null
    model: string | null
    year: string | null
    version: string | null
    engine: string | null
    manufacturerId?: string | null
    modelId?: string | null
    versionId?: string | null
  }>
  isMock: boolean
}

const PLATE_STRIP = /[^A-Za-z0-9]/g
const PLATE_ANTIGA = /^[A-Z]{3}\d{4}$/
const PLATE_MERCOSUL = /^[A-Z]{3}\d[A-Z]\d{2}$/

export function normalizePlate(raw: string): string {
  return String(raw ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(PLATE_STRIP, '')
    .toUpperCase()
}

export function isValidPlate(normalized: string): boolean {
  return PLATE_ANTIGA.test(normalized) || PLATE_MERCOSUL.test(normalized)
}
