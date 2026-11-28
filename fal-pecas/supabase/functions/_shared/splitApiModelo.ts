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
  /** 4x2 | 4x4 | awd quando o nome traz evidência. */
  traction?: string | null
}

/** Token de motorização decimal: 1.0, 1.0m, 2.0T, 1.4TSI */
const ENGINE_TOKEN = /^\d+\.\d+[a-zA-Z]{0,4}$/i

/** Motor DENATRAN sem ponto + câmbio: 10MT, 16AT, 20CVT — NÃO casa 16V */
const ENGINE_GEAR = /^(\d{2})(MT|AT|CVT|M|A)?$/i

/** Válvulas / válvulas por escrito — ficam no motor (com a cilindrada), nunca no modelo. */
const VALVE_TOKEN = /^(?:\d{1,2}\s*V|\d{1,2}\s*VALVULAS?)$/i

/** Segundo token de linha comercial (Onix Plus) — fica no modelo, não vira versão. */
const COMPOUND_MODEL_SECONDS = new Set(['PLUS', 'MAX', 'CROSS'])

/** Linhagem tipo 5X / 7X / 8X — parte do modelo (Tiggo 5X). */
function isLineageModelToken(token: string): boolean {
  return /^\d+[A-Za-z]$/i.test(token.trim())
}

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

/** Normaliza 16V / 16VALVULAS / "16" (quando o próximo é válvulas) → 16V. */
export function normalizeValveLabel(token: string): string {
  const folded = token
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleUpperCase('pt-BR')
    .replace(/\s+/g, '')
  const m = folded.match(/^(\d{1,2})(?:V|VALVULAS?)?$/)
  if (m) return `${m[1]}V`
  return folded
}

export function isTurboWord(token: string): boolean {
  const key = token
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleUpperCase('pt-BR')
  return key === 'TURBO' || key === 'ASPIRADO'
}

/** Selo Hyundai/FIPE “TB” / “TGDI” — turbo no motor, nunca sigla na versão. */
export function isTurboBadge(token: string): boolean {
  const key = token
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\./g, '')
    .toLocaleUpperCase('pt-BR')
  return key === 'TB' || key === 'TGDI' || key === 'T-GDI'
}

/** Linha de um token: o resto do nome é versão (HB20 5 Anos, HB20 Comfort Plus). */
function isStickyModelLine(token: string): boolean {
  const key = token.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  return key === 'HB20' || key === 'HB20S' || key === 'HB20X'
}

function expandNameToken(token: string): string[] {
  const glued = /^[A-Za-zÀ-ÿ]+\.[A-Za-zÀ-ÿ]/.test(token)
    ? token.split('.').map((p) => p.trim()).filter(Boolean)
    : [token.replace(/\.+$/g, '')]
  return glued.flatMap((part) => {
    const key = part
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/\./g, '')
      .toLocaleUpperCase('pt-BR')
    if (TRIM_ALIASES[key]) return TRIM_ALIASES[key]!.split(/\s+/)
    return [part]
  })
}

/** Portas FIPE (5p / 4P) — ruído, não versão. */
function isBodyDoorsToken(token: string): boolean {
  return /^\d{1,2}P$/i.test(token.trim())
}

/** Tração explícita no nome. */
export function parseTractionToken(token: string): '4x2' | '4x4' | 'awd' | null {
  const key = token
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleUpperCase('pt-BR')
    .replace(/\s+/g, '')
  if (key === 'AWD' || key === '4MATIC' || key.includes('ALLWHEEL')) return 'awd'
  if (key === '4X4' || key === '4WD') return '4x4'
  if (key === '4X2' || key === '2WD') return '4x2'
  return null
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
  COMF: 'Comfort',
  /** FIPE HB20S: "Com." = Comfort */
  COM: 'Comfort',
  /** FIPE: "Plat." = Platinum */
  PLAT: 'Platinum',
  PLATINUM: 'Platinum',
  SPEC: 'Spec',
  COPA: 'Copa',
  TECH: 'Tech',
  ANOS: 'Anos',
  COMFORTLINE: 'Comfortline',
  HIGHLINE: 'Highline',
  /**
   * FIPE escreve "High" no Tera = Highline.
   * "High Country" (S10) não usa este alias — tratado à parte.
   */
  ATTRACTIVE: 'Attractive',
  ESSENCE: 'Essence',
  /** FIPE: "ESSEN." */
  ESSEN: 'Essence',
  WORKING: 'Working',
  /** FIPE: "Work." */
  WORK: 'Working',
  ENDURANCE: 'Endurance',
  EXTREME: 'Extreme',
  ADVENTURE: 'Adventure',
  /** FIPE: "Adv." */
  ADV: 'Adventure',
  CELEBRATION: 'Celebration',
  /** FIPE: "Celeb." */
  CELEB: 'Celebration',
  RANCH: 'Ranch',
  /** Picapes FIPE: CS / CE / CD são a cabine, não acabamento. */
  CS: 'Cabine Simples',
  CE: 'Cabine Estendida',
  CD: 'Cabine Dupla',
  SR: 'SR',
  XLT: 'XLT',
  ALTIS: 'Altis',
  LARIAT: 'Lariat',
  TITANIUM: 'Titanium',
  TOURING: 'Touring',
  ULTIMATE: 'Ultimate',
  WILDTRAK: 'Wildtrak',
  GRIFFE: 'Griffe',
  TRENDLINE: 'Trendline',
  SENSE: 'Sense',
  STYLE: 'Style',
  SE: 'SE',
  LE: 'LE',
  XE: 'XE',
  SEL: 'SEL',
  SPORT: 'Sport',
  PLUS: 'Plus',
  PRO: 'Pro',
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
  ECON: 'Economy',
  DAKAR: 'Dakar',
  GOPRO: 'GoPro',
  GLSB: 'GLSB',
  HL: 'HL',
  AB: 'AB',
  TS: 'TS',
  CC: 'CC',
  SPORTING: 'Sporting',
  EXL: 'EXL',
  PREMIUM: 'Premium',
  PREM: 'Premium',
  SEDAN: 'Sedan',
  SED: 'Sedan',
  FURGAO: 'Furgão',
  FURG: 'Furgão',
  EXT: 'Extreme',
  ED: 'Edition',
  DUALOGIC: 'Dualogic',
  DUAL: 'Dualogic',
  ATTRACTI: 'Attractive',
  ATTRACT: 'Attractive',
  LIMIT: 'Limited',
  EXPRES: 'Expression',
  SPORTLINE: 'Sportline',
  SPORTS: 'Sports',
  GSI: 'GSi',
  ABARTH: 'Abarth',
  'R-LINE': 'R-Line',
  DIAMOND: 'Diamond',
  /** Chevrolet Prisma Joy — API às vezes truncada Joye */
  JOY: 'Joy',
  JOYE: 'Joy',
  /** Chery / FIPE */
  TXS: 'TXS',
  TGS: 'TGS',
  FREESTYLE: 'Freestyle',
  GTI: 'GTI',
  GTS: 'GTS',
  GT: 'GT',
  GLI: 'GLI',
  /** Polo Track, Saveiro Robust, up! Pepper, Gol Last Edition — acabamento, não modelo. */
  TRACK: 'Track',
  ROBUST: 'Robust',
  PEPPER: 'Pepper',
  LAST: 'Last',
  EDITION: 'Edition',
  RS: 'RS',
  SI: 'Si',
  MAX: 'Max',
  LOOK: 'Look',
  LONGITUDE: 'Longitude',
  ACTION: 'Action',
  EXCLUSIVE: 'Exclusive',
  TRAILHAWK: 'Trailhawk',
  VOLCANO: 'Volcano',
  FREEDOM: 'Freedom',
  AUDACE: 'Audace',
  IMPETUS: 'Impetus',
  FEEL: 'Feel',
  LIVE: 'Live',
  ALLURE: 'Allure',
  PRESTIGE: 'Prestige',
  LIKE: 'Like',
  XRE: 'XRE',
  SRV: 'SRV',
  SRX: 'SRX',
  MOMENTUM: 'Momentum',
}

