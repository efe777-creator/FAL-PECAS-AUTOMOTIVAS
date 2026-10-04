export type ParsedPriceRow = {
  line: number
  sku: string
  priceRaw: string
  price: number | null
}

/** Parse CSV SKU;PRECO (também aceita vírgula ou tab). */
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
    const parts = lines[i]!.split(/[;\t,]/).map((p) => p.trim().replace(/^["']|["']$/g, ''))
    const sku = parts[0] ?? ''
    const priceRaw = parts[1] ?? ''
    const normalized = priceRaw.replace(/\s/g, '').replace(',', '.')
    const price = normalized === '' ? null : Number(normalized)
    rows.push({
      line: i + 1,
      sku,
      priceRaw,
      price: price != null && !Number.isNaN(price) ? price : null,
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
    const priceRaw = String(row[1] ?? '').trim()
    if (!sku && !priceRaw) continue
    const normalized = priceRaw.replace(/\s/g, '').replace(',', '.')
    const price = normalized === '' ? null : Number(normalized)
    rows.push({
      line: i + 1,
      sku,
      priceRaw,
      price: price != null && !Number.isNaN(price) ? price : null,
    })
  }
  return rows
}
