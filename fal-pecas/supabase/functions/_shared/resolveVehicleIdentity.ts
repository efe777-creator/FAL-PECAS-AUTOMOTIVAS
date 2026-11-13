/**
 * FAL INV — resolveVehicleIdentity (Edge mirror Onda 1)
 */
import {
  assertModelClean,
  normalizeVersionLabel,
  sanitizeEngine,
  splitApiModelo,
} from './splitApiModelo.ts'

export type InvSource = 'plate' | 'text' | 'manual' | 'garage' | 'import'
export type InvStatus =
  | 'exact'
  | 'incomplete'
  | 'ambiguous'
  | 'not_in_catalog'
  | 'pending_validation'
export type InvConfidenceBand = 'A' | 'B' | 'C' | 'D'

export type InvAlias = {
  kind: 'maker' | 'model' | 'version' | 'engine'
  makerScope?: string | null
  fromNorm: string
  toCanonical: string | null
  status: 'validated' | 'pending_validation'
}

export type InvEvidence = { ruleId: string; detail?: string }

export type ResolveVehicleIdentityInput = {
  source: InvSource
  raw?: string | null
  maker?: string | null
  model?: string | null
  year?: string | null
  engine?: string | null
  version?: string | null
  aliases?: InvAlias[]
}

export type ResolveVehicleIdentityResult = {
  status: InvStatus
  confidenceBand: InvConfidenceBand
  filter: {
    maker?: string
    model?: string
    year?: string
    engine?: string
    version?: string
  }
  evidence: InvEvidence[]
  raw: string
  pendingCodes: string[]
  allowCanonicalUpsert: boolean
  message: string
}

const NOT_INFORMED = ''

export const INV_BUILTIN_ALIASES: InvAlias[] = [
  { kind: 'maker', fromNorm: 'chev', toCanonical: 'Chevrolet', status: 'validated' },
  { kind: 'maker', fromNorm: 'gm', toCanonical: 'Chevrolet', status: 'validated' },
  { kind: 'maker', fromNorm: 'vw', toCanonical: 'Volkswagen', status: 'validated' },
  { kind: 'engine', makerScope: 'Fiat', fromNorm: '13', toCanonical: '1.3', status: 'validated' },
  { kind: 'engine', makerScope: 'Fiat', fromNorm: '1300', toCanonical: '1.3', status: 'validated' },
  { kind: 'engine', makerScope: 'Fiat', fromNorm: 'firefly', toCanonical: 'Firefly', status: 'validated' },
  { kind: 'engine', makerScope: 'Fiat', fromNorm: 'etorq', toCanonical: 'E.torQ', status: 'validated' },
  { kind: 'version', makerScope: 'Fiat', fromNorm: 'drive', toCanonical: 'Drive', status: 'validated' },
  { kind: 'version', makerScope: 'Fiat', fromNorm: 'trekking', toCanonical: 'Trekking', status: 'validated' },
  { kind: 'version', makerScope: 'Fiat', fromNorm: 'hgt', toCanonical: 'HGT', status: 'validated' },
  { kind: 'version', makerScope: 'Fiat', fromNorm: 'precision', toCanonical: 'Precision', status: 'validated' },
  { kind: 'version', makerScope: 'Fiat', fromNorm: 'gsr', toCanonical: 'GSR', status: 'validated' },
  { kind: 'version', fromNorm: 'intens', toCanonical: 'Intense', status: 'validated' },
  { kind: 'version', fromNorm: 'joye', toCanonical: 'Joy', status: 'validated' },
  { kind: 'version', fromNorm: 'joy', toCanonical: 'Joy', status: 'validated' },
  {
    kind: 'version',
    makerScope: 'Fiat',
    fromNorm: 'hlap',
    toCanonical: null,
    status: 'pending_validation',
  },
]

function normKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

function lookupAlias(
  aliases: InvAlias[],
  kind: InvAlias['kind'],
  raw: string | null | undefined,
  makerScope?: string | null,
): InvAlias | undefined {
  if (!raw?.trim()) return undefined
  const key = normKey(raw)
  const validated = aliases.filter((a) => a.kind === kind && a.status === 'validated')
  const scoped = makerScope
    ? validated.find(
        (a) =>
          a.fromNorm === key &&
          a.makerScope &&
          normKey(a.makerScope) === normKey(makerScope),
      )
    : undefined
  if (scoped) return scoped
  return validated.find((a) => a.fromNorm === key && !a.makerScope)
}

function findPending(aliases: InvAlias[], chunks: string[], makerScope?: string | null): string[] {
  const pending: string[] = []
  const list = chunks.filter((c) => c.trim())
  const candidates: string[] = [...list]
  for (let i = 0; i < list.length - 1; i++) {
    candidates.push(`${list[i]} ${list[i + 1]}`)
  }
  for (const chunk of candidates) {
    const key = normKey(chunk)
    if (!key) continue
    const hit = aliases.find(
      (a) =>
        a.status === 'pending_validation' &&
        a.fromNorm === key &&
        (!a.makerScope || (makerScope && normKey(a.makerScope) === normKey(makerScope))),
    )
    if (hit && !pending.includes(chunk)) pending.push(chunk)
  }
  return pending
}

export function isInvResolverEnabled(): boolean {
  try {
    const v = Deno.env.get('INV_RESOLVER_ENABLED')
    if (v === '0' || v === 'false') return false
  } catch {
    /* ignore */
  }
  return true
}

