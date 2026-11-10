/**
 * Espelho Edge de src/services/plates/splitApiModelo.ts
 */

export type SplitApiModeloResult = {
  model: string | null
  engine: string | null
  version: string | null
}

const ENGINE_TOKEN = /^\d+\.\d+[a-zA-Z]{0,4}$/i
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
  ZEN: 'Zen',
  LIFE: 'Life',
  ICONIC: 'Iconic',
}

function expandTrim(abbr: string): string {
  const key = abbr.toUpperCase()
  if (TRIM_ALIASES[key]) return TRIM_ALIASES[key]!
  if (key.length <= 4) return key
  return key.charAt(0) + abbr.slice(1).toLocaleLowerCase('pt-BR')
}

function normalizeEngineToken(raw: string): string {
  const m = raw.match(/^(\d+\.\d+)(.*)$/i)
  if (!m) return raw
  const base = m[1]!
  const suf = (m[2] ?? '').trim()
  if (!suf || /^[mMaA]$/.test(suf)) return base
  return `${base}${suf.toUpperCase()}`
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
  const engine = `${engDigits[0]}.${engDigits[1]}`
  const n = Number(engine)
  if (!Number.isFinite(n) || n < 0.8 || n > 7.0) return null
  return { version: expandTrim(abbr), engine }
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

  const engineIdx = tokens.findIndex((t) => ENGINE_TOKEN.test(t))
  if (engineIdx >= 1) {
    return {
      model: formatPlateModelName(tokens.slice(0, engineIdx).join(' ')),
      engine: normalizeEngineToken(tokens[engineIdx]!),
      version: titleVersion(tokens.slice(engineIdx + 1)),
    }
  }

  const last = tokens[tokens.length - 1]!
  const compact = parseDenatranCompactToken(last)
  if (compact) {
    return {
      model: formatPlateModelName(tokens.slice(0, -1).join(' ')),
      engine: compact.engine,
      version: compact.version,
    }
  }

  if (tokens.length === 2) {
    const maybeTrim = tokens[1]!.toUpperCase()
    if (TRIM_ALIASES[maybeTrim]) {
      return {
        model: formatPlateModelName(tokens[0]!),
        engine: null,
        version: TRIM_ALIASES[maybeTrim]!,
      }
    }
  }

  return { model: formatPlateModelName(s), engine: null, version: null }
}
