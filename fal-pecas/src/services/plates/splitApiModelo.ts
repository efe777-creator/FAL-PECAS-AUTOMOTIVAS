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

/** Motor DENATRAN sem ponto + câmbio: 10MT, 16AT, 20CVT */
const ENGINE_GEAR = /^(\d{2})(MT|AT|CVT|M|A)?$/i

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

function normalizeEngineToken(raw: string): string {
  const m = raw.match(/^(\d+\.\d+)(.*)$/i)
  if (!m) return raw
  const base = m[1]!
  const suf = (m[2] ?? '').trim()
  if (!suf || /^[mMaA]$/.test(suf)) return base
  return `${base}${suf.toUpperCase()}`
}

/** Motor automotivo plausível (L); rejeita lixo tipo 0.1 da API. */
export function sanitizeEngine(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const t = String(raw).trim()
  if (!t) return null
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
 * Se sobrou "Modelo Trim", separa trim conhecido.
 * Aceita trim + sufixo 1 letra (ex.: CROSSER S → Crosser S).
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

export function splitApiModelo(rawModelo: string | null | undefined): SplitApiModeloResult {
  if (rawModelo == null) return { model: null, engine: null, version: null }
  let s = String(rawModelo).trim()
  if (!s) return { model: null, engine: null, version: null }

  s = s.replace(/^[A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9\- ]{0,24}\//, '').trim()

  const tokens = s.split(/\s+/).filter(Boolean)
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

  // 1) Motor decimal explícito: "HB20 1.0M UNIQUE"
  const engineIdx = tokens.findIndex((t) => ENGINE_TOKEN.test(t))
  if (engineIdx >= 1) {
    const engine = sanitizeEngine(normalizeEngineToken(tokens[engineIdx]!))
    const peeled = peelTrailingTrim(tokens.slice(0, engineIdx))
    const after = titleVersion(tokens.slice(engineIdx + 1))
    return {
      model: peeled.model,
      engine,
      version: normalizeVersionLabel(after ?? peeled.version),
    }
  }

  // 2) Último token 10MT / 16AT: "KWID INTENS 10MT"
  const last = tokens[tokens.length - 1]!
  const gearEngine = parseEngineGearToken(last)
  if (gearEngine) {
    const peeled = peelTrailingTrim(tokens.slice(0, -1))
    return {
      model: peeled.model,
      engine: gearEngine,
      version: normalizeVersionLabel(peeled.version),
    }
  }

  // 3) Último token DENATRAN compacto: "CLIO EXP1016VH"
  const compact = parseDenatranCompactToken(last)
  if (compact) {
    const peeled = peelTrailingTrim(tokens.slice(0, -1))
    return {
      model: peeled.model,
      engine: compact.engine,
      version: normalizeVersionLabel(compact.version ?? peeled.version),
    }
  }

  // 4) Segundo token é só trim conhecido: "HB20 UNIQUE"
  if (tokens.length === 2) {
    const maybeTrim = tokens[1]!.toUpperCase()
    if (TRIM_ALIASES[maybeTrim]) {
      return {
        model: formatPlateModelName(tokens[0]!),
        engine: null,
        version: normalizeVersionLabel(TRIM_ALIASES[maybeTrim]!),
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
        version: normalizeVersionLabel(peeled.version),
      }
    }
  }

  return { model: formatPlateModelName(s), engine: null, version: null }
}
