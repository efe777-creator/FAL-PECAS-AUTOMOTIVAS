/**
 * Validação inteligente do mestre (padrão FAL).
 * Normaliza, deduplica, exige ano no sync, prepara merge de vida de linha.
 * Nunca cria PVC. Nunca usa codigo_fipe como predicado.
 */
import {
  formatManufacturerDisplayName,
  formatModelDisplayName,
} from '@/lib/entityNormalize'
import { normalizeVehicleFuel } from '@/lib/vehicles/normalizeVehicleFuel'
import { splitVersionAlternatives } from '@/lib/vehicles/splitVersionAlternatives'
import {
  assertModelClean,
  normalizeVersionLabel,
  sanitizeEngine,
  splitApiModelo,
} from '@/services/plates/splitApiModelo'
import { mergeModelProductionYears } from '@/services/admin/adminVehicleService'
import { vehicleCanonicalUpsert } from '@/services/vehicles/vehicleCanonicalUpsert'

export type MasterIntelligenceRow = {
  montadora: string
  modelo: string
  ano: string
  motor: string
  versao: string
  /** Opcional — sync/import com combustível. */
  combustivel?: string
}

export type MasterIntelligencePrepared = {
  maker: string
  model: string
  year: number
  engine: string | null
  version: string | null
  fuel: string | null
  productionYearStart: number
  productionYearEnd: number
  key: string
  action: 'upsert' | 'skip' | 'error'
  message?: string
}

export type MasterIntelligenceReport = {
  prepared: MasterIntelligencePrepared[]
  skipped: number
  conflicts: string[]
  fileErrors: string[]
}

export type MasterIntelligenceApplyResult = {
  upserted: number
  productionMerged: number
  errors: number
  messages: string[]
}

function parseYear(raw: string): number | null {
  const t = raw.trim()
  if (!t) return null
  const m = t.match(/(19|20)\d{2}/)
  if (m) return Number(m[0])
  const n = Number(t)
  if (Number.isInteger(n) && n >= 1950 && n <= 2100) return n
  return null
}

/**
 * Prepara linhas para apply — exige maker+model+ano (alinha R2 Edge).
 * Agrupa por maker|model para vida de linha min/max.
 */
