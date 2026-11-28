/**
 * Consulta → diff → apply seletivo do mestre (admin).
 * Zero PVC. Não usa codigo_fipe como predicado.
 */
import { normalizeVehicleFuel } from '@/lib/vehicles/normalizeVehicleFuel'
import { yearsInInclusiveRange } from '@/lib/vehicles/expandVersionYearRange'
import { splitVersionAlternatives } from '@/lib/vehicles/splitVersionAlternatives'
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
import {
  fipeListBrands,
  fipeListModels,
  fipeSelectionToIntelligenceRows,
} from '@/services/admin/fipeCatalogClient'
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
  const out: MasterIntelligenceRow[] = []
  for (const r of rows) {
    if (r.action !== 'create') continue
    const start = Number(r.anoInicio || r.ano)
    const end = Number(r.anoFim || r.anoInicio || r.ano)
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) continue
    for (const year of yearsInInclusiveRange(start, end)) {
      out.push({
        montadora: r.montadora,
        modelo: r.modelo,
        ano: String(year),
        motor: r.motor,
        versao: r.versao,
        combustivel: r.combustivel ?? '',
      })
    }
  }
  return out
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

export function foldDemanda(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
}

/** Match contains: frase inteira OU todos os tokens (qualquer ordem). */
export function demandaTokensMatch(hayFolded: string, needleFolded: string): boolean {
  if (!needleFolded) return true
  if (hayFolded.includes(needleFolded)) return true
  const toks = needleFolded.split(/\s+/).filter(Boolean)
  if (!toks.length) return true
  return toks.every((t) => hayFolded.includes(t))
}

function pushDemandaRow(
  rows: MasterIntelligenceRow[],
  seen: Set<string>,
  row: MasterIntelligenceRow,
  limit: number,
): boolean {
  if (rows.length >= limit) return false
  const key =
    `${row.montadora}|${row.modelo}|${row.ano}|${row.motor}|${row.versao}|${row.combustivel}`.toLowerCase()
  if (seen.has(key)) return true
  seen.add(key)
  rows.push(row)
  return rows.length < limit
}

/**
 * Busca pura no snapshot do mestre — qualquer termo (montadora, modelo, motor, versão, combustível).
 * Ano no texto é opcional. 1 token ("Gol", "HB20") é válido.
 */
export function collectDemandaIntelligenceFromCatalog(
  catalog: MasterCatalogSnapshot,
  query: string,
  limit = 80,
): MasterIntelligenceRow[] {
  const q = query.trim()
  if (!q) return []
  const yearMatch = q.match(/(19|20)\d{2}/)
  const yearHint = yearMatch?.[0] ?? ''
  const needle = foldDemanda(q.replace(/(19|20)\d{2}/g, ' ').replace(/\s+/g, ' ').trim())
  const rows: MasterIntelligenceRow[] = []
  const seen = new Set<string>()
  const makerByModel = new Map(catalog.models.map((m) => [m.id, m]))
  const matchedModelIds = new Set<string>()

  for (const v of catalog.versions) {
    if (v.status !== 'active') continue
    const mod = makerByModel.get(v.modelId)
    if (!mod) continue
    const hay = foldDemanda(
      [mod.makerName, mod.name, v.engine ?? '', v.versionName ?? '', v.fuel ?? '', String(v.year ?? '')].join(
        ' ',
      ),
    )
    if (!demandaTokensMatch(hay, needle)) continue
    if (yearHint && v.year != null && String(v.year) !== yearHint) continue

    let ano = ''
    if (v.year != null) ano = String(v.year)
    else if (yearHint) ano = yearHint
    else if (mod.productionYearStart != null) ano = String(mod.productionYearStart)
    else if (mod.productionYearEnd != null) ano = String(mod.productionYearEnd)
    if (!ano) continue

    matchedModelIds.add(mod.id)
    if (
      !pushDemandaRow(
        rows,
        seen,
        {
          montadora: mod.makerName,
          modelo: mod.name,
          ano,
          motor: v.engine ?? '',
          versao: v.versionName ?? '',
          combustivel: v.fuel ?? '',
        },
        limit,
      )
    ) {
      return rows
    }
  }

  // Modelos casca / só nome (ex.: "Gol", "Volkswagen") sem VV tipada no match acima.
  for (const mod of catalog.models) {
    if (rows.length >= limit) break
    if (matchedModelIds.has(mod.id)) continue
    const hay = foldDemanda(`${mod.makerName} ${mod.name}`)
    if (!demandaTokensMatch(hay, needle)) continue

    const start = mod.productionYearStart
    const end = mod.productionYearEnd
    let years: number[] = []
    if (yearHint) {
      const y = Number(yearHint)
      if (Number.isFinite(y)) years = [y]
    } else if (start != null && end != null && start <= end) {
      years = yearsInInclusiveRange(start, Math.min(end, start + 4)).slice(0, 5)
    } else if (start != null) {
      years = [start]
    } else if (end != null) {
      years = [end]
    } else {
      years = [new Date().getFullYear()]
    }

    for (const year of years) {
      if (
        !pushDemandaRow(
          rows,
          seen,
          {
            montadora: mod.makerName,
            modelo: mod.name,
            ano: String(year),
            motor: '',
            versao: '',
            combustivel: '',
          },
          limit,
        )
      ) {
        return rows
      }
    }
    matchedModelIds.add(mod.id)
  }

  return rows
}

