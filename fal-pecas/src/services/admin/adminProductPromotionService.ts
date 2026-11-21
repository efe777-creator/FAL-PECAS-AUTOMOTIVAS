/**
 * HOME-03 — ativação individual de promoção (gate product_promotions).
 * Preço permanece em price_list_items; a listagem operacional mostra
 * todos os SKUs cadastrados nas listas promocionais (não só o gate).
 * Kits e itens usam o mesmo fluxo (promo é do SKU do kit, não herda BOM).
 */
import { getSupabase } from '@/lib/supabase'
import { adminUpsertPriceListItem } from '@/services/admin/adminPriceListService'

export type AdminPromotionRow = {
  /** Id do gate product_promotions; null = só está na lista, ainda sem ativação. */
  id: string | null
  productId: string
  name: string
  sku: string
  productKind: 'item' | 'kit'
  priceListId: string
  priceListName: string
  status: 'active' | 'inactive'
  startsAt: string | null
  endsAt: string | null
  listPrice: number | null
  promoPrice: number | null
}

const BASE_LIST_ID = 'a1111111-1111-1111-1111-111111111101'

/** Lista operacional de kits — não é campanha promocional. */
const KITS_MANUAL_LIST_SLUG = 'preco-kits-manual'

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

export function adminPromotionRowKey(row: AdminPromotionRow): string {
  return row.id ?? `${row.priceListId}:${row.productId}`
}

/**
 * Lista SKUs com preço nas listas promocionais ativas,
 * cruzando com o gate product_promotions (ativa/inativa/agendada/expirada).
 * Use `productKind` para separar visualizações: itens vs kits.
 */
