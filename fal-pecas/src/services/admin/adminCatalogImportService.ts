import { getSupabase } from '@/lib/supabase'
import { getImportContract } from '@/services/import/contracts'
import { normalizeImportText } from '@/services/import/normalizeText'
import { parseCsvToGrid } from '@/services/import/parseCsv'
import { parseXlsxToGrid } from '@/services/import/parseXlsx'
import { validateImportGrid } from '@/services/import/validate'
import type { ImportGrid } from '@/services/import/types'
import { adminFindProductIdBySku } from '@/services/admin/adminPriceListService'

export type CatalogImportPreviewRow = {
  line: number
  sku: string
  name: string
  grupo: string
  montadora: string
  /** create | update | null se inválido */
  action: 'create' | 'update' | null
  productId: string | null
  errors: string[]
  warnings: string[]
  ok: boolean
}

export type CatalogImportApplyResult = {
  created: number
  updated: number
  failed: number
  skipped: number
  enriched: number
}

async function parseCatalogFile(file: File): Promise<ImportGrid> {
  const contract = getImportContract('catalog')
  const lower = file.name.toLowerCase()
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    return parseXlsxToGrid(await file.arrayBuffer(), { contract })
  }
  return parseCsvToGrid(await file.text(), { contract })
}

/**
 * Preview estrutural + lookup SKU existente (create vs update).
 * Não grava produtos. Layout canônico: CODIGO|GRUPO|MONTADORA|DESCRICAO.
 */
export async function adminPreviewCatalogImport(file: File): Promise<{
  rows: CatalogImportPreviewRow[]
  delimiter: string | null
  fileErrors: string[]
}> {
  const contract = getImportContract('catalog')
  const grid = await parseCatalogFile(file)
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

  const rows: CatalogImportPreviewRow[] = []
  for (const mapped of validation.mapped) {
    const sku = normalizeImportText(mapped.values.sku)
    const name = normalizeImportText(mapped.values.name)
    const grupo = normalizeImportText(mapped.values.grupo)
    const montadora = normalizeImportText(mapped.values.montadora)
    const lineErrors = [...(errorsByLine.get(mapped.lineNumber) ?? [])]
    let productId: string | null = null
    let action: 'create' | 'update' | null = null
    const warnings: string[] = []

    if (montadora) {
      warnings.push('Montadora será gravada como sugestão (attrs) — sem compatibilidade veicular')
    }
    if (grupo) {
      warnings.push('Grupo será associado à categoria se o nome existir')
    }

    if (lineErrors.length === 0 && sku) {
      productId = await adminFindProductIdBySku(sku)
      action = productId ? 'update' : 'create'
    }

    rows.push({
      line: mapped.lineNumber,
      sku,
      name,
      grupo,
      montadora,
      action,
      productId,
      errors: lineErrors,
      warnings,
      ok: lineErrors.length === 0,
    })
  }

  return { rows, delimiter: grid.delimiter, fileErrors: [] }
}

export async function adminCreateCatalogImport(input: {
  filename: string
  createdBy?: string | null
  rows: CatalogImportPreviewRow[]
}): Promise<string> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('imports')
    .insert({
      filename: input.filename,
      status: 'preview',
      kind: 'catalog',
      created_by: input.createdBy ?? null,
      report: {
        total: input.rows.length,
        valid: input.rows.filter((r) => r.ok).length,
        invalid: input.rows.filter((r) => !r.ok).length,
      },
    })
    .select('id')
    .single()
  if (error) throw error
  const importId = String(data.id)

  const items = input.rows.map((r) => ({
    import_id: importId,
    line_number: r.line,
    errors: r.errors,
    warnings: r.warnings,
    payload: {
      sku: r.sku,
      name: r.name,
      grupo: r.grupo || null,
      montadora: r.montadora || null,
      product_id: r.productId,
      action: r.action,
    },
    result: r.ok ? 'ok' : 'error',
  }))
  if (items.length) {
    const { error: itemsErr } = await sb.from('import_items').insert(items)
    if (itemsErr) throw itemsErr
  }
  return importId
}

/**
 * Apply RPC (sku+name only) + enrichment client de grupo/montadora.
 * Não publica, não seta is_available, não cria compatibilidade.
 */
export async function adminApplyCatalogImport(
  importId: string,
): Promise<CatalogImportApplyResult> {
  const sb = getSupabase()
  const { data, error } = await sb.rpc('apply_catalog_import', {
    p_import_id: importId,
  })
  if (error) throw error
  const report = (data ?? {}) as Record<string, unknown>

  const enriched = await enrichCatalogImportExtras(importId)

  return {
    created: Number(report.created ?? 0),
    updated: Number(report.updated ?? 0),
    failed: Number(report.failed ?? 0),
    skipped: Number(report.skipped ?? 0),
    enriched,
  }
}

/** Pós-apply: category_id por nome de grupo + attrs.montadora_sugerida. */
async function enrichCatalogImportExtras(importId: string): Promise<number> {
  const sb = getSupabase()
  const { data: items, error } = await sb
    .from('import_items')
    .select('payload, result')
    .eq('import_id', importId)
  if (error) throw error

  const { data: categories } = await sb.from('product_categories').select('id, name')
  const catByName = new Map<string, string>()
  for (const c of categories ?? []) {
    catByName.set(normalizeImportText(String(c.name)).toLowerCase(), String(c.id))
  }

  let enriched = 0
  for (const row of items ?? []) {
    if (row.result !== 'created' && row.result !== 'updated' && row.result !== 'ok') continue
    const payload = (row.payload ?? {}) as Record<string, unknown>
    const sku = normalizeImportText(String(payload.sku ?? ''))
    if (!sku) continue
    const grupo = normalizeImportText(String(payload.grupo ?? ''))
    const montadora = normalizeImportText(String(payload.montadora ?? ''))
    if (!grupo && !montadora) continue

    const { data: product, error: pErr } = await sb
      .from('products')
      .select('id, attrs, category_id')
      .eq('sku', sku)
      .maybeSingle()
    if (pErr) throw pErr
    if (!product) continue

    const patch: Record<string, unknown> = {}
    if (grupo) {
      const catId = catByName.get(grupo.toLowerCase())
      if (catId) patch.category_id = catId
    }
    if (montadora) {
      const attrs =
        product.attrs && typeof product.attrs === 'object' && !Array.isArray(product.attrs)
          ? { ...(product.attrs as Record<string, unknown>) }
          : {}
      attrs.montadora_sugerida = montadora
      attrs.montadora_origem = 'import'
      patch.attrs = attrs
    }
    if (!Object.keys(patch).length) continue

    const { error: uErr } = await sb.from('products').update(patch).eq('id', product.id)
    if (uErr) throw uErr
    enriched += 1
  }
  return enriched
}
