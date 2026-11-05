import { resolveProductIdentity } from '@/lib/productIdentity'
import {
  evaluateReleaseChecklist,
  type ReleaseChecklistResult,
} from '@/lib/releaseChecklist'
import { getSupabase } from '@/lib/supabase'
import { toSlug } from '@/lib/slug'
import { adminEnsureBaseAndPromoPrices } from '@/services/admin/adminPriceListService'
import { resolveProductPrice } from '@/services/pricing/priceResolutionService'
import type { MeasureOrigin, Product, ProductReference } from '@/types'

type ProductRow = {
  id: string
  sku: string
  commercial_ref?: string | null
  name: string
  slug: string
  description: string | null
  short_description: string | null
  brand_id: string | null
  supplier_id: string | null
  category_id: string | null
  price: number
  promo_price: number | null
  status: string
  manufacturer_code: string | null
  is_incomplete: boolean
  is_available: boolean
  posicao?: string | null
  lado?: string | null
  attrs: Record<string, unknown> | null
  weight_kg?: number | null
  height_cm?: number | null
  width_cm?: number | null
  length_cm?: number | null
  weight_origin?: string | null
  height_origin?: string | null
  width_origin?: string | null
  length_origin?: string | null
  pol_unit?: number | null
  logistic_porte?: string | null
  vehicle_min_code?: string | null
  compatible_vehicle_codes?: string[] | null
  logistic_restrictions?: unknown
  own_delivery_allowed?: boolean | null
  pol_origin?: string | null
  logistic_profile_origin?: string | null
  product_brands?: { name: string } | { name: string }[] | null
  product_categories?: { id: string; name: string } | { id: string; name: string }[] | null
}

function asMeasureOrigin(v: string | null | undefined): MeasureOrigin {
  return v === 'manual' ? 'manual' : 'global'
}

function asNamed<T extends { name: string }>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function mapProduct(row: ProductRow): Product {
  const brand = asNamed(row.product_brands)
  const category = asNamed(row.product_categories)
  return {
    id: row.id,
    sku: row.sku,
    commercialRef: row.commercial_ref ?? row.sku,
    name: row.name,
    slug: row.slug,
    description: row.description ?? undefined,
    shortDescription: row.short_description ?? undefined,
    brandId: row.brand_id,
    brand: brand?.name,
    supplierId: row.supplier_id,
    categoryId: category?.id ?? row.category_id ?? undefined,
    categoryName: category?.name,
    price: Number(row.price),
    promoPrice: row.promo_price == null ? null : Number(row.promo_price),
    status: row.status as Product['status'],
    manufacturerCode: row.manufacturer_code ?? undefined,
    available: row.is_available,
    isIncomplete: row.is_incomplete,
    posicao: (row.posicao as Product['posicao']) ?? null,
    lado: (row.lado as Product['lado']) ?? null,
    attrs: row.attrs ?? {},
    weightKg: row.weight_kg == null ? null : Number(row.weight_kg),
    heightCm: row.height_cm == null ? null : Number(row.height_cm),
    widthCm: row.width_cm == null ? null : Number(row.width_cm),
    lengthCm: row.length_cm == null ? null : Number(row.length_cm),
    weightOrigin: asMeasureOrigin(row.weight_origin),
    heightOrigin: asMeasureOrigin(row.height_origin),
    widthOrigin: asMeasureOrigin(row.width_origin),
    lengthOrigin: asMeasureOrigin(row.length_origin),
    polUnit: row.pol_unit == null ? null : Number(row.pol_unit),
    logisticPorte: (row.logistic_porte as Product['logisticPorte']) ?? null,
    vehicleMinCode: row.vehicle_min_code ?? null,
    compatibleVehicleCodes: Array.isArray(row.compatible_vehicle_codes)
      ? row.compatible_vehicle_codes
      : [],
    logisticRestrictions: row.logistic_restrictions ?? [],
    ownDeliveryAllowed: row.own_delivery_allowed !== false,
    polOrigin: asMeasureOrigin(row.pol_origin),
    logisticProfileOrigin: asMeasureOrigin(row.logistic_profile_origin),
  }
}

