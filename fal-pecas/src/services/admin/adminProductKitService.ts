import { getSupabase } from '@/lib/supabase'
import { adminEnsureKitImageFromComponents } from '@/services/admin/adminImageService'
import { adminSyncKitListPrices } from '@/services/admin/adminKitPricingService'

async function syncKitAfterComposition(kitProductId: string, actorId?: string | null) {
  const { data, error } = await getSupabase()
    .from('products')
    .select('kit_price_mode')
    .eq('id', kitProductId)
    .maybeSingle()
  if (error) throw error
  const mode = data?.kit_price_mode === 'manual' ? 'manual' : 'auto'
  await adminSyncKitListPrices({
    kitProductId,
    kitPriceMode: mode,
    changedBy: actorId,
  })
  const comps = await adminListKitComponents(kitProductId)
  await adminEnsureKitImageFromComponents(
    kitProductId,
    comps.map((c) => c.componentProductId),
  )
}

export type ProductKind = 'item' | 'kit'
export type KitPriceMode = 'auto' | 'manual'

export type AdminKitComponentRow = {
  id: string
  kitProductId: string
  componentProductId: string
  quantity: number
  sortOrder: number
  componentSku: string
  componentCommercialRef: string
  componentName: string
  componentStatus: string
  componentKind: ProductKind
}

export type AdminKitUsageRow = {
  id: string
  kitProductId: string
  quantity: number
  kitSku: string
  kitCommercialRef: string
  kitName: string
  kitStatus: string
  kitPriceMode: KitPriceMode
  kitCompatReviewRequired: boolean
}

export type AdminKitReplacePreviewRow = AdminKitUsageRow & {
  /** Novo componente já existe neste kit → merge de qty na execução. */
  newAlreadyPresent: boolean
  newComponentQuantity: number
}

export type AdminKitReplaceResult = {
  updatedKitIds: string[]
  skipped: Array<{ kitProductId: string; reason: string }>
}

type ComponentJoinRow = {
  id: string
  kit_product_id: string
  component_product_id: string
  quantity: number
  sort_order: number
  products:
    | {
        sku: string
        commercial_ref: string | null
        name: string
        status: string
        product_kind: string
      }
    | {
        sku: string
        commercial_ref: string | null
        name: string
        status: string
        product_kind: string
      }[]
    | null
}

type UsageJoinRow = {
  id: string
  kit_product_id: string
  quantity: number
  products:
    | {
        sku: string
        commercial_ref: string | null
        name: string
        status: string
        kit_price_mode: string | null
        kit_compat_review_required: boolean | null
      }
    | {
        sku: string
        commercial_ref: string | null
        name: string
        status: string
        kit_price_mode: string | null
        kit_compat_review_required: boolean | null
      }[]
    | null
}

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function mapComponent(row: ComponentJoinRow): AdminKitComponentRow {
  const p = asOne(row.products)
  return {
    id: row.id,
    kitProductId: row.kit_product_id,
    componentProductId: row.component_product_id,
    quantity: Number(row.quantity),
    sortOrder: row.sort_order,
    componentSku: p?.sku ?? '',
    componentCommercialRef: p?.commercial_ref ?? p?.sku ?? '',
    componentName: p?.name ?? '',
    componentStatus: p?.status ?? '',
    componentKind: (p?.product_kind as ProductKind) ?? 'item',
  }
}

function mapUsage(row: UsageJoinRow): AdminKitUsageRow {
  const p = asOne(row.products)
  return {
    id: row.id,
    kitProductId: row.kit_product_id,
    quantity: Number(row.quantity),
    kitSku: p?.sku ?? '',
    kitCommercialRef: p?.commercial_ref ?? p?.sku ?? '',
    kitName: p?.name ?? '',
    kitStatus: p?.status ?? '',
    kitPriceMode: p?.kit_price_mode === 'manual' ? 'manual' : 'auto',
    kitCompatReviewRequired: p?.kit_compat_review_required === true,
  }
}

