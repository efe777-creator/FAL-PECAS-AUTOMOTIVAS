/**
 * Normalizador único do mestre de veículos (todos os writers).
 *
 * INVARIANTE CRÍTICO: Corolla e Corolla Cross são linhas DISTINTAS.
 * Nunca colapsar filho → pai por prefixo/startsWith. Tokens de família
 * protegidos (Cross, New, Plus, Sport, Space, T-*) jamais são removidos como trim.
 *
 * Mirror Edge: supabase/functions/_shared/normalizeVehicleMasterInput.ts (manter paridade).
 */
import {
  formatManufacturerDisplayName,
  formatModelDisplayName,
  normalizeEntityMatchKey,
} from '@/lib/entityNormalize'
import {
  assertModelClean,
  isModelNameClean,
  isValveToken,
  normalizeVersionLabel,
  peelValveSuffixFromEngineToken,
  sanitizeEngine,
} from '@/services/plates/splitApiModelo'

export type NormalizeVehicleMasterOutcome = 'clean' | 'review' | 'reject'

export type NormalizeVehicleMasterResult = {
  outcome: NormalizeVehicleMasterOutcome
  maker: string
  model: string
  version: string | null
  engine: string | null
  transmission: string | null
  drivetrain: string | null
  body: string | null
  reasons: string[]
  displayKey: string
  matchKey: string
}

/** Correções ortográficas conhecidas (token a token, sem acento, case-insensitive). */
const TYPO_MAP: Record<string, string> = {
  SAVEIRA: 'Saveiro',
}

/** Famílias/linhas: NUNCA removidos como trim. */
const PROTECTED_FAMILY_TOKENS = new Set(['CROSS', 'NEW', 'PLUS', 'SPORT', 'SPACE'])

function foldUpper(token: string): string {
  return token
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleUpperCase('pt-BR')
}

function isProtectedFamilyToken(token: string): boolean {
  const up = foldUpper(token)
  if (PROTECTED_FAMILY_TOKENS.has(up)) return true
  // T-Cross, T-Roc … (prefixo T- é parte do nome da linha)
  if (/^T-[A-Z0-9]/.test(up)) return true
  return false
}

const FUEL_TOKENS = new Set([
  'FLEX',
  'FLEXIVEL',
  'GASOLINA',
  'ALCOOL',
  'ETANOL',
  'DIESEL',
  'GNV',
])

/** Trims/configs classificados (únicos removíveis do nome da linha). */
const KNOWN_TRIM_TOKENS = new Set([
  'SPORTING',
  'VOLCANO',
  'BLACKHAWK',
  'ALTIS',
  'PREMIUM',
  'XEI',
  'XR',
  'XRE',
  'XRX',
  'SR',
  'SRV',
  'SRX',
  'EX',
  'EXL',
  'SV',
  'LS',
  'CL',
])

const TRANSMISSION_TOKENS: Record<string, string> = {
  AT: 'AT',
  MT: 'MT',
  CVT: 'CVT',
  AUT: 'AT',
  AUTO: 'AT',
  MANUAL: 'MT',
}

type TailParse = {
  engine: string | null
  transmission: string | null
  drivetrain: string | null
  body: string | null
  versionTokens: string[]
  residual: string[]
  invalidEngine: boolean
}

type TokenClass =
  | { kind: 'fuel' }
  | {
      kind: 'known'
      engine?: string | null
      invalidEngine?: boolean
      transmission?: string
      drivetrain?: string
      body?: string
      version?: string[]
    }
  | { kind: 'unknown' }

const ENGINE_DECIMAL = /^\d+\.\d+[A-Za-z]{0,4}$/
const ENGINE_DIGITS_SUFFIX = /^(\d{2})([A-Za-z]{2,3})$/
const BODY_DRIVE = /^(CD|CS)?(4X2|4X4)$/