const SELECT = `
  id, sku, commercial_ref, name, slug, description, short_description, brand_id, supplier_id,
  category_id, price, promo_price, status, manufacturer_code, is_incomplete,
  is_available, posicao, lado, attrs, weight_kg, height_cm, width_cm, length_cm,
  weight_origin, height_origin, width_origin, length_origin,
  pol_unit, logistic_porte, vehicle_min_code, compatible_vehicle_codes, logistic_restrictions,
  own_delivery_allowed, pol_origin, logistic_profile_origin,
  product_brands ( name ),
  product_categories ( id, name )
`

/** Tamanho padrão de página da lista de produtos admin. */
export const ADMIN_PRODUCTS_PAGE_SIZE = 200

export async function adminListProducts(params?: {
  q?: string
  status?: string
  /** Filtro Situação na listagem admin. */
  available?: boolean
  withoutImage?: boolean
  /** category_id IN (nó + descendentes). */
  categoryIds?: string[]
  /** Montadora: produtos com aplicação em vehicle_versions dessa manufacturer. */
  manufacturerId?: string
  /** Paginação simples (padrão: primeiros 200). */
  offset?: number
  limit?: number
}): Promise<Product[]> {
  const pageLimit = params?.limit ?? ADMIN_PRODUCTS_PAGE_SIZE
  const pageOffset = params?.offset ?? 0
  let productIdsByMaker: string[] | null = null
  if (params?.manufacturerId) {
    const { data: compat, error: compatErr } = await getSupabase()
      .from('product_vehicle_compatibility')
      .select('product_id, vehicle_versions!inner(manufacturer_id)')
      .eq('vehicle_versions.manufacturer_id', params.manufacturerId)
    if (compatErr) throw compatErr
    productIdsByMaker = [
      ...new Set((compat ?? []).map((r) => String((r as { product_id: string }).product_id))),
    ]
    if (productIdsByMaker.length === 0) return []
  }

  let q = getSupabase().from('products').select(SELECT).order('updated_at', { ascending: false })
  if (params?.status) q = q.eq('status', params.status)
  if (typeof params?.available === 'boolean') q = q.eq('is_available', params.available)
  if (params?.categoryIds && params.categoryIds.length > 0) {
    q = q.in('category_id', params.categoryIds)
  }
  if (productIdsByMaker) q = q.in('id', productIdsByMaker)
  if (params?.q?.trim()) {
    const term = params.q.trim()
    q = q.or(`name.ilike.%${term}%,sku.ilike.%${term}%,commercial_ref.ilike.%${term}%`)
  }
  const { data, error } = await q
    .order('id', { ascending: false })
    .range(pageOffset, pageOffset + pageLimit - 1)
  if (error) throw error
  let list = (data as ProductRow[]).map(mapProduct)

  if (params?.withoutImage) {
    const { data: imgs } = await getSupabase().from('product_images').select('product_id')
    const withImg = new Set((imgs ?? []).map((i) => String(i.product_id)))
    list = list.filter((p) => !withImg.has(p.id) || p.isIncomplete)
  }
  return list
}

export async function adminGetProduct(id: string): Promise<Product | null> {
  const { data, error } = await getSupabase()
    .from('products')
    .select(SELECT)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return mapProduct(data as ProductRow)
}

