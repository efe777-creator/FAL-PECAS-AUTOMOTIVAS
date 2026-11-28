/**
 * A consulta `/basico` da API Placas costuma devolver `modelo` composto:
 * - Espaçado: "HB20 1.0M UNIQUE"
 * - DENATRAN compacto: "CLIO EXP1016VH"
 * - Linha + trim + motor colado: "KWID INTENS 10MT"
 *
 * Extrai evidência do texto — sem inventar quando não há padrão.
 */

export type SplitApiModeloResult = {
  model: string | null
  engine: string | null
  version: string | null
}

/** Token de motorização decimal: 1.0, 1.0m, 2.0T, 1.4TSI */
const ENGINE_TOKEN = /^\d+\.\d+[a-zA-Z]{0,4}$/i

/** Motor DENATRAN sem ponto + câmbio: 10MT, 16AT, 20CVT — NÃO casa 16V */
const ENGINE_GEAR = /^(\d{2})(MT|AT|CVT|M|A)?$/i

/** Válvulas / válvulas por escrito — vão para versão, nunca motor. */
const VALVE_TOKEN = /^(?:\d{1,2}\s*V|\d{1,2}\s*VALVULAS?)$/i

export function isValveToken(token: string): boolean {
  const t = token.trim()
  if (!t) return false
  if (VALVE_TOKEN.test(t)) return true
  const folded = t
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleUpperCase('pt-BR')
  return /^(?:\d{1,2}\s*V|\d{1,2}\s*VALVULAS?)$/.test(folded)
}

/**
 * Código DENATRAN colado: EXP1016VH, AUTH1216V, ELX1418V
 */
const DENATRAN_COMPACT = /^([A-Za-z]{2,8})(\d{2})(?:(\d{1,2})V)?([A-Za-z]{0,8})$/i

const TRIM_ALIASES: Record<string, string> = {
  EXP: 'Expression',
  EXPRESSION: 'Expression',
  AUTH: 'Authentique',
  AUTHENTIQUE: 'Authentique',
  DYN: 'Dynamique',
  DYNAMIQUE: 'Dynamique',
  PRIV: 'Privilege',
  PRIVILEGE: 'Privilege',
  ELX: 'ELX',
  HLX: 'HLX',
  EX: 'EX',
  LX: 'LX',
  GL: 'GL',
  GLS: 'GLS',
  XEI: 'XEI',
  XRS: 'XRS',
  XLS: 'XLS',
  LT: 'LT',
  LTZ: 'LTZ',
  PREMIER: 'Premier',
  UNIQUE: 'Unique',
  COMFORT: 'Comfort',
  COMFOR: 'Comfort',
  COMFORTLINE: 'Comfortline',
  HIGHLINE: 'Highline',
  TRENDLINE: 'Trendline',
  SENSE: 'Sense',
  STYLE: 'Style',
  SE: 'SE',
  SEL: 'SEL',
  SPORT: 'Sport',
  PLUS: 'Plus',
  EVOLUTION: 'Evolution',
  LIMITED: 'Limited',
  CONNECT: 'Connect',
  INTENSE: 'Intense',
  /** API/DENATRAN trunca Intense → INTENS */
  INTENS: 'Intense',
  OUTSIDER: 'Outsider',
  ZEN: 'Zen',
  LIFE: 'Life',
  ICONIC: 'Iconic',
  CROSSER: 'Crosser',
  TREKKING: 'Trekking',
  DRIVE: 'Drive',
  HGT: 'HGT',
  PRECISION: 'Precision',
  GSR: 'GSR',
  FIRE: 'Fire',
  ECONOMY: 'Economy',
  GLSB: 'GLSB',
  HL: 'HL',
  AB: 'AB',
  TS: 'TS',
  CC: 'CC',
  SPORTING: 'Sporting',
  EXL: 'EXL',
  PREMIUM: 'Premium',
  DIAMOND: 'Diamond',
  /** Chevrolet Prisma Joy — API às vezes truncada Joye */
  JOY: 'Joy',
  JOYE: 'Joy',
}

