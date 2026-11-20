/**
 * Inteligência de seleção/ordenação de relacionados na PDP.
 * Reutiliza classifyCardCompatibility — não duplica o motor.
 * Cross-audit 2026-11-20 · decisões §17.
 */
import { oppositeLado } from '@/lib/productPosicaoLado'
import {
  cardSealRank,
  classifyCardCompatibility,
  resolveCardSeal,
  vehicleFilterToCompatInput,
  type CardSealKind,
  type CompatibilityVerdict,
  type PvcCompatRow,
} from '@/services/compatibility/compatibilityEngine'
import { loadPvcEvidenceByProductIds } from '@/services/compatibility/loadPvcEvidence'
import { listEquivalentProductIds } from '@/services/products/equivalenceLinksService'
import {
  listProductsByCategorySlug,
  listPublishedProductsByIds,
} from '@/services/products/productService'
import { listCuratedRelatedProductIds } from '@/services/products/relatedLinksService'
import {
  RELATED_PRODUCTS_CURATED_MAX,
  RELATED_PRODUCTS_LIMIT,
} from '@/services/products/relatedProducts'
import { searchCatalog } from '@/services/search/searchService'
import type { Product, VehicleFilter } from '@/types'

export type RelatedOrigin = Pick<Product, 'id' | 'categorySlug' | 'lado' | 'posicao'>

export type RelatedRankRow = {
  product: Product
  curated: boolean
  opposite: boolean
  sealKind: CardSealKind | null
  curatedOrder: number
  available: boolean
  /** Sobreposição maker|model PVC com o produto origem (desempate L/R). */
  pvcOverlap: number
}

function normAppToken(v: string | null | undefined): string {
  return (v ?? '').trim().toLowerCase()
}

export function pvcAppKey(row: PvcCompatRow): string {
  return `${normAppToken(row.maker)}|${normAppToken(row.model)}`
}

/** Quantidade de pares maker|model compartilhados entre duas evidências PVC. */
export function countPvcOverlap(a: PvcCompatRow[], b: PvcCompatRow[]): number {
  const setA = new Set(
    a.map(pvcAppKey).filter((k) => k !== '|' && !k.startsWith('|') && !k.endsWith('|')),
  )
  if (!setA.size) return 0
  let n = 0
  const seen = new Set<string>()
  for (const row of b) {
    const k = pvcAppKey(row)
    if (!k || k === '|' || seen.has(k) || !setA.has(k)) continue
    seen.add(k)
    n += 1
  }
  return n
}

/** Pareamento L/R: mesma categoria + lado oposto; posicao igual só se ambos tiverem. */
export function isOppositeSidePair(
  origin: RelatedOrigin,
  candidate: Pick<Product, 'id' | 'categorySlug' | 'lado' | 'posicao'>,
): boolean {
  if (!origin.id || candidate.id === origin.id) return false
  const want = oppositeLado(origin.lado ?? null)
  if (!want || candidate.lado !== want) return false
  const oSlug = origin.categorySlug?.trim()
  const cSlug = candidate.categorySlug?.trim()
  if (!oSlug || !cSlug || oSlug !== cSlug) return false
  const oPos = origin.posicao?.trim() || null
  const cPos = candidate.posicao?.trim() || null
  if (oPos && cPos && oPos !== cPos) return false
  return true
}

/**
 * Score composto (menor = melhor).
 * Com veículo: selo + opposite + curated.
 * Sem veículo: opposite → curated.
 */
export function relatedRelevanceScore(row: RelatedRankRow): number {
  const avail = row.available ? 0 : 1_000
  const overlapBoost = Math.min(Math.max(row.pvcOverlap, 0), 40) * 5
  if (row.sealKind == null) {
    const rel = row.opposite ? 0 : row.curated ? 100 : 200
    const order = row.curated ? Math.min(row.curatedOrder, 99) : 50
    return avail + rel + order - overlapBoost
  }
  if (row.sealKind === 'hide') return 50_000
  const seal = cardSealRank(row.sealKind) * 1_000
  const opp = row.opposite ? 0 : 100
  const cur = row.curated ? 0 : 50
  const order = row.curated ? Math.min(row.curatedOrder, 49) : 25
  return avail + seal + opp + cur + order - overlapBoost
}

/**
 * §17.4 qualidade > quantidade:
 * - curated / opposite: sempre (exceto hide)
 * - sem veículo: não completar com peers de categoria
 * - com veículo: peers de categoria só se compatible/similar
 */
export function isEligibleRelatedRow(
  row: Pick<RelatedRankRow, 'curated' | 'opposite' | 'sealKind'>,
  hasVehicle: boolean,
): boolean {
  if (row.sealKind === 'hide') return false
  if (row.curated || row.opposite) return true
  if (!hasVehicle) return false
  return row.sealKind === 'compatible' || row.sealKind === 'similar'
}

