/**
 * FAL INV — resolveVehicleIdentity (Onda 1)
 * Determinístico: split → aliases validados → reconcile → banda A–D.
 * pending_validation nunca altera filtro.
 */
import type { VehicleFilter, VehicleOptionTree } from '@/types'
import {
  assertModelClean,
  normalizeVersionLabel,
  sanitizeEngine,
  splitApiModelo,
} from '@/services/plates/splitApiModelo'
import {
  normalizeVehicleToken,
  reconcileVehicleFilter,
} from '@/services/plates/reconcileVehicleFilter'
import { VEHICLE_NOT_INFORMED_VALUE } from '@/services/vehicles/vehicleNotInformed'

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
  fuel?: string | null
  transmission?: string | null
  tree?: VehicleOptionTree | null
  aliases?: InvAlias[]
}

export type ResolveVehicleIdentityResult = {
  status: InvStatus
  confidenceBand: InvConfidenceBand
  filter: VehicleFilter
  vehicleVersionId: string | null
  candidates: VehicleFilter[]
  evidence: InvEvidence[]
  raw: string
  pendingCodes: string[]
  /** Se true, Edge NÃO deve upsert canônico. */
  allowCanonicalUpsert: boolean
}

/** Seed embutido (fallback se DB indisponível). Espelha migration INV. */
export const INV_BUILTIN_ALIASES: InvAlias[] = [
  { kind: 'maker', fromNorm: 'chev', toCanonical: 'Chevrolet', status: 'validated' },
  { kind: 'maker', fromNorm: 'gm', toCanonical: 'Chevrolet', status: 'validated' },
  { kind: 'maker', fromNorm: 'vw', toCanonical: 'Volkswagen', status: 'validated' },
  { kind: 'engine', makerScope: 'Fiat', fromNorm: '13', toCanonical: '1.3', status: 'validated' },
  { kind: 'engine', makerScope: 'Fiat', fromNorm: '1300', toCanonical: '1.3', status: 'validated' },
  { kind: 'engine', makerScope: 'Fiat', fromNorm: 'firefly', toCanonical: 'Firefly', status: 'validated' },
  { kind: 'engine', makerScope: 'Fiat', fromNorm: 'etorq', toCanonical: 'E.torQ', status: 'validated' },
  {
    kind: 'version',
    makerScope: 'Fiat',
    fromNorm: 'drive',
    toCanonical: 'Drive',
    status: 'validated',
  },
  {
    kind: 'version',
    makerScope: 'Fiat',
    fromNorm: 'trekking',
    toCanonical: 'Trekking',
    status: 'validated',
  },
  { kind: 'version', makerScope: 'Fiat', fromNorm: 'hgt', toCanonical: 'HGT', status: 'validated' },
  {
    kind: 'version',
    makerScope: 'Fiat',
    fromNorm: 'precision',
    toCanonical: 'Precision',
    status: 'validated',
  },
  { kind: 'version', makerScope: 'Fiat', fromNorm: 'gsr', toCanonical: 'GSR', status: 'validated' },
  {
    kind: 'version',
    makerScope: 'Fiat',
    fromNorm: 'openingedition',
    toCanonical: 'Opening Edition',
    status: 'validated',
  },
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
  return normalizeVehicleToken(value)
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

function findPending(
  aliases: InvAlias[],
  rawChunks: string[],
  makerScope?: string | null,
): string[] {
  const pending: string[] = []
  const chunks = rawChunks.filter((c) => c.trim())
  const candidates: string[] = [...chunks]
  for (let i = 0; i < chunks.length - 1; i++) {
    candidates.push(`${chunks[i]} ${chunks[i + 1]}`)
  }
  for (const chunk of candidates) {
    const key = normKey(chunk)
    if (!key) continue
    const hit = aliases.find(
      (a) =>
        a.status === 'pending_validation' &&
        a.fromNorm === key &&
        (!a.makerScope ||
          (makerScope && normKey(a.makerScope) === normKey(makerScope))),
    )
    if (hit && !pending.includes(chunk)) pending.push(chunk)
  }
  return pending
}

/**
 * Feature flag: INV_RESOLVER_ENABLED / VITE_INV_RESOLVER_ENABLED.
 * Default ON em client se VITE_ set; Edge lê Deno.env.
 */
export function isInvResolverEnabled(env?: Record<string, string | undefined>): boolean {
  const e = env ?? (typeof import.meta !== 'undefined' ? (import.meta as { env?: Record<string, string> }).env : undefined)
  const v = e?.VITE_INV_RESOLVER_ENABLED ?? e?.INV_RESOLVER_ENABLED
  if (v === '0' || v === 'false') return false
  return true
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

  // 1) Split modelo composto
  if (model) {
    const cleaned = assertModelClean(model, { engine, version })
    if (cleaned.model !== model) {
      evidence.push({ ruleId: 'split_model', detail: `${model}→${cleaned.model}` })
    }
    model = cleaned.model || model
    if (!engine && cleaned.engine) engine = cleaned.engine
    if (!version && cleaned.version) version = cleaned.version
  }

  // 1b) Peel versão comercial do fim do modelo via alias validado (Argo Drive → Argo + Drive)
  if (model && !version) {
    const tokens = model.split(/\s+/).filter(Boolean)
    if (tokens.length >= 2) {
      // tenta 2 tokens finais (Opening Edition) e depois 1
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

  // Extra: raw text may carry version codes (HL AP)
  const pendingCodes = findPending(
    aliases,
    [raw, version ?? '', model ?? ''].flatMap((s) => s.split(/\s+/)),
    maker,
  )
  if (pendingCodes.length) {
    evidence.push({ ruleId: 'pending_code', detail: pendingCodes.join(',') })
  }

  // 2) Aliases validados
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

  // engine displacement via alias (1,3 → 1.3) — família Firefly não vira engine PVC
  const engAlias = lookupAlias(aliases, 'engine', engine, maker)
  if (engAlias?.toCanonical && /^\d/.test(engAlias.toCanonical)) {
    evidence.push({ ruleId: 'alias_engine', detail: engAlias.toCanonical })
    engine = engAlias.toCanonical
  } else {
    engine = sanitizeEngine(engine) ?? engine
  }

  // Detect family words left in model/raw (Firefly) — strip from model if present
  if (model) {
    const splitAgain = splitApiModelo(model)
    model = splitAgain.model ?? model
  }

  let filter: VehicleFilter = {
    maker,
    model,
    year,
    engine: engine || (maker && model ? VEHICLE_NOT_INFORMED_VALUE : undefined),
    version: version || (maker && model ? VEHICLE_NOT_INFORMED_VALUE : undefined),
  }

  // 3) Reconcile com árvore
  if (input.tree && maker && model) {
    filter = reconcileVehicleFilter(filter, input.tree)
    evidence.push({ ruleId: 'reconcile_tree' })
  }

  const hasMakerModel = Boolean(filter.maker && filter.model)
  const engineKnown =
    filter.engine != null && filter.engine !== VEHICLE_NOT_INFORMED_VALUE
  const versionKnown =
    filter.version != null && filter.version !== VEHICLE_NOT_INFORMED_VALUE

  if (pendingCodes.length && !versionKnown) {
    return {
      status: 'pending_validation',
      confidenceBand: 'D',
      filter: {
        ...filter,
        version: VEHICLE_NOT_INFORMED_VALUE,
      },
      vehicleVersionId: null,
      candidates: [],
      evidence,
      raw,
      pendingCodes,
      allowCanonicalUpsert: Boolean(hasMakerModel && filter.year),
    }
  }

  if (!hasMakerModel) {
    return {
      status: 'not_in_catalog',
      confidenceBand: 'D',
      filter,
      vehicleVersionId: null,
      candidates: [],
      evidence,
      raw,
      pendingCodes,
      allowCanonicalUpsert: false,
    }
  }

  // Árvore: maker/model existem?
  if (input.tree) {
    const makers = input.tree.makers.map((m) => normKey(m))
    const makerOk = makers.includes(normKey(filter.maker!))
    const models = makerOk
      ? (input.tree.modelsByMaker[filter.maker!] ?? []).map((m) => normKey(m))
      : []
    const modelOk = models.includes(normKey(filter.model!))
    if (!makerOk || !modelOk) {
      return {
        status: 'not_in_catalog',
        confidenceBand: 'D',
        filter,
        vehicleVersionId: null,
        candidates: [],
        evidence,
        raw,
        pendingCodes,
        allowCanonicalUpsert: false,
      }
    }
  }

  if (engineKnown && versionKnown && filter.year) {
    return {
      status: 'exact',
      confidenceBand: 'A',
      filter,
      vehicleVersionId: null,
      candidates: [],
      evidence,
      raw,
      pendingCodes,
      allowCanonicalUpsert: true,
    }
  }

  return {
    status: 'incomplete',
    confidenceBand: 'B',
    filter,
    vehicleVersionId: null,
    candidates: [],
    evidence,
    raw,
    pendingCodes,
    allowCanonicalUpsert: true,
  }
}

export function invStatusMessage(result: ResolveVehicleIdentityResult): string {
  switch (result.status) {
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