/** Combustível — remove do modelo; NÃO vira versão/filtro. */
const FUEL_WORDS = new Set(
  ['FLEX', 'FLEXIVEL', 'FLEXÍVEL', 'GASOLINA', 'ALCOOL', 'ÁLCOOL', 'ETANOL', 'DIESEL', 'GNV', 'HIBRIDO', 'ELETRICO', 'TETRAFUEL'].map((w) =>
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
    .replace(/[().\-]/g, '')
    .toLocaleUpperCase('pt-BR')
  if (FUEL_WORDS.has(key)) return true
  return (
    key === 'FLEXPOWER' ||
    key === 'FLEXP' ||
    key === 'TOTFLEX' ||
    key === 'MULTIPOWER' ||
    key === 'EFLEX' ||
    key === 'HIFLEX'
  )
}

/** Ano solto no nome ("Onix LT 1.0 2012"). Não é versão. 2008 do Peugeot fica no modelo. */
function isCatalogYearToken(token: string): boolean {
  if (!/^(19|20)\d{2}$/.test(token.trim())) return false
  const year = Number(token)
  return year >= 1950 && year <= 2100
}

/** Potência de catálogo (211cv) — não é versão nem motor. */
function isPowerToken(token: string): boolean {
  return /^\d+\s*cv$/i.test(token.replace(/\./g, '').trim())
}

function trimAliasKey(token: string): string {
  return token
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\./g, '')
    .toLocaleUpperCase('pt-BR')
}

/** Token de versão por extenso. C. da FIPE (HB20 C./C.Plus) é Comfort; não vira modelo. */
function canonicalVersionToken(tok: string): string {
  const key = tok
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\./g, '')
    .toLocaleUpperCase('pt-BR')
  if (key === 'C') return 'Comfort'
  if (key === 'HIGH') return 'Highline'
  if (key === 'DO' || key === 'DE' || key === 'DA') return key.toLocaleLowerCase('pt-BR')
  if (TRIM_ALIASES[key]) return TRIM_ALIASES[key]!
  if (key.length <= 4 && /^[A-Z0-9\-]+$/.test(key)) return key
  const raw = tok.replace(/\.+$/g, '')
  return key.charAt(0) + raw.slice(1).toLocaleLowerCase('pt-BR')
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
  return tokens
    .map((tok, index) => {
      const key = tok
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .replace(/\./g, '')
        .toLocaleUpperCase('pt-BR')
      const next = tokens[index + 1]
        ?.normalize('NFD')
        .replace(/\p{M}/gu, '')
        .replace(/\./g, '')
        .toLocaleUpperCase('pt-BR')
      if (key === 'HIGH' && next === 'COUNTRY') return 'High'
      return canonicalVersionToken(tok)
    })
    .join(' ')
}

/** Códigos de câmbio DENATRAN/API — NÃO são versão comercial. */
const TRANSMISSION_NOISE = new Set(
  [
    'A',
    'M',
    'AT',
    'MT',
    'CVT',
    'AUT',
    'AUTO',
    'MANUAL',
    'AUTOMATICO',
    'AUTOMÁTICO',
    'DUALOGIC',
    'TIPTRONIC',
    'TIPTRON',
    'EASYTRONIC',
    'EASYTR',
    'IMOTION',
    'POWERSHIFT',
  ].map((w) =>
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

/** Configuração de cilindros (V6 / V8 / V12) — motor, nunca versão. */
export function isCylinderBankToken(token: string): boolean {
  const key = token
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\./g, '')
    .toLocaleUpperCase('pt-BR')
  return /^(V[468]|V10|V12|VR6|W12)$/.test(key)
}

function normalizeCylinderBankLabel(token: string): string {
  return token
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\./g, '')
    .toLocaleUpperCase('pt-BR')
}

