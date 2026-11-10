import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import type { PlateProviderRaw } from './plateProvider.ts'

function relName(value: unknown): string | undefined {
  if (!value) return undefined
  if (Array.isArray(value)) return (value[0] as { name?: string } | undefined)?.name
  return (value as { name?: string }).name
}

function normToken(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

export interface ResolvedVehicleIds {
  manufacturerId: string | null
  modelId: string | null
  versionId: string | null
  /** Nomes canônicos do cadastro FAL (para preencher selects). */
  makerName: string | null
  modelName: string | null
  /** Ano do cadastro quando houver match exato; senão null (mantém ano da API). */
  catalogYear: string | null
  catalogEngine: string | null
  catalogVersion: string | null
  /** Se maker/model externos não existem no cadastro FAL. */
  notInCatalog: boolean
}

/**
 * Resolve dados externos → IDs + nomes oficiais FAL.
 * Não inventa versão/motor/ano ausentes.
 */
export async function resolveVehicleAgainstCatalog(
  sb: SupabaseClient,
  raw: PlateProviderRaw,
): Promise<ResolvedVehicleIds> {
  const empty: ResolvedVehicleIds = {
    manufacturerId: null,
    modelId: null,
    versionId: null,
    makerName: null,
    modelName: null,
    catalogYear: null,
    catalogEngine: null,
    catalogVersion: null,
    notInCatalog: false,
  }

  if (!raw.maker?.trim() || !raw.model?.trim()) return empty

  const makerQ = raw.maker.trim()
  const modelQ = raw.model.trim()
  const makerAliases: Record<string, string[]> = {
    volkswagen: ['volkswagen', 'vw'],
    chevrolet: ['chevrolet', 'gm', 'chevy'],
    'mercedes-benz': ['mercedes-benz', 'mercedes'],
  }
  const makerNeedles = new Set<string>([makerQ.toLowerCase()])
  for (const [canon, alts] of Object.entries(makerAliases)) {
    if (alts.includes(makerQ.toLowerCase()) || canon === makerQ.toLowerCase()) {
      alts.forEach((a) => makerNeedles.add(a))
      makerNeedles.add(canon)
    }
  }

  const { data: makers, error: e1 } = await sb
    .from('manufacturers')
    .select('id, name')
    .eq('status', 'active')
    .limit(200)
  if (e1) throw e1

  const maker =
    (makers ?? []).find((m) => makerNeedles.has(String(m.name).toLowerCase())) ??
    (makers ?? []).find((m) =>
      [...makerNeedles].some((n) => String(m.name).toLowerCase().includes(n)),
    )
  if (!maker) {
    return { ...empty, notInCatalog: true }
  }

  const { data: models, error: e2 } = await sb
    .from('models')
    .select('id, name, manufacturer_id')
    .eq('status', 'active')
    .eq('manufacturer_id', maker.id)
    .limit(500)
  if (e2) throw e2

  const modelNorm = normToken(modelQ)
  const model =
    (models ?? []).find((m) => String(m.name).toLowerCase() === modelQ.toLowerCase()) ??
    (models ?? []).find((m) => normToken(String(m.name)) === modelNorm) ??
    (models ?? []).find((m) => {
      const n = normToken(String(m.name))
      return n.startsWith(modelNorm) || modelNorm.startsWith(n)
    })

  if (!model) {
    return {
      ...empty,
      manufacturerId: String(maker.id),
      makerName: String(maker.name),
      notInCatalog: true,
    }
  }

  let q = sb
    .from('vehicle_versions')
    .select('id, year, engine, version_name, manufacturers(name), models(name)')
    .eq('status', 'active')
    .eq('manufacturer_id', maker.id)
    .eq('model_id', model.id)

  if (raw.year?.trim()) q = q.eq('year', Number(raw.year))
  if (raw.engine?.trim()) q = q.eq('engine', raw.engine.trim())
  if (raw.version?.trim()) q = q.eq('version_name', raw.version.trim())

  const { data: versions, error: e3 } = await q.limit(20)
  if (e3) throw e3

  const match = (versions ?? []).find((v) => {
    const mk = relName(v.manufacturers)
    const md = relName(v.models)
    return (
      mk?.toLowerCase() === String(maker.name).toLowerCase() &&
      md?.toLowerCase() === String(model.name).toLowerCase()
    )
  })

  return {
    manufacturerId: String(maker.id),
    modelId: String(model.id),
    versionId: match ? String(match.id) : null,
    makerName: String(maker.name),
    modelName: String(model.name),
    catalogYear: match?.year != null ? String(match.year) : null,
    catalogEngine: match?.engine != null ? String(match.engine) : null,
    catalogVersion: match?.version_name != null ? String(match.version_name) : null,
    notInCatalog: false,
  }
}