/** Combustível — remove do modelo; NÃO vira versão/filtro. */
const FUEL_WORDS = new Set(
  ['FLEX', 'FLEXIVEL', 'FLEXÍVEL', 'GASOLINA', 'ALCOOL', 'ÁLCOOL', 'ETANOL', 'DIESEL', 'GNV'].map((w) =>
    w
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLocaleUpperCase('pt-BR'),
  ),
)

function isFuelToken(token: string): boolean {
  const key = token
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleUpperCase('pt-BR')
  return FUEL_WORDS.has(key)
}

function expandTrim(abbr: string): string {
  const key = abbr.toUpperCase()
  if (TRIM_ALIASES[key]) return TRIM_ALIASES[key]!
  if (key.length <= 4) return key
  return key.charAt(0) + abbr.slice(1).toLocaleLowerCase('pt-BR')
}

/**
 * Canônica a versão (EXPRESSION→Expression, INTENS→Intense).
 * Não inventa: se não houver evidência/alias, devolve title-case do texto.
 */
export function normalizeVersionLabel(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const t = String(raw).trim()
  if (!t) return null
  const tokens = t.split(/\s+/).filter(Boolean)
  if (!tokens.length) return null
  if (tokens.length === 1) {
    const key = tokens[0]!.toLocaleUpperCase('pt-BR')
    if (TRIM_ALIASES[key]) return TRIM_ALIASES[key]!
    if (key.length <= 4 && /^[A-Z0-9\-]+$/.test(key)) return key
    return key.charAt(0) + tokens[0]!.slice(1).toLocaleLowerCase('pt-BR')
  }
  return tokens
    .map((tok) => {
      const key = tok.toLocaleUpperCase('pt-BR')
      if (TRIM_ALIASES[key]) return TRIM_ALIASES[key]!
      if (key.length <= 4 && /^[A-Z0-9\-]+$/.test(key)) return key
      return key.charAt(0) + tok.slice(1).toLocaleLowerCase('pt-BR')
    })
    .join(' ')
}

/** Códigos de câmbio DENATRAN/API — NÃO são versão comercial. */
const TRANSMISSION_NOISE = new Set(
  ['A', 'M', 'AT', 'MT', 'CVT', 'AUT', 'AUTO', 'MANUAL', 'AUTOMATICO', 'AUTOMÁTICO'].map((w) =>
    w
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLocaleUpperCase('pt-BR'),
  ),
)

function isTransmissionNoiseToken(token: string): boolean {
  const key = token
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleUpperCase('pt-BR')
  if (TRANSMISSION_NOISE.has(key)) return true
  // FIPE: Aut.4p / AUT4P / Mec.5p
  if (/^(AUT|MEC|MAN)\.?\d*P?$/.test(key)) return true
  return false
}

/** Tecnologia de motor colada após cilindrada (1.0 TSI) — fica no motor, não na versão. */
function isEngineTechToken(token: string): boolean {
  const key = token
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleUpperCase('pt-BR')
  return /^(TSI|TFSI|THP|MPI|TDI|CDI|GDI|DIG\-?T|ECOBOOST)$/.test(key)
}

/** Token é só motor (1.6 / 1.6A / 16AT) — lixo se usado como "versão". Válvulas ficam. */
function isEngineNoiseToken(token: string): boolean {
  const t = token.trim()
  if (!t) return false
  if (isValveToken(t)) return false
  if (parseEngineGearToken(t)) return true
  if (ENGINE_TOKEN.test(t) && sanitizeEngine(t)) return true
  return false
}

/**
 * Versão comercial limpa: remove motor/câmbio colados da API
 * ("1.6 A", "1.6A", "A", "AT"). Não inventa trim.
 */