async function logEvent(input: {
  kitProductId: string
  eventType: 'add' | 'remove' | 'replace' | 'qty_change'
  componentProductId?: string | null
  previousComponentProductId?: string | null
  quantity?: number | null
  previousQuantity?: number | null
  actorId?: string | null
  note?: string | null
}) {
  const { error } = await getSupabase().from('product_kit_component_events').insert({
    kit_product_id: input.kitProductId,
    event_type: input.eventType,
    component_product_id: input.componentProductId ?? null,
    previous_component_product_id: input.previousComponentProductId ?? null,
    quantity: input.quantity ?? null,
    previous_quantity: input.previousQuantity ?? null,
    actor_id: input.actorId ?? null,
    note: input.note ?? null,
  })
  if (error) throw error
}

/** Lista componentes do kit (BOM). */
export async function adminListKitComponents(kitProductId: string): Promise<AdminKitComponentRow[]> {
  const { data, error } = await getSupabase()
    .from('product_kit_components')
    .select(
      `
      id, kit_product_id, component_product_id, quantity, sort_order,
      products!product_kit_components_component_product_id_fkey (
        sku, commercial_ref, name, status, product_kind
      )
    `,
    )
    .eq('kit_product_id', kitProductId)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return ((data ?? []) as ComponentJoinRow[]).map(mapComponent)
}

/** Kits que usam este item como componente. */
export async function adminListKitsUsingProduct(componentProductId: string): Promise<AdminKitUsageRow[]> {
  const { data, error } = await getSupabase()
    .from('product_kit_components')
    .select(
      `
      id, kit_product_id, quantity,
      products!product_kit_components_kit_product_id_fkey (
        sku, commercial_ref, name, status, kit_price_mode, kit_compat_review_required
      )
    `,
    )
    .eq('component_product_id', componentProductId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as UsageJoinRow[]).map(mapUsage)
}

/** Preview K8: kits afetados + se o novo componente já está no BOM. */
export async function adminPreviewKitComponentReplace(input: {
  oldComponentProductId: string
  newComponentProductId: string
}): Promise<AdminKitReplacePreviewRow[]> {
  if (input.oldComponentProductId === input.newComponentProductId) {
    throw new Error('Componente novo deve ser diferente do atual')
  }
  const usages = await adminListKitsUsingProduct(input.oldComponentProductId)
  if (usages.length === 0) return []

  const kitIds = usages.map((u) => u.kitProductId)
  const { data, error } = await getSupabase()
    .from('product_kit_components')
    .select('kit_product_id, quantity')
    .eq('component_product_id', input.newComponentProductId)
    .in('kit_product_id', kitIds)
  if (error) throw error

  const present = new Map<string, number>()
  for (const row of data ?? []) {
    present.set(String(row.kit_product_id), Number(row.quantity))
  }

  return usages.map((u) => ({
    ...u,
    newAlreadyPresent: present.has(u.kitProductId),
    newComponentQuantity: present.get(u.kitProductId) ?? 0,
  }))
}

/**
 * K8: substituição assistida transacional nos kits selecionados.
 * Depois sincroniza preço auto; pedidos/snapshots permanecem intactos.
 */
export async function adminReplaceComponentInKits(input: {
  oldComponentProductId: string
  newComponentProductId: string
  kitProductIds: string[]
  note?: string | null
  actorId?: string | null
}): Promise<AdminKitReplaceResult> {
  const kitIds = [...new Set(input.kitProductIds.filter(Boolean))]
  if (kitIds.length === 0) throw new Error('Selecione ao menos um kit')

  const { data, error } = await getSupabase().rpc('admin_replace_component_in_kits', {
    p_old_component_id: input.oldComponentProductId,
    p_new_component_id: input.newComponentProductId,
    p_kit_ids: kitIds,
    p_note: input.note?.trim() || null,
  })
  if (error) throw error

  const payload = (data ?? {}) as {
    updated_kit_ids?: string[]
    skipped?: Array<{ kit_product_id?: string; reason?: string }>
  }
  const updatedKitIds = (payload.updated_kit_ids ?? []).map(String)
  const skipped = (payload.skipped ?? []).map((s) => ({
    kitProductId: String(s.kit_product_id ?? ''),
    reason: String(s.reason ?? 'skipped'),
  }))

  for (const kitId of updatedKitIds) {
    await syncKitAfterComposition(kitId, input.actorId)
  }

  return { updatedKitIds, skipped }
}