/** Tecnologia de motor colada após cilindrada (1.0 TSI) — fica no motor, não na versão. */
function isEngineTechToken(token: string): boolean {
  const key = token
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleUpperCase('pt-BR')
  if (isCylinderBankToken(token)) return true
  return /^(TSI|TFSI|FSI|THP|MPI|MPFI|MI|MSI|TDI|CDI|GDI|DIG\-?T|ECOBOOST)$/.test(key)
}

/** Número de torque VW/Audi (170 TSI, 200 TSI, 250 TSI, 350 TSI). Não é cilindrada. */
function torqueBadgeNumber(token: string): string | null {
  const t = token.trim()
  if (!/^\d{3}$/.test(t)) return null
  const n = Number(t)
  if (n < 100 || n > 450) return null
  return t
}

const TORQUE_FAMILY = /^(TSI|TFSI|THP|MPI|MSI|TDI|CDI|GDI)$/i

/**
 * Tira do nome o selo de motor: "170 TSI", "250TSI", "T200".
 * "C 180" e "2008" não entram — não há família de motor colada.
 */
function pullTorqueBadges(tokens: string[]): { tokens: string[]; label: string | null } {
  const kept: string[] = []
  const badges: string[] = []
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]!
    const glued = tok.match(/^(\d{3})(TSI|TFSI|THP|MPI|MSI|TDI|CDI|GDI)$/i)
    if (glued && torqueBadgeNumber(glued[1]!)) {
      badges.push(`${glued[1]} ${glued[2]!.toUpperCase()}`)
      continue
    }
    const stellantis = tok.match(/^T(\d{3})$/i)
    if (stellantis && torqueBadgeNumber(stellantis[1]!)) {
      badges.push(`T${stellantis[1]}`)
      continue
    }
    const next = tokens[i + 1]
    if (torqueBadgeNumber(tok) && next && TORQUE_FAMILY.test(next)) {
      badges.push(`${tok} ${next.toUpperCase()}`)
      i += 1
      continue
    }
    if (isEngineTechToken(tok)) {
      const u = tok.toUpperCase().replace(/DIG-?T/i, 'DIG-T')
      badges.push(u === 'MI' || u === 'MPFI' ? 'MPI' : u)
      continue
    }
    kept.push(tok)
  }
  const uniqueBadges = [...new Set(badges)]
  return { tokens: kept, label: uniqueBadges.length ? uniqueBadges.join(' ') : null }
}

function appendTorqueBadge(engine: string | null, label: string | null): string | null {
  if (!label) return engine
  if (!engine) return label
  if (engine.toUpperCase().includes(label.toUpperCase())) return engine
  return `${engine} ${label}`
}

/** Token é só motor/tech — lixo se usado como "versão". Válvulas e Turbo também saem da versão. */
function isEngineNoiseToken(token: string): boolean {
  const t = token.trim()
  if (!t) return false
  if (isValveToken(t) || isCylinderBankToken(t) || isTurboWord(t) || isEngineTechToken(t)) return true
  if (isTurboBadge(t) && trimAliasKey(t) !== 'TB') return true
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
      !isFuelToken(tok) &&
      !isBodyDoorsToken(tok) &&
      !isPowerToken(tok) &&
      !isCatalogYearToken(tok) &&
      !/^(e|ou)$/i.test(tok) &&
      !parseTractionToken(tok),
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
  // V6/V8 colado (3.0V6) — a bancada sai no peel, a base fica limpa.
  if (isCylinderBankToken(suf)) return base
  // Mantém turbo/tsi etc. no token (2.0T).
  if (/^[tT]/.test(suf) || /tsi|tfsi|thp/i.test(suf)) return `${base}${suf.toUpperCase()}`
  return base
}

/** Extrai sufixo de válvulas ou bancada colado ao motor (2.016V → 16V, 3.0V6 → V6). */
export function peelValveSuffixFromEngineToken(raw: string): string | null {
  const t = String(raw).trim()
  // 1 dígito decimal + válvulas (evita 2.01+6V por greediness de \d+).
  const valve = t.match(/^\d+\.\d(\d{1,2}V)$/i)
  if (valve?.[1]) return valve[1].toUpperCase()
  const bank = t.match(/^\d+\.\d+(V[468]|V10|V12|VR6|W12)$/i)
  return bank?.[1]?.toUpperCase() ?? null
}

/**
 * Motor automotivo plausível (L).
 * Aceita composto FAL: "1.0 16V", "1.0 8V Turbo", "1.0 TSI".
 * Rejeita lixo tipo 0.1 e tokens só-válvula.
 */
