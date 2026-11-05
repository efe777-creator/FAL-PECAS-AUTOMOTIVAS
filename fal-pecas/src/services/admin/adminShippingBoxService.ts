import { getSupabase } from '@/lib/supabase'
import {
  pickSmallestFittingBox as pickBox,
  type PackingBox,
  type PackingItem,
} from '@/lib/shippingPacking'

export { pickSmallestFittingBox } from '@/lib/shippingPacking'

export type ShippingBoxTemplate = {
  id: string
  name: string
  lengthCm: number
  widthCm: number
  heightCm: number
  emptyWeightKg: number
  maxWeightKg: number | null
  active: boolean
  sortOrder: number
}

type Row = {
  id: string
  name: string
  length_cm: number
  width_cm: number
  height_cm: number
  empty_weight_kg: number
  max_weight_kg: number | null
  active: boolean
  sort_order: number
}

function map(row: Row): ShippingBoxTemplate {
  return {
    id: row.id,
    name: row.name,
    lengthCm: Number(row.length_cm),
    widthCm: Number(row.width_cm),
    heightCm: Number(row.height_cm),
    emptyWeightKg: Number(row.empty_weight_kg),
    maxWeightKg: row.max_weight_kg == null ? null : Number(row.max_weight_kg),
    active: row.active,
    sortOrder: row.sort_order,
  }
}

export async function adminListShippingBoxes(): Promise<ShippingBoxTemplate[]> {
  const { data, error } = await getSupabase()
    .from('shipping_box_templates')
    .select(
      'id, name, length_cm, width_cm, height_cm, empty_weight_kg, max_weight_kg, active, sort_order',
    )
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  if (error) throw error
  return ((data ?? []) as Row[]).map(map)
}

export async function adminUpsertShippingBox(
  input: Omit<ShippingBoxTemplate, 'id'> & { id?: string },
): Promise<ShippingBoxTemplate> {
  const payload = {
    name: input.name.trim(),
    length_cm: input.lengthCm,
    width_cm: input.widthCm,
    height_cm: input.heightCm,
    empty_weight_kg: input.emptyWeightKg,
    max_weight_kg: input.maxWeightKg,
    active: input.active,
    sort_order: input.sortOrder,
    updated_at: new Date().toISOString(),
  }
  const q = getSupabase().from('shipping_box_templates')
  const { data, error } = input.id
    ? await q.update(payload).eq('id', input.id).select().single()
    : await q.insert(payload).select().single()
  if (error) throw error
  return map(data as Row)
}

export async function adminDeleteShippingBox(id: string): Promise<void> {
  const { error } = await getSupabase().from('shipping_box_templates').delete().eq('id', id)
  if (error) throw error
}

/** Adapter tipado: ShippingBoxTemplate → PackingBox. */
export function pickSmallestFittingBoxFromTemplates(
  boxes: ShippingBoxTemplate[],
  items: PackingItem[],
): ShippingBoxTemplate | null {
  const packBoxes: PackingBox[] = boxes.map((b) => ({
    id: b.id,
    name: b.name,
    lengthCm: b.lengthCm,
    widthCm: b.widthCm,
    heightCm: b.heightCm,
    emptyWeightKg: b.emptyWeightKg,
    maxWeightKg: b.maxWeightKg,
    active: b.active,
  }))
  const picked = pickBox(packBoxes, items)
  if (!picked) return null
  return boxes.find((b) => b.id === picked.id) ?? null
}
