/**
 * Assertividade pós-consulta de placa (Notes #6).
 * Cruza resultado ApiPlacas/INV com o catálogo FAL — sem inventar PVC.
 * Pode elevar status para `ambiguous` quando há modelos irmãos próximos.
 */
import type {
  PlateLookupCandidate,
  PlateLookupResult,
  PlateLookupStatus,
} from '@/services/plates/plateTypes'
import {
  detectSiblingModelAmbiguity,
  rankCatalogModels,
  resolveMakerAgainstTree,
  scoreModelMatch,
  type CatalogModelRank,
} from '@/services/plates/siblingModelAmbiguity'
import { vehicleModelKey } from '@/services/vehicles/vehicleOptionKeys'
import type { VehicleOptionTree } from '@/types'

export type PlateConfidenceBand = 'A' | 'B' | 'C' | 'D'

export type { CatalogModelRank }
export { resolveMakerAgainstTree, scoreModelMatch, rankCatalogModels }

export function derivePlateConfidenceBand(input: {
  confidence: number | null
  status: PlateLookupStatus
  ambiguousCount: number
  topModelScore: number | null
  edgeBand?: PlateConfidenceBand | null
}): PlateConfidenceBand {
  if (input.edgeBand === 'A' || input.edgeBand === 'B' || input.edgeBand === 'C' || input.edgeBand === 'D') {
    if (input.ambiguousCount >= 2) {
      if (input.edgeBand === 'D') return 'D'
      return 'C'
    }
    return input.edgeBand
  }
  if (input.status === 'ambiguous' || input.ambiguousCount >= 2) return 'C'
  if (input.status === 'incomplete' || input.status === 'not_in_catalog') return 'C'
  if (input.topModelScore != null && input.topModelScore < 70) return 'C'
  if (input.topModelScore != null && input.topModelScore < 90) return 'B'
  const c = input.confidence
  if (c == null) return 'B'
  if (c >= 0.85) return 'A'
  if (c >= 0.65) return 'B'
  if (c >= 0.4) return 'C'
  return 'D'
}

export function plateBandAssertivenessCopy(band: PlateConfidenceBand): string {
  switch (band) {
    case 'A':
      return 'Identificação alta — ainda assim confira modelo, ano e motor antes de buscar.'
    case 'B':
      return 'Identificação boa, com possíveis ajustes. Confira cada campo.'
    case 'C':
      return 'Identificação parcial ou ambígua — revise com cuidado (modelo/motor podem estar trocados).'
    case 'D':
      return 'Baixa certeza — prefira selecionar o veículo manualmente ou corrigir todos os campos.'
  }
}

/**
 * Cruza lookup com árvore FAL. Pode:
 * - alinhar maker/model ao cadastro
 * - promover `ambiguous` + candidates quando há irmãos próximos
 * - anexar `confidenceBand`
 */
export function assertPlateAgainstCatalog(
  result: PlateLookupResult,
  tree: VehicleOptionTree,
): PlateLookupResult {
  if (
    result.status === 'invalid_plate' ||
    result.status === 'not_found' ||
    result.status === 'unavailable'
  ) {
    return {
      ...result,
      confidenceBand: result.confidenceBand ?? 'D',
    }
  }

  const sibling = detectSiblingModelAmbiguity(tree, result.maker, result.model)
  const ranks = sibling.ranks
  const top = ranks[0] ?? null

  let status = result.status
  let candidates: PlateLookupCandidate[] = result.candidates?.length
    ? [...result.candidates]
    : []
  let maker = result.maker
  let model = result.model
  let message = result.message

  if (sibling.ambiguous && ranks.length >= 2) {
    const a = ranks[0]!
    const b = ranks[1]!
    status = 'ambiguous'
    const year = result.year
    candidates = ranks.slice(0, 4).map((r) => ({
      maker: r.maker,
      model: r.model,
      year,
      version: result.version,
      engine: result.engine,
      manufacturerId: null,
      modelId: null,
      versionId: null,
    }))
    message =
      message ??
      `Encontramos mais de um modelo parecido no cadastro FAL (${a.model} × ${b.model}). Escolha o correto.`
  } else if (top && top.score >= 90) {
    maker = top.maker
    model = top.model
  } else if (top && top.score >= 70) {
    maker = top.maker
    model = top.model
    if (!message) {
      message =
        'Alinhamos o modelo ao cadastro FAL. Confira se está certo antes de buscar peças.'
    }
  }

  let confidenceBand = derivePlateConfidenceBand({
    confidence: result.confidence,
    status,
    ambiguousCount: candidates.length,
    topModelScore: top?.score ?? null,
    edgeBand: result.confidenceBand ?? null,
  })

  const yearNum = result.year != null ? Number(String(result.year).slice(0, 4)) : NaN
  if (
    maker &&
    model &&
    Number.isFinite(yearNum) &&
    tree.productionByModel
  ) {
    const prod = tree.productionByModel[vehicleModelKey(maker, model)]
    if (prod && (prod.start != null || prod.end != null)) {
      const lo = prod.start
      // end null = em linha: teto soft = ano corrente+1 (bloqueia absurdo futuro)
      const hi =
        prod.end != null
          ? prod.end
          : new Date().getFullYear() + 1
      const outside =
        (lo != null && yearNum < lo) || yearNum > hi
      if (outside) {
        if (confidenceBand === 'A') confidenceBand = 'B'
        else if (confidenceBand === 'B') confidenceBand = 'C'
        else confidenceBand = 'D'
        const endLabel = prod.end != null ? String(prod.end) : 'em linha'
        message =
          message ??
          `Ano ${yearNum} fora da vida de linha cadastrada do modelo (${lo ?? '…'}–${endLabel}). Confira antes de buscar.`
      }
    }
  }

  // Dual year: fab ≠ modelo → rebaixa e avisa (peças usam ano-modelo).
  const fab = result.yearFabrication
  const yModel = result.yearModel ?? result.year
  if (
    fab &&
    yModel &&
    String(fab).slice(0, 4) !== String(yModel).slice(0, 4) &&
    confidenceBand === 'A'
  ) {
    confidenceBand = 'B'
    message =
      message ??
      `Ano fabricação (${fab}) ≠ ano-modelo (${yModel}). Peças usam o ano-modelo — confira.`
  }

  if (confidenceBand === 'C' || confidenceBand === 'D') {
    if (status === 'found') status = 'incomplete'
  }

  const fullyIdentified = status === 'found'
  const makerInTree =
    !!maker &&
    !!model &&
    Array.isArray(tree.modelsByMaker?.[maker]) &&
    tree.modelsByMaker[maker]!.some((m) => m.toLowerCase() === model.toLowerCase())
  // FKs só sobrevivem se o par está na árvore verified e o status é identificação plena.
  const keepFks = fullyIdentified && makerInTree

  return {
    ...result,
    status,
    maker,
    model,
    year: yModel ?? result.year,
    yearModel: yModel ?? result.yearModel ?? null,
    yearFabrication: fab ?? result.yearFabrication ?? null,
    manufacturerId: keepFks ? result.manufacturerId : null,
    modelId: keepFks ? result.modelId : null,
    versionId: keepFks ? result.versionId : null,
    candidates,
    message,
    confidenceBand,
    identityAsserted: true,
    identificationStatus:
      status === 'ambiguous'
        ? 'ambiguous'
        : status === 'not_in_catalog'
          ? 'unidentified'
          : status === 'incomplete'
            ? 'partially_identified'
            : 'identified',
  }
}
