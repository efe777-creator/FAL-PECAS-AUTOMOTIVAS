import { getSupabase } from '@/lib/supabase'

export type ImportRunSummary = {
  id: string
  kind: string
  filename: string
  status: string
  createdAt: string
  createdBy: string | null
  priceListId: string | null
  supplierId: string | null
  report: Record<string, unknown> | null
  totalItems: number
  errorItems: number
}

export type ImportRunDetail = ImportRunSummary & {
  items: Array<{
    id: string
    lineNumber: number | null
    result: string | null
    errors: string[]
    warnings: string[]
    payload: Record<string, unknown>
  }>
}

/** Tamanho padrão de página do histórico unificado de importações. */
export const ADMIN_IMPORTS_PAGE_SIZE = 150

export type ListImportsInput = {
  kind?: string
  status?: string
  priceListId?: string
  supplierId?: string
  limit?: number
  offset?: number
}

function summarizeItems(
  items: Array<{ import_id: string; result: string | null }>,
): Map<string, { total: number; errors: number }> {
  const totals = new Map<string, { total: number; errors: number }>()
  for (const it of items) {
    const iid = String(it.import_id)
    const cur = totals.get(iid) ?? { total: 0, errors: 0 }
    cur.total += 1
    if (it.result === 'error' || it.result === 'failed') cur.errors += 1
    totals.set(iid, cur)
  }
  return totals
}

/** Histórico unificado: todos os kinds em `imports` / `import_items`. */
export async function adminListImports(
  filters: ListImportsInput = {},
): Promise<ImportRunSummary[]> {
  const sb = getSupabase()
  const limit = filters.limit ?? ADMIN_IMPORTS_PAGE_SIZE
  const offset = filters.offset ?? 0
  let q = sb
    .from('imports')
    .select(
      'id, kind, filename, status, created_at, created_by, report, price_list_id, supplier_id',
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (filters.kind) q = q.eq('kind', filters.kind)
  if (filters.status) q = q.eq('status', filters.status)
  if (filters.priceListId) q = q.eq('price_list_id', filters.priceListId)
  if (filters.supplierId) q = q.eq('supplier_id', filters.supplierId)

  const { data, error } = await q
  if (error) throw error

  const imports = data ?? []
  if (!imports.length) return []

  const ids = imports.map((r) => String(r.id))
  const { data: items, error: itemsError } = await sb
    .from('import_items')
    .select('import_id, result')
    .in('import_id', ids)
  if (itemsError) throw itemsError

  const totals = summarizeItems(
    (items ?? []).map((i) => ({
      import_id: String(i.import_id),
      result: i.result == null ? null : String(i.result),
    })),
  )

  return imports.map((r) => {
    const t = totals.get(String(r.id)) ?? { total: 0, errors: 0 }
    return {
      id: String(r.id),
      kind: String(r.kind ?? ''),
      filename: String(r.filename ?? ''),
      status: String(r.status ?? ''),
      createdAt: String(r.created_at),
      createdBy: r.created_by ? String(r.created_by) : null,
      priceListId: r.price_list_id ? String(r.price_list_id) : null,
      supplierId: r.supplier_id ? String(r.supplier_id) : null,
      report: (r.report as Record<string, unknown> | null) ?? null,
      totalItems: t.total,
      errorItems: t.errors,
    }
  })
}

export async function adminGetImportRunDetail(
  importId: string,
): Promise<ImportRunDetail | null> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('imports')
    .select(
      'id, kind, filename, status, created_at, created_by, report, price_list_id, supplier_id',
    )
    .eq('id', importId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null

  const { data: items, error: itemsError } = await sb
    .from('import_items')
    .select('id, line_number, result, errors, warnings, payload')
    .eq('import_id', importId)
    .order('line_number', { ascending: true })
  if (itemsError) throw itemsError

  const mapped = (items ?? []).map((i) => ({
    id: String(i.id),
    lineNumber: i.line_number == null ? null : Number(i.line_number),
    result: i.result == null ? null : String(i.result),
    errors: Array.isArray(i.errors) ? (i.errors as string[]) : [],
    warnings: Array.isArray(i.warnings) ? (i.warnings as string[]) : [],
    payload: (i.payload as Record<string, unknown>) ?? {},
  }))

  return {
    id: String(data.id),
    kind: String(data.kind ?? ''),
    filename: String(data.filename ?? ''),
    status: String(data.status ?? ''),
    createdAt: String(data.created_at),
    createdBy: data.created_by ? String(data.created_by) : null,
    priceListId: data.price_list_id ? String(data.price_list_id) : null,
    supplierId: data.supplier_id ? String(data.supplier_id) : null,
    report: (data.report as Record<string, unknown> | null) ?? null,
    totalItems: mapped.length,
    errorItems: mapped.filter((i) => i.result === 'error' || i.result === 'failed').length,
    items: mapped,
  }
}

const IMPORT_REPORT_KEY_LABEL: Record<string, string> = {
  created: 'Criados',
  updated: 'Atualizados',
  skipped: 'Ignorados',
  failed: 'Falhas',
  invalid: 'Inválidos',
  valid: 'Válidos',
  total: 'Total',
}

/** Resumo legível do JSON `report` (campos comuns dos applies). */
export function formatImportReportSummary(
  report: Record<string, unknown> | null,
): string {
  if (!report) return '—'
  const parts: string[] = []
  for (const key of [
    'created',
    'updated',
    'skipped',
    'failed',
    'invalid',
    'valid',
    'total',
  ] as const) {
    const v = report[key]
    if (typeof v === 'number') {
      parts.push(`${IMPORT_REPORT_KEY_LABEL[key] ?? key}: ${v}`)
    }
  }
  return parts.length ? parts.join(' · ') : '—'
}
