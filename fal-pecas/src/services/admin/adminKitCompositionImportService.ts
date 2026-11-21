import { getSupabase } from '@/lib/supabase'
import {
  getImportContract,
  parseCsvToGrid,
  parseXlsxToGrid,
  validateImportGrid,
  type ImportGrid,
} from '@/services/import'
import { decodeImportCsvText } from '@/services/import/decodeImportCsvText'
import { adminSyncKitListPrices } from '@/services/admin/adminKitPricingService'

export type KitCompositionPreviewRow = {
  lineNumber: number
  kitSku: string
  componentSku: string
  quantity: number
  kitProductId: string | null
  componentProductId: string | null
  kitName: string | null
  componentName: string | null
  ok: boolean
  errors: string[]
}

export type KitCompositionApplyResult = {
  kitsSynced: number
  linesWritten: number
  errors: Array<{ kitSku: string; componentSku?: string; reason: string }>
}

async function parseFile(file: File): Promise<ImportGrid> {
  const contract = getImportContract('kit_composition')
  const name = file.name.toLowerCase()
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    return parseXlsxToGrid(await file.arrayBuffer(), { contract })
  }
  return parseCsvToGrid(decodeImportCsvText(await file.arrayBuffer()), { contract })
}

async function loadProductsBySkus(skus: string[]): Promise<
  Map<string, { id: string; name: string; productKind: 'item' | 'kit' }>
> {
  const unique = [...new Set(skus.map((s) => s.trim()).filter(Boolean))]
  const map = new Map<string, { id: string; name: string; productKind: 'item' | 'kit' }>()
  if (unique.length === 0) return map

  const chunkSize = 200
  const sb = getSupabase()
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize)
    const { data, error } = await sb
      .from('products')
      .select('id, sku, name, product_kind')
      .in('sku', chunk)
    if (error) throw error
    for (const row of data ?? []) {
      map.set(String(row.sku).toUpperCase(), {
        id: String(row.id),
        name: String(row.name ?? ''),
        productKind: row.product_kind === 'kit' ? 'kit' : 'item',
      })
    }
  }
  return map
}

/** Preview estrutural + resolução de SKUs (não grava). */
export async function adminPreviewKitCompositionImport(file: File): Promise<{
  rows: KitCompositionPreviewRow[]
  delimiter: string | null
  fileErrors: string[]
}> {
  const contract = getImportContract('kit_composition')
  const grid = await parseFile(file)
  const validation = validateImportGrid(grid, contract)

  const fileErrors = validation.errors
    .filter((e) => e.lineNumber === 0)
    .map((e) => e.message)

  if (fileErrors.length > 0) {
    return { rows: [], delimiter: grid.delimiter, fileErrors }
  }

  const errorsByLine = new Map<number, string[]>()
  for (const e of validation.errors) {
    if (e.lineNumber === 0) continue
    const list = errorsByLine.get(e.lineNumber) ?? []
    list.push(e.message)
    errorsByLine.set(e.lineNumber, list)
  }

  const skus: string[] = []
  for (const m of validation.mapped) {
    skus.push(m.values.kit_sku ?? '', m.values.component_sku ?? '')
  }
  const bySku = await loadProductsBySkus(skus)

  const rows: KitCompositionPreviewRow[] = []
  for (const mapped of validation.mapped) {
    const kitSku = (mapped.values.kit_sku ?? '').trim().toUpperCase()
    const componentSku = (mapped.values.component_sku ?? '').trim().toUpperCase()
    const qtyRaw = (mapped.values.quantity ?? '').trim().replace(',', '.')
    const quantity = Number(qtyRaw)
    const lineErrors = [...(errorsByLine.get(mapped.lineNumber) ?? [])]

    const kit = bySku.get(kitSku)
    const comp = bySku.get(componentSku)

    if (!kit) lineErrors.push('Kit não encontrado (SKU)')
    else if (kit.productKind !== 'kit') lineErrors.push('SKU do kit não é product_kind=kit')

    if (!comp) lineErrors.push('Componente não encontrado (SKU)')
    else if (comp.productKind !== 'item') lineErrors.push('Componente deve ser item')

    if (!(quantity > 0) || !Number.isFinite(quantity)) {
      lineErrors.push('Quantidade inválida')
    }

    if (kit && comp && kit.id === comp.id) {
      lineErrors.push('Kit não pode incluir a si mesmo')
    }

    rows.push({
      lineNumber: mapped.lineNumber,
      kitSku,
      componentSku,
      quantity: Number.isFinite(quantity) ? quantity : 0,
      kitProductId: kit?.id ?? null,
      componentProductId: comp?.id ?? null,
      kitName: kit?.name ?? null,
      componentName: comp?.name ?? null,
      ok: lineErrors.length === 0,
      errors: lineErrors,
    })
  }

  return { rows, delimiter: grid.delimiter, fileErrors: [] }
}

/**
 * Aplica sync de BOM nos kits com linhas ok.
 * Depois recalcula preço auto dos kits tocados.
 */
export async function adminApplyKitCompositionImport(input: {
  rows: KitCompositionPreviewRow[]
  note?: string | null
  actorId?: string | null
}): Promise<KitCompositionApplyResult> {
  const okRows = input.rows.filter((r) => r.ok)
  if (okRows.length === 0) throw new Error('Nenhuma linha válida para aplicar')

  const payload = okRows.map((r) => ({
    kit_sku: r.kitSku,
    component_sku: r.componentSku,
    quantity: String(r.quantity),
  }))

  const { data, error } = await getSupabase().rpc('apply_kit_composition_import', {
    p_rows: payload,
    p_note: input.note?.trim() || null,
  })
  if (error) throw error

  const raw = (data ?? {}) as {
    kits_synced?: number
    lines_written?: number
    errors?: Array<{ kit_sku?: string; component_sku?: string; reason?: string }>
  }

  const kitIds = [
    ...new Set(okRows.map((r) => r.kitProductId).filter((id): id is string => Boolean(id))),
  ]
  for (const kitId of kitIds) {
    const { data: prod } = await getSupabase()
      .from('products')
      .select('kit_price_mode')
      .eq('id', kitId)
      .maybeSingle()
    const mode = prod?.kit_price_mode === 'manual' ? 'manual' : 'auto'
    await adminSyncKitListPrices({
      kitProductId: kitId,
      kitPriceMode: mode,
      changedBy: input.actorId,
    })
  }

  return {
    kitsSynced: Number(raw.kits_synced ?? 0),
    linesWritten: Number(raw.lines_written ?? 0),
    errors: (raw.errors ?? []).map((e) => ({
      kitSku: String(e.kit_sku ?? ''),
      componentSku: e.component_sku ? String(e.component_sku) : undefined,
      reason: String(e.reason ?? ''),
    })),
  }
}