export function sanitizeVersionLabel(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const t = String(raw).trim()
  if (!t) return null

  // Preserva alternativas "Comfortline / Highline" para o fan-out posterior.
  if (/\s*[|/]\s*/.test(t)) {
    const parts = t
      .split(/\s*[|/]\s*/)
      .map((p) => sanitizeVersionLabel(p.trim()))
      .filter((p): p is string => Boolean(p))
    if (!parts.length) return null
    return parts.length === 1 ? parts[0]! : parts.join(' / ')
  }

  // String inteira = motor (+ câmbio) sem trim real.
  const compact = t.replace(/\s+/g, '')
  if (
    sanitizeEngine(compact) &&
    /^[\d.]+(?:MT|AT|CVT|[AMamLlTt])?$/i.test(compact)
  ) {
    return null
  }

  const tokens = t.split(/\s+/).filter(Boolean)
  const kept = tokens.filter(
    (tok) =>
      !isEngineNoiseToken(tok) &&
      !isTransmissionNoiseToken(tok) &&
      !isFuelToken(tok),
  )
  if (!kept.length) return null
  return normalizeVersionLabel(kept.join(' '))
}

function normalizeEngineToken(raw: string): string {
  // Válvulas coladas (2.016V / 1.616V): 1 dígito pós-ponto + NxV — não engolir 16V no motor.
  const valveStuck = String(raw).trim().match(/^(\d+\.\d)(\d{1,2}V)$/i)
  if (valveStuck) return valveStuck[1]!

  const m = raw.match(/^(\d+\.\d+)(.*)$/i)
  if (!m) return raw
  const base = m[1]!
  const suf = (m[2] ?? '').trim()
  // Válvulas soltas após base (2.0 16V já vem tokenizado; 2.0V raro).
  if (/^\d{1,2}V$/i.test(suf)) return base
  // Descarta sufixo câmbio/unidade (AT/MT/L) — motor fica só a cilindrada.
  if (!suf || /^[mMaA]$/i.test(suf) || /^(MT|AT|CVT|L)$/i.test(suf)) return base
  // Mantém turbo/tsi etc. no token (2.0T).
  if (/^[tT]/.test(suf) || /tsi|tfsi|thp/i.test(suf)) return `${base}${suf.toUpperCase()}`
  return base
}

/** Extrai sufixo de válvulas colado ao motor (2.016V → 16V). */
export function peelValveSuffixFromEngineToken(raw: string): string | null {
  // 1 dígito decimal + válvulas (evita 2.01+6V por greediness de \d+).
  const m = String(raw).trim().match(/^\d+\.\d(\d{1,2}V)$/i)
  return m?.[1]?.toUpperCase() ?? null
}

/** Motor automotivo plausível (L); rejeita lixo tipo 0.1 da API e tokens só-válvula. */
export function sanitizeEngine(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const t = String(raw).trim()
  if (!t) return null
  if (isValveToken(t)) return null
  const gear = parseEngineGearToken(t)
  if (gear) return gear
  const m = t.match(/^(\d+\.\d+)/)
  if (!m) return null
  const n = Number(m[1])
  if (!Number.isFinite(n) || n < 0.8 || n > 7.0) return null
  return normalizeEngineToken(t)
}

function parseEngineGearToken(token: string): string | null {
  const m = token.match(ENGINE_GEAR)
  if (!m) return null
  const digits = m[1]!
  const engine = `${digits[0]}.${digits[1]}`
  const n = Number(engine)
  if (!Number.isFinite(n) || n < 0.8 || n > 7.0) return null
  return engine
}

function titleVersion(tokens: string[]): string | null {
  if (!tokens.length) return null
  return tokens
    .map((t) => {
      const upper = t.toLocaleUpperCase('pt-BR')
      if (TRIM_ALIASES[upper]) return TRIM_ALIASES[upper]!
      if (upper.length <= 4 && /^[A-Z0-9\-]+$/.test(upper)) return upper
      return upper.charAt(0) + t.slice(1).toLocaleLowerCase('pt-BR')
    })
    .join(' ')
}

