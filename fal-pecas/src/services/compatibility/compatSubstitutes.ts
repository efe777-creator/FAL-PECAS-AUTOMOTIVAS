import {
  cardSealRank,
  classifyCardCompatibility,
  resolveCardSeal,
  vehicleFilterToCompatInput,
  type CompatibilityVerdict,
  type CardSealKind,
} from '@/services/compatibility/compatibilityEngine'
import { loadPvcEvidenceByProductIds } from '@/services/compatibility/loadPvcEvidence'
import { listEquivalentProductIds } from '@/services/products/equivalenceLinksService'
import {
  getProductById,
  listEquivalentProductsForPdp,
} from '@/services/products/productService'
import { searchCatalog } from '@/services/search/searchService'
import type { Product, VehicleFilter } from '@/types'

export type CompatSubstituteCandidate = {
  product: Product
  verdict: CompatibilityVerdict
  sealKind: Extract<CardSealKind, 'compatible' | 'similar'>
  /** Vínculo E.6 — sobe na lista de troca. */
  fromEquivalence?: boolean
}

/**
 * M32: candidatos Compatível / Compatível similar para trocar peça incompatível.
 * Prioriza equivalentes técnicos (E.6), depois mesma categoria via busca.
 */
export async function listCompatibleSubstitutes(input: {
  excludeProductId: string
  excludeCartProductIds?: string[]
  filter: VehicleFilter | null | undefined
  categorySlug?: string | null
  limit?: number
}): Promise<CompatSubstituteCandidate[]> {
  const vehicle = vehicleFilterToCompatInput(input.filter)
  if (!vehicle) return []

  const limit = Math.min(Math.max(input.limit ?? 8, 1), 20)
  const exclude = new Set(
    [input.excludeProductId, ...(input.excludeCartProductIds ?? [])].filter(Boolean),
  )

  let category = input.categorySlug?.trim() || null
  if (!category) {
    try {
      const origin = await getProductById(input.excludeProductId)
      category = origin?.categorySlug?.trim() || null
    } catch {
      category = null
    }
  }

  const [equivProducts, equivIds, catalog] = await Promise.all([
    listEquivalentProductsForPdp(input.excludeProductId, limit).catch(() => [] as Product[]),
    listEquivalentProductIds(input.excludeProductId).catch(() => [] as string[]),
    searchCatalog({
      category: category || undefined,
      maker: vehicle.maker ?? undefined,
      model: vehicle.model ?? undefined,
      year: vehicle.year != null ? String(vehicle.year) : undefined,
      engine: vehicle.engine ?? undefined,
      version: vehicle.version ?? undefined,
      page: 1,
      pageSize: Math.min(limit * 3, 40),
      sort: 'relevance',
    }),
  ])

  const preferredIds = new Set(equivIds.filter((id) => !exclude.has(id)))
  const byId = new Map<string, Product>()
  for (const p of equivProducts) {
    if (!exclude.has(p.id)) byId.set(p.id, p)
  }
  for (const p of catalog.items) {
    if (!exclude.has(p.id) && !byId.has(p.id)) byId.set(p.id, p)
  }
  const pool = [...byId.values()]
  if (!pool.length) return []

  const pvcMap = await loadPvcEvidenceByProductIds(pool.map((p) => p.id))
  const classified: { product: Product; verdict: CompatibilityVerdict }[] = []
  for (const product of pool) {
    classified.push({
      product,
      verdict: classifyCardCompatibility(vehicle, pvcMap.get(product.id) ?? []),
    })
  }

  return filterSubstituteCandidates(classified, {
    excludeIds: exclude,
    preferredIds,
    limit,
  })
}

/** Filtra/ordena candidatos já classificados (testável sem rede). */
export function filterSubstituteCandidates(
  rows: { product: Product; verdict: CompatibilityVerdict }[],
  opts: { excludeIds: Set<string>; preferredIds?: Set<string>; limit: number },
): CompatSubstituteCandidate[] {
  const out: CompatSubstituteCandidate[] = []
  for (const row of rows) {
    if (opts.excludeIds.has(row.product.id)) continue
    const seal = resolveCardSeal(row.verdict)
    if (seal.kind !== 'compatible' && seal.kind !== 'similar') continue
    out.push({
      product: row.product,
      verdict: row.verdict,
      sealKind: seal.kind,
      fromEquivalence: opts.preferredIds?.has(row.product.id) ?? false,
    })
  }
  out.sort((a, b) => {
    const ap = a.fromEquivalence ? 0 : 1
    const bp = b.fromEquivalence ? 0 : 1
    if (ap !== bp) return ap - bp
    return cardSealRank(a.sealKind) - cardSealRank(b.sealKind)
  })
  return out.slice(0, opts.limit)
}
