import {
  mergeModelProductionYears,
  setModelQualityStatus,
} from '@/services/admin/adminVehicleService'
import { yearsInInclusiveRange } from '@/lib/vehicles/expandVersionYearRange'
import { normalizeVehicleFuel } from '@/lib/vehicles/normalizeVehicleFuel'
import { decodeImportCsvText } from '@/services/import/decodeImportCsvText'
import { detectCsvDelimiter } from '@/services/import/delimiter'
import { splitCsvLine, splitCsvRecords } from '@/services/import/csvSplit'
import { normalizeHeader } from '@/services/import/headers'
import { STAFF_QUALITY_EVIDENCE_KIND } from '@/services/vehicles/vehicleMasterProvider'
import { vehicleCanonicalUpsert } from '@/services/vehicles/vehicleCanonicalUpsert'

export type VehicleMasterQuality = 'verified' | 'quarantined'

export type VehicleMasterRow = {
  lineNumber: number
  montadora: string
  modelo: string
  /** Legado / display: ano único ou "início–fim". */
  ano: string
  anoInicio: string
  anoFim: string
  motor: string
  versao: string
  /** Combustível canônico; null = não informado. */
  combustivel: string | null
  /** Qualidade do modelo; null = não altera (fica review do RPC). */
  qualityStatus: VehicleMasterQuality | null
  action: 'create' | 'reuse' | 'skip' | 'error'
  message?: string
}

export type VehicleMasterApplyResult = {
  created: number
  reused: number
  skipped: number
  errors: number
  qualitySet: number
  versionIds: string[]
}

const YEAR_MIN = 1950
const YEAR_MAX = 2100

const FIELD_ALIASES: Record<
  | 'montadora'
  | 'modelo'
  | 'ano'
  | 'anoInicio'
  | 'anoFim'
  | 'motor'
  | 'versao'
  | 'combustivel'
  | 'status',
  string[]
> = {
  montadora: ['montadora', 'maker', 'marca', 'manufacturer', 'fabricante'],
  modelo: ['modelo', 'model'],
  ano: ['ano', 'year', 'ano_modelo', 'anomodel'],
  anoInicio: ['ano_inicio', 'anoinicio', 'year_start', 'inicio', 'ano início', 'ano inicio'],
  anoFim: ['ano_fim', 'anofim', 'year_end', 'fim', 'ano fim'],
  motor: ['motor', 'engine', 'motorizacao', 'motorização'],
  versao: ['versao', 'versão', 'version', 'version_name'],
  combustivel: ['combustivel', 'combustível', 'fuel', 'fuel_type', 'tipo_combustivel'],
  status: ['status', 'qualidade', 'quality', 'quality_status'],
}

export const VEHICLE_MASTER_CSV_TEMPLATE =
  'Montadora;Modelo;Versão;Motor;Combustível;Ano início;Ano fim;Status\n' +
  'Volkswagen;Gol;1.0;1.0 MPI;Flex;2010;2015;Verificado\n' +
  'Ford;Ka;SE;1.0;Gasolina;2015;2015;Quarentena\n'

function mapHeaders(headers: string[]): Partial<Record<string, number>> {
  const map: Partial<Record<string, number>> = {}
  headers.forEach((h, idx) => {
    const n = normalizeHeader(h)
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (aliases.some((a) => normalizeHeader(a) === n)) {
        map[field] = idx
      }
    }
  })
  return map
}

function parseYearToken(raw: string): number | null {
  const t = raw.trim()
  if (!t) return null
  const n = Number.parseInt(t, 10)
  if (!Number.isFinite(n) || n < YEAR_MIN || n > YEAR_MAX) return null
  return n
}

export function parseVehicleMasterQuality(raw: string): VehicleMasterQuality | null | 'invalid' {
  const t = raw.trim().toLowerCase()
  if (!t) return null
  if (['verificado', 'verified', 'confirmado', 'confirmada'].includes(t)) return 'verified'
  if (['quarentena', 'quarantined', 'quarantine'].includes(t)) return 'quarantined'
  return 'invalid'
}

function qualityLabel(q: VehicleMasterQuality | null): string {
  if (q === 'verified') return 'Verificado'
  if (q === 'quarantined') return 'Quarentena'
  return '—'
}