export function sanitizeEngine(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const t = String(raw).trim()
  if (!t) return null
  if (isTurboWord(t) || isTurboBadge(t)) return 'Turbo'
  if (isValveToken(t)) return null

  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length > 1) {
    const base = sanitizeEngine(parts[0]!)
    const extras: string[] = []
    for (const p of parts.slice(base ? 1 : 0)) {
      if (isCylinderBankToken(p)) extras.push(normalizeCylinderBankLabel(p))
      else if (isValveToken(p)) extras.push(normalizeValveLabel(p))
      else if (isTurboWord(p) || isTurboBadge(p)) {
        if (!extras.includes('Turbo') && !/turbo/i.test(base ?? '')) extras.push('Turbo')
      } else if (isEngineTechToken(p)) extras.push(p.toUpperCase().replace(/DIG-?T/i, 'DIG-T'))
      else if (torqueBadgeNumber(p) || /^T\d{3}$/i.test(p)) extras.push(p.toUpperCase())
    }
    if (!base) return extras.length ? extras.join(' ') : null
    return [base, ...extras].join(' ')
  }
  const gluedTorque = t.match(/^(\d{3})(TSI|TFSI|THP|MPI|MSI|TDI|CDI|GDI)$/i)
  if (gluedTorque && torqueBadgeNumber(gluedTorque[1]!)) {
    return `${gluedTorque[1]} ${gluedTorque[2]!.toUpperCase()}`
  }
  const stellantisTorque = t.match(/^T(\d{3})$/i)
  if (stellantisTorque && torqueBadgeNumber(stellantisTorque[1]!)) {
    return `T${stellantisTorque[1]}`
  }

  const gear = parseEngineGearToken(t)
  if (gear) return gear
  const m = t.match(/^(\d+\.\d+)/)
  if (!m) return null
  const n = Number(m[1])
  if (!Number.isFinite(n) || n < 0.8 || n > 7.0) return null
  return normalizeEngineToken(t)
}

/** Junta cilindrada + V6/V8 + válvulas + Turbo + família na ordem do contrato. */
export function composeEngineLabel(
  base: string | null,
  bits: { valves?: string[]; turbo?: boolean; tech?: string[] },
): string | null {
  const parts: string[] = []
  if (base) parts.push(base)
  if (!base && !bits.valves?.length && !bits.turbo && !bits.tech?.length) return null
  const tech = bits.tech ?? []
  for (const bank of tech.filter((t) => isCylinderBankToken(t))) {
    const n = normalizeCylinderBankLabel(bank)
    if (n && !parts.includes(n)) parts.push(n)
  }
  for (const v of bits.valves ?? []) {
    const n = normalizeValveLabel(v)
    if (n && !parts.includes(n)) parts.push(n)
  }
  if (bits.turbo && !parts.some((p) => /turbo/i.test(p))) parts.push('Turbo')
  for (const item of tech) {
    if (isCylinderBankToken(item)) continue
    const u = item.toUpperCase()
    if (u && !parts.includes(u)) parts.push(u)
  }
  return parts.join(' ')
}

/**
 * Consome tokens pós-motor: válvulas (16V ou 16 + válvulas), Turbo, TSI…
 * Devolve o que sobrou para a versão.
 */
export function absorbEngineExtras(tokens: string[]): {
  valves: string[]
  turbo: boolean
  tech: string[]
  rest: string[]
  traction: '4x2' | '4x4' | 'awd' | null
} {
  const valves: string[] = []
  const tech: string[] = []
  let turbo = false
  let traction: '4x2' | '4x4' | 'awd' | null = null
  const rest: string[] = []
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]!
    const next = tokens[i + 1]
    const tract = parseTractionToken(tok)
    if (tract) {
      traction = tract
      continue
    }
    if (
      isFuelToken(tok) ||
      isTransmissionNoiseToken(tok) ||
      isBodyDoorsToken(tok) ||
      isPowerToken(tok) ||
      isCatalogYearToken(tok)
    ) {
      continue
    }
    if (ENGINE_TOKEN.test(tok) && !isValveToken(tok)) continue
    if (/^(e|ou)$/i.test(tok)) continue
    if (isValveToken(tok)) {
      valves.push(normalizeValveLabel(tok))
      continue
    }
    // "16 válvulas" / "8 valvulas"
    const fold = tok
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLocaleUpperCase('pt-BR')
    if (/^\d{1,2}$/.test(fold) && next) {
      const nf = next
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .toLocaleUpperCase('pt-BR')
      if (/^VALVULAS?$/.test(nf)) {
        valves.push(`${fold}V`)
        i += 1
        continue
      }
    }
    const turboKey = tok
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/[.\-]/g, '')
      .toLocaleUpperCase('pt-BR')
    if (turboKey === 'BITURBO' || turboKey === 'BITB') {
      turbo = true
      if (!tech.includes('Bi-Turbo')) tech.push('Bi-Turbo')
      continue
    }
    if (isTurboWord(tok) || isTurboBadge(tok) || /^T\.?$/i.test(tok)) {
      turbo = true
      continue
    }
    if (isCylinderBankToken(tok)) {
      const bank = normalizeCylinderBankLabel(tok)
      if (!tech.includes(bank)) tech.push(bank)
      continue
    }
    if (isEngineTechToken(tok)) {
      const u = tok.toUpperCase()
      tech.push(u === 'MI' || u === 'MPFI' ? 'MPI' : u)
      continue
    }
    rest.push(tok)
  }
  return { valves, turbo, tech, rest, traction }
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
  return tokens.map(canonicalVersionToken).join(' ')
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
  const valveDigits = m[3]
  if (!/[A-Za-z]/.test(abbr)) return null
  const base = sanitizeEngine(`${engDigits[0]}.${engDigits[1]}`)
  if (!base) return null
  const engine = composeEngineLabel(base, {
    valves: valveDigits ? [`${valveDigits}V`] : [],
  })
  if (!engine) return null
  return { version: expandTrim(abbr), engine }
}

/**
 * Nome FIPE/API com trims separados por / ou |:
 * "Gol Comfortline / Highline 1.0" → model Gol, version "Comfortline / Highline", engine 1.0.
 */
