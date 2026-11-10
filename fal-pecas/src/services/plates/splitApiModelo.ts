/**
 * A consulta `/basico` da API Placas costuma devolver `modelo` composto:
 * - Espaçado: "HB20 1.0M UNIQUE"
 * - DENATRAN compacto: "CLIO EXP1016VH" (= Clio Expression 1.0 16V Hi-Flex)
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

/**
 * Código DENATRAN colado: EXP1016VH, AUTH1216V, ELX1418V
 * letras(trim) + 2 dígitos(motor X.Y) + opcional NN V + sufixo (H, HF…)
 */
const DENATRAN_COMPACT = /^([A-Za-z]{2,8})(\d{2})(?:(\d{1,2})V)?([A-Za-z]{0,8})$/i

/** Abreviações de versão comuns em marca/modelo DENATRAN → label comercial. */
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

/**
 * Normaliza modelo de linha (HB20, T-Cross, Gol).
 * Códigos alfanuméricos com dígito permanecem UPPER.
 */
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

/** Parseia token DENATRAN compacto → versão + motor. */
export function parseDenatranCompactToken(
  token: string,
): { version: string; engine: string } | null {
  const m = token.match(DENATRAN_COMPACT)
  if (!m) return null
  const abbr = m[1]!
  const engDigits = m[2]!
  // Exige letras de trim (não só dígitos) e motor plausível 0.8–7.0
  if (!/[A-Za-z]/.test(abbr)) return null
  const engine = `${engDigits[0]}.${engDigits[1]}`
  const n = Number(engine)
  if (!Number.isFinite(n) || n < 0.8 || n > 7.0) return null
  // Evita falso positivo em códigos estranhos sem trim conhecido e muito longos
  const version = expandTrim(abbr)
  return { version, engine }
}

export function splitApiModelo(rawModelo: string | null | undefined): SplitApiModeloResult {
  if (rawModelo == null) return { model: null, engine: null, version: null }
  let s = String(rawModelo).trim()
  if (!s) return { model: null, engine: null, version: null }

  // Remove prefixo "HYUNDAI/" / "VW/" / "RENAULT/"
  s = s.replace(/^[A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9\- ]{0,24}\//, '').trim()

  const tokens = s.split(/\s+/).filter(Boolean)
  if (tokens.length === 1) {
    // Tenta "CLIOEXP1016VH" (raro) — senão modelo puro
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
    const modelPart = tokens.slice(0, engineIdx).join(' ')
    const engine = normalizeEngineToken(tokens[engineIdx]!)
    const version = titleVersion(tokens.slice(engineIdx + 1))
    return {
      model: formatPlateModelName(modelPart),
      engine,
      version,
    }
  }

  // 2) Último token DENATRAN compacto: "CLIO EXP1016VH", "PALIO WEEKEND ELX1418V"
  const last = tokens[tokens.length - 1]!
  const compact = parseDenatranCompactToken(last)
  if (compact) {
    const modelPart = tokens.slice(0, -1).join(' ')
    return {
      model: formatPlateModelName(modelPart),
      engine: compact.engine,
      version: compact.version,
    }
  }

  // 3) Segundo token é só trim conhecido: "HB20 UNIQUE"
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

  // Sem padrão — modelo inteiro (ex.: "Cross Fox")
  return { model: formatPlateModelName(s), engine: null, version: null }
}
