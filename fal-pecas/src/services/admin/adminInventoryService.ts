import { getSupabase } from '@/lib/supabase'

export type InventoryMode = 'com_estoque' | 'estoque_ficticio' | 'sem_estoque'

export const INVENTORY_MODE_LABELS: Record<InventoryMode, string> = {
  com_estoque: 'Com estoque (real)',
  estoque_ficticio: 'Estoque fictício',
  sem_estoque: 'Sem estoque',
}

export const INVENTORY_MODE_SUCCESS_MSG: Record<InventoryMode, string> = {
  com_estoque: 'Loja agora em Com estoque — reservas e baixas físicas estão ativas.',
  estoque_ficticio: 'Loja agora em Estoque fictício — vendas não dependem do estoque físico.',
  sem_estoque: 'Loja agora em Sem estoque — vendas usam disponibilidade comercial.',
}

/** Extrai mensagem útil de erros Supabase/PostgREST (não só instanceof Error). */
export function formatInventoryError(err: unknown, fallback: string): string {
  if (err == null) return fallback
  if (typeof err === 'string' && err.trim()) return err.trim()
  if (err instanceof Error && err.message.trim()) return err.message.trim()
  if (typeof err === 'object') {
    const o = err as Record<string, unknown>
    const parts = [o.message, o.error_description, o.details, o.hint, o.code]
      .map((v) => (typeof v === 'string' ? v.trim() : ''))
      .filter(Boolean)
    if (parts.length) return parts.join(' — ')
  }
  return fallback
}

export interface InventoryRow {
  productId: string
  sku: string
  name: string
  onHand: number
  reserved: number
  available: number
}

export interface InventoryMovementRow {
  id: string
  productId: string
  type: string
  quantity: number
  reason: string | null
  orderId: string | null
  createdAt: string
}

export async function getStoreInventoryMode(): Promise<InventoryMode> {
  const { data, error } = await getSupabase().rpc('get_store_inventory_mode')
  if (error) throw error
  const m = String(data ?? 'com_estoque')
  if (m === 'estoque_ficticio' || m === 'sem_estoque' || m === 'com_estoque') return m
  return 'com_estoque'
}

export async function setStoreInventoryMode(mode: InventoryMode): Promise<InventoryMode> {
  const { data, error } = await getSupabase().rpc('set_store_inventory_mode', { p_mode: mode })
  if (error) throw error
  const m = String(data ?? mode)
  if (m === 'estoque_ficticio' || m === 'sem_estoque' || m === 'com_estoque') return m
  return mode
}

export async function staffCanAdjustInventory(): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('staff_can_adjust_inventory')
  if (error) throw error
  return Boolean(data)
}

export async function isAdministrador(): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('is_administrador')
  if (error) throw error
  return Boolean(data)
}

export async function listInventory(search?: string): Promise<InventoryRow[]> {
  let q = getSupabase()
    .from('products')
    .select('id, sku, name, inventory(quantity_on_hand, quantity_reserved)')
    .neq('status', 'archived')
    .order('name')
    .limit(200)

  if (search?.trim()) {
    const s = search.trim()
    q = q.or(`name.ilike.%${s}%,sku.ilike.%${s}%`)
  }

  const { data, error } = await q
  if (error) throw error

  return (data ?? []).map((row) => {
    const inv = Array.isArray(row.inventory) ? row.inventory[0] : row.inventory
    const onHand = Number(inv?.quantity_on_hand ?? 0)
    const reserved = Number(inv?.quantity_reserved ?? 0)
    return {
      productId: row.id as string,
      sku: String(row.sku ?? ''),
      name: String(row.name ?? ''),
      onHand,
      reserved,
      available: onHand - reserved,
    }
  })
}

export async function listInventoryMovements(productId: string, limit = 30): Promise<InventoryMovementRow[]> {
  const { data, error } = await getSupabase()
    .from('inventory_movements')
    .select('id, product_id, type, quantity, reason, order_id, created_at')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []).map((m) => ({
    id: m.id as string,
    productId: m.product_id as string,
    type: String(m.type),
    quantity: Number(m.quantity),
    reason: (m.reason as string | null) ?? null,
    orderId: (m.order_id as string | null) ?? null,
    createdAt: String(m.created_at),
  }))
}

export async function adjustInventory(productId: string, delta: number, reason?: string) {
  const { data, error } = await getSupabase().rpc('adjust_inventory', {
    p_product_id: productId,
    p_delta: delta,
    p_reason: reason ?? null,
  })
  if (error) throw error
  return data as { product_id: string; quantity_on_hand: number; quantity_reserved: number; delta: number }
}
