/**
 * Consulta → diff → apply seletivo do mestre (admin).
 * Zero PVC. Não usa codigo_fipe como predicado.
 */
import { normalizeVehicleFuel } from '@/lib/vehicles/normalizeVehicleFuel'
import { yearsInInclusiveRange } from '@/lib/vehicles/expandVersionYearRange'
import { adminListManufacturers } from '@/services/admin/adminManufacturerService'
import {
  adminListModels,
  adminListVersions,
  mergeModelProductionYears,
} from '@/services/admin/adminVehicleService'
import {
  adminPreviewVehicleMasterImport,
  type VehicleMasterRow,
} from '@/services/admin/adminVehicleMasterImportService'
import {
  diffVehicleMasterCandidates,
  selectedMasterDiffCandidates,
  type MasterCatalogSnapshot,
  type MasterDiffCandidate,
} from '@/services/vehicles/diffVehicleMasterCandidates'
import {
  prepareVehicleMasterIntelligence,
  type MasterIntelligenceRow,
} from '@/services/vehicles/vehicleMasterIntelligence'
import { fipeXCsvVehicleMasterSource } from '@/services/vehicles/vehicleMasterSource'
import { vehicleCanonicalUpsert } from '@/services/vehicles/vehicleCanonicalUpsert'

export type ConsultApplyResult = {
  upserted: number
  productionMerged: number
  skipped: number
  errors: number
  messages: string[]
  modelIds: string[]
}

export async function loadMasterCatalogSnapshot(): Promise<MasterCatalogSnapshot> {
  const [makers, models, versions] = await Promise.all([
    adminListManufacturers(),
    adminListModels(),
    adminListVersions(),
  ])
  const makerName = new Map(makers.map((m) => [m.id, m.name]))
  const activeCount = new Map<string, number>()
  for (const v of versions) {
    if (v.status !== 'active') continue
    activeCount.set(v.modelId, (activeCount.get(v.modelId) ?? 0) + 1)
  }
  return {
    models: models
      .filter((m) => m.status === 'active')
      .map((m) => ({
        id: m.id,
        manufacturerId: m.manufacturerId,
        makerName: makerName.get(m.manufacturerId) ?? '—',
        name: m.name,
        productionYearStart: m.productionYearStart ?? null,
        productionYearEnd: m.productionYearEnd ?? null,
        activeVersionCount: activeCount.get(m.id) ?? 0,
      })),
    versions: versions.map((v) => ({
      id: v.id,
      modelId: v.modelId,
      manufacturerId: v.manufacturerId,
      year: v.year,
      engine: v.engine,
      versionName: v.versionName,
      fuel: v.fuel ?? null,
      status: v.status,
    })),
  }
}

function falRowsToIntelligence(rows: VehicleMasterRow[]): MasterIntelligenceRow[] {
  return rows
    .filter((r) => r.action === 'create')
    .map((r) => ({
      montadora: r.montadora,
      modelo: r.modelo,
      ano: r.anoInicio || r.ano,
      motor: r.motor,
      versao: r.versao,
      combustivel: r.combustivel ?? '',
    }))
}

/** CSV FAL clássico → candidatos com diff. */
export async function buildCandidatesFromFalCsvFile(
  file: File,
): Promise<{ candidates: MasterDiffCandidate[]; fileErrors: string[]; skipped: number }> {
  const { rows, fileErrors } = await adminPreviewVehicleMasterImport(file)
  if (fileErrors.length) {
    return { candidates: [], fileErrors, skipped: 0 }
  }
  const intel = falRowsToIntelligence(rows)
  return buildCandidatesFromIntelligenceRows(intel)
}

/** Dump fipeX → candidatos com diff. */
export async function buildCandidatesFromFipeXText(
  text: string,
): Promise<{ candidates: MasterDiffCandidate[]; fileErrors: string[]; skipped: number }> {
  const source = await fipeXCsvVehicleMasterSource.fetchNormalizedRows(text)
  if (source.fileErrors.length) {
    return { candidates: [], fileErrors: source.fileErrors, skipped: source.skipped }
  }
  return buildCandidatesFromIntelligenceRows(source.rows, source.skipped)
}

