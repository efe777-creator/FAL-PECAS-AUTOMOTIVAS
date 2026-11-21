import { getSupabase } from '@/lib/supabase'
import {
  PRICE_LIST_BASE_ID,
  adminUpsertPriceListItem,
} from '@/services/admin/adminPriceListService'
import { adminListKitComponents } from '@/services/admin/adminProductKitService'

/** Seed da lista pública de preços manuais de kits (K2). */
export const PRICE_LIST_KITS_MANUAL_ID = 'a1111111-1111-1111-1111-111111111103'

export type KitPricePreview = {
  kitProductId: string
  kitPriceMode: 'auto' | 'manual'
  componentsSum: number
  /** Preço na lista Base. */
  baseListPrice: number | null
  /** Preço na lista manual de kits. */
  manualListPrice: number | null
  /** Preço efetivo sugerido para a loja (ainda via resolve). */
  effectiveHint: number
  /** Manual sem preço na lista → usando soma provisória. */
  provisional: boolean
  missingComponentPrices: string[]
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

async function loadBasePrices(productIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  if (productIds.length === 0) return map
  const { data, error } = await getSupabase()
    .from('price_list_items')
    .select('product_id, price')
    .eq('price_list_id', PRICE_LIST_BASE_ID)
    .in('product_id', productIds)
  if (error) throw error
  for (const row of data ?? []) {
    map.set(String(row.product_id), Number(row.price))
  }
  return map
}

/** Soma Base dos componentes × qty. */
export async function adminComputeKitComponentsSum(kitProductId: string): Promise<{
  sum: number
  missing: string[]
}> {
  const comps = await adminListKitComponents(kitProductId)
  const prices = await loadBasePrices(comps.map((c) => c.componentProductId))
  let sum = 0
  const missing: string[] = []
  for (const c of comps) {
    const unit = prices.get(c.componentProductId)
    if (unit == null || Number.isNaN(unit)) {
      missing.push(c.componentCommercialRef || c.componentSku)
      continue
    }
    sum += unit * c.quantity
  }
  return { sum: round2(sum), missing }
}

export async function adminGetKitPricePreview(kitProductId: string): Promise<KitPricePreview> {
  const { data: product, error } = await getSupabase()
    .from('products')
    .select('id, kit_price_mode')
    .eq('id', kitProductId)
    .single()
  if (error) throw error

  const mode = product.kit_price_mode === 'manual' ? 'manual' : 'auto'
  const { sum, missing } = await adminComputeKitComponentsSum(kitProductId)

  const { data: listRows, error: listErr } = await getSupabase()
    .from('price_list_items')
    .select('price_list_id, price')
    .eq('product_id', kitProductId)
    .in('price_list_id', [PRICE_LIST_BASE_ID, PRICE_LIST_KITS_MANUAL_ID])
  if (listErr) throw listErr

  let baseListPrice: number | null = null
  let manualListPrice: number | null = null
  for (const row of listRows ?? []) {
    if (row.price_list_id === PRICE_LIST_BASE_ID) baseListPrice = Number(row.price)
    if (row.price_list_id === PRICE_LIST_KITS_MANUAL_ID) manualListPrice = Number(row.price)
  }

  const provisional = mode === 'manual' && (manualListPrice == null || Number.isNaN(manualListPrice))
  const effectiveHint =
    mode === 'manual' && manualListPrice != null ? manualListPrice : sum

  return {
    kitProductId,
    kitPriceMode: mode,
    componentsSum: sum,
    baseListPrice,
    manualListPrice,
    effectiveHint: round2(effectiveHint),
    provisional,
    missingComponentPrices: missing,
  }
}

/**
 * Materializa preço do kit no motor 6B:
 * - auto → Base = soma; remove linha da lista manual
 * - manual com preço → lista kits-manual; Base espelha o mesmo valor (fallback)
 * - manual sem preço novo, mas já existe na lista kits-manual → preserva e espelha na Base
 * - manual sem nenhum preço → Base = soma provisória; alerta via preview.provisional
 * Nota: resolve da loja usa Lista Base (is_default); a lista kits-manual é espelho/cadastro.
 */
export async function adminSyncKitListPrices(input: {
  kitProductId: string
  kitPriceMode: 'auto' | 'manual'
  manualPrice?: number | null
  changedBy?: string | null
}): Promise<KitPricePreview> {
  const { sum, missing } = await adminComputeKitComponentsSum(input.kitProductId)
  const sb = getSupabase()

  if (input.kitPriceMode === 'auto') {
    await adminUpsertPriceListItem({
      priceListId: PRICE_LIST_BASE_ID,
      productId: input.kitProductId,
      price: sum,
      source: 'system',
      changedBy: input.changedBy,
    })
    await sb
      .from('price_list_items')
      .delete()
      .eq('price_list_id', PRICE_LIST_KITS_MANUAL_ID)
      .eq('product_id', input.kitProductId)
    await sb.from('products').update({ price: sum }).eq('id', input.kitProductId)
  } else {
    // Manual: preservar preço já cadastrado quando sync vem sem manualPrice
    // (ex.: alteração de BOM). Senão a Base (fonte do resolve) era sobrescrita
    // com a soma e a vitrine perdia o preço manual.
    let manual =
      input.manualPrice != null && !Number.isNaN(input.manualPrice) && input.manualPrice >= 0
        ? input.manualPrice
        : null
    if (manual == null) {
      const { data: existingManualRows, error: existingErr } = await sb
        .from('price_list_items')
        .select('price')
        .eq('price_list_id', PRICE_LIST_KITS_MANUAL_ID)
        .eq('product_id', input.kitProductId)
        .maybeSingle()
      if (existingErr) throw existingErr
      if (existingManualRows?.price != null && !Number.isNaN(Number(existingManualRows.price))) {
        manual = Number(existingManualRows.price)
      }
    }

    if (manual != null) {
      await adminUpsertPriceListItem({
        priceListId: PRICE_LIST_KITS_MANUAL_ID,
        productId: input.kitProductId,
        price: manual,
        source: 'manual',
        changedBy: input.changedBy,
      })
      await adminUpsertPriceListItem({
        priceListId: PRICE_LIST_BASE_ID,
        productId: input.kitProductId,
        price: manual,
        source: 'system',
        changedBy: input.changedBy,
      })
      await sb.from('products').update({ price: manual }).eq('id', input.kitProductId)
    } else {
      // Provisório: ainda sem preço manual — Base = soma (preview.provisional)
      await adminUpsertPriceListItem({
        priceListId: PRICE_LIST_BASE_ID,
        productId: input.kitProductId,
        price: sum,
        source: 'system',
        changedBy: input.changedBy,
      })
      await sb.from('products').update({ price: sum }).eq('id', input.kitProductId)
    }
  }

  void missing
  await adminSyncKitPackageMeasuresIfEmpty(input.kitProductId)
  return adminGetKitPricePreview(input.kitProductId)
}

/**
 * Se o kit ainda não tem peso/caixa, deriva medidas dos componentes (soma peso × qty;
 * caixa = máximos). Evita PDP sem cotação ME por kit “sem embalagem”.
 */
export async function adminSyncKitPackageMeasuresIfEmpty(kitProductId: string): Promise<boolean> {
  const sb = getSupabase()
  const { data: kit, error: kitErr } = await sb
    .from('products')
    .select('weight_kg, height_cm, width_cm, length_cm')
    .eq('id', kitProductId)
    .maybeSingle()
  if (kitErr) throw kitErr
  if (!kit) return false

  const hasPackage =
    kit.weight_kg != null &&
    Number(kit.weight_kg) > 0 &&
    kit.height_cm != null &&
    Number(kit.height_cm) > 0 &&
    kit.width_cm != null &&
    Number(kit.width_cm) > 0 &&
    kit.length_cm != null &&
    Number(kit.length_cm) > 0
  if (hasPackage) return false

  const comps = await adminListKitComponents(kitProductId)
  if (!comps.length) return false

  const ids = comps.map((c) => c.componentProductId)
  const { data: rows, error } = await sb
    .from('products')
    .select('id, weight_kg, height_cm, width_cm, length_cm')
    .in('id', ids)
  if (error) throw error

  const byId = new Map((rows ?? []).map((r) => [String(r.id), r]))
  let weight = 0
  let height = 0
  let width = 0
  let length = 0
  let any = false
  for (const c of comps) {
    const row = byId.get(c.componentProductId)
    if (!row) continue
    const w = row.weight_kg == null ? null : Number(row.weight_kg)
    if (w != null && w > 0) {
      weight += w * c.quantity
      any = true
    }
    const h = row.height_cm == null ? null : Number(row.height_cm)
    const wi = row.width_cm == null ? null : Number(row.width_cm)
    const le = row.length_cm == null ? null : Number(row.length_cm)
    if (h != null && h > 0) height = Math.max(height, h)
    if (wi != null && wi > 0) width = Math.max(width, wi)
    if (le != null && le > 0) length = Math.max(length, le)
  }

  if (!any || !(height > 0 && width > 0 && length > 0)) return false

  const { error: upErr } = await sb
    .from('products')
    .update({
      weight_kg: round2(weight),
      height_cm: round2(height),
      width_cm: round2(width),
      length_cm: round2(length),
      weight_origin: 'global',
      height_origin: 'global',
      width_origin: 'global',
      length_origin: 'global',
      updated_at: new Date().toISOString(),
    })
    .eq('id', kitProductId)
  if (upErr) throw upErr
  return true
}
