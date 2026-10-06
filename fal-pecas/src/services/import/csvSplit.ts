import type { CsvDelimiter } from './types'

/** Remove aspas externas e unescapa aspas duplicadas. */
export function stripCellQuotes(raw: string): string {
  const s = raw.trim()
  if (s.length >= 2) {
    const q = s[0]
    if ((q === '"' || q === "'") && s[s.length - 1] === q) {
      const inner = s.slice(1, -1)
      if (q === '"') return inner.replace(/""/g, '"')
      return inner.replace(/''/g, "'")
    }
  }
  return s
}

/**
 * Split de uma linha CSV respeitando aspas.
 * Não usa regex frágil para valores BR com vírgula quando o delimitador é `;`.
 */
export function splitCsvLine(line: string, delimiter: CsvDelimiter): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false
  let quoteChar = ''

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (inQuotes) {
      if (ch === quoteChar) {
        if (line[i + 1] === quoteChar) {
          current += quoteChar
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
      continue
    }
    if (ch === '"' || ch === "'") {
      inQuotes = true
      quoteChar = ch
      continue
    }
    if (ch === delimiter) {
      cells.push(stripCellQuotes(current))
      current = ''
      continue
    }
    current += ch
  }
  cells.push(stripCellQuotes(current))
  return cells
}
