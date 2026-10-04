import { parseMoneyBr } from '@/lib/money'

export type ParsedPriceRow = {
  line: number
  sku: string
  priceRaw: string
  price: number | null
}

/** Separa SKU e preço preservando vírgulas do valor BR (ex.: 1.234,56). */
function splitSkuPrice(line: string): { sku: string; priceRaw: string } {
  if (line.includes(';')) {
    const idx = line.indexOf(';')
    return { sku: line.slice(0, idx).trim(), priceRaw: line.slice(idx + 1).trim() }
  }
  if (line.includes('\t')) {
    const idx = line.indexOf('\t')
    return { sku: line.slice(0, idx).trim(), priceRaw: line.slice(idx + 1).trim() }
  }
  const idx = line.indexOf(',')
  if (idx === -1) return { sku: line.trim(), priceRaw: '' }
  return { sku: line.slice(0, idx).trim(), priceRaw: line.slice(idx + 1).trim() }
}

function stripQuotes(s: string): string {
  return s.replace(/^["']|["']$/g, '')
}

/** Parse CSV SKU;PRECO (também aceita tab ou vírgula). */
export function parsePriceCsv(text: string): ParsedPriceRow[] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  const rows: ParsedPriceRow[] = []
  let start = 0
  if (lines[0] && /sku/i.test(lines[0]) && /preco|preço|price/i.test(lines[0])) {
    start = 1
  }

  for (let i = start; i < lines.length; i++) {
    const { sku: rawSku, priceRaw: rawPrice } = splitSkuPrice(lines[i]!)
    const sku = stripQuotes(rawSku)
    const priceRaw = stripQuotes(rawPrice)
    const price = parseMoneyBr(priceRaw)
    rows.push({
      line: i + 1,
      sku,
      priceRaw,
      price,
    })
  }
  return rows
}

/** Parse XLSX first sheet via SheetJS (dynamic import). */
export async function parsePriceXlsx(file: ArrayBuffer): Promise<ParsedPriceRow[]> {
  const XLSX = await import('xlsx')
  const wb = XLSX.read(file, { type: 'array' })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) return []
  const sheet = wb.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1, defval: '' })
  const rows: ParsedPriceRow[] = []
  let start = 0
  const first = data[0]
  if (
    first &&
    String(first[0]).toLowerCase().includes('sku') &&
    /preco|preço|price/i.test(String(first[1] ?? ''))
  ) {
    start = 1
  }
  for (let i = start; i < data.length; i++) {
    const row = data[i] ?? []
    const sku = String(row[0] ?? '').trim()
    const cell = row[1]
    const priceRaw = cell === '' || cell == null ? '' : String(cell).trim()
    if (!sku && !priceRaw) continue
    // Célula numérica do Excel já é number
    const price = typeof cell === 'number' ? (Number.isFinite(cell) ? cell : null) : parseMoneyBr(priceRaw)
    rows.push({
      line: i + 1,
      sku,
      priceRaw: priceRaw || (typeof cell === 'number' ? String(cell) : ''),
      price,
    })
  }
  return rows
}
