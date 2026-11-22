/**
 * FAL INV — aliases SoT no banco (vehicle_aliases).
 * DB validado é preferido; INV_BUILTIN_ALIASES é bootstrap quando DB vazio/falha.
 *
 * Nota: vehicle_aliases tem policy backend-only (anon/authenticated negados). No browser a
 * leitura volta vazia → fallback builtin. No Edge (service_role) o loader espelhado em
 * supabase/functions/_shared/loadVehicleAliases.ts lê o DB de fato.
 */
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import {
  INV_BUILTIN_ALIASES,
  isChildToParentModelAlias,
  resolveVehicleIdentity,
  type InvAlias,
  type ResolveVehicleIdentityInput,
  type ResolveVehicleIdentityResult,
} from '@/services/vehicles/resolveVehicleIdentity'

export type VehicleAliasRow = {
  kind?: string | null
  maker_scope?: string | null
  from_norm?: string | null
  to_canonical?: string | null
  status?: string | null
}

const KINDS: ReadonlyArray<InvAlias['kind']> = ['maker', 'model', 'version', 'engine']

/**
 * Mapeia linhas do DB → InvAlias. Só `validated` com destino; descarta
 * kind desconhecido e alias de modelo filho→pai (Corolla Cross → Corolla).
 */
export function mapVehicleAliasRows(rows: VehicleAliasRow[] | null | undefined): InvAlias[] {
  const out: InvAlias[] = []
  for (const r of rows ?? []) {
    if (r.status !== 'validated') continue
    const kind = r.kind as InvAlias['kind']
    if (!KINDS.includes(kind)) continue
    const fromNorm = String(r.from_norm ?? '').trim()
    const toCanonical = String(r.to_canonical ?? '').trim()
    if (!fromNorm || !toCanonical) continue
    const alias: InvAlias = {
      kind,
      makerScope: r.maker_scope?.trim() || null,
      fromNorm,
      toCanonical,
      status: 'validated',
    }
    if (isChildToParentModelAlias(alias)) continue
    out.push(alias)
  }
  return out
}

/** DB (se houver) senão builtins. Pure — usado pelo loader e testável. */
export function pickAliasesSource(dbAliases: InvAlias[] | null | undefined): InvAlias[] {
  return dbAliases && dbAliases.length > 0 ? dbAliases : INV_BUILTIN_ALIASES
}

const TTL_MS = 5 * 60_000
let cache: { at: number; aliases: InvAlias[] } | null = null
let inflight: Promise<InvAlias[]> | null = null

export function clearVehicleAliasesCache() {
  cache = null
  inflight = null
}

async function fetchFromDb(): Promise<InvAlias[]> {
  if (!isSupabaseConfigured || !supabase) return []
  const { data, error } = await supabase
    .from('vehicle_aliases')
    .select('kind, maker_scope, from_norm, to_canonical, status')
    .eq('status', 'validated')
  if (error) throw error
  return mapVehicleAliasRows(data as VehicleAliasRow[])
}

/** Carrega aliases validados do DB (cache 5 min). Nunca lança: fallback = builtins. */
export async function loadVehicleAliases(): Promise<InvAlias[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.aliases
  if (inflight) return inflight
  inflight = fetchFromDb()
    .then((db) => pickAliasesSource(db))
    .catch(() => INV_BUILTIN_ALIASES)
    .then((aliases) => {
      cache = { at: Date.now(), aliases }
      return aliases
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

/** Para callers que podem aguardar: resolve com aliases do DB (ou builtins). */
export async function resolveVehicleIdentityWithDbAliases(
  input: ResolveVehicleIdentityInput,
): Promise<ResolveVehicleIdentityResult> {
  const aliases = input.aliases?.length ? input.aliases : await loadVehicleAliases()
  return resolveVehicleIdentity({ ...input, aliases })
}
