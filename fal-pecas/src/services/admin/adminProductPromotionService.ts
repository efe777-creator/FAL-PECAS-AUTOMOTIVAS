/**
 * HOME-03 — ativação individual de promoção (gate product_promotions).
 * Preço permanece em price_list_items.
 */
import { getSupabase } from '@/lib/supabase'

export type AdminPromotionRow = {
  id: string
  productId: string
  name: string
  sku: string
  priceListId: string
  priceListName: string
  status: 'active' | 'inactive'
  startsAt: string | null
  endsAt: string | null
  listPrice: number | null
  promoPrice: number | null
}

const BASE_LIST_ID = 'a1111111-1111-1111-1111-111111111101'

function derivedStatus(
  status: string,
  startsAt: string | null,
  endsAt: string | null,
  now = Date.now(),
): 'active' | 'inactive' | 'scheduled' | 'expired' {
  if (status !== 'active') return 'inactive'
  if (startsAt && new Date(startsAt).getTime() > now) return 'scheduled'
  if (endsAt && new Date(endsAt).getTime() < now) return 'expired'
  return 'active'
}

export type AdminPromotionDisplayStatus = ReturnType<typeof derivedStatus>

export function adminPromotionDisplayStatus(row: AdminPromotionRow): AdminPromotionDisplayStatus {
  return derivedStatus(row.status, row.startsAt, row.endsAt)
}

export async function adminListProductPromotions(opts?: {
  onlyActive?: boolean
  q?: string
}): Promise<AdminPromotionRow[]> {
  const sb = getSupabase()
  let query = sb
    .from('product_promotions')
    .select(
      'id, product_id, price_list_id, status, starts_at, ends_at, products!inner(id, name, sku), price_lists!inner(id, name)',
    )
    .order('updated_at', { ascending: false })
    .limit(200)

  if (opts?.onlyActive) query = query.eq('status', 'active')

  const { data, error } = await query
  if (error) throw error

  const rows = (data ?? []) as Array<{
    id: string
    product_id: string
    price_list_id: string
    status: 'active' | 'inactive'
    starts_at: string | null
    ends_at: string | null
    products: { id: string; name: string; sku: string } | { id: string; name: string; sku: string }[]
    price_lists: { id: string; name: string } | { id: string; name: string }[]
  }>

  const productIds = rows.map((r) => r.product_id)
  const listIds = [...new Set(rows.map((r) => r.price_list_id).concat(BASE_LIST_ID))]

  const priceMap = new Map<string, number>()
  if (productIds.length) {
    const { data: items } = await sb
      .from('price_list_items')
      .select('product_id, price_list_id, price')
      .in('product_id', productIds)
      .in('price_list_id', listIds)
    for (const it of items ?? []) {
      priceMap.set(`${it.product_id}:${it.price_list_id}`, Number(it.price))
    }
  }

  const q = (opts?.q ?? '').trim().toLowerCase()
  const mapped: AdminPromotionRow[] = rows.map((r) => {
    const p = Array.isArray(r.products) ? r.products[0]! : r.products
    const pl = Array.isArray(r.price_lists) ? r.price_lists[0]! : r.price_lists
    return {
      id: r.id,
      productId: r.product_id,
      name: p.name,
      sku: p.sku,
      priceListId: r.price_list_id,
      priceListName: pl.name,
      status: r.status,
      startsAt: r.starts_at,
      endsAt: r.ends_at,
      listPrice: priceMap.get(`${r.product_id}:${BASE_LIST_ID}`) ?? null,
      promoPrice: priceMap.get(`${r.product_id}:${r.price_list_id}`) ?? null,
    }
  })

  if (!q) return mapped
  return mapped.filter(
    (r) =>
      r.name.toLowerCase().includes(q) ||
      r.sku.toLowerCase().includes(q) ||
      r.priceListName.toLowerCase().includes(q),
  )
}