export function formatPlateModelName(raw: string): string {
  const tokens = raw.trim().split(/\s+/).filter(Boolean)
  return tokens
    .map((t) => {
      const core = t.replace(/[^A-Za-zÀ-ÿ0-9]/g, '')
      if (/\d/.test(core) || (core.length <= 2 && core.toUpperCase() !== 'KA' && core.toUpperCase() !== 'UP')) {
        return t.toLocaleUpperCase('pt-BR')
      }
      if (t.includes('-')) {
        return t
          .split('-')
          .map((p) => formatPlateModelName(p))
          .join('-')
      }
      const lower = t.toLocaleLowerCase('pt-BR')
      return lower.charAt(0).toLocaleUpperCase('pt-BR') + lower.slice(1)
    })
    .join(' ')
}

export function parseDenatranCompactToken(
  token: string,
): { version: string; engine: string } | null {
  const m = token.match(DENATRAN_COMPACT)
  if (!m) return null
  const abbr = m[1]!
  const engDigits = m[2]!
  if (!/[A-Za-z]/.test(abbr)) return null
  const engine = sanitizeEngine(`${engDigits[0]}.${engDigits[1]}`)
  if (!engine) return null
  return { version: expandTrim(abbr), engine }
}

/**
 * Nome FIPE/API com trims separados por / ou |:
 * "Gol Comfortline / Highline 1.0" → model Gol, version "Comfortline / Highline", engine 1.0.
 */
function splitModeloWithVersionAlternatives(s: string): SplitApiModeloResult | null {
  const tokens = s.split(/\s+/).filter(Boolean)
  if (tokens.length < 3) return null

  let engine: string | null = null
  let headTokens = tokens
  const last = tokens[tokens.length - 1]!
  if (ENGINE_TOKEN.test(last) && !isValveToken(last)) {
    engine = sanitizeEngine(normalizeEngineToken(last))
    headTokens = tokens.slice(0, -1)
  } else {
    const engIdx = tokens.findIndex((t) => ENGINE_TOKEN.test(t) && !isValveToken(t))
    if (engIdx >= 1) {
      engine = sanitizeEngine(normalizeEngineToken(tokens[engIdx]!))
      headTokens = [...tokens.slice(0, engIdx), ...tokens.slice(engIdx + 1)]
    }
  }

  const head = headTokens.join(' ')
  if (!/\s*[|/]\s*/.test(head)) return null

  const parts = head
    .split(/\s*[|/]\s*/)
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length < 2) return null

  const firstTokens = parts[0]!.split(/\s+/).filter(Boolean)
  if (!firstTokens.length) return null

  const peeled = peelTrailingTrim(firstTokens)
  let model: string
  let versionParts: string[]
  if (peeled.version) {
    model = peeled.model
    versionParts = [peeled.version, ...parts.slice(1)]
  } else if (firstTokens.length === 1) {
    model = formatPlateModelName(firstTokens[0]!)
    versionParts = parts.slice(1)
  } else {
    model = formatPlateModelName(firstTokens[0]!)
    versionParts = [...firstTokens.slice(1), ...parts.slice(1)]
  }

  const version = sanitizeVersionLabel(versionParts.join(' / '))
  if (!version || versionParts.length < 2) return null
  return { model, engine, version }
}

/**
 * Se sobrou "Modelo Trim", separa trim conhecido.
 * Aceita trim + sufixo 1 letra (ex.: CROSSER S → Crosser S)
 * e dois trims (FIRE ECONOMY, HL AB).
 */