function resolveYearBounds(input: {
  ano: string
  anoInicio: string
  anoFim: string
}): { start: number; end: number; openEnded: boolean } | { error: string } {
  const startRaw = parseYearToken(input.anoInicio)
  const endRaw = parseYearToken(input.anoFim)
  const legacy = parseYearToken(input.ano)
  const nowYear = new Date().getFullYear()

  let start = startRaw
  let end = endRaw
  let openEnded = false

  if (start == null && end == null && legacy != null) {
    start = legacy
    end = legacy
  } else if (start != null && end == null) {
    // Ano fim vazio = vigente até o ano corrente (paridade Linha até / config).
    end = Math.max(nowYear, start)
    openEnded = true
  } else if (start == null && end != null) {
    start = end
  }

  if (start == null || end == null) {
    return { error: 'Informe ano (ou Ano início / Ano fim)' }
  }
  if (start > end) {
    return { error: 'Ano início deve ser ≤ Ano fim' }
  }
  try {
    yearsInInclusiveRange(start, end)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Intervalo de anos inválido' }
  }
  return { start, end, openEnded }
}

/** Preview idempotente — não grava; classifica linhas. */
export async function adminPreviewVehicleMasterImport(file: File): Promise<{
  rows: VehicleMasterRow[]
  delimiter: string
  fileErrors: string[]
}> {
  const text = decodeImportCsvText(await file.arrayBuffer())
  const delimiter = detectCsvDelimiter(text)
  const records = splitCsvRecords(text)
  const fileErrors: string[] = []
  if (!records.length) {
    return { rows: [], delimiter, fileErrors: ['Arquivo vazio'] }
  }

  const first = splitCsvLine(records[0]!.text, delimiter)
  const headerMap = mapHeaders(first)
  const hasHeader = headerMap.montadora != null && headerMap.modelo != null
  const start = hasHeader ? 1 : 0
  const col = hasHeader
    ? headerMap
    : { montadora: 0, modelo: 1, ano: 2, motor: 3, versao: 4 }

  if (col.montadora == null || col.modelo == null) {
    fileErrors.push(
      'Cabeçalho obrigatório: montadora, modelo (ano ou ano início/fim, motor, versão, status opcionais)',
    )
    return { rows: [], delimiter, fileErrors }
  }

  const rows: VehicleMasterRow[] = []
  for (let i = start; i < records.length; i++) {
    const rec = records[i]!
    const cells = splitCsvLine(rec.text, delimiter)
    if (cells.every((c) => !c.trim())) continue

    const montadora = (cells[col.montadora!] ?? '').trim()
    const modelo = (cells[col.modelo!] ?? '').trim()
    const ano = (cells[col.ano ?? -1] ?? '').trim()
    const anoInicio = (cells[col.anoInicio ?? -1] ?? '').trim()
    const anoFim = (cells[col.anoFim ?? -1] ?? '').trim()
    const motor = (cells[col.motor ?? -1] ?? '').trim()
    const versao = (cells[col.versao ?? -1] ?? '').trim()
    const combustivelRaw = (cells[col.combustivel ?? -1] ?? '').trim()
    const combustivel = combustivelRaw ? normalizeVehicleFuel(combustivelRaw) : null
    const statusRaw = (cells[col.status ?? -1] ?? '').trim()
    const qualityParsed = parseVehicleMasterQuality(statusRaw)

    const base = {
      lineNumber: rec.lineNumber,
      montadora,
      modelo,
      ano,
      anoInicio,
      anoFim,
      motor,
      versao,
      combustivel,
      qualityStatus: null as VehicleMasterQuality | null,
    }

    if (!montadora || !modelo) {
      rows.push({
        ...base,
        action: 'skip',
        message: 'Montadora e modelo são obrigatórios',
      })
      continue
    }

    if (qualityParsed === 'invalid') {
      rows.push({
        ...base,
        action: 'skip',
        message: 'Status inválido (use Verificado ou Quarentena)',
      })
      continue
    }

    if (combustivelRaw && combustivel == null) {
      rows.push({
        ...base,
        action: 'skip',
        message: 'Combustível inválido (use Flex, Gasolina, Etanol, Diesel, GNV, Elétrico ou Híbrido)',
      })
      continue
    }

    const bounds = resolveYearBounds({ ano, anoInicio, anoFim })
    if ('error' in bounds) {
      rows.push({
        ...base,
        action: 'skip',
        message: bounds.error,
      })
      continue
    }

    const yy = (y: number) => String(((y % 100) + 100) % 100).padStart(2, '0')
    const displayAno = bounds.openEnded
      ? `${yy(bounds.start)}/...`
      : bounds.start === bounds.end
        ? yy(bounds.start)
        : `${yy(bounds.start)}/${yy(bounds.end)}`

    const fuelPart = combustivel ? ` · ${combustivel}` : ''
    rows.push({
      ...base,
      ano: displayAno,
      anoInicio: String(bounds.start),
      anoFim: String(bounds.end),
      qualityStatus: qualityParsed,
      action: 'create',
      message:
        qualityParsed != null
          ? `Upsert ${displayAno}${fuelPart} · qualidade ${qualityLabel(qualityParsed)}`
          : `Upsert ${displayAno}${fuelPart} · qualidade inalterada (review)`,
    })
  }

  return { rows, delimiter, fileErrors }
}

