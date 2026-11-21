/**
 * Assertividade pós-consulta de placa (Notes #6).
 * Cruza resultado ApiPlacas/INV com o catálogo FAL — sem inventar PVC.
 * Pode elevar status para `ambiguous` quando há modelos irmãos próximos.
 */
import { normalizeVehicleToken } from '@/services/plates/reconcileVehicleFilter'
import { splitApiModelo } from '@/services/plates/splitApiModelo'
import type {
  PlateLookupCandidate,
  PlateLookupResult,
  PlateLookupStatus,
} from '@/services/plates/plateTypes'
import type { VehicleOptionTree } from '@/types'

export type PlateConfidenceBand = 'A' | 'B' | 'C' | 'D'

export type CatalogModelRank = {
  maker: string
  model: string
  score: number
}

const MAKER_ALIASES: Record<string, string> = {
  chev: 'Chevrolet',
  gm: 'Chevrolet',
  chevy: 'Chevrolet',
  vw: 'Volkswagen',
  mercedes: 'Mercedes-Benz',
}

export function resolveMakerAgainstTree(
  tree: VehicleOptionTree,
  maker: string | null | undefined,
): string | null {
  if (!maker?.trim()) return null
  const alias = MAKER_ALIASES[normalizeVehicleToken(maker)] ?? maker
  const n = normalizeVehicleToken(alias)
  const exact = tree.makers.find((m) => normalizeVehicleToken(m) === n)
  if (exact) return exact
  const starts = tree.makers.find(
    (m) =>
      normalizeVehicleToken(m).startsWith(n) || n.startsWith(normalizeVehicleToken(m)),
  )
  return starts ?? alias
}

/** Score 0–100: quão perto o modelo da placa está de um modelo do cadastro. */
export function scoreModelMatch(catalogModel: string, needle: string): number {
  const a = normalizeVehicleToken(catalogModel)
  const b = normalizeVehicleToken(needle)
  if (!a || !b) return 0
  if (a === b) return 100
  if (a.startsWith(b) || b.startsWith(a)) {
    const ratio = Math.min(a.length, b.length) / Math.max(a.length, b.length)
    return Math.round(70 + ratio * 25)
  }
  // Prefixo comum (HB20X vs HB20)
  let common = 0
  const len = Math.min(a.length, b.length)
  while (common < len && a[common] === b[common]) common += 1
  if (common >= 3) {
    return Math.round(40 + (common / Math.max(a.length, b.length)) * 40)
  }
  return 0
}

export function rankCatalogModels(
  tree: VehicleOptionTree,
  maker: string | null,
  modelRaw: string | null,
): CatalogModelRank[] {
  if (!modelRaw?.trim()) return []
  const modelNeedle = splitApiModelo(modelRaw).model || modelRaw
  const makerCanon = resolveMakerAgainstTree(tree, maker)
  const pool = makerCanon
    ? (tree.modelsByMaker[makerCanon] ?? []).map((model) => ({
        maker: makerCanon,
        model,
      }))
    : Object.entries(tree.modelsByMaker).flatMap(([m, models]) =>
        models.map((model) => ({ maker: m, model })),
      )

  return pool
    .map(({ maker: mk, model }) => ({
      maker: mk,
      model,
      score: scoreModelMatch(model, modelNeedle),
    }))
    .filter((r) => r.score >= 40)
    .sort((a, b) => b.score - a.score || a.model.localeCompare(b.model))
}

export function derivePlateConfidenceBand(input: {
  confidence: number | null
  status: PlateLookupStatus
  ambiguousCount: number
  topModelScore: number | null
  edgeBand?: PlateConfidenceBand | null
}): PlateConfidenceBand {
  if (input.edgeBand === 'A' || input.edgeBand === 'B' || input.edgeBand === 'C' || input.edgeBand === 'D') {
    // Ambiguidade de catálogo rebaixa para no máximo C
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

  const ranks = rankCatalogModels(tree, result.maker, result.model)
  const top = ranks[0] ?? null
  const second = ranks[1] ?? null
  const scoreAmbiguous =
    Boolean(top && second) &&
    top!.score >= 55 &&
    second!.score >= 55 &&
    top!.score - second!.score <= 18 &&
    normalizeVehicleToken(top!.model) !== normalizeVehicleToken(second!.model)

  /**
   * Caso típico DENATRAN: "Kwid Intens" → split Kwid + Intense, e o cadastro tem
   * "Kwid" e "Kwid Intense" como modelos distintos — exige escolha humana.
   */
  const split = result.model?.trim() ? splitApiModelo(result.model) : null
  const makerCanon = resolveMakerAgainstTree(tree, result.maker)
  const pool = makerCanon ? (tree.modelsByMaker[makerCanon] ?? []) : []
  const baseName = split?.model?.trim() || ''
  const baseNorm = normalizeVehicleToken(baseName)
  const catalogBase = pool.find((m) => normalizeVehicleToken(m) === baseNorm)
  const catalogExtended = pool.filter(
    (m) =>
      normalizeVehicleToken(m) !== baseNorm &&
      normalizeVehicleToken(m).startsWith(baseNorm) &&
      baseNorm.length >= 3,
  )
  const splitFamilyAmbiguous =
    Boolean(split?.version || split?.engine) &&
    Boolean(catalogBase) &&
    catalogExtended.length > 0

  const ambiguousPair = scoreAmbiguous || splitFamilyAmbiguous
  const ambiguousRanks: CatalogModelRank[] = splitFamilyAmbiguous && catalogBase && makerCanon
    ? [
        { maker: makerCanon, model: catalogBase, score: 100 },
        ...catalogExtended.map((model) => ({
          maker: makerCanon,
          model,
          score: scoreModelMatch(model, result.model ?? baseName),
        })),
        ...ranks,
      ].filter(
        (r, i, arr) =>
          arr.findIndex(
            (x) =>
              x.maker === r.maker &&
              normalizeVehicleToken(x.model) === normalizeVehicleToken(r.model),
          ) === i,
      )
    : ranks

  let status = result.status
  let candidates: PlateLookupCandidate[] = result.candidates?.length
    ? [...result.candidates]
    : []
  let maker = result.maker
  let model = result.model
  let message = result.message

  if (ambiguousPair && ambiguousRanks.length >= 2) {
    const a = ambiguousRanks[0]!
    const b = ambiguousRanks[1]!
    status = 'ambiguous'
    const year = result.year
    candidates = ambiguousRanks.slice(0, 4).map((r) => ({
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

  const confidenceBand = derivePlateConfidenceBand({
    confidence: result.confidence,
    status,
    ambiguousCount: candidates.length,
    topModelScore: top?.score ?? null,
    edgeBand: result.confidenceBand ?? null,
  })

  if (confidenceBand === 'C' || confidenceBand === 'D') {
    if (status === 'found') status = 'incomplete'
  }

  return {
    ...result,
    status,
    maker,
    model,
    candidates,
    message,
    confidenceBand,
    identityAsserted: true,
  }
}