export function prepareVehicleMasterIntelligence(
  rows: MasterIntelligenceRow[],
): MasterIntelligenceReport {
  const fileErrors: string[] = []
  const conflicts: string[] = []
  const prepared: MasterIntelligencePrepared[] = []
  const seenVv = new Set<string>()
  const rangeByModel = new Map<string, { start: number; end: number }>()
  let skipped = 0

  if (!rows.length) {
    return {
      prepared: [],
      skipped: 0,
      conflicts: [],
      fileErrors: ['Nenhuma linha para processar'],
    }
  }

  for (const raw of rows) {
    const maker = formatManufacturerDisplayName(raw.montadora)
    if (!maker || !raw.modelo?.trim()) {
      skipped += 1
      continue
    }

    const year = parseYear(raw.ano)
    if (year == null) {
      skipped += 1
      continue
    }

    let modelName = raw.modelo.trim()
    let engine = (raw.motor ?? '').trim() || null
    let version = (raw.versao ?? '').trim() || null
    const fuel = normalizeVehicleFuel(raw.combustivel)

    // Se motor/versão vazios, tenta extrair do texto do modelo (sem inventar).
    if (!engine && !version) {
      const split = splitApiModelo(modelName)
      if (split.model) modelName = split.model
      engine = sanitizeEngine(split.engine) ?? null
      // Mantém "Comfortline / Highline" intacto para o fan-out abaixo.
      version = split.version?.trim() || null
    }

    // Fan-out ANTES do sanitize (senão "A / B / C" perde o A = câmbio).
    const versionAlts = splitVersionAlternatives(version)
    let anyAlt = false

    for (const verRaw of versionAlts) {
      let cleaned
      try {
        cleaned = assertModelClean(modelName, {
          engine,
          version: verRaw.trim() ? verRaw : null,
        })
      } catch (err) {
        prepared.push({
          maker,
          model: modelName,
          year,
          engine,
          version: verRaw || null,
          fuel,
          productionYearStart: year,
          productionYearEnd: year,
          key: '',
          action: 'error',
          message: err instanceof Error ? err.message : 'Modelo inválido',
        })
        continue
      }

      const model = formatModelDisplayName(cleaned.model)
      const eng = blank(sanitizeEngine(cleaned.engine))
      // Alternativa curta (A/B/C): sanitizeVersionLabel pode zerar "A"; preserva o token do fan-out.
      let ver = blank(normalizeVersionLabel(cleaned.version))
      if (!ver && verRaw.trim()) {
        ver = blank(normalizeVersionLabel(verRaw.trim()))
      }

      const modelKey = `${maker.toLowerCase()}|${model.toLowerCase()}`
      const prev = rangeByModel.get(modelKey)
      if (prev) {
        rangeByModel.set(modelKey, {
          start: Math.min(prev.start, year),
          end: Math.max(prev.end, year),
        })
      } else {
        rangeByModel.set(modelKey, { start: year, end: year })
      }

      const vvKey = [maker, model, year, eng ?? '', ver ?? '', fuel ?? '']
        .map((x) => String(x).toLowerCase())
        .join('|')
      if (seenVv.has(vvKey)) {
        skipped += 1
        continue
      }
      seenVv.add(vvKey)
      anyAlt = true
      const range = rangeByModel.get(modelKey)!
      prepared.push({
        maker,
        model,
        year,
        engine: eng,
        version: ver,
        fuel,
        productionYearStart: range.start,
        productionYearEnd: range.end,
        key: vvKey,
        action: 'upsert',
      })
    }
    if (!anyAlt) {
      skipped += 1
    }
  }

  // Reaplica ranges finais (após ver todos os anos do modelo).
  for (const row of prepared) {
    if (row.action !== 'upsert') continue
    const mk = `${row.maker.toLowerCase()}|${row.model.toLowerCase()}`
    const range = rangeByModel.get(mk)
    if (range) {
      row.productionYearStart = range.start
      row.productionYearEnd = range.end
    }
  }

  if (!prepared.some((p) => p.action === 'upsert')) {
    fileErrors.push('Nenhuma linha válida com montadora, modelo e ano.')
  }

  return { prepared, skipped, conflicts, fileErrors }
}

function blank(v: string | null | undefined): string | null {
  const t = (v ?? '').trim()
  return t ? t : null
}

/** Apply canônico + merge vida de linha. Zero PVC. */
export async function applyVehicleMasterIntelligence(
  prepared: MasterIntelligencePrepared[],
): Promise<MasterIntelligenceApplyResult> {
  const result: MasterIntelligenceApplyResult = {
    upserted: 0,
    productionMerged: 0,
    errors: 0,
    messages: [],
  }
  const mergedModels = new Set<string>()

  for (const row of prepared) {
    if (row.action !== 'upsert') {
      if (row.action === 'error') {
        result.errors += 1
        if (row.message) result.messages.push(row.message)
      }
      continue
    }
    try {
      const up = await vehicleCanonicalUpsert({
        maker: row.maker,
        model: row.model,
        year: row.year,
        engine: row.engine,
        version: row.version,
        fuel: row.fuel,
        source: 'import',
      })
      result.upserted += 1

      const mk = up.modelId
      if (!mergedModels.has(mk)) {
        await mergeModelProductionYears(
          up.modelId,
          row.productionYearStart,
          row.productionYearEnd,
        )
        mergedModels.add(mk)
        result.productionMerged += 1
      }
    } catch (err) {
      result.errors += 1
      result.messages.push(err instanceof Error ? err.message : 'Falha no upsert')
    }
  }

  return result
}