/** Aplica upsert canônico por ano do período — sem PVC. Idempotente. */
export async function adminApplyVehicleMasterImport(
  rows: VehicleMasterRow[],
): Promise<VehicleMasterApplyResult> {
  const result: VehicleMasterApplyResult = {
    created: 0,
    reused: 0,
    skipped: 0,
    errors: 0,
    qualitySet: 0,
    versionIds: [],
  }

  const seen = new Set<string>()
  const qualityByModel = new Map<string, VehicleMasterQuality>()
  const lifeByModel = new Map<string, { start: number; end: number }>()

  for (const row of rows) {
    if (row.action === 'skip' || !row.montadora || !row.modelo) {
      result.skipped += 1
      continue
    }

    const bounds = resolveYearBounds({
      ano: row.ano,
      anoInicio: row.anoInicio,
      anoFim: row.anoFim,
    })
    if ('error' in bounds) {
      result.skipped += 1
      row.action = 'skip'
      row.message = bounds.error
      continue
    }

    const key = [
      row.montadora.toLowerCase(),
      row.modelo.toLowerCase(),
      bounds.start,
      bounds.end,
      row.motor.toLowerCase(),
      row.versao.toLowerCase(),
      (row.combustivel ?? '').toLowerCase(),
      row.qualityStatus ?? '',
    ].join('|')
    if (seen.has(key)) {
      result.reused += 1
      continue
    }
    seen.add(key)

    try {
      const years = yearsInInclusiveRange(bounds.start, bounds.end)
      let modelId: string | null = null
      for (const year of years) {
        const upserted = await vehicleCanonicalUpsert({
          maker: row.montadora,
          model: row.modelo,
          year,
          engine: row.motor || null,
          version: row.versao || null,
          fuel: row.combustivel,
          source: 'import',
        })
        result.versionIds.push(upserted.versionId)
        modelId = upserted.modelId
        result.created += 1
      }

      if (modelId) {
        const prevLife = lifeByModel.get(modelId)
        if (!prevLife) {
          lifeByModel.set(modelId, { start: bounds.start, end: bounds.end })
        } else {
          lifeByModel.set(modelId, {
            start: Math.min(prevLife.start, bounds.start),
            end: Math.max(prevLife.end, bounds.end),
          })
        }

        if (row.qualityStatus) {
          const prevQ = qualityByModel.get(modelId)
          if (prevQ === 'quarantined' || row.qualityStatus === 'quarantined') {
            qualityByModel.set(modelId, 'quarantined')
          } else {
            qualityByModel.set(modelId, 'verified')
          }
        }
      }
    } catch (err) {
      result.errors += 1
      row.action = 'error'
      row.message = err instanceof Error ? err.message : 'Falha no upsert'
    }
  }

  for (const [modelId, life] of lifeByModel) {
    try {
      await mergeModelProductionYears(modelId, life.start, life.end)
    } catch {
      // vida expansiva — falha isolada não invalida VVs já criadas
    }
  }

  for (const [modelId, qualityStatus] of qualityByModel) {
    try {
      await setModelQualityStatus({
        modelId,
        qualityStatus,
        evidenceKind: STAFF_QUALITY_EVIDENCE_KIND,
        reviewNote: 'Import mestre CSV',
      })
      result.qualitySet += 1
    } catch (err) {
      result.errors += 1
      // não reverte VVs; reporta erro de qualidade
      void err
    }
  }

  return result
}
