/**
 * Adapter CarImages — consulta catálogo/imagens/GLB sem acoplar UI ao fornecedor.
 * Secrets nunca ficam aqui; URLs autenticadas vêm da Netlify Function
 * `/api/carimages-signed-url` (preferencial) ou Edge `carimages-image` (fallback).
 */

import { FAL_CARIMAGES_SIGNED_URL_PATH } from '@/services/garage/adapters/carImagesSignedUrl'

export type CarImagesPaint =
  | 'silver'
  | 'black'
  | 'grey'
  | 'blue'
  | 'red'
  | 'white'

export type CarImagesView =
  | 'front34'
  | 'front34-r'
  | 'front'
  | 'side'
  | 'side-r'
  | 'rear34'
  | 'rear34-r'
  | 'rear'

export type CarImagesLookup = {
  make: string
  model?: string | null
  year?: number | null
  view?: CarImagesView
  color?: CarImagesPaint | null
  width?: number
  format?: 'webp' | 'png' | 'jpg'
}

export type CarImagesGlbMeta = {
  url: string | null
  watermarked: boolean
  fallback: boolean
  generationSlug: string | null
}

const BASE = 'https://carimagesapi.com'

/** Catálogo público (sem key) — PoC / ADM import. */
export function carImagesCatalogMakesUrl(): string {
  return `${BASE}/api/v1/makes`
}

export function carImagesCatalogModelsUrl(makeSlug: string): string {
  return `${BASE}/api/v1/makes/${encodeURIComponent(makeSlug)}/models`
}

export function carImagesCatalogModelUrl(makeSlug: string, modelSlug: string): string {
  return `${BASE}/api/v1/makes/${encodeURIComponent(makeSlug)}/models/${encodeURIComponent(modelSlug)}`
}

export function carImagesGlbMetaUrl(
  makeSlug: string,
  modelSlug: string,
  genSlug: string,
): string {
  return `${BASE}/api/v1/vehicles/${encodeURIComponent(makeSlug)}/${encodeURIComponent(modelSlug)}/${encodeURIComponent(genSlug)}/model`
}

/**
 * URL pública de imagem (requer key). Preferir Edge em produção.
 * Nunca versionar a key no repositório.
 */
export function buildCarImagesPublicImageUrl(
  lookup: CarImagesLookup,
  apiKey: string,
): string {
  const q = new URLSearchParams()
  q.set('make', lookup.make.trim())
  if (lookup.model?.trim()) q.set('model', lookup.model.trim())
  if (lookup.year != null) q.set('year', String(lookup.year))
  if (lookup.view) q.set('view', lookup.view)
  if (lookup.color) q.set('color', lookup.color)
  if (lookup.width) q.set('width', String(lookup.width))
  if (lookup.format) q.set('format', lookup.format)
  q.set('key', apiKey)
  return `${BASE}/image?${q.toString()}`
}

/** Mapeia hex FAL → paint CarImages mais próximo (6 cores). */
export function nearestCarImagesPaint(hex: string | null | undefined): CarImagesPaint | null {
  if (!hex || !/^#[0-9A-Fa-f]{6}$/.test(hex)) return null
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const samples: Array<{ name: CarImagesPaint; r: number; g: number; b: number }> = [
    { name: 'silver', r: 192, g: 192, b: 192 },
    { name: 'black', r: 20, g: 20, b: 20 },
    { name: 'grey', r: 80, g: 80, b: 80 },
    { name: 'blue', r: 30, g: 90, b: 180 },
    { name: 'red', r: 180, g: 30, b: 30 },
    { name: 'white', r: 245, g: 245, b: 245 },
  ]
  let best = samples[0]!
  let bestD = Infinity
  for (const s of samples) {
    const d = (s.r - r) ** 2 + (s.g - g) ** 2 + (s.b - b) ** 2
    if (d < bestD) {
      bestD = d
      best = s
    }
  }
  return best.name
}

export function isCarImagesClientEnabled(): boolean {
  try {
    return String(import.meta.env.VITE_FAL_CARIMAGES ?? '') === '1'
  } catch {
    return false
  }
}

function buildLookupQuery(lookup: CarImagesLookup): URLSearchParams {
  const q = new URLSearchParams()
  q.set('make', lookup.make.trim())
  if (lookup.model?.trim()) q.set('model', lookup.model.trim())
  if (lookup.year != null) q.set('year', String(lookup.year))
  if (lookup.view) q.set('view', lookup.view)
  if (lookup.color) q.set('color', lookup.color)
  q.set('width', String(lookup.width ?? 800))
  q.set('format', lookup.format ?? 'webp')
  return q
}

async function fetchCarImagesJson(
  url: string,
  headers?: Record<string, string>,
): Promise<{ url: string; level: 'family' } | null> {
  const res = await fetch(url, { headers: { Accept: 'application/json', ...headers } })
  if (!res.ok) return null
  const body = (await res.json()) as { url?: string; fallback?: boolean }
  if (!body.url || body.fallback) return null
  return { url: body.url, level: 'family' }
}

/**
 * Resolve imagem 2D via Netlify Function (preferencial) ou Edge Supabase (fallback).
 * Retorna null se flag off ou falha — caller cai no placeholder.
 * Nível sempre `family` (ilustrativa) — nunca promove fuzzy a exact.
 */
export async function resolveCarImagesStockViaEdge(
  lookup: CarImagesLookup,
  opts?: { accessToken?: string | null; supabaseUrl?: string | null },
): Promise<{ url: string; level: 'family' } | null> {
  if (!isCarImagesClientEnabled()) return null
  const q = buildLookupQuery(lookup)

  try {
    const viaNetlify = await fetchCarImagesJson(`${FAL_CARIMAGES_SIGNED_URL_PATH}?${q}`)
    if (viaNetlify) return viaNetlify
  } catch {
    /* vite-only / function down → Edge */
  }

  const base = opts?.supabaseUrl?.replace(/\/$/, '')
  if (!base) return null
  const headers: Record<string, string> = {}
  if (opts?.accessToken) headers.Authorization = `Bearer ${opts.accessToken}`
  try {
    return await fetchCarImagesJson(`${base}/functions/v1/carimages-image?${q}`, headers)
  } catch {
    return null
  }
}
