/**
 * FAL — contrato de evidência do mestre de veículos (somente leitura).
 *
 * Adaptadores (OEM / Senatran / PBEV / FIPE oficial / fipeX) produzem `VehicleEvidence`
 * para relatório/revisão. Eles NÃO escrevem em `models`, `vehicle_versions` ou PVC.
 *
 * Regra de aprovação: `verified` exige 1 fonte A1 ou 2 fontes A2 concordantes;
 * fonte B nunca promove sozinha (gera `review`).
 */

export type VehicleEvidenceSourceId = 'oem' | 'senatran' | 'pbev' | 'fipe_official' | 'fipex'
export type VehicleEvidenceTier = 'A1' | 'A2' | 'B'

export type VehicleEvidence = {
  sourceId: VehicleEvidenceSourceId
  authorityTier: VehicleEvidenceTier
  maker: string
  rawDescription: string
  referenceYear: number | null
  vehicleClass: string | null
  sourceUrl: string
  license: string
  fetchedAt: string
  checksum: string | null
}

/** Entrada frouxa de um adaptador (campos mínimos). */
export type VehicleEvidenceInput = {
  sourceId: VehicleEvidenceSourceId
  authorityTier: VehicleEvidenceTier
  maker?: string | null
  rawDescription?: string | null
  referenceYear?: number | string | null
  vehicleClass?: string | null
  sourceUrl?: string | null
  license?: string | null
  fetchedAt?: string | null
  checksum?: string | null
}

/**
 * Stub: normaliza uma entrada de adaptador para `VehicleEvidence`.
 * Retorna null se faltar maker/descrição/URL (evidência sem origem não vale).
 * Puro, sem I/O e sem escrita no mestre.
 */
export function toVehicleEvidence(input: VehicleEvidenceInput): VehicleEvidence | null {
  const maker = input.maker?.trim()
  const rawDescription = input.rawDescription?.trim()
  const sourceUrl = input.sourceUrl?.trim()
  if (!maker || !rawDescription || !sourceUrl) return null

  const year =
    input.referenceYear == null || input.referenceYear === ''
      ? null
      : Number(input.referenceYear)

  return {
    sourceId: input.sourceId,
    authorityTier: input.authorityTier,
    maker,
    rawDescription,
    referenceYear: year != null && Number.isFinite(year) ? year : null,
    vehicleClass: input.vehicleClass?.trim() || null,
    sourceUrl,
    license: input.license?.trim() || 'unknown',
    fetchedAt: input.fetchedAt?.trim() || new Date().toISOString(),
    checksum: input.checksum?.trim() || null,
  }
}
