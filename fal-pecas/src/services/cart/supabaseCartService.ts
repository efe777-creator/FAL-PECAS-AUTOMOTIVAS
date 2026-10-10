import { getSupabase } from '@/lib/supabase'
import { getCurrentCustomerId } from '@/services/customers/customerService'
import { applyResolvedPricesToCartItems } from '@/services/cart/cartPricing'
import type { CartItem } from '@/types'

async function ensureCartId(customerId: string): Promise<string> {
  const sb = getSupabase()
  const { data: existing, error: selErr } = await sb
    .from('carts')
    .select('id')
    .eq('customer_id', customerId)
    .maybeSingle()
  if (selErr) throw selErr
  if (existing?.id) return String(existing.id)

  const { data: created, error: insErr } = await sb
    .from('carts')
    .insert({ customer_id: customerId })
    .select('id')
    .single()
  if (insErr) throw insErr
  return String(created.id)
}

function dedupeCartItems(items: CartItem[]): CartItem[] {
  const map = new Map<string, CartItem>()
  for (const item of items) {
    const prev = map.get(item.productId)
    if (prev) {
      map.set(item.productId, {
        ...prev,
        ...item,
        quantity: Math.max(prev.quantity, item.quantity),
      })
    } else {
      map.set(item.productId, item)
    }
  }
  return Array.from(map.values())
}

export async function loadRemoteCart(): Promise<CartItem[]> {
  const customerId = await getCurrentCustomerId()
  if (!customerId) return []

  const sb = getSupabase()
  const cartId = await ensureCartId(customerId)
  const { data, error } = await sb
    .from('cart_items')
    .select(
      'product_id, quantity, unit_price_snapshot, products ( sku, name, price, promo_price )',
    )
    .eq('cart_id', cartId)
  if (error) throw error

  const mapped: CartItem[] = (data ?? []).map((row) => {
    const product = Array.isArray(row.products) ? row.products[0] : row.products
    const p = product as
      | { sku?: string; name?: string; price?: number; promo_price?: number | null }
      | null
    // Snapshot só como placeholder até applyResolvedPricesToCartItems (FIND-006).
    const price =
      row.unit_price_snapshot != null
        ? Number(row.unit_price_snapshot)
        : Number(p?.price ?? 0)
    return {
      productId: String(row.product_id),
      sku: String(p?.sku ?? ''),
      name: String(p?.name ?? 'Produto'),
      price,
      quantity: Number(row.quantity),
    }
  })

  return applyResolvedPricesToCartItems(mapped, customerId)
}

/**
 * Persiste o carrinho remoto.
 * Usa upsert + limpeza de órfãos (evita 23505 em saves concorrentes delete+insert).
 */
export async function saveRemoteCart(items: CartItem[]): Promise<void> {
  const customerId = await getCurrentCustomerId()
  if (!customerId) return

  const sb = getSupabase()
  const cartId = await ensureCartId(customerId)
  const unique = dedupeCartItems(items)

  if (!unique.length) {
    const { error: delAllErr } = await sb.from('cart_items').delete().eq('cart_id', cartId)
    if (delAllErr) throw delAllErr
    await sb.from('carts').update({ updated_at: new Date().toISOString() }).eq('id', cartId)
    return
  }

  const { error: upsErr } = await sb.from('cart_items').upsert(
    unique.map((i) => ({
      cart_id: cartId,
      product_id: i.productId,
      quantity: i.quantity,
      unit_price_snapshot: i.price,
    })),
    { onConflict: 'cart_id,product_id' },
  )
  if (upsErr) throw upsErr

  const keepIds = unique.map((i) => i.productId)
  const { error: delErr } = await sb
    .from('cart_items')
    .delete()
    .eq('cart_id', cartId)
    .not('product_id', 'in', `(${keepIds.join(',')})`)
  if (delErr) throw delErr

  await sb.from('carts').update({ updated_at: new Date().toISOString() }).eq('id', cartId)
}

export async function clearRemoteCart(): Promise<void> {
  await saveRemoteCart([])
}

/** Merge: soma quantidades por productId; preço do item remoto se existir, senão local. */
export function mergeCartItems(local: CartItem[], remote: CartItem[]): CartItem[] {
  const map = new Map<string, CartItem>()
  for (const item of remote) {
    map.set(item.productId, { ...item })
  }
  for (const item of local) {
    const prev = map.get(item.productId)
    if (prev) {
      map.set(item.productId, {
        ...prev,
        quantity: prev.quantity + item.quantity,
      })
    } else {
      map.set(item.productId, { ...item })
    }
  }
  return Array.from(map.values())
}