function peelTrailingTrim(modelTokens: string[]): {
  model: string
  version: string | null
} {
  if (modelTokens.length >= 3) {
    const last = modelTokens[modelTokens.length - 1]!.toUpperCase()
    const prev = modelTokens[modelTokens.length - 2]!.toUpperCase()
    if (TRIM_ALIASES[prev] && /^[A-Z0-9]$/.test(last)) {
      return {
        model: formatPlateModelName(modelTokens.slice(0, -2).join(' ')),
        version: normalizeVersionLabel(`${TRIM_ALIASES[prev]} ${last}`),
      }
    }
    if (TRIM_ALIASES[prev] && TRIM_ALIASES[last]) {
      return {
        model: formatPlateModelName(modelTokens.slice(0, -2).join(' ')),
        version: normalizeVersionLabel(`${TRIM_ALIASES[prev]} ${TRIM_ALIASES[last]}`),
      }
    }
  }
  if (modelTokens.length >= 2) {
    const last = modelTokens[modelTokens.length - 1]!.toUpperCase()
    if (TRIM_ALIASES[last]) {
      return {
        model: formatPlateModelName(modelTokens.slice(0, -1).join(' ')),
        version: TRIM_ALIASES[last]!,
      }
    }
  }
  return { model: formatPlateModelName(modelTokens.join(' ')), version: null }
}