function messageFor(status: InvStatus): string {
  switch (status) {
    case 'exact':
      return 'Encontramos este veículo. Confira antes de buscar.'
    case 'incomplete':
      return 'Identificamos o veículo; complete os campos que souber. Ausentes ficam em Não informado.'
    case 'ambiguous':
      return 'Encontramos mais de uma configuração. Escolha a correta.'
    case 'not_in_catalog':
      return 'Veículo identificado, mas fora do cadastro FAL. Corrija montadora/modelo.'
    case 'pending_validation':
      return 'Código preservado para validação; confirme apenas os dados conhecidos.'
    default:
      return 'Confira os dados do veículo antes de ver as peças.'
  }
}

export function resolveVehicleIdentity(
  input: ResolveVehicleIdentityInput,
): ResolveVehicleIdentityResult {
  const evidence: InvEvidence[] = []
  const aliases = input.aliases?.length ? input.aliases : INV_BUILTIN_ALIASES
  const raw =
    input.raw?.trim() ||
    [input.maker, input.model, input.year, input.engine, input.version]
      .filter(Boolean)
      .join(' ')

  let maker = input.maker?.trim() || undefined
  let model = input.model?.trim() || undefined
  let year = input.year?.trim() || undefined
  let engine = input.engine?.trim() || undefined
  let version = input.version?.trim() || undefined

  if (model) {
    const cleaned = assertModelClean(model, { engine, version })
    if (cleaned.model !== model) {
      evidence.push({ ruleId: 'split_model', detail: `${model}→${cleaned.model}` })
    }
    model = cleaned.model || model
    if (!engine && cleaned.engine) engine = cleaned.engine
    if (!version && cleaned.version) version = cleaned.version
  }

  if (model && !version) {
    const tokens = model.split(/\s+/).filter(Boolean)
    if (tokens.length >= 2) {
      for (const take of [2, 1] as const) {
        if (tokens.length <= take) continue
        const tail = tokens.slice(-take).join(' ')
        const head = tokens.slice(0, -take).join(' ')
        const verAlias = lookupAlias(aliases, 'version', tail, maker)
        if (verAlias?.toCanonical && head) {
          model = head
          version = verAlias.toCanonical
          evidence.push({ ruleId: 'peel_version_alias', detail: version })
          break
        }
      }
    }
  }

  const pendingCodes = findPending(
    aliases,
    [raw, version ?? '', model ?? ''].flatMap((s) => s.split(/\s+/)),
    maker,
  )
  if (pendingCodes.length) evidence.push({ ruleId: 'pending_code', detail: pendingCodes.join(',') })

  const makerAlias = lookupAlias(aliases, 'maker', maker)
  if (makerAlias?.toCanonical) {
    evidence.push({ ruleId: 'alias_maker', detail: makerAlias.toCanonical })
    maker = makerAlias.toCanonical
  }

  const versionAlias = lookupAlias(aliases, 'version', version, maker)
  if (versionAlias?.toCanonical) {
    evidence.push({ ruleId: 'alias_version', detail: versionAlias.toCanonical })
    version = versionAlias.toCanonical
  } else if (version) {
    version = normalizeVersionLabel(version) ?? version
  }

  const engAlias = lookupAlias(aliases, 'engine', engine, maker)
  if (engAlias?.toCanonical && /^\d/.test(engAlias.toCanonical)) {
    evidence.push({ ruleId: 'alias_engine', detail: engAlias.toCanonical })
    engine = engAlias.toCanonical
  } else {
    engine = sanitizeEngine(engine) ?? engine
  }

  if (model) {
    const splitAgain = splitApiModelo(model)
    model = splitAgain.model ?? model
  }

  const filter = {
    maker,
    model,
    year,
    engine: engine || (maker && model ? NOT_INFORMED : undefined),
    version: version || (maker && model ? NOT_INFORMED : undefined),
  }

  const hasMakerModel = Boolean(filter.maker && filter.model)
  const engineKnown = filter.engine != null && filter.engine !== NOT_INFORMED
  const versionKnown = filter.version != null && filter.version !== NOT_INFORMED

  if (pendingCodes.length && !versionKnown) {
    const status: InvStatus = 'pending_validation'
    return {
      status,
      confidenceBand: 'D',
      filter: { ...filter, version: NOT_INFORMED },
      evidence,
      raw,
      pendingCodes,
      allowCanonicalUpsert: Boolean(hasMakerModel && filter.year),
      message: messageFor(status),
    }
  }

  if (!hasMakerModel) {
    const status: InvStatus = 'not_in_catalog'
    return {
      status,
      confidenceBand: 'D',
      filter,
      evidence,
      raw,
      pendingCodes,
      allowCanonicalUpsert: false,
      message: messageFor(status),
    }
  }

  if (engineKnown && versionKnown && filter.year) {
    const status: InvStatus = 'exact'
    return {
      status,
      confidenceBand: 'A',
      filter,
      evidence,
      raw,
      pendingCodes,
      allowCanonicalUpsert: true,
      message: messageFor(status),
    }
  }

  const status: InvStatus = 'incomplete'
  return {
    status,
    confidenceBand: 'B',
    filter,
    evidence,
    raw,
    pendingCodes,
    allowCanonicalUpsert: true,
    message: messageFor(status),
  }
}