export async function adminUpsertProduct(input: {
  id?: string
  name: string
  sku?: string
  /** Código referência comercial. Se vazio, espelha o sku. */
  commercialRef?: string
  slug?: string
  categoryId?: string | null
  brandId?: string | null
  supplierId?: string | null
  price: number
  promoPrice?: number | null
  status?: Product['status']
  shortDescription?: string
  description?: string
  posicao?: Product['posicao']
  lado?: Product['lado']
  attrs?: Record<string, unknown>
  isAvailable?: boolean
  weightKg?: number | null
  heightCm?: number | null
  widthCm?: number | null
  lengthCm?: number | null
  weightOrigin?: MeasureOrigin
  heightOrigin?: MeasureOrigin
  widthOrigin?: MeasureOrigin
  lengthOrigin?: MeasureOrigin
  polUnit?: number | null
  logisticPorte?: Product['logisticPorte']
  vehicleMinCode?: string | null
  compatibleVehicleCodes?: string[]
  ownDeliveryAllowed?: boolean
  polOrigin?: MeasureOrigin
  logisticProfileOrigin?: MeasureOrigin
  /** Quando false, o caller sincroniza as listas (modo listas no formulário). */
  syncBasePromoLists?: boolean
}): Promise<Product> {
  const identity = resolveProductIdentity({
    commercialRef: input.commercialRef,
    sku: input.sku,
  })
  const payload = {
    name: input.name.trim(),
    sku: identity.sku,
    commercial_ref: identity.commercialRef,
    slug: (input.slug?.trim() || toSlug(input.name)) || toSlug(identity.sku),
    category_id: input.categoryId || null,
    brand_id: input.brandId || null,
    supplier_id: input.supplierId || null,
    price: input.price,
    promo_price: input.promoPrice ?? null,
    status: input.status ?? 'draft',
    short_description: input.shortDescription?.trim() || null,
    description: input.description?.trim() || null,
    posicao: input.posicao || null,
    lado: input.lado || null,
    attrs: input.attrs ?? {},
    is_available: input.isAvailable ?? false,
    weight_kg: input.weightKg ?? null,
    height_cm: input.heightCm ?? null,
    width_cm: input.widthCm ?? null,
    length_cm: input.lengthCm ?? null,
    weight_origin: input.weightOrigin ?? (input.weightKg != null ? 'manual' : 'global'),
    height_origin: input.heightOrigin ?? (input.heightCm != null ? 'manual' : 'global'),
    width_origin: input.widthOrigin ?? (input.widthCm != null ? 'manual' : 'global'),
    length_origin: input.lengthOrigin ?? (input.lengthCm != null ? 'manual' : 'global'),
    pol_unit: input.polUnit ?? null,
    logistic_porte: input.logisticPorte ?? null,
    vehicle_min_code: input.vehicleMinCode || null,
    compatible_vehicle_codes: input.compatibleVehicleCodes ?? [],
    own_delivery_allowed: input.ownDeliveryAllowed ?? true,
    pol_origin: input.polOrigin ?? (input.polUnit != null ? 'manual' : 'global'),
    logistic_profile_origin: input.logisticProfileOrigin ?? 'manual',
    // search_document canônico via RPC após salvar (marca/refs/sinônimos)
    search_document: [
      input.name,
      identity.sku,
      identity.commercialRef,
      input.shortDescription,
      input.description,
      input.posicao,
      input.lado,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase(),
  }

  const q = getSupabase().from('products')
  const { data, error } = input.id
    ? await q
        .update({ ...payload, measure_audit_source: 'manual' })
        .eq('id', input.id)
        .select(SELECT)
        .single()
    : await q.insert(payload).select(SELECT).single()
  if (error) throw error

  const product = mapProduct(data as ProductRow)
  try {
    await getSupabase().rpc('rebuild_product_search_documents', { p_ids: [product.id] })
  } catch {
    // fallback: mantém search_document do payload se RPC ainda não existir
  }
  if (input.syncBasePromoLists !== false) {
    await adminEnsureBaseAndPromoPrices(product.id, input.price, input.promoPrice ?? null)
  }
  await refreshIncompleteFlag(product.id)
  return (await adminGetProduct(product.id)) ?? product
}

export type GlobalMeasurePatch = {
  weightKg?: number | null
  heightCm?: number | null
  widthCm?: number | null
  lengthCm?: number | null
}

/** skip_manual = só campos global; overwrite_manual = força inclusive manuais → viram global. */
export type ApplyGlobalMeasuresMode = 'skip_manual' | 'overwrite_manual'

/**
 * Bulk de medidas nos produtos selecionados.
 * Campos omitidos no patch não são tocados.
 */
export async function adminApplyGlobalProductMeasures(opts: {
  productIds: string[]
  patch: GlobalMeasurePatch
  mode: ApplyGlobalMeasuresMode
}): Promise<{ updatedFieldRows: number }> {
  const ids = [...new Set(opts.productIds)].filter(Boolean)
  if (!ids.length) return { updatedFieldRows: 0 }

  const fields: Array<{
    valueKey: keyof GlobalMeasurePatch
    col: string
    originCol: string
  }> = [
    { valueKey: 'weightKg', col: 'weight_kg', originCol: 'weight_origin' },
    { valueKey: 'heightCm', col: 'height_cm', originCol: 'height_origin' },
    { valueKey: 'widthCm', col: 'width_cm', originCol: 'width_origin' },
    { valueKey: 'lengthCm', col: 'length_cm', originCol: 'length_origin' },
  ]

  let updatedFieldRows = 0
  for (const f of fields) {
    if (!(f.valueKey in opts.patch)) continue
    const value = opts.patch[f.valueKey] ?? null
    let q = getSupabase()
      .from('products')
      .update({ [f.col]: value, [f.originCol]: 'global', measure_audit_source: 'bulk' })
      .in('id', ids)
    if (opts.mode === 'skip_manual') q = q.eq(f.originCol, 'global')
    const { data, error } = await q.select('id')
    if (error) throw error
    updatedFieldRows += data?.length ?? 0
  }
  return { updatedFieldRows }
}

export type ProductMeasureHistoryRow = {
  id: string
  productId: string
  changes: Record<string, { old?: unknown; new?: unknown; old_origin?: string; new_origin?: string }>
  source: 'manual' | 'bulk' | 'system' | 'seed'
  createdAt: string
}

export async function adminListProductMeasureHistory(
  productId: string,
  limit = 30,
): Promise<ProductMeasureHistoryRow[]> {
  const { data, error } = await getSupabase()
    .from('product_measure_change_history')
    .select('id, product_id, changes, source, created_at')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: String(r.id),
    productId: String(r.product_id),
    changes: (r.changes ?? {}) as ProductMeasureHistoryRow['changes'],
    source:
      r.source === 'bulk' || r.source === 'system' || r.source === 'seed' || r.source === 'manual'
        ? r.source
        : 'manual',
    createdAt: String(r.created_at),
  }))
}

