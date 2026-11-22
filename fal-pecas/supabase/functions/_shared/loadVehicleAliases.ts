/**
 * FAL INV — aliases SoT do DB para Edge (service_role lê vehicle_aliases).
 * Espelho de src/services/vehicles/loadVehicleAliases.ts. Fallback: INV_BUILTIN_ALIASES.
 */
import {
  INV_BUILTIN_ALIASES,
  isChildToParentModelAlias,
  type InvAlias,
} from './resolveVehicleIdentity.ts'

export type VehicleAliasRow = {
  kind?: string | null
  maker_scope?: string | null
  from_norm?: string | null
  to_canonical?: string | null
  status?: string | null
}

const KINDS: ReadonlyArray<InvAlias['kind']> = ['maker', 'model', 'version', 'engine']

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

// deno-lint-ignore no-explicit-any
type SbLike = { from: (table: string) => any }

/** Nunca lança: DB vazio/erro → builtins. */
export async function loadVehicleAliases(sb: SbLike | null | undefined): Promise<InvAlias[]> {
  if (!sb) return INV_BUILTIN_ALIASES
  try {
    const { data, error } = await sb
      .from('vehicle_aliases')
      .select('kind, maker_scope, from_norm, to_canonical, status')
      .eq('status', 'validated')
    if (error) return INV_BUILTIN_ALIASES
    const mapped = mapVehicleAliasRows(data as VehicleAliasRow[])
    return mapped.length > 0 ? mapped : INV_BUILTIN_ALIASES
  } catch {
    return INV_BUILTIN_ALIASES
  }
}