function splitModeloWithVersionAlternatives(s: string): SplitApiModeloResult | null {
  let tokens = s
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((tok) => (tok === '/' || tok === '|' ? [tok] : expandNameToken(tok)))
  if (tokens.length < 3) return null
  const torque = pullTorqueBadges(tokens)
  tokens = torque.tokens

  let traction: '4x2' | '4x4' | 'awd' | null = null
  tokens = tokens.filter((tok) => {
    const t = parseTractionToken(tok)
    if (t) {
      traction = t
      return false
    }
    return true
  })

  let engine: string | null = null
  let headTokens = tokens
  const last = tokens[tokens.length - 1]!
  if (ENGINE_TOKEN.test(last) && !isValveToken(last)) {
    const stuck = peelValveSuffixFromEngineToken(last)
    const bank = stuck && isCylinderBankToken(stuck) ? [stuck] : []
    const valves = stuck && !isCylinderBankToken(stuck) ? [stuck] : []
    engine = composeEngineLabel(sanitizeEngine(normalizeEngineToken(last)), {
      valves,
      tech: bank,
    })
    headTokens = tokens.slice(0, -1)
  } else {
    const engIdx = tokens.findIndex((t) => ENGINE_TOKEN.test(t) && !isValveToken(t))
    if (engIdx >= 1) {
      const engTok = tokens[engIdx]!
      const stuck = peelValveSuffixFromEngineToken(engTok)
      const after = absorbEngineExtras(tokens.slice(engIdx + 1))
      if (after.traction) traction = after.traction
      const bank = stuck && isCylinderBankToken(stuck) ? [stuck] : []
      const valves = stuck && !isCylinderBankToken(stuck) ? [stuck] : []
      engine = composeEngineLabel(sanitizeEngine(normalizeEngineToken(engTok)), {
        valves: [...valves, ...after.valves],
        turbo: after.turbo,
        tech: [...bank, ...after.tech],
      })
      headTokens = [...tokens.slice(0, engIdx), ...after.rest]
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
  return { model, engine: appendTorqueBadge(engine, torque.label), version, traction }
}

/**
 * Se sobrou "Modelo Trim", separa trim conhecido.
 * Aceita trim + sufixo 1 letra (ex.: CROSSER S → Crosser S)
 * e dois trims (FIRE ECONOMY, HL AB).
 * Plus/Pro/Max depois de linhagem (Tiggo 3X / 5X) = versão.
 * Plus colado em linha sem código (Onix Plus) permanece no modelo.
 */
function peelTrailingTrim(modelTokens: string[]): {
  model: string
  version: string | null
} {
  modelTokens = modelTokens.filter(
    (t) =>
      !isFuelToken(t) &&
      !isPowerToken(t) &&
      !isTransmissionNoiseToken(t) &&
      !isBodyDoorsToken(t),
  )
  if (!modelTokens.length) return { model: '', version: null }
  // HB20 / HB20S / HB20X: o token da linha é o modelo; o resto é versão por extenso.
  if (modelTokens.length >= 2 && isStickyModelLine(modelTokens[0]!)) {
    return {
      model: formatPlateModelName(modelTokens[0]!),
      version: normalizeVersionLabel(modelTokens.slice(1).join(' ')),
    }
  }
  // Bronco Sport é a linha; Wildtrak e os demais acabamentos ficam na versão.
  if (
    modelTokens.length >= 2 &&
    /^bronco$/i.test(modelTokens[0]!) &&
    /^sport$/i.test(modelTokens[1]!)
  ) {
    const rest = modelTokens.slice(2)
    return {
      model: 'Bronco Sport',
      version: rest.length ? normalizeVersionLabel(rest.join(' ')) : null,
    }
  }
  // Tiggo 2 / 3X / 7 / 8: número da linha fica no modelo; Pro, Plus, Max, Look ficam na versão.
  if (modelTokens.length >= 3 && /^tiggo$/i.test(modelTokens[0]!) && /^\d+[Xx]?$/.test(modelTokens[1]!)) {
    const series = modelTokens[1]!.replace(/x$/i, 'X')
    return {
      model: formatPlateModelName(`Tiggo ${series}`),
      version: normalizeVersionLabel(modelTokens.slice(2).join(' ')),
    }
  }
  if (modelTokens.length >= 2) {
    const tail = `${trimAliasKey(modelTokens[modelTokens.length - 2]!)} ${trimAliasKey(modelTokens[modelTokens.length - 1]!)}`
    const cabin =
      tail === 'CABINE DUPLA'
        ? 'Cabine Dupla'
        : tail === 'CABINE ESTENDIDA'
          ? 'Cabine Estendida'
          : tail === 'CABINE SIMPLES'
            ? 'Cabine Simples'
            : null
    if (cabin) {
      const head = peelTrailingTrim(modelTokens.slice(0, -2))
      return {
        model: head.model,
        version: [head.version, cabin].filter(Boolean).join(' '),
      }
    }
  }
  if (modelTokens.length >= 3) {
    const lastTok = modelTokens[modelTokens.length - 1]!
    const prevTok = modelTokens[modelTokens.length - 2]!
    const last = trimAliasKey(lastTok)
    const prev = trimAliasKey(prevTok)
    if (last === 'COUNTRY' && prev === 'HIGH') {
      return {
        model: formatPlateModelName(modelTokens.slice(0, -2).join(' ')),
        version: 'High Country',
      }
    }
    if (isLineageModelToken(lastTok)) {
      return { model: formatPlateModelName(modelTokens.join(' ')), version: null }
    }
    // Tiggo 3X Plus / Tiggo 5X Pro → versão. Onix Plus (sem 3X) não entra aqui.
    if (
      (COMPOUND_MODEL_SECONDS.has(last) || last === 'PRO') &&
      isLineageModelToken(prevTok)
    ) {
      return {
        model: formatPlateModelName(modelTokens.slice(0, -1).join(' ')),
        version: TRIM_ALIASES[last] ?? last,
      }
    }
    if (COMPOUND_MODEL_SECONDS.has(last)) {
      return { model: formatPlateModelName(modelTokens.join(' ')), version: null }
    }
    if (TRIM_ALIASES[prev] && /^[A-Z0-9]$/.test(last) && !COMPOUND_MODEL_SECONDS.has(prev)) {
      return {
        model: formatPlateModelName(modelTokens.slice(0, -2).join(' ')),
        version: normalizeVersionLabel(`${TRIM_ALIASES[prev]} ${last}`),
      }
    }
    if (TRIM_ALIASES[prev] && TRIM_ALIASES[last] && !COMPOUND_MODEL_SECONDS.has(prev)) {
      return {
        model: formatPlateModelName(modelTokens.slice(0, -2).join(' ')),
        version: normalizeVersionLabel(`${TRIM_ALIASES[prev]} ${TRIM_ALIASES[last]}`),
      }
    }
  }
  if (modelTokens.length >= 2) {
    const lastTok = modelTokens[modelTokens.length - 1]!
    const last = trimAliasKey(lastTok)
    if (last === 'HIGH') {
      return {
        model: formatPlateModelName(modelTokens.slice(0, -1).join(' ')),
        version: 'Highline',
      }
    }
    if (isLineageModelToken(lastTok) || COMPOUND_MODEL_SECONDS.has(last)) {
      return { model: formatPlateModelName(modelTokens.join(' ')), version: null }
    }
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
): { model: string; engine: string | null; version: string | null; traction: string | null } {
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
  return { model, engine, version, traction: split.traction ?? null }
}

/**
 * Junta código partido (HB 20, Tiggo 3 X, HR V, XC 60) e expande sigla de versão
 * (Comf., C.Plus, C.Style) antes do split.
 */
function normalizeSpacedModelCodes(raw: string): string {
  let s = raw
  s = s.replace(/\bHB\s+20(?:\s*([SX]))?(?=\s|$)/gi, (_, suf: string | undefined) =>
    `HB20${(suf ?? '').toUpperCase()}`,
  )
  s = s.replace(/(?<![\d.])(\d)\s+X\b/gi, '$1X')
  s = s.replace(/\b(HR|WR|CR|ZR)\s+V\b/gi, (_, letters: string) => `${letters.toUpperCase()}-V`)
  s = s.replace(/\bT\s+CROSS\b/gi, 'T-CROSS')
  s = s.replace(/\bXC\s+(40|60|90)\b/gi, 'XC$1')
  s = s.replace(/(?<=[A-Za-z])(?=\d+\.\d)/g, ' ')
  s = s.replace(/(\d+\.\d+)(V(?:[468]|10|12|R6)|W12)\b/gi, '$1 $2')
  s = s.replace(/\bComf\.?(?!\w)/gi, 'Comfort')
  s = s.replace(/\bCom\.(?!\w)/gi, 'Comfort')
  s = s.replace(/\bPlat\.(?!\w)/gi, 'Platinum')
  s = s.replace(/\bEssen\.(?!\w)/gi, 'Essence')
  s = s.replace(/\bWork\.(?!\w)/gi, 'Working')
  s = s.replace(/\bAdv\.(?!\w)/gi, 'Adventure')
  s = s.replace(/\bCeleb\.(?!\w)/gi, 'Celebration')
  s = s.replace(/\bDual\.(?!\w)/gi, 'Dualogic')
  s = s.replace(/\bDie(?:s|sel)?\.?\s*TB\b/gi, 'Diesel Turbo')
  s = s.replace(/\bDies?\.+(?=(?:Aut|Mec)\b)/gi, 'Diesel ')
  s = s.replace(/\bDies\.?(?!\w)/gi, 'Diesel')
  s = s.replace(/\bDie\.?(?!\w)/gi, 'Diesel')
  s = s.replace(/\bAlc\.?(?!\w)/gi, 'Alcool')
  s = s.replace(/\bGasol\.?(?!\w)/gi, 'Gasolina')
  s = s.replace(/\b[FT]\.\s*Flex\b/gi, 'Flex')
  s = s.replace(/\bTot\.?\s*Flex\b/gi, 'Flex')
  s = s.replace(/\bTotal\s+Flex\b/gi, 'Flex')
  s = s.replace(/\bE-?\s*Flex\b/gi, 'Flex')
  s = s.replace(/\bFlex\s*Power\b/gi, 'Flex')
  s = s.replace(/\bFlexP\.?/gi, 'Flex')
  s = s.replace(/\bMulti\s*Power\b/gi, 'Flex')
  s = s.replace(/\bT\.?\s*Dies(?:el)?\.?/gi, 'Turbo Diesel')
  s = s.replace(/\bHghl\w*\b/gi, 'Highline')
  s = s.replace(/\bTiptron(?!ic)\.?/gi, 'Tiptronic')
  s = s.replace(/\bTip\.(?!\w)/gi, 'Tiptronic')
  s = s.replace(/\bI\s+MOTION\b/gi, ' ')
  s = s.replace(/\b(FSI)\s*\/\s*(TSI)\b/gi, 'TSI')
  s = s.replace(/(\d+\.\d+)\s*\/\s*\1\b/g, '$1')
  s = s.replace(/([A-Za-zÀ-ÿ])\.(?=\d+\.\d)/g, '$1 ')
  s = s.replace(/Flex(?=\d{1,2}V\b)/gi, 'Flex ')
  s = s.replace(/(?<=\d)(?=Diesel\b)/gi, ' ')
  s = s.replace(
    /\b(\d)(000|300|400|500|600|800|900)\b(?=\s+(?:Mi|MPI|MPFI|16V|8V|Turbo)\b)/gi,
    (_, lead: string, rest: string) => `${lead}.${rest.startsWith('0') ? '0' : rest[0]}`,
  )
  s = s.replace(
    /\((?:[^)]*(?:h[ií]br[ií]d|el[eé]tric|flex|diesel|gasolina|todas|lugares|\bE\d+\b)[^)]*)\)/gi,
    ' ',
  )
  s = s.replace(/\bH[ií]b\.?(?!\w)/gi, 'Híbrido')
  s = s.replace(/\bEletr\.?(?!\w)/gi, 'Elétrico')
  s = s.replace(/\s*\/\s*(?=\d+\.\d+\b)/g, ' ')
  s = s.replace(/,\s*(?=\d+\.\d+\b)/g, ' ')
  s = s.replace(/\b(\d{3})\s+TB\b/gi, 'T$1')
  s = s.replace(/\b(\d{3})\s+T\.(?!\w)/gi, 'T$1')
  s = s.replace(/\bT\.\s+(\d{3})\b/gi, 'T$1')
  s = s.replace(/\bTurbo\s+(\d{3})\b/gi, 'T$1')
  s = s.replace(/\bBi-?\s*TB\b/gi, 'Bi-Turbo')
  s = s.replace(/\bTB-IC\b/gi, 'Turbo')
  s = s.replace(/\bMille\b/gi, '1.0')
  s = s.replace(/\b\d+p\s+e\s+\d+p\b/gi, ' ')
  s = s.replace(/\bHighli(?!ne)\w*/gi, 'Highline')
  s = s.replace(/\bHighi\b/gi, 'Highline')
  s = s.replace(/\(\s*novo\s*\)/gi, ' ')
  s = s.replace(/\bA\.?\s*Premiu\w*/gi, 'Altis Premium')
  s = s.replace(/\bPremiu(?!m)\w*/gi, 'Premium')
  s = s.replace(/\bAttac\.?(?!\w)/gi, 'Attack')
  s = s.replace(/\bPlati\.?(?!\w)/gi, 'Platinum')
  s = s.replace(/\bS\.?\s*Surf\b/gi, 'Super Surf')
  s = s.replace(/\bI\s+MOTI\.?\s*Power\b/gi, ' ')
  s = s.replace(/(\d+\.\d)\.(\d{1,2}V)\b/gi, '$1 $2')
  s = s.replace(/\bDie\.?(?=Aut)/gi, 'Diesel ')
  s = s.replace(/\([^)]*blind[^)]*\)/gi, ' ')
  s = s.replace(/\((?:nacion|import)[^)]*\)/gi, ' ')
  s = s.replace(/\bC\.\s*Plus\b/gi, 'Comfort Plus')
  s = s.replace(/\bC\.\s*Style\b/gi, 'Comfort Style')
  s = s.replace(/\bC\.(?!\w)/gi, 'Comfort')
  s = s.replace(/\s*[|/]\s*/g, ' / ')
  return s.replace(/\s+/g, ' ').trim()
}