export async function adminSetProductStatus(id: string, status: NonNullable<Product['status']>) {
  const { error } = await getSupabase().from('products').update({ status }).eq('id', id)
  if (error) throw error
}

/** Situação em massa: só `is_available` (não força publish). */
export async function adminSetProductsAvailability(
  ids: string[],
  available: boolean,
): Promise<{ updated: number }> {
  const productIds = [...new Set(ids)].filter(Boolean)
  if (!productIds.length) return { updated: 0 }
  const { data, error } = await getSupabase()
    .from('products')
    .update({ is_available: available })
    .in('id', productIds)
    .select('id')
  if (error) throw error
  return { updated: data?.length ?? 0 }
}

/** Classificação em massa: grava `category_id` (folha efetiva). Não cria nós. */
export async function adminBulkSetProductCategory(
  ids: string[],
  categoryId: string,
): Promise<{ updated: number }> {
  const productIds = [...new Set(ids)].filter(Boolean)
  const cat = categoryId.trim()
  if (!productIds.length) return { updated: 0 }
  if (!cat) throw new Error('Informe a classificação (categoria/grupo/subgrupo).')
  const { data, error } = await getSupabase()
    .from('products')
    .update({ category_id: cat })
    .in('id', productIds)
    .select('id')
  if (error) throw error
  return { updated: data?.length ?? 0 }
}

export type ReleaseToStoreResult =
  | { ok: true; productId: string; publishedNow: boolean; checklist: ReleaseChecklistResult }
  | { ok: false; productId: string; reason: string; checklist?: ReleaseChecklistResult }

