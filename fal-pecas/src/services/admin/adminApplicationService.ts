import { getSupabase } from '@/lib/supabase'
import { adminFindProductIdBySku } from '@/services/admin/adminPriceListService'
import {
  adminAddApplicationsBulk,
  adminRemoveApplication,
  adminUpdateApplicationVehicleVersion,
  adminUpdateApplicationYears,
} from '@/services/admin/adminProductService'

export type AdminApplicationRow = {
  id: string
  productId: string
  productSku: string
  productName: string
  vehicleVersionId: string
  yearStart: number | null
  yearEnd: number | null
  notes: string | null
  makerId: string | null
  makerName: string | null
  modelId: string | null
  modelName: string | null
  engine: string | null
  versionName: string | null
  versionYear: number | null
}

/** Tamanho padrão de página da listagem global de aplicações. */
export const ADMIN_APPLICATIONS_PAGE_SIZE = 250

export type AdminApplicationListFilter = {
  q?: string
  productId?: string
  manufacturerId?: string
  modelId?: string
  engine?: string
  versionName?: string
  limit?: number
  offset?: number
}

type NestedName = { id?: string; name?: string } | { id?: string; name?: string }[] | null

function oneName(v: NestedName): { id: string | null; name: string | null } {
  if (!v) return { id: null, name: null }
  if (Array.isArray(v)) {
    const first = v[0]
    return { id: first?.id ?? null, name: first?.name ?? null }
  }
  return { id: v.id ?? null, name: v.name ?? null }
}

function mapRow(raw: Record<string, unknown>): AdminApplicationRow {
  const product = raw.products as
    | { id?: string; sku?: string; name?: string }
    | { id?: string; sku?: string; name?: string }[]
    | null
  const p = Array.isArray(product) ? product[0] : product
  const vv = raw.vehicle_versions as
    | {
        id?: string
        year?: number | null
        engine?: string | null
        version_name?: string | null
        manufacturer_id?: string
        model_id?: string
        manufacturers?: NestedName
        models?: NestedName
      }
    | null
    | undefined
  const maker = oneName(vv?.manufacturers ?? null)
  const model = oneName(vv?.models ?? null)
  return {
    id: String(raw.id),
    productId: String(raw.product_id ?? p?.id ?? ''),
    productSku: String(p?.sku ?? ''),
    productName: String(p?.name ?? ''),
    vehicleVersionId: String(raw.vehicle_version_id ?? vv?.id ?? ''),
    yearStart: raw.year_start == null ? null : Number(raw.year_start),
    yearEnd: raw.year_end == null ? null : Number(raw.year_end),
    notes: raw.notes == null ? null : String(raw.notes),
    makerId: maker.id ?? (vv?.manufacturer_id ? String(vv.manufacturer_id) : null),
    makerName: maker.name,
    modelId: model.id ?? (vv?.model_id ? String(vv.model_id) : null),
    modelName: model.name,
    engine: vv?.engine ?? null,
    versionName: vv?.version_name ?? null,
    versionYear: vv?.year ?? null,
  }
}

export function mergeUniqueIds(
  ...groups: Array<readonly string[] | null | undefined>
): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const group of groups) {
    for (const id of group ?? []) {
      const value = String(id ?? '').trim()
      if (!value || seen.has(value)) continue
      seen.add(value)
      out.push(value)
    }
  }
  return out
}

export type ApplicationSearchClause =
  | { kind: 'empty' }
  | { kind: 'none' }
  | { kind: 'and'; productIds: string[] | null; versionIds: string[] | null }
  | { kind: 'or'; productIds: string[]; versionIds: string[] }

/**
 * Decide como aplicar a busca textual (q) e os filtros cascata de veículo.
 * - Só q: OR entre produtos (SKU/marca/ref) e veículos (montadora/modelo).
 * - Cascata de veículo: AND (como antes), e sobrescreve o match veicular do q.
 */
export function buildApplicationSearchClause(input: {
  productIds: string[] | null
  versionIdsFromQ: string[] | null
  versionIdsFromFilters: string[] | null
}): ApplicationSearchClause {
  const productIds = input.productIds
  const versionIdsFromQ = input.versionIdsFromQ
  const versionIdsFromFilters = input.versionIdsFromFilters

  if (versionIdsFromFilters) {
    if (versionIdsFromFilters.length === 0) return { kind: 'empty' }
    if (productIds && productIds.length === 0) return { kind: 'empty' }
    return {
      kind: 'and',
      productIds: productIds && productIds.length ? productIds : null,
      versionIds: versionIdsFromFilters,
    }
  }

  const hasProductQuery = productIds != null
  const hasVersionQuery = versionIdsFromQ != null
  if (!hasProductQuery && !hasVersionQuery) return { kind: 'none' }

  const products = productIds ?? []
  const versions = versionIdsFromQ ?? []
  if (products.length === 0 && versions.length === 0) return { kind: 'empty' }
  if (products.length > 0 && versions.length > 0) {
    return { kind: 'or', productIds: products, versionIds: versions }
  }
  return {
    kind: 'and',
    productIds: products.length ? products : null,
    versionIds: versions.length ? versions : null,
  }
}