export async function adminListProductPromotions(opts?: {
  /** Se true, retorna só linhas com gate ativo (e vigência atual). */
  onlyActive?: boolean
  /** Filtra por tipo de produto — abas Itens / Kits. */
  productKind?: 'item' | 'kit'
  q?: string
}): Promise<AdminPromotionRow[]> {
  const sb = getSupabase()

  const { data: promoLists, error: listsErr } = await sb
    .from('price_lists')
    .select('id, name, slug')
    .eq('scope', 'public')
    .eq('status', 'active')
    .eq('is_default', false)
  if (listsErr) throw listsErr

  const lists = (promoLists ?? []).filter((l) => String(l.slug) !== KITS_MANUAL_LIST_SLUG)
  if (!lists.length) return []

  const listIds = lists.map((l) => String(l.id))
  const listNameById = new Map(lists.map((l) => [String(l.id), String(l.name)]))

  let itemsQuery = sb
    .from('price_list_items')
    .select('product_id, price_list_id, price, products!inner(id, name, sku, product_kind)')
    .in('price_list_id', listIds)
    .order('updated_at', { ascending: false })
    .limit(5000)

  // Separação na origem: aba Itens não lê kits; aba Kits não lê itens.
  if (opts?.productKind === 'kit') {
    itemsQuery = itemsQuery.eq('products.product_kind', 'kit')
  } else if (opts?.productKind === 'item') {
    itemsQuery = itemsQuery.neq('products.product_kind', 'kit')
  }

  const { data: items, error: itemsErr } = await itemsQuery
  if (itemsErr) throw itemsErr

  type ItemRow = {
    product_id: string
    price_list_id: string
    price: number | string
    products:
      | { id: string; name: string; sku: string; product_kind?: string }
      | { id: string; name: string; sku: string; product_kind?: string }[]
  }

  const itemRows = (items ?? []) as ItemRow[]
  if (!itemRows.length) return []

  const productIds = [...new Set(itemRows.map((r) => r.product_id))]

  const { data: gates, error: gatesErr } = await sb
    .from('product_promotions')
    .select('id, product_id, price_list_id, status, starts_at, ends_at, updated_at')
    .in('product_id', productIds)
    .in('price_list_id', listIds)
  if (gatesErr) throw gatesErr

  type GateRow = {
    id: string
    product_id: string
    price_list_id: string
    status: 'active' | 'inactive'
    starts_at: string | null
    ends_at: string | null
    updated_at: string | null
  }

  const gateByPair = new Map<string, GateRow>()
  for (const g of (gates ?? []) as GateRow[]) {
    const key = `${g.product_id}:${g.price_list_id}`
    const prev = gateByPair.get(key)
    if (!prev) {
      gateByPair.set(key, g)
      continue
    }
    // Prefer active; else most recently updated
    if (g.status === 'active' && prev.status !== 'active') {
      gateByPair.set(key, g)
    } else if (g.status === prev.status) {
      const gTs = g.updated_at ? new Date(g.updated_at).getTime() : 0
      const pTs = prev.updated_at ? new Date(prev.updated_at).getTime() : 0
      if (gTs >= pTs) gateByPair.set(key, g)
    }
  }

  const { data: basePrices, error: baseErr } = await sb
    .from('price_list_items')
    .select('product_id, price')
    .eq('price_list_id', BASE_LIST_ID)
    .in('product_id', productIds)
  if (baseErr) throw baseErr

  const baseMap = new Map<string, number>()
  for (const bp of basePrices ?? []) {
    baseMap.set(String(bp.product_id), Number(bp.price))
  }

  let mapped: AdminPromotionRow[] = itemRows.map((r) => {
    const p = Array.isArray(r.products) ? r.products[0]! : r.products
    const gate = gateByPair.get(`${r.product_id}:${r.price_list_id}`)
    return {
      id: gate?.id ?? null,
      productId: r.product_id,
      name: p.name,
      sku: p.sku,
      productKind: p.product_kind === 'kit' ? 'kit' : 'item',
      priceListId: r.price_list_id,
      priceListName: listNameById.get(r.price_list_id) ?? 'Lista promocional',
      status: gate?.status === 'active' ? 'active' : 'inactive',
      startsAt: gate?.starts_at ?? null,
      endsAt: gate?.ends_at ?? null,
      listPrice: baseMap.get(r.product_id) ?? null,
      promoPrice: Number(r.price),
    }
  })

  if (opts?.productKind === 'kit') {
    mapped = mapped.filter((r) => r.productKind === 'kit')
  } else if (opts?.productKind === 'item') {
    mapped = mapped.filter((r) => r.productKind === 'item')
  }

  if (opts?.onlyActive) {
    mapped = mapped.filter((r) => adminPromotionDisplayStatus(r) === 'active')
  }

  const q = (opts?.q ?? '').trim().toLowerCase()
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
  /** Se informado, grava/atualiza o preço na lista (permite incluir kit/item novo). */
  promoPrice?: number | null
}): Promise<void> {
  const sb = getSupabase()

  const { data: list, error: listErr } = await sb
    .from('price_lists')
    .select('id, is_default, scope, status, slug')
    .eq('id', input.priceListId)
    .single()
  if (listErr) throw listErr
  if (list.is_default) throw new Error('Não é possível ativar promoção na lista Base')
  if (String(list.slug) === KITS_MANUAL_LIST_SLUG) {
    throw new Error('Use a Lista Promocional — a lista de preços manuais de kits não é campanha')
  }
  if (list.scope !== 'public' || list.status !== 'active') {
    throw new Error('Lista deve ser public e active')
  }

  const { data: item, error: itemErr } = await sb
    .from('price_list_items')
    .select('id')
    .eq('product_id', input.productId)
    .eq('price_list_id', input.priceListId)
    .maybeSingle()
  if (itemErr) throw itemErr

  const wantsPrice =
    input.promoPrice != null && !Number.isNaN(input.promoPrice) && input.promoPrice >= 0

  if (!item && !wantsPrice) {
    throw new Error(
      'Informe o preço promocional para incluir este SKU na lista (vale para item e kit).',
    )
  }
  if (wantsPrice) {
    await adminUpsertPriceListItem({
      priceListId: input.priceListId,
      productId: input.productId,
      price: input.promoPrice!,
      source: 'manual',
    })
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

function mapPublicLists(
  data: Array<{ id: unknown; name: unknown; slug: unknown }> | null,
): Array<{ id: string; name: string; slug: string }> {
  return (data ?? [])
    .map((r) => ({
      id: String(r.id),
      name: String(r.name),
      slug: String(r.slug),
    }))
    .filter((l) => l.slug !== KITS_MANUAL_LIST_SLUG)
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
  return mapPublicLists(data)
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
  return mapPublicLists(data)
}