export type ReleasePreflightRow = ReleaseChecklistResult & {
  sku: string
  name: string
  commercialRef?: string | null
  status: string
}

/**
 * Pré-flight D-LIBERAR: avalia checklist sem gravar.
 */
export async function adminEvaluateReleaseChecklist(
  productId: string,
  opts?: { publishIfNeeded?: boolean },
): Promise<ReleasePreflightRow | null> {
  const product = await adminGetProduct(productId)
  if (!product) return null

  let resolvedPrice: number | null = null
  try {
    const resolved = await resolveProductPrice(product.id)
    resolvedPrice = resolved.amount
  } catch {
    resolvedPrice = null
  }

  const sb = getSupabase()
  const [{ count: appCount }, { count: imgCount }] = await Promise.all([
    sb
      .from('product_vehicle_compatibility')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', productId),
    sb
      .from('product_images')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', productId),
  ])

  const sku = product.sku ?? ''
  const name = product.name ?? ''
  const status = product.status ?? 'draft'
  const checklist = evaluateReleaseChecklist({
    productId: product.id,
    name,
    commercialRef: product.commercialRef,
    sku,
    categoryId: product.categoryId ?? null,
    status,
    resolvedPrice,
    hasApplication: (appCount ?? 0) > 0,
    hasImage: (imgCount ?? 0) > 0,
    publishIfNeeded: opts?.publishIfNeeded ?? false,
  })

  return {
    ...checklist,
    sku,
    name,
    commercialRef: product.commercialRef ?? sku,
    status,
  }
}

export async function adminEvaluateReleaseChecklistBatch(
  productIds: string[],
  opts?: { publishIfNeeded?: boolean },
): Promise<ReleasePreflightRow[]> {
  const rows: ReleasePreflightRow[] = []
  for (const id of productIds) {
    const row = await adminEvaluateReleaseChecklist(id, opts)
    if (row) rows.push(row)
  }
  return rows
}

/**
 * Liberar na loja: checklist D-LIBERAR (hard) + is_available.
 * Preço via `resolve_product_price`. Soft (app/imagem) = aviso só.
 * Não publica automaticamente em imports — só via esta ação explícita.
 */
export async function adminReleaseProductToStore(input: {
  productId: string
  /** Se true e status ≠ published, publica neste passo. */
  publishIfNeeded?: boolean
}): Promise<ReleaseToStoreResult> {
  const preflight = await adminEvaluateReleaseChecklist(input.productId, {
    publishIfNeeded: input.publishIfNeeded,
  })
  if (!preflight) {
    return { ok: false, productId: input.productId, reason: 'Produto não encontrado' }
  }
  if (!preflight.canRelease) {
    return {
      ok: false,
      productId: input.productId,
      reason: preflight.summary,
      checklist: preflight,
    }
  }

  let publishedNow = false
  if (preflight.status !== 'published') {
    await adminSetProductStatus(input.productId, 'published')
    publishedNow = true
  }

  const { error } = await getSupabase()
    .from('products')
    .update({ is_available: true, status: 'published' })
    .eq('id', input.productId)
  if (error) throw error

  return { ok: true, productId: input.productId, publishedNow, checklist: preflight }
}

export async function adminReleaseProductsToStore(input: {
  productIds: string[]
  publishIfNeeded?: boolean
}): Promise<{ released: number; failed: ReleaseToStoreResult[]; skipped: number }> {
  const failed: ReleaseToStoreResult[] = []
  let released = 0
  let skipped = 0
  for (const productId of input.productIds) {
    const r = await adminReleaseProductToStore({
      productId,
      publishIfNeeded: input.publishIfNeeded,
    })
    if (r.ok) released += 1
    else {
      failed.push(r)
      skipped += 1
    }
  }
  return { released, failed, skipped }
}

export async function adminDeleteProduct(id: string) {
  const { error } = await getSupabase().from('products').delete().eq('id', id)
  if (error) throw error
}