/** Etapa A+B sobre pool já carregado (testável sem rede). */
export function rankRelatedCandidates(input: {
  origin: RelatedOrigin
  candidates: Product[]
  curatedIds: Set<string>
  curatedOrder: Map<string, number>
  vehicle: ReturnType<typeof vehicleFilterToCompatInput>
  pvcMap: Map<string, PvcCompatRow[]>
  excludeIds: Set<string>
  limit: number
}): Product[] {
  const hasVehicle = Boolean(input.vehicle)
  const originPvc = input.pvcMap.get(input.origin.id) ?? []
  const originHasPvc = originPvc.length > 0
  const rows: RelatedRankRow[] = []
  for (const product of input.candidates) {
    if (!product.id || input.excludeIds.has(product.id)) continue
    const opposite = isOppositeSidePair(input.origin, product)
    const curated = input.curatedIds.has(product.id)
    const pvcOverlap = countPvcOverlap(originPvc, input.pvcMap.get(product.id) ?? [])
    // L/R sem veículo: se a origem tem PVC, exige overlap (evita LE Audi → LD Fox).
    if (opposite && !curated && !hasVehicle && originHasPvc && pvcOverlap === 0) {
      continue
    }
    let sealKind: CardSealKind | null = null
    if (input.vehicle) {
      const verdict: CompatibilityVerdict = classifyCardCompatibility(
        input.vehicle,
        input.pvcMap.get(product.id) ?? [],
      )
      sealKind = resolveCardSeal(verdict).kind
      // Decisão §17.1: incompatível fora da recomendação positiva
      if (sealKind === 'hide') continue
    }
    const row: RelatedRankRow = {
      product,
      curated,
      opposite,
      sealKind,
      curatedOrder: input.curatedOrder.get(product.id) ?? 999,
      available: product.available !== false,
      pvcOverlap,
    }
    if (!isEligibleRelatedRow(row, hasVehicle)) continue
    rows.push(row)
  }
  // Sem veículo: vários LD na categoria podem ter overlap parcial (dados mistos).
  // Mantém só opposite(s) com overlap máximo (+ curated).
  let finalRows = rows
  if (!hasVehicle && originHasPvc) {
    const maxOpp = rows.reduce(
      (m, r) => (r.opposite ? Math.max(m, r.pvcOverlap) : m),
      0,
    )
    if (maxOpp > 0) {
      finalRows = rows.filter(
        (r) => r.curated || !r.opposite || r.pvcOverlap >= maxOpp,
      )
    }
  }
  finalRows.sort((a, b) => relatedRelevanceScore(a) - relatedRelevanceScore(b))
  return finalRows.slice(0, input.limit).map((r) => r.product)
}

export type IntelligentRelatedResult = {
  products: Product[]
  pvcByProductId: Map<string, PvcCompatRow[]>
}

/**
 * Lista relacionados inteligentes para a PDP.
 * Qualidade > quantidade: retorna até `limit`, sem forçar preenchimento.
 */
export async function listIntelligentRelatedForPdp(input: {
  product: RelatedOrigin & Partial<Product>
  vehicleFilter?: VehicleFilter | null
  limit?: number
}): Promise<IntelligentRelatedResult> {
  const empty: IntelligentRelatedResult = {
    products: [],
    pvcByProductId: new Map(),
  }
  const product = input.product
  if (!product?.id) return empty

  const limit = Math.min(Math.max(input.limit ?? RELATED_PRODUCTS_LIMIT, 1), 12)
  const excludeIds = new Set<string>([product.id])

  try {
    const equivIds = await listEquivalentProductIds(product.id)
    for (const id of equivIds) excludeIds.add(id)
  } catch {
    /* E.6 opcional */
  }

  let curatedIdsOrdered: string[] = []
  try {
    curatedIdsOrdered = await listCuratedRelatedProductIds(product.id)
  } catch {
    curatedIdsOrdered = []
  }

  const curatedHydrateIds = curatedIdsOrdered.slice(0, RELATED_PRODUCTS_CURATED_MAX)
  let curated: Product[] = []
  try {
    curated = await listPublishedProductsByIds(curatedHydrateIds)
  } catch {
    curated = []
  }

  const curatedIds = new Set(curated.map((p) => p.id))
  const curatedOrder = new Map(curatedIdsOrdered.map((id, i) => [id, i]))

  const slug = product.categorySlug?.trim()
  let categoryPool: Product[] = []
  if (slug) {
    const poolSize = Math.min(Math.max(limit + 16, limit), 40)
    try {
      categoryPool = await listProductsByCategorySlug(slug, poolSize)
    } catch {
      categoryPool = []
    }
  }

  const byId = new Map<string, Product>()
  for (const p of curated) {
    if (!excludeIds.has(p.id)) byId.set(p.id, p)
  }
  for (const p of categoryPool) {
    if (!excludeIds.has(p.id) && !byId.has(p.id)) byId.set(p.id, p)
  }

  const vehicle = vehicleFilterToCompatInput(input.vehicleFilter)
  if (vehicle && slug) {
    try {
      const catalog = await searchCatalog({
        category: slug,
        maker: vehicle.maker ?? undefined,
        model: vehicle.model ?? undefined,
        year: vehicle.year != null ? String(vehicle.year) : undefined,
        engine: vehicle.engine ?? undefined,
        version: vehicle.version ?? undefined,
        page: 1,
        pageSize: Math.min(limit * 3, 40),
        sort: 'relevance',
      })
      for (const p of catalog.items) {
        if (!excludeIds.has(p.id) && !byId.has(p.id)) byId.set(p.id, p)
      }
    } catch {
      /* pool já tem curados + categoria */
    }
  }

  const pool = [...byId.values()]
  if (!pool.length) return empty

  // PVC sempre em lote (selo se houver veículo; overlap L/R também sem veículo).
  let pvcMap = new Map<string, PvcCompatRow[]>()
  try {
    pvcMap = await loadPvcEvidenceByProductIds([
      product.id,
      ...pool.map((p) => p.id),
    ])
  } catch {
    pvcMap = new Map()
  }

  const products = rankRelatedCandidates({
    origin: product,
    candidates: pool,
    curatedIds,
    curatedOrder,
    vehicle,
    pvcMap,
    excludeIds,
    limit,
  })

  return { products, pvcByProductId: pvcMap }
}
