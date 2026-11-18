/**
 * PLANO 2B E2 — preview de peças FAL no viewer (read-only).
 * Lê G7 existente; NÃO inventa bought; NÃO cria instalação a partir do visual.
 */

import { getSupabase } from '@/lib/supabase'
import {
  eventProductLabel,
  listVehiclePartEvents,
  type VehiclePartEvent,
  type VehiclePartEventType,
} from '@/services/garage/vehiclePartEventService'
import { pickPrimaryStoragePath } from '@/services/products/productImages'

export type VisualPartPreviewState = 'comprada' | 'associada' | 'aguardando' | 'instalada'

export type VisualPartPreview = {
  key: string
  productId: string | null
  name: string
  sku: string | null
  imageUrl: string | null
  state: VisualPartPreviewState
  orderId: string | null
  /** Último evento G7 que define o estado (somente leitura). */
  sourceEventType: VehiclePartEventType
}

const STATE_RANK: Record<VisualPartPreviewState, number> = {
  comprada: 1,
  associada: 2,
  aguardando: 3,
  instalada: 4,
}

function stateFromEventType(t: VehiclePartEventType): VisualPartPreviewState | null {
  switch (t) {
    case 'bought':
      return 'comprada'
    case 'associated':
      return 'associada'
    case 'awaiting_install':
      return 'aguardando'
    case 'installed_declared':
      return 'instalada'
    case 'returned':
    case 'disassociated':
    case 'corrected':
      return null
    default:
      return null
  }
}

export function groupPartEventsForPreview(events: VehiclePartEvent[]): VisualPartPreview[] {
  // Mais antigo → mais novo: estado sobe; returned/disassociated remove do preview
  const chronological = [...events].sort((a, b) =>
    a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0,
  )
  const byKey = new Map<string, VisualPartPreview>()

  for (const ev of chronological) {
    const key =
      ev.orderItemId ??
      (ev.productId ? `p:${ev.productId}` : null) ??
      `e:${ev.id}`
    if (ev.eventType === 'returned' || ev.eventType === 'disassociated') {
      byKey.delete(key)
      continue
    }
    const state = stateFromEventType(ev.eventType)
    if (!state) continue

    const prev = byKey.get(key)
    const nextState =
      prev && STATE_RANK[prev.state] > STATE_RANK[state] ? prev.state : state
    const name = eventProductLabel(ev)
    const sku = typeof ev.payload.sku === 'string' ? ev.payload.sku : null

    byKey.set(key, {
      key,
      productId: ev.productId,
      name: prev?.name && prev.name !== 'Peça' ? prev.name : name,
      sku: sku ?? prev?.sku ?? null,
      imageUrl: prev?.imageUrl ?? null,
      state: nextState,
      orderId: ev.orderId ?? prev?.orderId ?? null,
      sourceEventType: ev.eventType,
    })
  }

  return [...byKey.values()].sort((a, b) =>
    STATE_RANK[b.state] - STATE_RANK[a.state] || a.name.localeCompare(b.name, 'pt-BR'),
  )
}

/** Preview nunca escreve em G7 / events. */
export function previewIsReadOnly(): true {
  return true
}

async function attachImages(items: VisualPartPreview[]): Promise<VisualPartPreview[]> {
  const ids = [...new Set(items.map((i) => i.productId).filter((x): x is string => Boolean(x)))]
  if (!ids.length) return items

  const { data, error } = await getSupabase()
    .from('product_images')
    .select('product_id, storage_path, sort_order, is_primary')
    .in('product_id', ids)
  if (error) throw error

  const byProduct = new Map<string, Array<{
    product_id: string
    storage_path: string
    sort_order: number
    is_primary: boolean
  }>>()
  for (const row of (data ?? []) as Array<{
    product_id: string
    storage_path: string
    sort_order: number
    is_primary: boolean
  }>) {
    const list = byProduct.get(String(row.product_id)) ?? []
    list.push(row)
    byProduct.set(String(row.product_id), list)
  }

  const sb = getSupabase()
  return items.map((item) => {
    if (!item.productId) return item
    const path = pickPrimaryStoragePath(byProduct.get(item.productId) ?? [])
    if (!path) return item
    const { data: pub } = sb.storage.from('product-images').getPublicUrl(path)
    return { ...item, imageUrl: pub.publicUrl || null }
  })
}

export async function listVisualPartPreviews(
  membershipId: string,
): Promise<VisualPartPreview[]> {
  const events = await listVehiclePartEvents(membershipId)
  const grouped = groupPartEventsForPreview(events)
  return attachImages(grouped)
}

export const VISUAL_PART_STATE_LABEL: Record<VisualPartPreviewState, string> = {
  comprada: 'Comprada (FAL)',
  associada: 'Associada',
  aguardando: 'Aguardando instalação',
  instalada: 'Instalação declarada',
}