async function resolveProductIdsFromQ(q: string): Promise<string[]> {
  const text = q.trim()
  if (!text) return []
  const sb = getSupabase()
  const like = `%${text}%`

  const [byProduct, byRef, byBrand] = await Promise.all([
    sb
      .from('products')
      .select('id')
      .or(
        [
          `sku.ilike.${like}`,
          `name.ilike.${like}`,
          `manufacturer_code.ilike.${like}`,
          `search_document.ilike.${like}`,
        ].join(','),
      )
      .limit(120),
    sb
      .from('product_references')
      .select('product_id')
      .or(`code.ilike.${like},brand_label.ilike.${like}`)
      .limit(120),
    sb.from('product_brands').select('id').ilike('name', like).limit(40),
  ])

  if (byProduct.error) throw byProduct.error
  if (byRef.error) throw byRef.error
  if (byBrand.error) throw byBrand.error

  const brandIds = (byBrand.data ?? []).map((r) => String(r.id))
  let byBrandProducts: string[] = []
  if (brandIds.length) {
    const { data, error } = await sb
      .from('products')
      .select('id')
      .in('brand_id', brandIds)
      .limit(120)
    if (error) throw error
    byBrandProducts = (data ?? []).map((r) => String(r.id))
  }

  return mergeUniqueIds(
    (byProduct.data ?? []).map((r) => String(r.id)),
    (byRef.data ?? []).map((r) => String(r.product_id)),
    byBrandProducts,
  )
}

async function resolveVersionIdsFromQ(q: string): Promise<string[]> {
  const text = q.trim()
  if (!text) return []
  const sb = getSupabase()
  const like = `%${text}%`

  const [makers, models] = await Promise.all([
    sb.from('manufacturers').select('id').ilike('name', like).limit(40),
    sb.from('models').select('id').ilike('name', like).limit(80),
  ])
  if (makers.error) throw makers.error
  if (models.error) throw models.error

  const makerIds = (makers.data ?? []).map((r) => String(r.id))
  const modelIds = (models.data ?? []).map((r) => String(r.id))
  if (!makerIds.length && !modelIds.length) return []

  let query = sb.from('vehicle_versions').select('id')
  if (makerIds.length && modelIds.length) {
    query = query.or(
      `manufacturer_id.in.(${makerIds.join(',')}),model_id.in.(${modelIds.join(',')})`,
    )
  } else if (makerIds.length) {
    query = query.in('manufacturer_id', makerIds)
  } else {
    query = query.in('model_id', modelIds)
  }
  const { data, error } = await query.limit(800)
  if (error) throw error
  return (data ?? []).map((r) => String(r.id))
}

async function resolveVersionIds(filter: {
  manufacturerId?: string
  modelId?: string
  engine?: string
  versionName?: string
}): Promise<string[] | null> {
  const needs =
    filter.manufacturerId || filter.modelId || filter.engine?.trim() || filter.versionName?.trim()
  if (!needs) return null

  let q = getSupabase().from('vehicle_versions').select('id')
  if (filter.manufacturerId) q = q.eq('manufacturer_id', filter.manufacturerId)
  if (filter.modelId) q = q.eq('model_id', filter.modelId)
  if (filter.engine?.trim()) q = q.ilike('engine', filter.engine.trim())
  if (filter.versionName?.trim()) q = q.ilike('version_name', filter.versionName.trim())
  const { data, error } = await q.limit(800)
  if (error) throw error
  return (data ?? []).map((r) => String(r.id))
}

/** Lista global de aplicações (PVC) com filtros. */
export async function adminListApplicationsGlobal(
  filter: AdminApplicationListFilter = {},
): Promise<{ rows: AdminApplicationRow[]; total: number }> {
  const limit = Math.min(Math.max(filter.limit ?? ADMIN_APPLICATIONS_PAGE_SIZE, 1), 500)
  const offset = Math.max(filter.offset ?? 0, 0)

  let productIds: string[] | null = null
  let versionIdsFromQ: string[] | null = null
  if (filter.productId) {
    productIds = [filter.productId]
  } else if (filter.q?.trim()) {
    const [fromProducts, fromVehicles] = await Promise.all([
      resolveProductIdsFromQ(filter.q),
      resolveVersionIdsFromQ(filter.q),
    ])
    productIds = fromProducts
    versionIdsFromQ = fromVehicles
  }

  const versionIdsFromFilters = await resolveVersionIds({
    manufacturerId: filter.manufacturerId,
    modelId: filter.modelId,
    engine: filter.engine,
    versionName: filter.versionName,
  })

  const clause = buildApplicationSearchClause({
    productIds,
    versionIdsFromQ,
    versionIdsFromFilters,
  })
  if (clause.kind === 'empty') return { rows: [], total: 0 }

  let q = getSupabase()
    .from('product_vehicle_compatibility')
    .select(
      `
      id, product_id, vehicle_version_id, year_start, year_end, notes,
      products ( id, sku, name ),
      vehicle_versions (
        id, year, engine, version_name, manufacturer_id, model_id,
        manufacturers ( id, name ),
        models ( id, name )
      )
    `,
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })

  if (clause.kind === 'and') {
    if (clause.productIds) q = q.in('product_id', clause.productIds)
    if (clause.versionIds) q = q.in('vehicle_version_id', clause.versionIds)
  } else if (clause.kind === 'or') {
    q = q.or(
      `product_id.in.(${clause.productIds.join(',')}),vehicle_version_id.in.(${clause.versionIds.join(',')})`,
    )
  }

  const { data, error, count } = await q.range(offset, offset + limit - 1)
  if (error) throw error

  const rows = (data ?? []).map((r) => mapRow(r as Record<string, unknown>))
  return { rows, total: count ?? rows.length }
}

export {
  adminFindProductIdBySku,
  adminAddApplicationsBulk,
  adminRemoveApplication,
  adminUpdateApplicationYears,
  adminUpdateApplicationVehicleVersion,
}

export async function adminRemoveApplicationsBulk(ids: string[]): Promise<number> {
  const unique = [...new Set(ids.filter(Boolean))]
  if (!unique.length) return 0
  const { error } = await getSupabase()
    .from('product_vehicle_compatibility')
    .delete()
    .in('id', unique)
  if (error) throw error
  return unique.length
}
