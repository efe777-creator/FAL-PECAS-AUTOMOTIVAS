import { mockVehicleTree } from '@/data/mocks/vehicles'
import { assertStoreBackendConfigured, allowCatalogMocks } from '@/lib/storeBackend'
import { expandYearsForSelector } from '@/lib/vehicleAppYear'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { VehicleCatalogEntry } from '@/services/search/interpretSearchQuery'
import type { VehicleFilter, VehicleOptionTree } from '@/types'
import { vehicleModelKey, vehicleModelYearKey } from '@/services/vehicles/vehicleOptionKeys'

function relationName(value: unknown): string | undefined {
  if (!value) return undefined
  if (Array.isArray(value)) {
    const first = value[0] as { name?: string } | undefined
    return first?.name
  }
  return (value as { name?: string }).name
}

/**
 * Opções de veículo a partir de manufacturers / models / vehicle_versions.
 * Anos/motores/versões vêm de **vehicle_versions active** (cadastro mestre).
 * PVC só enriquece anos de aplicação — não limita o seletor.
 * Mock só com VITE_ALLOW_CATALOG_MOCKS=true em DEV (IMP-19 U1).
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

  const [
    { data: makers, error: e1 },
    { data: models, error: e2 },
    { data: versions, error: e3 },
    { data: pvcRows, error: e4 },
  ] = await Promise.all([
    supabase.from('manufacturers').select('id, name').eq('status', 'active').order('name'),
    supabase
      .from('models')
      .select('id, name, manufacturer_id, manufacturers(name)')
      .eq('status', 'active')
      .order('name'),
    supabase
      .from('vehicle_versions')
      .select('year, engine, version_name, model_id, manufacturers(name), models(name)')
      .eq('status', 'active'),
    supabase
      .from('product_vehicle_compatibility')
      .select(
        'year_start, year_end, vehicle_versions!inner(year, manufacturers(name), models!inner(name))',
      )
      .limit(5000),
  ])

  if (e1) throw e1
  if (e2) throw e2
  if (e3) throw e3
  if (e4) throw e4

  const makerNames = (makers ?? []).map((m) => String(m.name))
  const modelsByMaker: Record<string, string[]> = {}
  const yearsByModel: Record<string, string[]> = {}
  const yearNumsByModel: Record<string, Set<number>> = {}
  const enginesByModelYear: Record<string, string[]> = {}
  const enginesByModel: Record<string, string[]> = {}
  const versionsByModel: Record<string, string[]> = {}

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
  }

  for (const v of versions ?? []) {
    const makerName = relationName(v.manufacturers)
    const modelName = relationName(v.models)
    if (!makerName || !modelName) continue
    const mk = vehicleModelKey(makerName, modelName)

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

  for (const row of pvcRows ?? []) {
    const rawVv = row.vehicle_versions as unknown
    const vv = (Array.isArray(rawVv) ? rawVv[0] : rawVv) as
      | { year?: number | null; models?: unknown; manufacturers?: unknown }
      | null
    const makerName = relationName(vv?.manufacturers)
    const modelName = relationName(vv?.models)
    if (!makerName || !modelName) continue
    const mk = vehicleModelKey(makerName, modelName)
    const expanded = expandYearsForSelector(
      row.year_start == null ? null : Number(row.year_start),
      row.year_end == null ? null : Number(row.year_end),
      vv?.year ?? null,
    )
    if (!expanded.length) continue
    yearNumsByModel[mk] ??= new Set()
    for (const y of expanded) yearNumsByModel[mk].add(y)
  }

  for (const [mk, years] of Object.entries(yearNumsByModel)) {
    yearsByModel[mk] = [...years]
      .sort((a, b) => b - a)
      .map(String)
  }

  return {
    makers: makerNames,
    modelsByMaker,
    yearsByModel,
    enginesByModelYear,
    enginesByModel,
    versionsByModel,
  }
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

  const { data, error } = await supabase
    .from('models')
    .select('name, status, manufacturers!inner(name, status)')
    .eq('status', 'active')
    .eq('manufacturers.status', 'active')
    .order('name')
  if (error) throw error

  const entries: VehicleCatalogEntry[] = []
  const seen = new Set<string>()
  for (const row of data ?? []) {
    const maker = relationName(row.manufacturers)
    const model = String(row.name ?? '')
    if (!maker || !model) continue
    const key = `${maker.toLowerCase()}|${model.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    entries.push({ maker, model })
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
