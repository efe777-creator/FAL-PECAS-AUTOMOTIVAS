/**
 * Diff de candidatos do mestre vs catálogo local.
 * Não grava. Não usa codigo_fipe. Não cria PVC.
 */
import { normalizeEntityMatchKey } from '@/lib/entityNormalize'
import { normalizeVehicleFuel } from '@/lib/vehicles/normalizeVehicleFuel'
import type { MasterIntelligencePrepared } from '@/services/vehicles/vehicleMasterIntelligence'

export type MasterDiffStatus = 'novo' | 'ja_cadastrado' | 'enriquece' | 'conflito'

export type MasterCatalogModel = {
  id: string
  manufacturerId: string
  makerName: string
  name: string
  productionYearStart: number | null
  productionYearEnd: number | null
  activeVersionCount: number
}

export type MasterCatalogVersion = {
  id: string
  modelId: string
  manufacturerId: string
  year: number | null
  engine: string | null
  versionName: string | null
  fuel: string | null
  status: string
}

export type MasterCatalogSnapshot = {
  models: MasterCatalogModel[]
  versions: MasterCatalogVersion[]
}

export type MasterDiffCandidate = {
  id: string
  selected: boolean
  status: MasterDiffStatus
  note: string
  maker: string
  model: string
  version: string
  engine: string
  fuel: string
  yearStart: number
  yearEnd: number
  modelId: string | null
  versionId: string | null
}

function nk(s: string | null | undefined): string {
  return normalizeEntityMatchKey(s ?? '')
}

function fuelKey(raw: string | null | undefined): string {
  return (normalizeVehicleFuel(raw) ?? '').toLowerCase()
}

function vvMatchKey(input: {
  modelId: string
  year: number
  engine: string | null | undefined
  version: string | null | undefined
  fuel: string | null | undefined
}): string {
  return [
    input.modelId,
    input.year,
    (input.engine ?? '').trim().toLowerCase(),
    (input.version ?? '').trim().toLowerCase(),
    fuelKey(input.fuel),
  ].join('|')
}

function defaultSelected(status: MasterDiffStatus): boolean {
  return status === 'novo' || status === 'enriquece'
}

/**
 * Compara linhas preparadas com snapshot do mestre.
 * Uma linha por ano do período preparado (year do prepared).
 */
