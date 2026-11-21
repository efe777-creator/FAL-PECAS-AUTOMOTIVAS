import { getSupabase } from '@/lib/supabase'
import {
  isCarImagesClientEnabled,
  nearestCarImagesPaint,
  resolveCarImagesStockViaEdge,
} from '@/services/garage/adapters/carImagesAdapter'
import type {
  CustomerSavedVehicle,
  CustomerVehicleAsset,
  ResolvedVehicleImage,
  VehicleImageMatchLevel,
} from '@/types'

export const STOCK_CONFIDENCE_THRESHOLD = 0.7

type StockRow = {
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
}

const LEVEL_RANK: Record<'exact' | 'family' | 'generic', number> = {
  exact: 3,
  family: 2,
  generic: 1,
}

const LEVEL_LABEL: Record<VehicleImageMatchLevel, string> = {
  exact: 'Imagem do modelo',
  family: 'Imagem ilustrativa da família',
  generic: 'Imagem genérica da marca',
  placeholder: 'Sem foto — placeholder FAL',
}

export function placeholderVehicleImage(): ResolvedVehicleImage {
  return {
    level: 'placeholder',
    url: null,
    label: LEVEL_LABEL.placeholder,
    source: 'placeholder',
  }
}

export function personalCoverImage(
  assets: CustomerVehicleAsset[],
  primaryAssetId?: string | null,
): ResolvedVehicleImage | null {
  if (!assets.length) return null
  const cover =
    (primaryAssetId ? assets.find((a) => a.id === primaryAssetId) : undefined) ??
    assets.find((a) => a.isPrimary) ??
    assets[0]
  if (!cover?.signedUrl) return null
  return {
    level: 'exact',
    url: cover.signedUrl,
    label: 'Foto pessoal',
    source: 'personal',
  }
}

/** Escolhe o melhor stock sem promover família/genérico como exact. */
export function pickBestStockImage(
  rows: StockRow[],
  vehicle: Pick<CustomerSavedVehicle, 'makerName' | 'modelName' | 'year'>,
): ResolvedVehicleImage {
  const maker = (vehicle.makerName ?? '').trim().toLowerCase()
  const model = (vehicle.modelName ?? '').trim().toLowerCase()
  const year = vehicle.year ?? null

  const candidates = rows.filter((r) => {
    if (r.confidence < STOCK_CONFIDENCE_THRESHOLD) return false
    if (r.maker.trim().toLowerCase() !== maker) return false
    if (r.match_level === 'generic') return true
    if (r.model.trim().toLowerCase() !== model) return false
    if (year != null) {
      if (r.year_from != null && year < r.year_from) return false
      if (r.year_to != null && year > r.year_to) return false
    }
    return true
  })

  if (!candidates.length) return placeholderVehicleImage()

  candidates.sort((a, b) => {
    const rank = LEVEL_RANK[b.match_level] - LEVEL_RANK[a.match_level]
    if (rank !== 0) return rank
    return Number(b.confidence) - Number(a.confidence)
  })

  const best = candidates[0]!
  const url = best.image_url?.trim() || null
  if (!url) return placeholderVehicleImage()

  const level: VehicleImageMatchLevel = best.match_level
  return {
    level,
    url,
    label: LEVEL_LABEL[level],
    source: 'stock',
  }
}

export async function resolveVehicleDisplayImage(input: {
  vehicle: CustomerSavedVehicle
  assets?: CustomerVehicleAsset[]
}): Promise<ResolvedVehicleImage> {
  const personal = personalCoverImage(input.assets ?? [], input.vehicle.primaryAssetId)
  if (personal) return personal

  const maker = input.vehicle.makerName?.trim()
  if (!maker) return placeholderVehicleImage()

  const { data, error } = await getSupabase()
    .from('vehicle_stock_images')
    .select(
      'id, maker, model, generation, body_style, year_from, year_to, match_level, image_url, storage_path, confidence',
    )
    .eq('active', true)
    .ilike('maker', maker)
  if (error) throw error

  const local = pickBestStockImage((data as StockRow[]) ?? [], input.vehicle)
  if (local.source === 'stock' && local.url) return local

  if (isCarImagesClientEnabled() && input.vehicle.modelName?.trim()) {
    try {
      const sb = getSupabase()
      const session = (await sb.auth.getSession()).data.session
      const paint = nearestCarImagesPaint(input.vehicle.colorHex)
      const remote = await resolveCarImagesStockViaEdge(
        {
          make: maker,
          model: input.vehicle.modelName,
          year: input.vehicle.year ?? null,
          view: 'front34',
          color: paint,
          width: 800,
          format: 'webp',
        },
        {
          accessToken: session?.access_token ?? null,
          supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string | undefined,
        },
      )
      if (remote?.url) {
        return {
          level: 'family',
          url: remote.url,
          label: 'Imagem ilustrativa da família/estúdio',
          source: 'carimages',
        }
      }
    } catch {
      /* fallback placeholder */
    }
  }

  return local
}