export async function buildCandidatesFromIntelligenceRows(
  rows: MasterIntelligenceRow[],
  extraSkipped = 0,
): Promise<{ candidates: MasterDiffCandidate[]; fileErrors: string[]; skipped: number }> {
  const prepared = prepareVehicleMasterIntelligence(rows)
  if (prepared.fileErrors.length && !prepared.prepared.some((p) => p.action === 'upsert')) {
    return {
      candidates: [],
      fileErrors: prepared.fileErrors,
      skipped: prepared.skipped + extraSkipped,
    }
  }
  const catalog = await loadMasterCatalogSnapshot()
  const candidates = diffVehicleMasterCandidates(prepared.prepared, catalog)
  return {
    candidates,
    fileErrors: prepared.fileErrors,
    skipped: prepared.skipped + extraSkipped,
  }
}

/** Converte candidatos editados da UI → intelligence rows (1 por ano do período). */
export function candidatesToIntelligenceRows(
  candidates: MasterDiffCandidate[],
): MasterIntelligenceRow[] {
  const rows: MasterIntelligenceRow[] = []
  for (const c of selectedMasterDiffCandidates(candidates)) {
    const start = Number(c.yearStart)
    const end = Number(c.yearEnd)
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) continue
    const years = yearsInInclusiveRange(start, end)
    for (const year of years) {
      rows.push({
        montadora: c.maker.trim(),
        modelo: c.model.trim(),
        ano: String(year),
        motor: c.engine.trim(),
        versao: c.version.trim(),
        combustivel: c.fuel.trim(),
      })
    }
  }
  return rows
}

/**
 * Apply só linhas marcadas. Edits na UI já estão nos campos do candidato.
 * Linhas desmarcadas são ignoradas mesmo se editadas.
 */
export async function applySelectedMasterCandidates(
  candidates: MasterDiffCandidate[],
): Promise<ConsultApplyResult> {
  const selected = selectedMasterDiffCandidates(candidates)
  const result: ConsultApplyResult = {
    upserted: 0,
    productionMerged: 0,
    skipped: candidates.length - selected.length,
    errors: 0,
    messages: [],
    modelIds: [],
  }
  if (!selected.length) return result

  const lifeByModel = new Map<string, { start: number; end: number }>()
  const touched = new Set<string>()

  for (const c of selected) {
    const start = Number(c.yearStart)
    const end = Number(c.yearEnd)
    if (!c.maker.trim() || !c.model.trim() || !Number.isFinite(start) || !Number.isFinite(end) || start > end) {
      result.errors += 1
      result.messages.push(`${c.maker} ${c.model}: anos inválidos`)
      continue
    }
    const fuel = normalizeVehicleFuel(c.fuel)
    try {
      const years = yearsInInclusiveRange(start, end)
      let modelId: string | null = null
      for (const year of years) {
        const up = await vehicleCanonicalUpsert({
          maker: c.maker.trim(),
          model: c.model.trim(),
          year,
          engine: c.engine.trim() || null,
          version: c.version.trim() || null,
          fuel,
          source: 'import',
        })
        modelId = up.modelId
        result.upserted += 1
      }
      if (modelId) {
        touched.add(modelId)
        const prev = lifeByModel.get(modelId)
        if (!prev) lifeByModel.set(modelId, { start, end })
        else {
          lifeByModel.set(modelId, {
            start: Math.min(prev.start, start),
            end: Math.max(prev.end, end),
          })
        }
      }
    } catch (err) {
      result.errors += 1
      result.messages.push(
        `${c.maker} ${c.model}: ${err instanceof Error ? err.message : 'Falha no upsert'}`,
      )
    }
  }

  for (const [modelId, life] of lifeByModel) {
    try {
      await mergeModelProductionYears(modelId, life.start, life.end)
      result.productionMerged += 1
    } catch {
      /* vida expansiva — não invalida VVs */
    }
  }

  result.modelIds = [...touched]
  return result
}
