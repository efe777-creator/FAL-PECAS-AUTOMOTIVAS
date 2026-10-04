import { getSupabase } from '@/lib/supabase'
import { toSlug } from '@/lib/slug'

export type PriceListStatus = 'draft' | 'active' | 'inactive'
export type PriceListScope = 'public' | 'assigned'

export interface PriceList {
  id: string
  name: string
  slug: string
  description?: string | null
  status: PriceListStatus
  scope: PriceListScope
  priority: number
  validFrom?: string | null
  validUntil?: string | null
  isDefault: boolean
  itemCount?: number
  createdAt?: string
  updatedAt?: string
}

export interface PriceListItem {
  id: string
  priceListId: string
  productId: string
  price: number
  sku?: string
  productName?: string
  updatedAt?: string
}

export interface PriceChangeHistoryRow {
  id: string
  productId: string
  priceListId: string
  oldPrice: number | null
  newPrice: number
  source: 'manual' | 'import' | 'system'
  importId?: string | null
  createdAt: string
  sku?: string
}

const LIST_SELECT =
  'id, name, slug, description, status, scope, priority, valid_from, valid_until, is_default, created_at, updated_at'

function mapList(row: Record<string, unknown>, itemCount?: number): PriceList {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    description: (row.description as string | null) ?? null,
    status: row.status as PriceListStatus,
    scope: row.scope as PriceListScope,
    priority: Number(row.priority),
    validFrom: (row.valid_from as string | null) ?? null,
    validUntil: (row.valid_until as string | null) ?? null,
    isDefault: Boolean(row.is_default),
    itemCount,
    createdAt: row.created_at as string | undefined,
    updatedAt: row.updated_at as string | undefined,
  }
}

export async function adminListPriceLists(): Promise<PriceList[]> {
  const sb = getSupabase()
  const { data, error } = await sb.from('price_lists').select(LIST_SELECT).order('priority', {
    ascending: false,
  })
  if (error) throw error

  const lists = (data ?? []).map((r) => mapList(r as Record<string, unknown>))
  if (!lists.length) return lists

  const { data: counts } = await sb.from('price_list_items').select('price_list_id')
  const map = new Map<string, number>()
  for (const c of counts ?? []) {
    const id = String(c.price_list_id)
    map.set(id, (map.get(id) ?? 0) + 1)
  }
  return lists.map((l) => ({ ...l, itemCount: map.get(l.id) ?? 0 }))
}

export async function adminGetPriceList(id: string): Promise<PriceList | null> {
  const { data, error } = await getSupabase()
    .from('price_lists')
    .select(LIST_SELECT)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return mapList(data as Record<string, unknown>)
}

export async function adminUpsertPriceList(input: {
  id?: string
  name: string
  slug?: string
  description?: string | null
  status: PriceListStatus
  scope: PriceListScope
  priority: number
  validFrom?: string | null
  validUntil?: string | null
  isDefault?: boolean
}): Promise<PriceList> {
  const sb = getSupabase()
  const payload = {
    name: input.name.trim(),
    slug: (input.slug?.trim() || toSlug(input.name)).trim(),
    description: input.description?.trim() || null,
    status: input.status,
    scope: input.scope,
    priority: input.priority,
    valid_from: input.validFrom || null,
    valid_until: input.validUntil || null,
    is_default: Boolean(input.isDefault),
  }

  if (payload.is_default) {
    await sb.from('price_lists').update({ is_default: false }).neq('id', input.id ?? '00000000-0000-0000-0000-000000000000')
  }

  const { data, error } = input.id
    ? await sb.from('price_lists').update(payload).eq('id', input.id).select(LIST_SELECT).single()
    : await sb.from('price_lists').insert(payload).select(LIST_SELECT).single()
  if (error) throw error
  return mapList(data as Record<string, unknown>)
}

export async function adminListPriceListItems(
  priceListId: string,
  q?: string,
): Promise<PriceListItem[]> {
  let query = getSupabase()
    .from('price_list_items')
    .select(
      'id, price_list_id, product_id, price, updated_at, products ( sku, name )',
    )
    .eq('price_list_id', priceListId)
    .order('updated_at', { ascending: false })
    .limit(500)

  const { data, error } = await query
  if (error) throw error

  let items = (data ?? []).map((row) => {
    const r = row as Record<string, unknown>
    const prod = r.products as { sku?: string; name?: string } | { sku?: string; name?: string }[] | null
    const p = Array.isArray(prod) ? prod[0] : prod
    return {
      id: String(r.id),
      priceListId: String(r.price_list_id),
      productId: String(r.product_id),
      price: Number(r.price),
      sku: p?.sku,
      productName: p?.name,
      updatedAt: r.updated_at as string | undefined,
    } satisfies PriceListItem
  })

  const term = q?.trim().toLowerCase()
  if (term) {
    items = items.filter(
      (i) =>
        i.sku?.toLowerCase().includes(term) ||
        i.productName?.toLowerCase().includes(term),
    )
  }
  return items
}