/**
 * Demanda free-text: qualquer termo no mestre (+ complemento FIPE).
 * 1 token ("Gol", "HB20", "1.0") é válido — não exige montadora+modelo.
 */
export async function buildCandidatesFromDemandaQuery(
  query: string,
): Promise<{ candidates: MasterDiffCandidate[]; fileErrors: string[]; skipped: number }> {
  const q = query.trim()
  if (!q) {
    return { candidates: [], fileErrors: ['Informe um termo para buscar.'], skipped: 0 }
  }
  const yearMatch = q.match(/(19|20)\d{2}/)
  const yearHint = yearMatch?.[0] ?? ''
  const needle = foldDemanda(q.replace(/(19|20)\d{2}/g, ' ').replace(/\s+/g, ' ').trim())
  const catalog = await loadMasterCatalogSnapshot()
  const rows = collectDemandaIntelligenceFromCatalog(catalog, q, 80)
  const seen = new Set(
    rows.map(
      (r) =>
        `${r.montadora}|${r.modelo}|${r.ano}|${r.motor}|${r.versao}|${r.combustivel}`.toLowerCase(),
    ),
  )

  // Complemento FIPE só se o mestre trouxe pouco — e só marcas relevantes ao termo
  // (antes: até 14 marcas aleatórias em série → a busca “não ia”).
  if (rows.length < 12 && needle) {
    try {
      const brands = await fipeListBrands()
      const byFold = new Map(brands.map((b) => [foldDemanda(b.name), b] as const))
      const toScan: typeof brands = []
      const addBrand = (b: (typeof brands)[number] | undefined) => {
        if (!b) return
        if (toScan.some((x) => x.code === b.code)) return
        toScan.push(b)
      }

      const toks = needle.split(/\s+/).filter((t) => t.length >= 2)
      for (const b of brands) {
        const bn = foldDemanda(b.name)
        if (demandaTokensMatch(bn, needle) || toks.some((t) => bn.includes(t) || t.includes(bn))) {
          addBrand(b)
        }
      }
      // Marcas já acertadas no mestre (ex.: Gol → Volkswagen).
      for (const r of rows) {
        addBrand(byFold.get(foldDemanda(r.montadora)))
      }

      const absorbModels = (
        brand: (typeof brands)[number],
        models: Awaited<ReturnType<typeof fipeListModels>>,
      ) => {
        const modelHits = models.filter((m) => {
          const hay = foldDemanda(`${brand.name} ${m.name}`)
          return demandaTokensMatch(hay, needle)
        })
        for (const m of modelHits.slice(0, 12)) {
          if (rows.length >= 40) return
          const dedupe = `${brand.name}|${m.name}|fipe`.toLowerCase()
          if (seen.has(dedupe)) continue
          seen.add(dedupe)
          const ano = yearHint || String(new Date().getFullYear())
          for (const r of fipeSelectionToIntelligenceRows({
            brandName: brand.name,
            modelName: m.name,
            years: [{ code: `${ano}-0`, name: String(ano), year: Number(ano), fuel: null }],
          })) {
            if (!pushDemandaRow(rows, seen, r, 40)) return
          }
        }
      }

      const fetchModels = async (brand: (typeof brands)[number]) => {
        try {
          return await fipeListModels(brand.code)
        } catch {
          return [] as Awaited<ReturnType<typeof fipeListModels>>
        }
      }

      if (toScan.length) {
        const lists = await Promise.all(
          toScan.slice(0, 6).map(async (brand) => ({ brand, models: await fetchModels(brand) })),
        )
        for (const { brand, models } of lists) absorbModels(brand, models)
      } else if (!rows.length) {
        // Sem montadora no termo: lotes paralelos até achar modelo (ex.: "Gol") — máx. 40 marcas.
        const BATCH = 8
        const MAX = 40
        for (let i = 0; i < brands.length && i < MAX && rows.length < 12; i += BATCH) {
          const batch = brands.slice(i, i + BATCH)
          const lists = await Promise.all(
            batch.map(async (brand) => ({ brand, models: await fetchModels(brand) })),
          )
          for (const { brand, models } of lists) absorbModels(brand, models)
          if (rows.length) break
        }
      }
    } catch {
      // FIPE opcional — mestre local já cobre o caso principal.
    }
  }

  if (!rows.length) {
    return {
      candidates: [],
      fileErrors: [
        `Nenhum veículo para “${q}”. Tente outro termo (ex.: Gol, HB20, Volkswagen, Comfortline).`,
      ],
      skipped: 0,
    }
  }

  return buildCandidatesFromIntelligenceRows(rows)
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
    // Segurança: se a prévia ainda trouxe "A / B", grava uma VV por alternativa.
    const versionAlts = splitVersionAlternatives(c.version.trim() || '')
    try {
      const years = yearsInInclusiveRange(start, end)
      let modelId: string | null = null
      for (const verAlt of versionAlts) {
        for (const year of years) {
          const up = await vehicleCanonicalUpsert({
            maker: c.maker.trim(),
            model: c.model.trim(),
            year,
            engine: c.engine.trim() || null,
            version: verAlt.trim() || null,
            fuel,
            source: 'import',
          })
          modelId = up.modelId
          result.upserted += 1
        }
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
