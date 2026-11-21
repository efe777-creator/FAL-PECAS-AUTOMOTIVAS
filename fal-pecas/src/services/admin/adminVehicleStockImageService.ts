import { getSupabase } from '@/lib/supabase'

export type AdminStockImageRow = {
  id: string
  maker: string
  model: string
  generation: string | null
  bodyStyle: string | null
  yearFrom: number | null
  yearTo: number | null
  matchLevel: 'exact' | 'family' | 'generic'
  imageUrl: string | null
  storagePath: string | null
  confidence: number
  active: boolean
}

type Row = {
  id: string
  maker: string
  model: string
  generation: string | null
  body_style: string | null
  year_from: number | null
  year_to: number | null
  match_level: 'exact' | 'family' | 'generic'
  image_url: string | null
  storage_path: string | null
  confidence: number
  active: boolean
}

function mapRow(r: Row): AdminStockImageRow {
  return {
    id: String(r.id),
    maker: r.maker,
    model: r.model,
    generation: r.generation,
    bodyStyle: r.body_style,
    yearFrom: r.year_from,
    yearTo: r.year_to,
    matchLevel: r.match_level,
    imageUrl: r.image_url,
    storagePath: r.storage_path,
    confidence: Number(r.confidence),
    active: Boolean(r.active),
  }
}

export async function adminListStockImages(): Promise<AdminStockImageRow[]> {
  const { data, error } = await getSupabase()
    .from('vehicle_stock_images')
    .select(
      'id, maker, model, generation, body_style, year_from, year_to, match_level, image_url, storage_path, confidence, active',
    )
    .order('maker')
    .order('model')
    .limit(500)
  if (error) throw error
  return ((data ?? []) as Row[]).map(mapRow)
}

export async function adminUpsertStockImage(input: {
  id?: string
  maker: string
  model: string
  generation?: string | null
  bodyStyle?: string | null
  yearFrom?: number | null
  yearTo?: number | null
  matchLevel: 'exact' | 'family' | 'generic'
  imageUrl: string
  confidence?: number
  active?: boolean
}): Promise<AdminStockImageRow> {
  const payload = {
    maker: input.maker.trim(),
    model: input.model.trim(),
    generation: input.generation?.trim() || null,
    body_style: input.bodyStyle?.trim() || null,
    year_from: input.yearFrom ?? null,
    year_to: input.yearTo ?? null,
    match_level: input.matchLevel,
    image_url: input.imageUrl.trim(),
    confidence: input.confidence ?? 0.85,
    active: input.active ?? true,
  }
  if (input.id) {
    const { data, error } = await getSupabase()
      .from('vehicle_stock_images')
      .update(payload)
      .eq('id', input.id)
      .select(
        'id, maker, model, generation, body_style, year_from, year_to, match_level, image_url, storage_path, confidence, active',
      )
      .single()
    if (error) throw error
    return mapRow(data as Row)
  }
  const { data, error } = await getSupabase()
    .from('vehicle_stock_images')
    .insert(payload)
    .select(
      'id, maker, model, generation, body_style, year_from, year_to, match_level, image_url, storage_path, confidence, active',
    )
    .single()
  if (error) throw error
  return mapRow(data as Row)
}

export async function adminSetStockImageActive(id: string, active: boolean): Promise<void> {
  const { error } = await getSupabase()
    .from('vehicle_stock_images')
    .update({ active })
    .eq('id', id)
  if (error) throw error
}
