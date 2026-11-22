import { mockVehicleTree } from '@/data/mocks/vehicles'
import { assertStoreBackendConfigured, allowCatalogMocks } from '@/lib/storeBackend'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { VehicleCatalogEntry } from '@/services/search/interpretSearchQuery'
import type { VehicleFilter, VehicleOptionTree } from '@/types'
import { vehicleModelKey, vehicleModelYearKey } from '@/services/vehicles/vehicleOptionKeys'
import { yearsFromProductionLife } from '@/services/vehicles/productionLifeYears'

function relationName(value: unknown): string | undefined {
  if (!value) return undefined
  if (Array.isArray(value)) {
    const first = value[0] as { name?: string } | undefined
    return first?.name
  }
  return (value as { name?: string }).name
}

const VEHICLE_OPTIONS_TTL_MS = 5 * 60_000
let vehicleOptionsCache: { at: number; tree: VehicleOptionTree } | null = null
let vehicleOptionsInflight: Promise<VehicleOptionTree> | null = null

export function clearVehicleOptionsCache() {
  vehicleOptionsCache = null
  vehicleOptionsInflight = null
}

/**
 * Opções de veículo a partir de manufacturers / models / vehicle_versions.
 * Anos do seletor = snapshot VV + vida de linha (identidade).
 * PVC (fit) NÃO entra em yearsByModel — search_products usa PVC à parte.
 * Mock só com VITE_ALLOW_CATALOG_MOCKS=true em DEV (IMP-19 U1).
 * Cache em memória + coalescing de inflight (cascata PVC / garagem).
 */
export async function getVehicleOptions(): Promise<VehicleOptionTree> {
  assertStoreBackendConfigured()
  if (!isSupabaseConfigured || !supabase) {
    if (!allowCatalogMocks()) {
      return {
        makers: [],
        modelsByMaker: {},
        yearsByModel: {},
        enginesByModel: {},
        enginesByModelYear: {},
        versionsByModel: {},
      }
    }
    return mockVehicleTree
  }

  if (
    vehicleOptionsCache &&
    Date.now() - vehicleOptionsCache.at < VEHICLE_OPTIONS_TTL_MS
  ) {
    return vehicleOptionsCache.tree
  }
  if (vehicleOptionsInflight) return vehicleOptionsInflight

  vehicleOptionsInflight = loadVehicleOptionsFromSupabase().finally(() => {
    vehicleOptionsInflight = null
  })
  return vehicleOptionsInflight
}

async function loadVehicleOptionsFromSupabase(): Promise<VehicleOptionTree> {
  if (!supabase) {
    return {
      makers: [],
      modelsByMaker: {},
      yearsByModel: {},
      enginesByModel: {},
      enginesByModelYear: {},
      versionsByModel: {},
    }
  }

  const [
    { data: makers, error: e1 },
    { data: models, error: e2 },
    { data: versions, error: e3 },
  ] = await Promise.all([
    supabase.from('manufacturers').select('id, name').eq('status', 'active').order('name'),
    supabase
      .from('models')
      .select(
        'id, name, manufacturer_id, production_year_start, production_year_end, quality_status, manufacturers(name)',
      )
      .eq('status', 'active')
      // Árvore pública: apenas mestre verificado (review/quarantined/superseded ficam só no admin).
      .eq('quality_status', 'verified')
      .order('name'),
    supabase
      .from('vehicle_versions')
      .select(
        'year, engine, version_name, model_id, manufacturers(name), models!inner(name, status, quality_status)',
      )
      .eq('status', 'active')
      .eq('models.status', 'active')
      .eq('models.quality_status', 'verified'),
  ])

  if (e1) throw e1
  if (e2) throw e2
  if (e3) throw e3

  const modelsByMaker: Record<string, string[]> = {}
  const yearsByModel: Record<string, string[]> = {}
  const yearNumsByModel: Record<string, Set<number>> = {}
  const enginesByModelYear: Record<string, string[]> = {}
  const enginesByModel: Record<string, string[]> = {}
  const versionsByModel: Record<string, string[]> = {}
  const productionByModel: Record<string, { start: number | null; end: number | null }> =
    {}

  for (const m of models ?? []) {
    const makerName =
      relationName(m.manufacturers) ??
      makers?.find((x) => x.id === m.manufacturer_id)?.name
    if (!makerName) continue
    const modelName = String(m.name)
    modelsByMaker[makerName] ??= []
    if (!modelsByMaker[makerName].includes(modelName)) {
      modelsByMaker[makerName].push(modelName)
    }
    const mk = vehicleModelKey(makerName, modelName)
    const ps =
      m.production_year_start == null ? null : Number(m.production_year_start)
    const pe = m.production_year_end == null ? null : Number(m.production_year_end)
    productionByModel[mk] = {
      start: Number.isFinite(ps as number) ? (ps as number) : null,
      end: Number.isFinite(pe as number) ? (pe as number) : null,
    }
    // Vida de linha = identidade do modelo (não predicado PVC).
    // end null = em linha → expande até o ano corrente (não colapsar no start).
    if (ps != null && Number.isFinite(ps)) {
      yearNumsByModel[mk] ??= new Set()
      for (const y of yearsFromProductionLife(ps, pe)) {
        yearNumsByModel[mk].add(y)
      }
    }
  }

  for (const v of versions ?? []) {
    const makerName = relationName(v.manufacturers)
    const modelName = relationName(v.models)
    if (!makerName || !modelName) continue
    const mk = vehicleModelKey(makerName, modelName)

    // Snapshot VV = identidade (anos do seletor).
    if (v.year != null) {
      yearNumsByModel[mk] ??= new Set()
      yearNumsByModel[mk].add(Number(v.year))

      if (v.engine) {
        const key = vehicleModelYearKey(makerName, modelName, v.year)
        enginesByModelYear[key] ??= []
        const engine = String(v.engine)
        if (!enginesByModelYear[key].includes(engine)) {
          enginesByModelYear[key].push(engine)
        }
      }
    }

    if (v.engine) {
      enginesByModel[mk] ??= []
      const engine = String(v.engine)
      if (!enginesByModel[mk].includes(engine)) {
        enginesByModel[mk].push(engine)
      }
    }

    if (v.version_name) {
      versionsByModel[mk] ??= []
      const vn = String(v.version_name)
      if (!versionsByModel[mk].includes(vn)) {
        versionsByModel[mk].push(vn)
      }
    }
  }

  // PVC year_start/end = fit da peça — NÃO entra em yearsByModel (evita entidade falsa).
  // search_products continua usando PVC; placa/seletor injetam ano via selectOptionsWithValue.

  for (const [mk, years] of Object.entries(yearNumsByModel)) {
    yearsByModel[mk] = [...years]
      .sort((a, b) => b - a)
      .map(String)
  }

  // Só montadoras com ≥1 modelo verified — evita SR/Yamaha (só quarentena) no seletor.
  const makerNames = Object.keys(modelsByMaker).sort((a, b) =>
    a.localeCompare(b, 'pt-BR'),
  )

  const tree: VehicleOptionTree = {
    makers: makerNames,
    modelsByMaker,
    yearsByModel,
    enginesByModelYear,
    enginesByModel,
    versionsByModel,
    productionByModel,
  }
  vehicleOptionsCache = { at: Date.now(), tree }
  return tree
}

