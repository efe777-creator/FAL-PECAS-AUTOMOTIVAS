/**
 * Ranking + ambiguidade de modelos irmãos (Kwid × Kwid Intense).
 * Shared assert placa ↔ INV. Não inventa PVC.
 */
import { normalizeVehicleToken } from '@/services/plates/reconcileVehicleFilter'
import { splitApiModelo } from '@/services/plates/splitApiModelo'
import type { VehicleOptionTree } from '@/types'

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

export type SiblingAmbiguityResult = {
  ambiguous: boolean
  ranks: CatalogModelRank[]
  reason: 'score' | 'split_family' | null
}

export function detectSiblingModelAmbiguity(
  tree: VehicleOptionTree,
  maker: string | null | undefined,
  modelRaw: string | null | undefined,
): SiblingAmbiguityResult {
  const ranks = rankCatalogModels(tree, maker ?? null, modelRaw ?? null)
  const top = ranks[0] ?? null
  const second = ranks[1] ?? null
  const makerCanon = resolveMakerAgainstTree(tree, maker)
  const pool = makerCanon ? (tree.modelsByMaker[makerCanon] ?? []) : []

  // Exact win no cadastro (ex.: pick "Kwid Intense") — não reabre família irmã.
  const fullNorm = normalizeVehicleToken(modelRaw ?? '')
  const exactFull =
    makerCanon && fullNorm
      ? pool.find((m) => normalizeVehicleToken(m) === fullNorm)
      : undefined
  if (exactFull && makerCanon) {
    return {
      ambiguous: false,
      ranks: [
        { maker: makerCanon, model: exactFull, score: 100 },
        ...ranks.filter(
          (r) => normalizeVehicleToken(r.model) !== normalizeVehicleToken(exactFull),
        ),
      ],
      reason: null,
    }
  }

  const scoreAmbiguous =
    Boolean(top && second) &&
    top!.score < 100 &&
    top!.score >= 55 &&
    second!.score >= 55 &&
    top!.score - second!.score <= 18 &&
    normalizeVehicleToken(top!.model) !== normalizeVehicleToken(second!.model)

  const split = modelRaw?.trim() ? splitApiModelo(modelRaw) : null
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

  if (splitFamilyAmbiguous && catalogBase && makerCanon) {
    const merged: CatalogModelRank[] = [
      { maker: makerCanon, model: catalogBase, score: 100 },
      ...catalogExtended.map((model) => ({
        maker: makerCanon,
        model,
        score: scoreModelMatch(model, modelRaw ?? baseName),
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
    return { ambiguous: merged.length >= 2, ranks: merged, reason: 'split_family' }
  }

  if (scoreAmbiguous) {
    return { ambiguous: true, ranks, reason: 'score' }
  }

  return { ambiguous: false, ranks, reason: null }
}