export async function adminListReferences(productId: string): Promise<ProductReference[]> {
  const { data, error } = await getSupabase()
    .from('product_references')
    .select('id, code, ref_type, brand_id, brand_label, status')
    .eq('product_id', productId)
    .order('code')
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: String(r.id),
    code: String(r.code),
    type: String(r.ref_type),
    brandId: (r.brand_id as string | null) ?? null,
    brandLabel: (r.brand_label as string | null) ?? undefined,
    status: (r.status as ProductReference['status']) ?? 'active',
  }))
}

export async function adminUpsertReference(input: {
  id?: string
  productId: string
  code: string
  type: string
  brandId?: string | null
  brandLabel?: string
  status?: ProductReference['status']
}): Promise<void> {
  const payload = {
    product_id: input.productId,
    code: input.code.trim(),
    ref_type: input.type,
    brand_id: input.brandId || null,
    brand_label: input.brandLabel?.trim() || null,
    status: input.status ?? 'active',
  }
  const q = getSupabase().from('product_references')
  const { error } = input.id
    ? await q.update(payload).eq('id', input.id)
    : await q.insert(payload)
  if (error) throw error
}

export async function adminDeleteReference(id: string) {
  const { error } = await getSupabase().from('product_references').delete().eq('id', id)
  if (error) throw error
}

export async function adminListApplications(productId: string) {
  const { data, error } = await getSupabase()
    .from('product_vehicle_compatibility')
    .select(
      `
      id, notes, vehicle_version_id, year_start, year_end,
      vehicle_versions (
        id, year, engine, version_name,
        manufacturers ( name ),
        models ( name )
      )
    `,
    )
    .eq('product_id', productId)
  if (error) throw error
  return data ?? []
}

export async function adminAddApplication(
  productId: string,
  vehicleVersionId: string,
  notes?: string,
  years?: { yearStart?: number | null; yearEnd?: number | null },
) {
  const { error } = await getSupabase().from('product_vehicle_compatibility').upsert(
    {
      product_id: productId,
      vehicle_version_id: vehicleVersionId,
      notes: notes?.trim() || null,
      year_start: years?.yearStart ?? null,
      year_end: years?.yearEnd ?? null,
    },
    { onConflict: 'product_id,vehicle_version_id' },
  )
  if (error) throw error
}

/** Vincula várias configs (ex.: motorização “Todas”). */
export async function adminAddApplicationsBulk(
  productId: string,
  vehicleVersionIds: string[],
  years?: { yearStart?: number | null; yearEnd?: number | null },
): Promise<number> {
  const unique = [...new Set(vehicleVersionIds.filter(Boolean))]
  if (!unique.length) return 0
  const rows = unique.map((vehicleVersionId) => ({
    product_id: productId,
    vehicle_version_id: vehicleVersionId,
    notes: null as string | null,
    year_start: years?.yearStart ?? null,
    year_end: years?.yearEnd ?? null,
  }))
  const { error } = await getSupabase()
    .from('product_vehicle_compatibility')
    .upsert(rows, { onConflict: 'product_id,vehicle_version_id' })
  if (error) throw error
  return unique.length
}

export async function adminUpdateApplicationYears(
  id: string,
  years: { yearStart?: number | null; yearEnd?: number | null },
): Promise<void> {
  const { error } = await getSupabase()
    .from('product_vehicle_compatibility')
    .update({
      year_start: years.yearStart ?? null,
      year_end: years.yearEnd ?? null,
    })
    .eq('id', id)
  if (error) throw error
}

export async function adminRemoveApplication(id: string) {
  const { error } = await getSupabase().from('product_vehicle_compatibility').delete().eq('id', id)
  if (error) throw error
}

export async function refreshIncompleteFlag(productId: string) {
  const { count, error } = await getSupabase()
    .from('product_images')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', productId)
  if (error) throw error
  const incomplete = !count || count < 1
  const { error: uErr } = await getSupabase()
    .from('products')
    .update({ is_incomplete: incomplete })
    .eq('id', productId)
  if (uErr) throw uErr
}