export async function adminDeactivatePromotion(promotionId: string): Promise<void> {
  const sb = getSupabase()
  const { data: row, error: readErr } = await sb
    .from('product_promotions')
    .select('id, product_id, price_list_id')
    .eq('id', promotionId)
    .single()
  if (readErr) throw readErr

  const { error } = await sb
    .from('product_promotions')
    .update({ status: 'inactive', updated_at: new Date().toISOString() })
    .eq('id', promotionId)
  if (error) throw error

  await sb.from('product_promotion_events').insert({
    product_promotion_id: promotionId,
    product_id: row.product_id,
    price_list_id: row.price_list_id,
    action: 'deactivate',
  })
}

export async function adminActivatePromotion(input: {
  productId: string
  priceListId: string
  endsAt?: string | null
}): Promise<void> {
  const sb = getSupabase()
  const { data: item, error: itemErr } = await sb
    .from('price_list_items')
    .select('id')
    .eq('product_id', input.productId)
    .eq('price_list_id', input.priceListId)
    .maybeSingle()
  if (itemErr) throw itemErr
  if (!item) throw new Error('Produto sem preço nesta lista promocional')

  const { data: list, error: listErr } = await sb
    .from('price_lists')
    .select('id, is_default, scope, status')
    .eq('id', input.priceListId)
    .single()
  if (listErr) throw listErr
  if (list.is_default) throw new Error('Não é possível ativar promoção na lista Base')
  if (list.scope !== 'public' || list.status !== 'active') {
    throw new Error('Lista deve ser public e active')
  }

  const { data: current } = await sb
    .from('product_promotions')
    .select('id, price_list_id')
    .eq('product_id', input.productId)
    .eq('status', 'active')
    .maybeSingle()

  if (current && current.price_list_id !== input.priceListId) {
    await sb
      .from('product_promotions')
      .update({ status: 'inactive', updated_at: new Date().toISOString() })
      .eq('id', current.id)
    await sb.from('product_promotion_events').insert({
      product_promotion_id: current.id,
      product_id: input.productId,
      price_list_id: current.price_list_id,
      action: 'deactivate',
      meta: { reason: 'reassign' },
    })
  }

  if (current && current.price_list_id === input.priceListId) {
    const { error } = await sb
      .from('product_promotions')
      .update({
        status: 'active',
        ends_at: input.endsAt ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', current.id)
    if (error) throw error
    await sb.from('product_promotion_events').insert({
      product_promotion_id: current.id,
      product_id: input.productId,
      price_list_id: input.priceListId,
      action: 'activate',
    })
    return
  }

  const { data: inserted, error: insErr } = await sb
    .from('product_promotions')
    .insert({
      product_id: input.productId,
      price_list_id: input.priceListId,
      status: 'active',
      ends_at: input.endsAt ?? null,
    })
    .select('id')
    .single()
  if (insErr) throw insErr

  await sb.from('product_promotion_events').insert({
    product_promotion_id: inserted.id,
    product_id: input.productId,
    price_list_id: input.priceListId,
    action: 'activate',
  })
}

export async function adminListPromotionalLists(): Promise<
  Array<{ id: string; name: string; slug: string }>
> {
  const { data, error } = await getSupabase()
    .from('price_lists')
    .select('id, name, slug')
    .eq('scope', 'public')
    .eq('status', 'active')
    .eq('is_default', false)
    .order('priority', { ascending: false })
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: String(r.id),
    name: String(r.name),
    slug: String(r.slug),
  }))
}

/** B-06 — listas public não-default inativas (bloqueiam campanha). */
export async function adminListInactivePromotionalLists(): Promise<
  Array<{ id: string; name: string; slug: string }>
> {
  const { data, error } = await getSupabase()
    .from('price_lists')
    .select('id, name, slug')
    .eq('scope', 'public')
    .eq('status', 'inactive')
    .eq('is_default', false)
    .order('name')
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: String(r.id),
    name: String(r.name),
    slug: String(r.slug),
  }))
}