export async function adminUpsertPriceListItem(input: {
  priceListId: string
  productId: string
  price: number
  source?: 'manual' | 'import' | 'system'
  importId?: string | null
  changedBy?: string | null
}): Promise<void> {
  if (input.price < 0 || Number.isNaN(input.price)) {
    throw new Error('Preço inválido')
  }
  const sb = getSupabase()

  const { data: existing } = await sb
    .from('price_list_items')
    .select('id, price')
    .eq('price_list_id', input.priceListId)
    .eq('product_id', input.productId)
    .maybeSingle()

  const oldPrice = existing ? Number(existing.price) : null

  const { error } = await sb.from('price_list_items').upsert(
    {
      price_list_id: input.priceListId,
      product_id: input.productId,
      price: input.price,
    },
    { onConflict: 'price_list_id,product_id' },
  )
  if (error) throw error

  if (oldPrice === null || Math.abs(oldPrice - input.price) > 0.001) {
    await sb.from('price_change_history').insert({
      product_id: input.productId,
      price_list_id: input.priceListId,
      old_price: oldPrice,
      new_price: input.price,
      source: input.source ?? 'manual',
      import_id: input.importId ?? null,
      changed_by: input.changedBy ?? null,
    })
  }
}

export async function adminDeletePriceListItem(id: string): Promise<void> {
  const { error } = await getSupabase().from('price_list_items').delete().eq('id', id)
  if (error) throw error
}

export async function adminFindProductIdBySku(sku: string): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from('products')
    .select('id')
    .eq('sku', sku.trim())
    .maybeSingle()
  if (error) throw error
  return data?.id ? String(data.id) : null
}

/** IDs seed das listas Base e Promocional (F6B). */
export const PRICE_LIST_BASE_ID = 'a1111111-1111-1111-1111-111111111101'
export const PRICE_LIST_PROMO_ID = 'a1111111-1111-1111-1111-111111111102'

export type PriceAdjustMode = 'percent' | 'fixed'

function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Ajuste global em todos os itens da lista.
 * - percent: value = 10 → +10%; value = -5 → -5%
 * - fixed: value em R$ somado (negativo reduz)
 * Não altera preço avulso. Espelha products.price / promo_price se for Base/Promo.
 */
export async function adminAdjustAllPriceListItems(input: {
  priceListId: string
  mode: PriceAdjustMode
  value: number
  changedBy?: string | null
}): Promise<{ updated: number; skipped: number }> {
  if (!Number.isFinite(input.value) || input.value === 0) {
    throw new Error('Informe um valor de ajuste diferente de zero.')
  }

  const sb = getSupabase()
  const { data, error } = await sb
    .from('price_list_items')
    .select('product_id, price')
    .eq('price_list_id', input.priceListId)
  if (error) throw error

  const rows = data ?? []
  let updated = 0
  let skipped = 0

  for (const row of rows) {
    const oldPrice = Number(row.price)
    if (!Number.isFinite(oldPrice)) {
      skipped += 1
      continue
    }

    let next =
      input.mode === 'percent'
        ? oldPrice * (1 + input.value / 100)
        : oldPrice + input.value

    next = roundMoney2(next)
    if (next < 0) next = 0

    if (Math.abs(next - oldPrice) < 0.001) {
      skipped += 1
      continue
    }

    const productId = String(row.product_id)
    await adminUpsertPriceListItem({
      priceListId: input.priceListId,
      productId,
      price: next,
      source: 'manual',
      changedBy: input.changedBy ?? null,
    })

    if (input.priceListId === PRICE_LIST_BASE_ID) {
      await sb.from('products').update({ price: next }).eq('id', productId)
    } else if (input.priceListId === PRICE_LIST_PROMO_ID) {
      await sb.from('products').update({ promo_price: next }).eq('id', productId)
    }

    updated += 1
  }

  return { updated, skipped }
}

export type ProductListPriceRow = {
  priceListId: string
  listName: string
  listSlug: string
  status: PriceListStatus
  priority: number
  isDefault: boolean
  itemId: string | null
  price: number | null
}

/** Todas as listas + preço do produto em cada uma (se houver). */
export async function adminListProductListPrices(productId: string): Promise<ProductListPriceRow[]> {
  const sb = getSupabase()
  const [{ data: lists, error: lErr }, { data: items, error: iErr }] = await Promise.all([
    sb.from('price_lists').select(LIST_SELECT).order('priority', { ascending: false }),
    sb
      .from('price_list_items')
      .select('id, price_list_id, price')
      .eq('product_id', productId),
  ])
  if (lErr) throw lErr
  if (iErr) throw iErr

  const byList = new Map<string, { id: string; price: number }>()
  for (const row of items ?? []) {
    byList.set(String(row.price_list_id), {
      id: String(row.id),
      price: Number(row.price),
    })
  }

  return (lists ?? []).map((raw) => {
    const list = mapList(raw as Record<string, unknown>)
    const hit = byList.get(list.id)
    return {
      priceListId: list.id,
      listName: list.name,
      listSlug: list.slug,
      status: list.status,
      priority: list.priority,
      isDefault: list.isDefault,
      itemId: hit?.id ?? null,
      price: hit?.price ?? null,
    }
  })
}