/** True se o nome não carrega motor/versão/fuel reconhecíveis. */
export function isModelNameClean(raw: string | null | undefined): boolean {
  if (raw == null) return true
  const t = String(raw).trim()
  if (!t) return true
  const split = splitApiModelo(t)
  if (split.engine || split.version) return false
  const left = (split.model ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
  const right = t
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
  return Boolean(left) && left === right
}

/**
 * Garante modelo limpo (re-split). Usa no mapper/upsert antes de gravar ou filtrar.
 * Retorna model sem motor/versão; engine/version só quando o split extraiu.
 */
export function assertModelClean(
  rawModel: string | null | undefined,
  extras?: { engine?: string | null; version?: string | null },
): { model: string; engine: string | null; version: string | null } {
  const raw = String(rawModel ?? '').trim()
  const split = splitApiModelo(raw)
  const model = (split.model ?? raw).trim()
  let engine =
    sanitizeEngine(extras?.engine) ?? sanitizeEngine(split.engine) ?? null
  // Extras versão "1.6 A" → extrai motor se ainda faltou.
  if (!engine && extras?.version) {
    const fromVer = splitApiModelo(`X ${extras.version}`)
    engine = sanitizeEngine(fromVer.engine) ?? sanitizeEngine(extras.version)
  }
  const version =
    sanitizeVersionLabel(extras?.version) ??
    sanitizeVersionLabel(split.version) ??
    null
  return { model, engine, version }
}

export function splitApiModelo(rawModelo: string | null | undefined): SplitApiModeloResult {
  if (rawModelo == null) return { model: null, engine: null, version: null }
  let s = String(rawModelo).trim()
  if (!s) return { model: null, engine: null, version: null }

  // Prefixo compacto MARCA/ (VW/, GM/, I/) — sem espaço. NÃO engolir "Comfortline / Highline".
  s = s.replace(/^[A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9\-]{0,12}\//, '').trim()

  // Versões alternativas no nome: "Gol Comfortline / Highline 1.0" → versão com barra para fan-out.
  if (/\s[|/]\s/.test(s) || /\s[|/]$/.test(s) || /^[|/]\s/.test(s)) {
    const fromAlts = splitModeloWithVersionAlternatives(s)
    if (fromAlts) return fromAlts
  }

  let tokens = s.split(/\s+/).filter(Boolean)
  // Remove combustível do fim (Fiesta Flex) — nunca vira versão.
  while (tokens.length >= 2 && isFuelToken(tokens[tokens.length - 1]!)) {
    tokens = tokens.slice(0, -1)
  }
  s = tokens.join(' ')
  if (!tokens.length) return { model: null, engine: null, version: null }

  if (tokens.length === 1) {
    const only = tokens[0]!
    const compactAlone = only.match(/^([A-Za-zÀ-ÿ\-]+?)([A-Za-z]{2,8}\d{2}(?:\d{1,2}V)?[A-Za-z]*)$/i)
    if (compactAlone) {
      const parsed = parseDenatranCompactToken(compactAlone[2]!)
      if (parsed) {
        return {
          model: formatPlateModelName(compactAlone[1]!),
          engine: parsed.engine,
          version: parsed.version,
        }
      }
    }
    return { model: formatPlateModelName(only), engine: null, version: null }
  }

  // 1) Motor decimal explícito: "HB20 1.0M UNIQUE" / "HB20 1.6A 1.6 A" / "Gol 2.0 16V"
  const engineIdx = tokens.findIndex((t) => ENGINE_TOKEN.test(t) && !isValveToken(t))
  if (engineIdx >= 1) {
    const engTok = tokens[engineIdx]!
    const valveStuck = peelValveSuffixFromEngineToken(engTok)
    let engine = sanitizeEngine(normalizeEngineToken(engTok))
    const peeled = peelTrailingTrim(tokens.slice(0, engineIdx))
    let afterTokens = tokens.slice(engineIdx + 1)
    // 1.0 TSI → motor "1.0 TSI" (não vira versão)
    if (engine && afterTokens[0] && isEngineTechToken(afterTokens[0]!)) {
      engine = `${engine} ${afterTokens[0]!.toUpperCase()}`
      afterTokens = afterTokens.slice(1)
    }
    const valveLoose = afterTokens.filter(isValveToken)
    const restAfter = afterTokens.filter(
      (t) =>
        !isValveToken(t) &&
        !isFuelToken(t) &&
        !isTransmissionNoiseToken(t) &&
        !isEngineTechToken(t),
    )
    const after = titleVersion(restAfter)
    const valveBits = [...(valveStuck ? [valveStuck] : []), ...valveLoose.map((v) => v.toUpperCase())]
    const versionCore = sanitizeVersionLabel(after ?? peeled.version)
    const version =
      versionCore || valveBits.length
        ? sanitizeVersionLabel([versionCore, ...valveBits].filter(Boolean).join(' '))
        : null
    return {
      model: peeled.model,
      engine,
      version,
    }
  }

  // 2) Motor 10MT/16AT em qualquer posição: "Prisma 10MT Joye" ou "KWID INTENS 10MT"
  const gearIdx = tokens.findIndex((t) => parseEngineGearToken(t) != null)
  if (gearIdx >= 1) {
    const gearEngine = parseEngineGearToken(tokens[gearIdx]!)!
    const peeled = peelTrailingTrim(tokens.slice(0, gearIdx))
    const after = titleVersion(tokens.slice(gearIdx + 1))
    return {
      model: peeled.model,
      engine: gearEngine,
      version: sanitizeVersionLabel(after ?? peeled.version),
    }
  }

  // 3) Último token DENATRAN compacto: "CLIO EXP1016VH"
  const last = tokens[tokens.length - 1]!
  const compact = parseDenatranCompactToken(last)
  if (compact) {
    const peeled = peelTrailingTrim(tokens.slice(0, -1))
    return {
      model: peeled.model,
      engine: compact.engine,
      version: sanitizeVersionLabel(compact.version ?? peeled.version),
    }
  }

  // 4) Segundo token é só trim conhecido: "HB20 UNIQUE"
  if (tokens.length === 2) {
    const maybeTrim = tokens[1]!.toUpperCase()
    if (TRIM_ALIASES[maybeTrim]) {
      return {
        model: formatPlateModelName(tokens[0]!),
        engine: null,
        version: sanitizeVersionLabel(TRIM_ALIASES[maybeTrim]!),
      }
    }
  }

  // 5) Trim no fim sem motor: "XTZ150 CROSSER S" → modelo XTZ150, versão Crosser S
  if (tokens.length >= 2) {
    const peeled = peelTrailingTrim(tokens)
    if (peeled.version) {
      return {
        model: peeled.model,
        engine: null,
        version: sanitizeVersionLabel(peeled.version),
      }
    }
  }

  return { model: formatPlateModelName(s), engine: null, version: null }
}
