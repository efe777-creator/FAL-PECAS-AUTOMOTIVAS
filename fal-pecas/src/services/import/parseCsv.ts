import { detectCsvDelimiter } from './delimiter'
import { splitCsvLine } from './csvSplit'
import type { CsvDelimiter, ImportContract, ImportGrid, ImportGridRow } from './types'
import { normalizeHeader } from './headers'

function looksLikeHeader(cells: string[], contract: ImportContract): boolean {
  const normalized = cells.map(normalizeHeader).filter(Boolean)
  if (normalized.length === 0) return false
  const aliasSet = new Set(
    contract.fields.flatMap((f) => f.aliases.map(normalizeHeader)),
  )
  let hits = 0
  for (const h of normalized) {
    if (aliasSet.has(h)) hits++
  }
  return hits >= 1
}

/**
 * Parse CSV → grade. Delimitador opcional; se omitido, detecta (preferência `;`).
 */
export function parseCsvToGrid(
  text: string,
  options: {
    contract: ImportContract
    delimiter?: CsvDelimiter
  },
): ImportGrid {
  const delimiter = options.delimiter ?? detectCsvDelimiter(text)
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0)

  if (lines.length === 0) {
    return {
      source: 'csv',
      delimiter,
      hasHeader: false,
      headers: [],
      rows: [],
    }
  }

  const firstCells = splitCsvLine(lines[0]!, delimiter)
  const hasHeader = looksLikeHeader(firstCells, options.contract)
  const headers = hasHeader ? firstCells.map(normalizeHeader) : []
  const dataStart = hasHeader ? 1 : 0

  const rows: ImportGridRow[] = []
  for (let i = dataStart; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]!, delimiter)
    if (cells.every((c) => !c.trim())) continue
    rows.push({
      lineNumber: i + 1,
      cells,
    })
  }

  return {
    source: 'csv',
    delimiter,
    hasHeader,
    headers,
    rows,
  }
}