/**
 * Sincroniza o produto nas listas: preço definido = upsert; null = remove da lista.
 * A lista Base deve sempre receber preço (≥ 0) quando o modo for listas.
 */
export async function adminSyncProductListPrices(input: {
  productId: string
  entries: { priceListId: string; price: number | null }[]
  changedBy?: string | null
}): Promise<void> {
  for (const entry of input.entries) {
    if (entry.price == null) {
      const { data: existing } = await getSupabase()
        .from('price_list_items')
        .select('id')
        .eq('price_list_id', entry.priceListId)
        .eq('product_id', input.productId)
        .maybeSingle()
      if (existing?.id) {
        await adminDeletePriceListItem(String(existing.id))
      }
      continue
    }
    await adminUpsertPriceListItem({
      priceListId: entry.priceListId,
      productId: input.productId,
      price: entry.price,
      source: 'manual',
      changedBy: input.changedBy ?? null,
    })
  }
}

export async function adminEnsureBaseAndPromoPrices(productId: string, price: number, promoPrice?: number | null) {
  const BASE = PRICE_LIST_BASE_ID
  const PROMO = PRICE_LIST_PROMO_ID
  await adminUpsertPriceListItem({
    priceListId: BASE,
    productId,
    price,
    source: 'manual',
  })
  if (promoPrice != null && !Number.isNaN(promoPrice)) {
    await adminUpsertPriceListItem({
      priceListId: PROMO,
      productId,
      price: promoPrice,
      source: 'manual',
    })
  } else {
    const sb = getSupabase()
    const { data: existing } = await sb
      .from('price_list_items')
      .select('id')
      .eq('price_list_id', PROMO)
      .eq('product_id', productId)
      .maybeSingle()
    if (existing?.id) {
      await sb.from('price_list_items').delete().eq('id', existing.id)
    }
  }
}

export type ImportPreviewRow = {
  line: number
  sku: string
  price: number | null
  productId: string | null
  errors: string[]
  warnings: string[]
  ok: boolean
}

export async function adminCreatePriceImport(input: {
  filename: string
  priceListId: string
  createdBy?: string | null
  rows: ImportPreviewRow[]
}): Promise<string> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('imports')
    .insert({
      filename: input.filename,
      status: 'preview',
      kind: 'price_list',
      price_list_id: input.priceListId,
      created_by: input.createdBy ?? null,
      report: {
        total: input.rows.length,
        valid: input.rows.filter((r) => r.ok).length,
        invalid: input.rows.filter((r) => !r.ok).length,
      },
    })
    .select('id')
    .single()
  if (error) throw error
  const importId = String(data.id)

  const items = input.rows.map((r) => ({
    import_id: importId,
    line_number: r.line,
    errors: r.errors,
    warnings: r.warnings,
    payload: { sku: r.sku, price: r.price, product_id: r.productId },
    result: r.ok ? 'ok' : 'error',
  }))
  if (items.length) {
    const { error: itemsErr } = await sb.from('import_items').insert(items)
    if (itemsErr) throw itemsErr
  }
  return importId
}

export async function adminApplyPriceImport(importId: string, priceListId: string): Promise<{
  applied: number
  failed: number
}> {
  const sb = getSupabase()
  await sb.from('imports').update({ status: 'importing' }).eq('id', importId)

  const { data: items, error } = await sb
    .from('import_items')
    .select('id, payload, result, errors')
    .eq('import_id', importId)
    .eq('result', 'ok')
  if (error) throw error

  let applied = 0
  let failed = 0
  for (const item of items ?? []) {
    const payload = item.payload as { sku?: string; price?: number; product_id?: string }
    try {
      if (!payload.product_id || payload.price == null) throw new Error('payload inválido')
      await adminUpsertPriceListItem({
        priceListId,
        productId: payload.product_id,
        price: Number(payload.price),
        source: 'import',
        importId,
      })
      applied++
    } catch {
      failed++
      await sb
        .from('import_items')
        .update({ result: 'error', errors: ['falha ao aplicar'] })
        .eq('id', item.id)
    }
  }

  await sb
    .from('imports')
    .update({
      status: failed && !applied ? 'failed' : 'done',
      report: { applied, failed },
    })
    .eq('id', importId)

  return { applied, failed }
}