export function isKitCompositionPublishable(rows: { quantity: number }[]): boolean {
  if (rows.length >= 2) return true
  if (rows.length === 1 && rows[0]!.quantity >= 2) return true
  return false
}

export async function adminAddKitComponent(input: {
  kitProductId: string
  componentProductId: string
  quantity: number
  actorId?: string | null
}): Promise<void> {
  const qty = Number(input.quantity)
  if (!(qty > 0)) throw new Error('Quantidade deve ser maior que zero')
  if (input.kitProductId === input.componentProductId) {
    throw new Error('Kit não pode incluir a si mesmo')
  }

  const existing = await adminListKitComponents(input.kitProductId)
  const dup = existing.find((r) => r.componentProductId === input.componentProductId)
  if (dup) {
    // Merge qty (mesmo comportamento do replace K8) em vez de erro de unique.
    await adminUpdateKitComponentQuantity({
      kitProductId: input.kitProductId,
      rowId: dup.id,
      componentProductId: input.componentProductId,
      previousQuantity: dup.quantity,
      quantity: dup.quantity + qty,
      actorId: input.actorId,
    })
    return
  }

  const sortOrder = existing.length === 0 ? 0 : Math.max(...existing.map((r) => r.sortOrder)) + 1

  const { error } = await getSupabase().from('product_kit_components').insert({
    kit_product_id: input.kitProductId,
    component_product_id: input.componentProductId,
    quantity: qty,
    sort_order: sortOrder,
  })
  if (error) throw error

  await logEvent({
    kitProductId: input.kitProductId,
    eventType: 'add',
    componentProductId: input.componentProductId,
    quantity: qty,
    actorId: input.actorId,
  })
  await syncKitAfterComposition(input.kitProductId, input.actorId)
}

export async function adminUpdateKitComponentQuantity(input: {
  kitProductId: string
  rowId: string
  componentProductId: string
  previousQuantity: number
  quantity: number
  actorId?: string | null
}): Promise<void> {
  const qty = Number(input.quantity)
  if (!(qty > 0)) throw new Error('Quantidade deve ser maior que zero')

  const { error } = await getSupabase()
    .from('product_kit_components')
    .update({ quantity: qty, updated_at: new Date().toISOString() })
    .eq('id', input.rowId)
    .eq('kit_product_id', input.kitProductId)
  if (error) throw error

  await logEvent({
    kitProductId: input.kitProductId,
    eventType: 'qty_change',
    componentProductId: input.componentProductId,
    quantity: qty,
    previousQuantity: input.previousQuantity,
    actorId: input.actorId,
  })
  await syncKitAfterComposition(input.kitProductId, input.actorId)
}

export async function adminRemoveKitComponent(input: {
  kitProductId: string
  rowId: string
  componentProductId: string
  quantity: number
  actorId?: string | null
}): Promise<void> {
  const { error } = await getSupabase()
    .from('product_kit_components')
    .delete()
    .eq('id', input.rowId)
    .eq('kit_product_id', input.kitProductId)
  if (error) throw error

  await logEvent({
    kitProductId: input.kitProductId,
    eventType: 'remove',
    componentProductId: input.componentProductId,
    previousQuantity: input.quantity,
    actorId: input.actorId,
  })
  await syncKitAfterComposition(input.kitProductId, input.actorId)
}