function classifyToken(token: string): TokenClass {
  const up = foldUpper(token)
  if (isProtectedFamilyToken(token)) return { kind: 'unknown' }
  if (FUEL_TOKENS.has(up)) return { kind: 'fuel' }

  if (isValveToken(token)) {
    return { kind: 'known', version: [token.toUpperCase()] }
  }

  if (ENGINE_DECIMAL.test(token)) {
    const valveStuck = peelValveSuffixFromEngineToken(token)
    const eng = sanitizeEngine(token)
    return {
      kind: 'known',
      engine: eng,
      invalidEngine: !eng,
      version: valveStuck ? [valveStuck] : undefined,
    }
  }

  const digitsSuffix = up.match(ENGINE_DIGITS_SUFFIX)
  if (digitsSuffix) {
    const suffix = digitsSuffix[2]!
    const eng = sanitizeEngine(digitsSuffix[1]!)
    if (eng && TRANSMISSION_TOKENS[suffix]) {
      return { kind: 'known', engine: eng, transmission: TRANSMISSION_TOKENS[suffix] }
    }
    if (eng && KNOWN_TRIM_TOKENS.has(suffix)) {
      return { kind: 'known', engine: eng, version: [suffix] }
    }
  }

  const bodyDrive = up.match(BODY_DRIVE)
  if (bodyDrive) {
    return {
      kind: 'known',
      body: bodyDrive[1] ?? undefined,
      drivetrain: bodyDrive[2]!.toLowerCase(),
    }
  }
  if (up === 'CD' || up === 'CS') return { kind: 'known', body: up }

  if (TRANSMISSION_TOKENS[up]) return { kind: 'known', transmission: TRANSMISSION_TOKENS[up] }

  if (up === 'APREMIUMH') return { kind: 'known', version: ['Altis', 'Premium', 'Hybrid'] }
  if (KNOWN_TRIM_TOKENS.has(up)) return { kind: 'known', version: [token] }

  return { kind: 'unknown' }
}

function parseTail(tokens: string[]): TailParse {
  const out: TailParse = {
    engine: null,
    transmission: null,
    drivetrain: null,
    body: null,
    versionTokens: [],
    residual: [],
    invalidEngine: false,
  }
  for (const tok of tokens) {
    const c = classifyToken(tok)
    if (c.kind === 'fuel') continue
    if (c.kind === 'known') {
      if (c.invalidEngine) out.invalidEngine = true
      if (c.engine && !out.engine) out.engine = c.engine
      if (c.transmission && !out.transmission) out.transmission = c.transmission
      if (c.drivetrain && !out.drivetrain) out.drivetrain = c.drivetrain
      if (c.body && !out.body) out.body = c.body
      if (c.version) out.versionTokens.push(...c.version)
      continue
    }
    // Não classificado após o início do sufixo: guarda como versão, mas sinaliza revisão.
    out.versionTokens.push(tok)
    out.residual.push(tok)
  }
  return out
}

function applyTypoMap(tokens: string[], reasons: string[]): string[] {
  return tokens.map((t) => {
    const fixed = TYPO_MAP[foldUpper(t)]
    if (fixed) {
      reasons.push(`typo_corrected:${t}->${fixed}`)
      return fixed
    }
    return t
  })
}

function dedupeTokens(tokens: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of tokens) {
    const k = foldUpper(t)
    if (!k || seen.has(k)) continue
    seen.add(k)
    out.push(t)
  }
  return out
}

function collapse(s: string): string {
  return s.replace(/\uFFFD/g, '').replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim()
}

