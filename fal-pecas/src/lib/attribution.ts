/**
 * Captura de atribuição Ads (UTM / gclid / fbclid) — prep estrutural.
 * Persistido em sessionStorage e gravado em orders.attribution no place_order.
 */

export const ATTRIBUTION_STORAGE_KEY = 'fal_attribution_v1'

export type OrderAttribution = {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
  gclid?: string
  fbclid?: string
  landing_path?: string
  captured_at?: string
}

const ATTR_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'fbclid',
] as const

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

function defaultSessionStorage(): StorageLike | null {
  try {
    if (typeof sessionStorage === 'undefined') return null
    return sessionStorage
  } catch {
    return null
  }
}

function trimStr(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const t = v.trim()
  return t ? t.slice(0, 256) : undefined
}

/** Extrai campos conhecidos de URLSearchParams / Record. */
export function parseAttributionFromSearch(
  search: string | URLSearchParams,
  landingPath?: string,
): OrderAttribution | null {
  const params =
    typeof search === 'string' ? new URLSearchParams(search.startsWith('?') ? search : `?${search}`) : search
  const out: OrderAttribution = {}
  for (const key of ATTR_KEYS) {
    const v = trimStr(params.get(key))
    if (v) out[key] = v
  }
  const path = trimStr(landingPath)
  if (path) out.landing_path = path.slice(0, 512)
  if (Object.keys(out).length === 0) return null
  out.captured_at = new Date().toISOString()
  return out
}

export function mergeAttribution(
  existing: OrderAttribution | null,
  incoming: OrderAttribution | null,
): OrderAttribution | null {
  if (!incoming) return existing
  if (!existing) return incoming
  const merged: OrderAttribution = { ...existing }
  for (const key of ATTR_KEYS) {
    if (incoming[key] && !merged[key]) merged[key] = incoming[key]
  }
  if (incoming.landing_path && !merged.landing_path) {
    merged.landing_path = incoming.landing_path
  }
  if (!merged.captured_at) merged.captured_at = incoming.captured_at
  return merged
}

export function readStoredAttribution(
  storage: StorageLike | null = defaultSessionStorage(),
): OrderAttribution | null {
  if (!storage) return null
  try {
    const raw = storage.getItem(ATTRIBUTION_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as OrderAttribution
    return sanitizeAttribution(parsed)
  } catch {
    return null
  }
}

export function writeStoredAttribution(
  value: OrderAttribution,
  storage: StorageLike | null = defaultSessionStorage(),
): void {
  if (!storage) return
  try {
    storage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

/** Captura da URL atual e faz merge com o que já estava salvo (primeiro clique ganha). */
export function captureAttributionFromLocation(
  loc: { search: string; pathname: string },
  storage: StorageLike | null = defaultSessionStorage(),
): OrderAttribution | null {
  const incoming = parseAttributionFromSearch(loc.search, loc.pathname)
  const existing = readStoredAttribution(storage)
  const merged = mergeAttribution(existing, incoming)
  if (merged) writeStoredAttribution(merged, storage)
  return merged
}

/** Payload seguro para RPC / JSONB (só chaves conhecidas). */
export function sanitizeAttribution(raw: unknown): OrderAttribution | null {
  if (!raw || typeof raw !== 'object') return null
  const src = raw as Record<string, unknown>
  const out: OrderAttribution = {}
  for (const key of ATTR_KEYS) {
    const v = trimStr(src[key])
    if (v) out[key] = v
  }
  const path = trimStr(src.landing_path)
  if (path) out.landing_path = path.slice(0, 512)
  const at = trimStr(src.captured_at)
  if (at) out.captured_at = at.slice(0, 40)
  return Object.keys(out).length > 0 ? out : null
}

export function attributionToPayload(
  value: OrderAttribution | null,
): Record<string, string> | undefined {
  const clean = sanitizeAttribution(value)
  if (!clean) return undefined
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(clean)) {
    if (typeof v === 'string' && v) out[k] = v
  }
  return Object.keys(out).length ? out : undefined
}