function emptySplit(): SplitApiModeloResult {
  return { model: null, engine: null, version: null, traction: null }
}

export function splitApiModelo(rawModelo: string | null | undefined): SplitApiModeloResult {
  if (rawModelo == null) return emptySplit()
  let s = String(rawModelo).trim()
  if (!s) return emptySplit()

  // Prefixo compacto MARCA/ (VW/, GM/, I/) — sem espaço. NÃO engolir "Comfortline / Highline".
  s = s.replace(/^[A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9\-]{0,12}\//, '').trim()
  s = normalizeSpacedModelCodes(s)

  // Versões alternativas no nome: "Gol Comfortline / Highline 1.0" → versão com barra para fan-out.
  if (/\s[|/]\s/.test(s) || /\s[|/]$/.test(s) || /^[|/]\s/.test(s)) {
    const fromAlts = splitModeloWithVersionAlternatives(s)
    if (fromAlts) return fromAlts
  }

  let tokens = s.split(/\s+/).filter(Boolean).flatMap(expandNameToken)
  const torque = pullTorqueBadges(tokens)
  tokens = torque.tokens
  let extraTurbo = false
  let extraBi = false
  const namedTurboFamily = /(?:^|\s)(TSI|TFSI|FSI)(?:\s|$)/i.test(
    `${torque.label ?? ''} ${tokens.join(' ')}`,
  )
  tokens = tokens.filter((tok) => {
    const key = trimAliasKey(tok).replace(/-/g, '')
    if (key === 'BITURBO' || key === 'BITB') {
      extraBi = true
      return false
    }
    if (isTurboBadge(tok)) {
      // "Passat TB 2.0 TSI": TB é a versão. "HB20 1.0 TB" sem TSI: TB é turbo.
      if (trimAliasKey(tok) === 'TB' && namedTurboFamily) return false
      extraTurbo = true
      return false
    }
    return true
  })
  // Remove combustível do fim (Fiesta Flex) — nunca vira versão.
  while (tokens.length >= 2 && isFuelToken(tokens[tokens.length - 1]!)) {
    tokens = tokens.slice(0, -1)
  }
  // Tração em qualquer posição (antes de classificar modelo/motor/versão).
  let traction: '4x2' | '4x4' | 'awd' | null = null
  tokens = tokens.filter((tok) => {
    const t = parseTractionToken(tok)
    if (t) {
      traction = t
      return false
    }
    return true
  })
  s = tokens.join(' ')
  if (!tokens.length) {
    return torque.label
      ? { model: null, engine: torque.label, version: null, traction }
      : emptySplit()
  }

  const withTraction = (r: SplitApiModeloResult): SplitApiModeloResult => {
    let engine = r.engine ?? null
    if (extraBi && !(engine && /bi-turbo/i.test(engine))) {
      engine = engine ? `${engine} Bi-Turbo` : 'Bi-Turbo'
    } else if (extraTurbo && !(engine && /turbo/i.test(engine))) {
      engine = engine ? `${engine} Turbo` : 'Turbo'
    }
    return {
      ...r,
      engine,
      traction: r.traction ?? traction,
    }
  }

  if (tokens.length === 1) {
    const only = tokens[0]!
    const compactAlone = only.match(/^([A-Za-zÀ-ÿ\-]+?)([A-Za-z]{2,8}\d{2}(?:\d{1,2}V)?[A-Za-z]*)$/i)
    if (compactAlone) {
      const parsed = parseDenatranCompactToken(compactAlone[2]!)
      if (parsed) {
        return withTraction({
          model: formatPlateModelName(compactAlone[1]!),
          engine: appendTorqueBadge(parsed.engine, torque.label),
          version: parsed.version,
        })
      }
    }
    return withTraction({
      model: formatPlateModelName(only),
      engine: torque.label,
      version: null,
    })
  }

  // 1) Motor decimal explícito: "HB20 1.0M UNIQUE" / "Gol 2.0 16V" / "1.0 16 válvulas Turbo"
  const engineIdx = tokens.findIndex((t) => ENGINE_TOKEN.test(t) && !isValveToken(t))
  if (engineIdx >= 1) {
    const engTok = tokens[engineIdx]!
    const stuck = peelValveSuffixFromEngineToken(engTok)
    const base = sanitizeEngine(normalizeEngineToken(engTok))
    const peeled = peelTrailingTrim(tokens.slice(0, engineIdx))
    const absorbed = absorbEngineExtras(tokens.slice(engineIdx + 1))
    if (stuck && isCylinderBankToken(stuck)) absorbed.tech.unshift(stuck)
    else if (stuck) absorbed.valves.unshift(stuck)
    if (absorbed.traction) traction = absorbed.traction
    const engine = appendTorqueBadge(
      composeEngineLabel(base, {
        valves: absorbed.valves,
        turbo: absorbed.turbo,
        tech: absorbed.tech,
      }),
      torque.label,
    )
    const version = sanitizeVersionLabel(
      [peeled.version, titleVersion(absorbed.rest)].filter(Boolean).join(' '),
    )
    return withTraction({
      model: peeled.model,
      engine,
      version,
      traction,
    })
  }

  // 2) Motor 10MT/16AT em qualquer posição: "Prisma 10MT Joye" ou "KWID INTENS 10MT"
  const gearIdx = tokens.findIndex((t) => parseEngineGearToken(t) != null)
  if (gearIdx >= 1) {
    const gearEngine = parseEngineGearToken(tokens[gearIdx]!)!
    const peeled = peelTrailingTrim(tokens.slice(0, gearIdx))
    const absorbed = absorbEngineExtras(tokens.slice(gearIdx + 1))
    if (absorbed.traction) traction = absorbed.traction
    const engine = appendTorqueBadge(
      composeEngineLabel(gearEngine, {
        valves: absorbed.valves,
        turbo: absorbed.turbo,
        tech: absorbed.tech,
      }),
      torque.label,
    )
    return withTraction({
      model: peeled.model,
      engine,
      version: sanitizeVersionLabel(
        [peeled.version, titleVersion(absorbed.rest)].filter(Boolean).join(' '),
      ),
      traction,
    })
  }

  // 3) Último token DENATRAN compacto: "CLIO EXP1016VH"
  const last = tokens[tokens.length - 1]!
  const compact = parseDenatranCompactToken(last)
  if (compact) {
    const peeled = peelTrailingTrim(tokens.slice(0, -1))
    return withTraction({
      model: peeled.model,
      engine: compact.engine,
      version: sanitizeVersionLabel(compact.version ?? peeled.version),
    })
  }

  if (torque.label) {
    const peeled = peelTrailingTrim(tokens)
    return withTraction({
      model: peeled.model,
      engine: torque.label,
      version: sanitizeVersionLabel(peeled.version),
      traction,
    })
  }

  const looseValves = tokens.filter((t) => isValveToken(t))
  if (looseValves.length) {
    const rest = tokens.filter((t) => !isValveToken(t))
    const peeled = peelTrailingTrim(rest)
    const engine = composeEngineLabel(null, {
      valves: looseValves.map((v) => normalizeValveLabel(v)),
    })
    if (peeled.model && engine) {
      return withTraction({
        model: peeled.model,
        engine,
        version: sanitizeVersionLabel(peeled.version),
      })
    }
  }

  // 4) Segundo token é só trim conhecido: "HB20 UNIQUE" (não Onix Plus / Tiggo 5X)
  if (tokens.length === 2) {
    const maybeTrim = tokens[1]!.toUpperCase()
    if (
      TRIM_ALIASES[maybeTrim] &&
      !COMPOUND_MODEL_SECONDS.has(maybeTrim) &&
      !isLineageModelToken(tokens[1]!)
    ) {
      return withTraction({
        model: formatPlateModelName(tokens[0]!),
        engine: null,
        version: sanitizeVersionLabel(TRIM_ALIASES[maybeTrim]!),
      })
    }
  }

  // 5) Trim no fim sem motor: "XTZ150 CROSSER S" → modelo XTZ150, versão Crosser S
  if (tokens.length >= 2) {
    const peeled = peelTrailingTrim(tokens)
    if (peeled.version) {
      return withTraction({
        model: peeled.model,
        engine: null,
        version: sanitizeVersionLabel(peeled.version),
      })
    }
  }

  return withTraction({ model: formatPlateModelName(s), engine: null, version: null })
}