let vehicleCatalogCache: { at: number; entries: VehicleCatalogEntry[] } | null = null
const VEHICLE_CATALOG_TTL_MS = 5 * 60 * 1000

/** Distinct maker+model active para o interpretador de busca. */
export async function listVehicleCatalogEntries(): Promise<VehicleCatalogEntry[]> {
  const now = Date.now()
  if (vehicleCatalogCache && now - vehicleCatalogCache.at < VEHICLE_CATALOG_TTL_MS) {
    return vehicleCatalogCache.entries
  }

  assertStoreBackendConfigured()
  if (!isSupabaseConfigured || !supabase) {
    if (!allowCatalogMocks()) return []
    const entries: VehicleCatalogEntry[] = []
    for (const [maker, models] of Object.entries(mockVehicleTree.modelsByMaker)) {
      for (const model of models) entries.push({ maker, model })
    }
    vehicleCatalogCache = { at: now, entries }
    return entries
  }

  const [modelsRes, versionsRes] = await Promise.all([
    supabase
      .from('models')
      .select('name, status, quality_status, manufacturers!inner(name, status)')
      .eq('status', 'active')
      .eq('quality_status', 'verified')
      .order('name'),
    supabase
      .from('vehicle_versions')
      .select(
        'version_name, status, models!inner(name, status, quality_status), manufacturers!inner(name)',
      )
      .eq('status', 'active')
      .eq('models.status', 'active')
      .eq('models.quality_status', 'verified')
      .not('version_name', 'is', null),
  ])
  if (modelsRes.error) throw modelsRes.error

  const versionsByKey = new Map<string, Set<string>>()
  for (const row of versionsRes.data ?? []) {
    const rawMaker = row.manufacturers as
      | { name?: string }
      | { name?: string }[]
      | null
    const rawModel = row.models as { name?: string } | { name?: string }[] | null
    const makerObj = Array.isArray(rawMaker) ? rawMaker[0] : rawMaker
    const modelObj = Array.isArray(rawModel) ? rawModel[0] : rawModel
    const vn = String(row.version_name ?? '').trim()
    if (!makerObj?.name || !modelObj?.name || !vn) continue
    const key = `${makerObj.name.toLowerCase()}|${modelObj.name.toLowerCase()}`
    if (!versionsByKey.has(key)) versionsByKey.set(key, new Set())
    versionsByKey.get(key)!.add(vn)
  }

  const entries: VehicleCatalogEntry[] = []
  const seen = new Set<string>()
  for (const row of modelsRes.data ?? []) {
    const rawMaker = row.manufacturers as
      | { name?: string; status?: string }
      | { name?: string; status?: string }[]
      | null
    const makerObj = Array.isArray(rawMaker) ? rawMaker[0] : rawMaker
    if (!makerObj?.name || makerObj.status !== 'active') continue
    const maker = String(makerObj.name)
    const model = String(row.name ?? '')
    if (!model) continue
    const key = `${maker.toLowerCase()}|${model.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    const versions = [...(versionsByKey.get(key) ?? [])]
    entries.push({ maker, model, versions: versions.length ? versions : undefined })
  }
  vehicleCatalogCache = { at: now, entries }
  return entries
}

export function buildVehicleQuery(filter: VehicleFilter): URLSearchParams {
  const params = new URLSearchParams()
  const entries: [keyof VehicleFilter, string | undefined][] = [
    ['maker', filter.maker],
    ['model', filter.model],
    ['year', filter.year],
    ['engine', filter.engine],
    ['version', filter.version],
  ]
  const selected = entries.filter(([, v]) => Boolean(v))
  if (selected.length) {
    params.set('vehicle', '1')
    selected.forEach(([k, v]) => {
      if (v) params.set(k, v)
    })
  }
  return params
}

export { vehicleModelKey, vehicleModelYearKey }
