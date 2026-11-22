/**
 * Normaliza dump/CSV fipeX (ou similar) → CSV FAL do import mestre.
 * Não grava banco. Não cria PVC. Não usa codigo_fipe como predicado.
 */
import { detectCsvDelimiter } from '@/services/import/delimiter'
import { splitCsvLine, splitCsvRecords } from '@/services/import/csvSplit'
import { normalizeHeader } from '@/services/import/headers'
import { splitApiModelo } from '@/services/plates/splitApiModelo'

export type FalVehicleMasterCsvRow = {
  montadora: string
  modelo: string
  ano: string
  motor: string
  versao: string
}

export type FipeXNormalizeOptions = {
  /** Marcas priorizadas (match case-insensitive / aliases). Default: top BR. */
  priorityBrands?: string[]
  yearMin?: number
  yearMax?: number
  /** Se true, só emite marcas prioritárias. Default true. */
  priorityOnly?: boolean
}

export type FipeXNormalizeResult = {
  csv: string
  rows: FalVehicleMasterCsvRow[]
  skipped: number
  fileErrors: string[]
}

export const FIPEX_PRIORITY_BRANDS = [
  'Fiat',
  'Volkswagen',
  'VW',
  'Chevrolet',
  'Ford',
  'Renault',
  'Toyota',
  'Hyundai',
] as const

const BRAND_ALIASES: Record<string, string> = {
  vw: 'Volkswagen',
  volkswagen: 'Volkswagen',
  fiat: 'Fiat',
  chevrolet: 'Chevrolet',
  gm: 'Chevrolet',
  ford: 'Ford',
  renault: 'Renault',
  toyota: 'Toyota',
  hyundai: 'Hyundai',
}

const FIELD_ALIASES: Record<'montadora' | 'modelo' | 'ano', string[]> = {
  montadora: ['montadora', 'marca', 'maker', 'brand', 'manufacturer', 'fabricante'],
  modelo: ['modelo', 'model', 'name', 'nome'],
  ano: ['ano', 'year', 'ano_modelo', 'anomodel', 'anoModelo', 'year_model'],
}

function mapHeaders(headers: string[]): Partial<Record<'montadora' | 'modelo' | 'ano', number>> {
  const map: Partial<Record<'montadora' | 'modelo' | 'ano', number>> = {}
  headers.forEach((h, idx) => {
    const n = normalizeHeader(h)
    for (const [field, aliases] of Object.entries(FIELD_ALIASES) as Array<
      [keyof typeof FIELD_ALIASES, string[]]
    >) {
      if (aliases.some((a) => normalizeHeader(a) === n)) {
        map[field] = idx
      }
    }
  })
  return map
}

function normalizeBrandName(raw: string): string {
  const key = raw.trim().toLowerCase()
  return BRAND_ALIASES[key] ?? raw.trim()
}

function brandAllowed(brand: string, priority: string[]): boolean {
  const n = normalizeBrandName(brand).toLowerCase()
  return priority.some((p) => {
    const pn = p.toLowerCase()
    return n === pn || n === (BRAND_ALIASES[pn] ?? pn).toLowerCase()
  })
}

function parseYear(raw: string): number | null {
  const t = raw.trim()
  if (!t) return null
  // fipeX às vezes "2020 Gasolina" / "32000" (código ano+comb)
  const m = t.match(/(19|20)\d{2}/)
  if (m) return Number(m[0])
  const n = Number(t)
  if (Number.isInteger(n) && n >= 1900 && n <= 2100) return n
  return null
}

export function buildFalVehicleMasterCsv(rows: FalVehicleMasterCsvRow[]): string {
  const header = 'montadora,modelo,ano,motor,versao'
  const lines = rows.map((r) =>
    [r.montadora, r.modelo, r.ano, r.motor, r.versao]
      .map((c) => {
        const s = String(c ?? '')
        return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
      })
      .join(','),
  )
  return [header, ...lines].join('\n') + (lines.length ? '\n' : '')
}

/** Converte texto CSV fipeX → CSV FAL (contrato do import mestre). */
export function normalizeFipeXToFalCsv(
  text: string,
  opts: FipeXNormalizeOptions = {},
): FipeXNormalizeResult {
  const yearMin = opts.yearMin ?? 2000
  const yearMax = opts.yearMax ?? new Date().getFullYear() + 1
  const priority = (opts.priorityBrands ?? [...FIPEX_PRIORITY_BRANDS]).map((b) =>
    normalizeBrandName(b),
  )
  const priorityOnly = opts.priorityOnly !== false
  const fileErrors: string[] = []

  const delimiter = detectCsvDelimiter(text)
  const records = splitCsvRecords(text)
  if (!records.length) {
    return { csv: buildFalVehicleMasterCsv([]), rows: [], skipped: 0, fileErrors: ['Arquivo vazio'] }
  }

  const first = splitCsvLine(records[0]!.text, delimiter)
  const headerMap = mapHeaders(first)
  const hasHeader = headerMap.montadora != null && headerMap.modelo != null
  if (!hasHeader) {
    fileErrors.push(
      'Cabeçalho obrigatório no dump: marca/montadora e modelo (ano opcional). Colunas FAL: montadora,modelo,ano,motor,versao',
    )
    return { csv: buildFalVehicleMasterCsv([]), rows: [], skipped: 0, fileErrors }
  }

  const col = headerMap
  const rows: FalVehicleMasterCsvRow[] = []
  const seen = new Set<string>()
  let skipped = 0

  for (let i = 1; i < records.length; i++) {
    const rec = records[i]!
    const cells = splitCsvLine(rec.text, delimiter)
    if (cells.every((c) => !c.trim())) continue

    const marcaRaw = (cells[col.montadora!] ?? '').trim()
    const modeloRaw = (cells[col.modelo!] ?? '').trim()
    const anoRaw = col.ano != null ? (cells[col.ano] ?? '').trim() : ''

    if (!marcaRaw || !modeloRaw) {
      skipped += 1
      continue
    }

    const montadora = normalizeBrandName(marcaRaw)
    if (priorityOnly && !brandAllowed(montadora, priority)) {
      skipped += 1
      continue
    }

    const year = parseYear(anoRaw)
    if (anoRaw && year == null) {
      skipped += 1
      continue
    }
    if (year != null && (year < yearMin || year > yearMax)) {
      skipped += 1
      continue
    }

    const split = splitApiModelo(modeloRaw)
    const modelo = (split.model || modeloRaw).trim()
    // Só preenche motor/versão se o split extraiu de fato — não inventa.
    const motor = (split.engine ?? '').trim()
    const versao = (split.version ?? '').trim()
    const ano = year != null ? String(year) : ''

    if (!modelo) {
      skipped += 1
      continue
    }

    const key = [montadora, modelo, ano, motor, versao].map((x) => x.toLowerCase()).join('|')
    if (seen.has(key)) {
      skipped += 1
      continue
    }
    seen.add(key)

    rows.push({ montadora, modelo, ano, motor, versao })
  }

  return {
    csv: buildFalVehicleMasterCsv(rows),
    rows,
    skipped,
    fileErrors,
  }
}
