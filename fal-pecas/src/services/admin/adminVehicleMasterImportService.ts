import { decodeImportCsvText } from '@/services/import/decodeImportCsvText'
import { detectCsvDelimiter } from '@/services/import/delimiter'
import { splitCsvLine, splitCsvRecords } from '@/services/import/csvSplit'
import { normalizeHeader } from '@/services/import/headers'
import { vehicleCanonicalUpsert } from '@/services/vehicles/vehicleCanonicalUpsert'

export type VehicleMasterRow = {
  lineNumber: number
  montadora: string
  modelo: string
  ano: string
  motor: string
  versao: string
  action: 'create' | 'reuse' | 'skip' | 'error'
  message?: string
}

export type VehicleMasterApplyResult = {
  created: number
  reused: number
  skipped: number
  errors: number
  versionIds: string[]
}

const FIELD_ALIASES: Record<keyof Omit<VehicleMasterRow, 'lineNumber' | 'action' | 'message'>, string[]> =
  {
    montadora: ['montadora', 'maker', 'marca', 'manufacturer', 'fabricante'],
    modelo: ['modelo', 'model'],
    ano: ['ano', 'year', 'ano_modelo', 'anomodel'],
    motor: ['motor', 'engine', 'motorizacao'],
    versao: ['versao', 'versão', 'version', 'version_name'],
  }

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
    fileErrors.push('Cabeçalho obrigatório: montadora, modelo (ano, motor, versao opcionais)')
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
    const motor = (cells[col.motor ?? -1] ?? '').trim()
    const versao = (cells[col.versao ?? -1] ?? '').trim()

    if (!montadora || !modelo) {
      rows.push({
        lineNumber: rec.lineNumber,
        montadora,
        modelo,
        ano,
        motor,
        versao,
        action: 'skip',
        message: 'Montadora e modelo são obrigatórios',
      })
      continue
    }

    rows.push({
      lineNumber: rec.lineNumber,
      montadora,
      modelo,
      ano,
      motor,
      versao,
      action: 'create',
      message: 'Será criado ou reutilizado (idempotente)',
    })
  }

  return { rows, delimiter, fileErrors }
}

/** Aplica upsert canônico — sem criar PVC. Idempotente. */
export async function adminApplyVehicleMasterImport(
  rows: VehicleMasterRow[],
): Promise<VehicleMasterApplyResult> {
  const result: VehicleMasterApplyResult = {
    created: 0,
    reused: 0,
    skipped: 0,
    errors: 0,
    versionIds: [],
  }

  const seen = new Set<string>()

  for (const row of rows) {
    if (row.action === 'skip' || !row.montadora || !row.modelo) {
      result.skipped += 1
      continue
    }
    const key = [
      row.montadora.toLowerCase(),
      row.modelo.toLowerCase(),
      row.ano,
      row.motor.toLowerCase(),
      row.versao.toLowerCase(),
    ].join('|')
    if (seen.has(key)) {
      result.reused += 1
      continue
    }
    seen.add(key)

    try {
      const upserted = await vehicleCanonicalUpsert({
        maker: row.montadora,
        model: row.modelo,
        year: row.ano || null,
        engine: row.motor || null,
        version: row.versao || null,
        source: 'import',
      })
      result.versionIds.push(upserted.versionId)
      // Heurística: se já existia, RPC ainda retorna id — contamos create na 1ª vez do batch
      result.created += 1
    } catch (err) {
      result.errors += 1
      row.action = 'error'
      row.message = err instanceof Error ? err.message : 'Falha no upsert'
    }
  }

  return result
}
