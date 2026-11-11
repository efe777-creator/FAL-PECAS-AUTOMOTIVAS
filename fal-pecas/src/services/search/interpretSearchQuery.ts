import { normalizeEntityMatchKey } from '@/lib/entityNormalize'

export type SearchIntentVehicle = {
  maker?: string
  model?: string
  year?: string
  engine?: string
  version?: string
}

export type SearchIntent = {
  raw: string
  productQuery: string | null
  vehicle: SearchIntentVehicle
  codeHint?: string
  needsClarification: boolean
  clarification?: 'engine' | 'version' | 'year' | 'model'
  confidence: 'high' | 'medium' | 'low'
}

export type VehicleCatalogEntry = { maker: string; model: string }

const YEAR_RE = /^(19|20)\d{2}$/
const ENGINE_RE = /^\d\.\d$/
/** Refs/SKU com ≥3 dígitos (TDI2116); evita HB20 / Onix etc. */
const CODE_RE = /^[A-Za-z]{2,}\d{3,}[A-Za-z0-9\-]*$/

const PRODUCT_WORDS = new Set(
  [
    'terminal',
    'ponteira',
    'pivo',
    'pivô',
    'axial',
    'barra',
    'amortecedor',
    'shock',
    'bandeja',
    'filtro',
    'oleo',
    'óleo',
    'pastilha',
    'disco',
    'embreagem',
    'kit',
    'direcao',
    'direção',
    'suspensao',
    'suspensão',
    'coxim',
    'bucha',
  ].map((w) => normalizeEntityMatchKey(w)),
)

/** Versões de acabamento conhecidas — NÃO confundir com nome de peça (ex.: ponteira). */
const VERSION_WORDS = new Set(
  [
    'one',
    'unique',
    'comfort',
    'premium',
    'sense',
    'vision',
    'style',
    'sport',
    'plus',
    'max',
    'diamond',
    'evolution',
    'high',
    'se',
    'lt',
    'ltz',
    'joy',
  ].map((w) => normalizeEntityMatchKey(w)),
)

function tokenize(raw: string): string[] {
  return raw
    .trim()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
}

function isLikelyProductWord(token: string): boolean {
  return PRODUCT_WORDS.has(normalizeEntityMatchKey(token))
}

type Hit = { maker: string; model: string; start: number; len: number }

function findModelHit(
  tokens: string[],
  catalog: VehicleCatalogEntry[],
  skip: Set<number>,
): Hit | null {
  const catalogNorm = catalog.map((c) => ({
    maker: c.maker,
    model: c.model,
    modelKey: normalizeEntityMatchKey(c.model),
    makerKey: normalizeEntityMatchKey(c.maker),
  }))

  for (let len = Math.min(3, tokens.length); len >= 1; len -= 1) {
    for (let start = 0; start <= tokens.length - len; start += 1) {
      let blocked = false
      for (let k = 0; k < len; k += 1) {
        if (skip.has(start + k)) blocked = true
      }
      if (blocked) continue

      const slice = tokens.slice(start, start + len)
      if (slice.some((t) => YEAR_RE.test(t) || ENGINE_RE.test(t) || CODE_RE.test(t))) continue

      if (len >= 2) {
        const makerTok = normalizeEntityMatchKey(slice[0]!)
        const modelTok = normalizeEntityMatchKey(slice.slice(1).join(' '))
        const makerHit = catalogNorm.find(
          (c) => c.makerKey === makerTok && c.modelKey === modelTok,
        )
        if (makerHit) {
          return { maker: makerHit.maker, model: makerHit.model, start, len }
        }
      }

      const key = normalizeEntityMatchKey(slice.join(' '))
      const modelHits = catalogNorm.filter((c) => c.modelKey === key)
      if (modelHits.length >= 1) {
        return {
          maker: modelHits[0]!.maker,
          model: modelHits[0]!.model,
          start,
          len,
        }
      }
    }
  }
  return null
}

/**
 * Interpreta texto livre em intenção estruturada (sem IA).
 * Ano só é aceito se um modelo do catálogo já casou.
 */
export function interpretSearchQuery(
  raw: string,
  catalog: VehicleCatalogEntry[] = [],
): SearchIntent {
  const trimmed = raw.trim()
  if (!trimmed) {
    return {
      raw,
      productQuery: null,
      vehicle: {},
      needsClarification: false,
      confidence: 'low',
    }
  }

  const tokens = tokenize(trimmed)
  const used = new Set<number>()
  const vehicle: SearchIntentVehicle = {}

  let codeHint: string | undefined
  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i]!
    if (CODE_RE.test(t) && !YEAR_RE.test(t)) {
      codeHint = t.toUpperCase()
      used.add(i)
      if (tokens.length === 1) {
        return {
          raw,
          productQuery: codeHint,
          vehicle: {},
          codeHint,
          needsClarification: false,
          confidence: 'high',
        }
      }
      break
    }
  }

  const hit = findModelHit(tokens, catalog, used)
  if (hit) {
    vehicle.maker = hit.maker
    vehicle.model = hit.model
    for (let k = 0; k < hit.len; k += 1) used.add(hit.start + k)
  }

  if (vehicle.model) {
    for (let i = 0; i < tokens.length; i += 1) {
      if (used.has(i)) continue
      if (YEAR_RE.test(tokens[i]!)) {
        vehicle.year = tokens[i]!
        used.add(i)
        break
      }
    }
  }

  for (let i = 0; i < tokens.length; i += 1) {
    if (used.has(i)) continue
    if (ENGINE_RE.test(tokens[i]!)) {
      vehicle.engine = tokens[i]!
      used.add(i)
      break
    }
  }

  if (vehicle.model) {
    for (let i = 0; i < tokens.length; i += 1) {
      if (used.has(i)) continue
      const t = tokens[i]!
      if (YEAR_RE.test(t) || ENGINE_RE.test(t) || CODE_RE.test(t)) continue
      if (isLikelyProductWord(t)) continue
      if (!VERSION_WORDS.has(normalizeEntityMatchKey(t))) continue
      vehicle.version = t
      used.add(i)
      break
    }
  }

  const leftover = tokens.filter((_, i) => !used.has(i))
  /** Marcas de peça: com SKU no query, não poluem p_q (AND zerava ex. Nakata+PVI sem brand_id). */
  const BRAND_WORDS = new Set(
    ['nakata', 'cofap', 'monroe', 'trw', 'skf', 'ina', 'luk', 'bosch', 'ngk', 'mahle'].map((w) =>
      normalizeEntityMatchKey(w),
    ),
  )
  let productQuery: string | null
  if (codeHint) {
    const extra = leftover.filter(
      (t) => isLikelyProductWord(t) && !BRAND_WORDS.has(normalizeEntityMatchKey(t)),
    )
    productQuery = extra.length ? `${codeHint} ${extra.join(' ')}` : codeHint
  } else if (leftover.length) {
    productQuery = leftover.join(' ')
  } else {
    productQuery = null
  }

  let confidence: SearchIntent['confidence'] = 'low'
  if (vehicle.model && vehicle.year) confidence = 'high'
  else if (vehicle.model || codeHint) confidence = 'medium'

  let needsClarification = false
  let clarification: SearchIntent['clarification']
  if (vehicle.model && !vehicle.year && !vehicle.engine && !productQuery) {
    needsClarification = true
    clarification = 'year'
  }

  return {
    raw,
    productQuery,
    vehicle,
    codeHint,
    needsClarification,
    clarification,
    confidence,
  }
}