export function normalizeVehicleMasterInput(input: {
  maker: string
  model: string
  engine?: string | null
  version?: string | null
}): NormalizeVehicleMasterResult {
  const reasons: string[] = []
  const maker = formatManufacturerDisplayName(String(input.maker ?? ''))
  let rawModel = collapse(String(input.model ?? ''))
  // Prefixo compacto "VW/" / "I/" (igual ao splitApiModelo — sem espaço).
  rawModel = rawModel.replace(/^[A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9\-]{0,12}\//, '').trim()

  const extras = assertModelClean('X', { engine: input.engine, version: input.version })

  if (!maker || !rawModel) {
    if (!maker) reasons.push('maker_empty')
    if (!rawModel) reasons.push('model_empty')
    return {
      outcome: 'reject',
      maker,
      model: '',
      version: extras.version,
      engine: extras.engine,
      transmission: null,
      drivetrain: null,
      body: null,
      reasons,
      displayKey: '',
      matchKey: '',
    }
  }

  const tokens = applyTypoMap(rawModel.split(' ').filter(Boolean), reasons)

  // Primeiro token fora da linha: trim/config/motor/combustível classificado (nunca idx 0,
  // nunca token protegido).
  let tailStart = -1
  for (let i = 1; i < tokens.length; i += 1) {
    if (classifyToken(tokens[i]!).kind !== 'unknown') {
      tailStart = i
      break
    }
  }
  const headTokens = tailStart === -1 ? tokens : tokens.slice(0, tailStart)
  const tail =
    tailStart === -1
      ? parseTail([])
      : parseTail(tokens.slice(tailStart))

  const protectedPresent = headTokens.some(isProtectedFamilyToken)
  for (const t of headTokens) {
    if (isProtectedFamilyToken(t)) reasons.push(`protected_family_kept:${t.toLowerCase()}`)
  }

  let model = headTokens.join(' ')
  let splitEngine: string | null = null
  let splitVersion: string | null = null
  if (!protectedPresent) {
    // Código DENATRAN colado / trims TRIM_ALIASES do fim do nome.
    const cleaned = assertModelClean(model)
    model = cleaned.model
    splitEngine = cleaned.engine
    splitVersion = cleaned.version
    if (splitEngine || splitVersion) reasons.push('split_api_modelo_applied')
  }
  model = formatModelDisplayName(model)

  if (tail.invalidEngine) reasons.push('invalid_engine_dropped')
  if (tail.residual.length) {
    reasons.push(`residual_tail_token:${tail.residual.join(' ').toLowerCase()}`)
  }
  if (tailStart !== -1) {
    reasons.push(`suffix_stripped:${tokens.slice(tailStart).join(' ')}`)
  }

  const versionTokens = dedupeTokens([
    ...tail.versionTokens,
    ...(splitVersion ? splitVersion.split(' ') : []),
    ...(extras.version ? extras.version.split(' ') : []),
  ])
  const version = versionTokens.length
    ? normalizeVersionLabel(versionTokens.join(' '))
    : null
  const engine = extras.engine ?? tail.engine ?? splitEngine ?? null

  if (!model) {
    reasons.push('model_empty_after_normalize')
    return {
      outcome: 'reject',
      maker,
      model: '',
      version,
      engine,
      transmission: tail.transmission,
      drivetrain: tail.drivetrain,
      body: tail.body,
      reasons,
      displayKey: '',
      matchKey: '',
    }
  }

  // Resíduo de poluição / incerteza → review (linha continua sendo a normalizada).
  const modelTokens = model.split(' ')
  let outcome: NormalizeVehicleMasterOutcome = 'clean'
  if (tail.residual.length || tail.invalidEngine) outcome = 'review'
  if (!protectedPresent && !isModelNameClean(model)) {
    reasons.push('model_residual_pollution')
    outcome = 'review'
  }
  if (modelTokens.length > 4) {
    reasons.push('model_too_long_for_line_name')
    outcome = 'review'
  }
  if (modelTokens.some((t) => /^\d+\.\d+/.test(t) || FUEL_TOKENS.has(foldUpper(t)))) {
    reasons.push('model_contains_engine_or_fuel')
    outcome = 'review'
  }

  return {
    outcome,
    maker,
    model,
    version,
    engine,
    transmission: tail.transmission,
    drivetrain: tail.drivetrain,
    body: tail.body,
    reasons,
    displayKey: `${maker} ${model}`,
    // Igualdade exata — NUNCA prefixo (Corolla ≠ Corolla Cross).
    matchKey: `${normalizeEntityMatchKey(maker)}|${normalizeEntityMatchKey(model)}`,
  }
}