export function diffVehicleMasterCandidates(
  prepared: MasterIntelligencePrepared[],
  catalog: MasterCatalogSnapshot,
): MasterDiffCandidate[] {
  const modelByKey = new Map<string, MasterCatalogModel>()
  for (const m of catalog.models) {
    modelByKey.set(`${nk(m.makerName)}|${nk(m.name)}`, m)
  }

  const versionsByModel = new Map<string, MasterCatalogVersion[]>()
  for (const v of catalog.versions) {
    if (v.status !== 'active') continue
    const list = versionsByModel.get(v.modelId)
    if (list) list.push(v)
    else versionsByModel.set(v.modelId, [v])
  }

  const out: MasterDiffCandidate[] = []
  let seq = 0

  for (const row of prepared) {
    if (row.action === 'error') {
      out.push({
        id: `err-${seq++}`,
        selected: false,
        status: 'conflito',
        note: row.message ?? 'Linha inválida',
        maker: row.maker,
        model: row.model,
        version: row.version ?? '',
        engine: row.engine ?? '',
        fuel: row.fuel ?? '',
        yearStart: row.year,
        yearEnd: row.year,
        modelId: null,
        versionId: null,
      })
      continue
    }
    if (row.action !== 'upsert') continue

    const model = modelByKey.get(`${nk(row.maker)}|${nk(row.model)}`)
    const yearStart = row.productionYearStart || row.year
    const yearEnd = row.productionYearEnd || row.year

    if (!model) {
      const status: MasterDiffStatus = 'novo'
      out.push({
        id: `c-${seq++}`,
        selected: defaultSelected(status),
        status,
        note: 'Modelo/configuração ainda não existem no mestre',
        maker: row.maker,
        model: row.model,
        version: row.version ?? '',
        engine: row.engine ?? '',
        fuel: row.fuel ?? '',
        yearStart,
        yearEnd,
        modelId: null,
        versionId: null,
      })
      continue
    }

    const vvs = versionsByModel.get(model.id) ?? []
    const exactKey = vvMatchKey({
      modelId: model.id,
      year: row.year,
      engine: row.engine,
      version: row.version,
      fuel: row.fuel,
    })
    const exact = vvs.find(
      (v) =>
        vvMatchKey({
          modelId: v.modelId,
          year: v.year ?? -1,
          engine: v.engine,
          version: v.versionName,
          fuel: v.fuel,
        }) === exactKey,
    )

    const sameSliceNoFuel = vvs.find(
      (v) =>
        v.year === row.year &&
        (v.engine ?? '').trim().toLowerCase() === (row.engine ?? '').trim().toLowerCase() &&
        (v.versionName ?? '').trim().toLowerCase() === (row.version ?? '').trim().toLowerCase() &&
        fuelKey(v.fuel) !== fuelKey(row.fuel) &&
        Boolean(row.fuel),
    )

    const lifeStart = model.productionYearStart
    const lifeEnd = model.productionYearEnd
    const expandsLife =
      lifeStart == null ||
      lifeEnd == null ||
      yearStart < lifeStart ||
      yearEnd > lifeEnd

    const missingEngineOnExisting =
      exact != null && !(exact.engine ?? '').trim() && Boolean(row.engine)
    const missingFuelOnExisting =
      exact != null && !fuelKey(exact.fuel) && Boolean(row.fuel)
    const thinShell = model.activeVersionCount === 0

    let status: MasterDiffStatus
    let note: string
    let versionId: string | null = exact?.id ?? null

    if (exact) {
      if (missingEngineOnExisting || missingFuelOnExisting || expandsLife) {
        status = 'enriquece'
        const bits: string[] = []
        if (missingEngineOnExisting) bits.push('preenche motor')
        if (missingFuelOnExisting) bits.push('preenche combustível')
        if (expandsLife) bits.push('alarga vida de linha')
        note = bits.join(' · ') || 'Enriquece cadastro existente'
      } else {
        status = 'ja_cadastrado'
        note = 'Mesma configuração já ativa no mestre'
      }
    } else if (sameSliceNoFuel) {
      status = 'conflito'
      note = `Combustível diverge (mestre: ${sameSliceNoFuel.fuel || 'vazio'} → fonte: ${row.fuel})`
      versionId = sameSliceNoFuel.id
    } else if (thinShell || expandsLife) {
      status = 'enriquece'
      note = thinShell
        ? 'Modelo casca (0 VV) — cria configuração'
        : 'Nova configuração / alarga vida de linha'
    } else {
      status = 'novo'
      note = 'Nova configuração para modelo existente'
    }

    out.push({
      id: `c-${seq++}`,
      selected: defaultSelected(status),
      status,
      note,
      maker: row.maker,
      model: row.model,
      version: row.version ?? '',
      engine: row.engine ?? '',
      fuel: row.fuel ?? '',
      yearStart,
      yearEnd,
      modelId: model.id,
      versionId,
    })
  }

  // Vários anos da mesma config (ex.: Comfortline 2018+2019) → 1 candidato com vida unificada.
  return mergeDiffCandidatesByIdentity(out)
}

const STATUS_RANK: Record<MasterDiffStatus, number> = {
  conflito: 4,
  enriquece: 3,
  novo: 2,
  ja_cadastrado: 1,
}

/** Une linhas iguais (maker/modelo/versão/motor/combustível) fundindo anos. */
function mergeDiffCandidatesByIdentity(rows: MasterDiffCandidate[]): MasterDiffCandidate[] {
  const map = new Map<string, MasterDiffCandidate>()
  const errors: MasterDiffCandidate[] = []
  for (const r of rows) {
    if (r.id.startsWith('err-')) {
      errors.push(r)
      continue
    }
    const key = [nk(r.maker), nk(r.model), nk(r.version), nk(r.engine), fuelKey(r.fuel)].join('|')
    const prev = map.get(key)
    if (!prev) {
      map.set(key, { ...r })
      continue
    }
    prev.yearStart = Math.min(prev.yearStart, r.yearStart)
    prev.yearEnd = Math.max(prev.yearEnd, r.yearEnd)
    prev.selected = prev.selected || r.selected
    if (STATUS_RANK[r.status] > STATUS_RANK[prev.status]) {
      prev.status = r.status
      prev.note = r.note
      prev.versionId = r.versionId ?? prev.versionId
      prev.modelId = r.modelId ?? prev.modelId
    }
  }
  return [...errors, ...map.values()]
}

/** Filtra só linhas marcadas para apply. */
export function selectedMasterDiffCandidates(
  rows: MasterDiffCandidate[],
): MasterDiffCandidate[] {
  return rows.filter((r) => r.selected)
}
