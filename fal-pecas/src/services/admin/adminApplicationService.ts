import { getSupabase } from '@/lib/supabase'
import { adminFindProductIdBySku } from '@/services/admin/adminPriceListService'
import {
  adminAddApplicationsBulk,
  adminRemoveApplication,
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

async function resolveProductIdsFromQ(q: string): Promise<string[] | null> {
  const text = q.trim()
  if (!text) return null
  const { data, error } = await getSupabase()
    .from('products')
    .select('id')
    .or(`sku.ilike.%${text}%,name.ilike.%${text}%`)
    .limit(80)
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
  if (filter.productId) {
    productIds = [filter.productId]
  } else if (filter.q?.trim()) {
    const ids = (await resolveProductIdsFromQ(filter.q)) ?? []
    if (ids.length === 0) return { rows: [], total: 0 }
    productIds = ids
  }

  const versionIds = await resolveVersionIds({
    manufacturerId: filter.manufacturerId,
    modelId: filter.modelId,
    engine: filter.engine,
    versionName: filter.versionName,
  })
  if (versionIds && versionIds.length === 0) return { rows: [], total: 0 }

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

  if (productIds) q = q.in('product_id', productIds)
  if (versionIds) q = q.in('vehicle_version_id', versionIds)

  const { data, error, count } = await q.range(offset, offset + limit - 1)
  if (error) throw error

  const rows = (data ?? []).map((r) => mapRow(r as Record<string, unknown>))
  return { rows, total: count ?? rows.length }
}

export { adminFindProductIdBySku, adminAddApplicationsBulk, adminRemoveApplication, adminUpdateApplicationYears }

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
