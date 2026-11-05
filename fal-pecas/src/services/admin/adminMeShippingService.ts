import { getSupabase } from '@/services/supabase/client'

export type MeShippingServiceRow = {
  serviceId: number
  serviceName: string
  companyId: number | null
  companyName: string
  companyPicture: string | null
  displayName: string | null
  enabled: boolean
  sortHint: number
  lastSeenAt: string | null
  updatedAt: string | null
}

export type MeAdminStatus = {
  apiBase: string
  tokenConfigured: boolean
  userAgentConfigured: boolean
  originPostalCode: string | null
  originCity: string | null
  originState: string | null
  senderName: string | null
  catalogCount: number
  enabledCount: number
  lastQuoteAt: string | null
  lastQuotePostal: string | null
  disclaimer: string | null
}

type DbRow = {
  service_id: number
  service_name: string
  company_id: number | null
  company_name: string
  company_picture: string | null
  display_name: string | null
  enabled: boolean
  sort_hint: number
  last_seen_at: string | null
  updated_at: string | null
}

function mapRow(r: DbRow): MeShippingServiceRow {
  return {
    serviceId: Number(r.service_id),
    serviceName: r.service_name ?? '',
    companyId: r.company_id == null ? null : Number(r.company_id),
    companyName: r.company_name ?? '',
    companyPicture: r.company_picture ?? null,
    displayName: r.display_name ?? null,
    enabled: Boolean(r.enabled),
    sortHint: Number(r.sort_hint ?? 100),
    lastSeenAt: r.last_seen_at ?? null,
    updatedAt: r.updated_at ?? null,
  }
}

export async function listMeShippingServices(): Promise<MeShippingServiceRow[]> {
  const { data, error } = await getSupabase()
    .from('me_shipping_services')
    .select(
      'service_id, service_name, company_id, company_name, company_picture, display_name, enabled, sort_hint, last_seen_at, updated_at',
    )
    .order('sort_hint', { ascending: true })
    .order('service_id', { ascending: true })
  if (error) throw new Error(error.message)
  return ((data ?? []) as DbRow[]).map(mapRow)
}

export async function updateMeShippingService(
  serviceId: number,
  patch: { enabled?: boolean; displayName?: string | null },
): Promise<void> {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.enabled !== undefined) payload.enabled = patch.enabled
  if (patch.displayName !== undefined) {
    const t = patch.displayName?.trim() ?? ''
    payload.display_name = t.length ? t : null
  }
  const { error } = await getSupabase()
    .from('me_shipping_services')
    .update(payload)
    .eq('service_id', serviceId)
  if (error) throw new Error(error.message)
}

export async function saveMeShippingServicesBatch(
  rows: Array<{ serviceId: number; enabled: boolean; displayName: string | null }>,
): Promise<void> {
  const now = new Date().toISOString()
  for (const r of rows) {
    const { error } = await getSupabase()
      .from('me_shipping_services')
      .update({
        enabled: r.enabled,
        display_name: r.displayName?.trim() ? r.displayName.trim() : null,
        updated_at: now,
      })
      .eq('service_id', r.serviceId)
    if (error) throw new Error(error.message)
  }
}

/** Importa serviços novos a partir do JSON de opções de cotações recentes. */
export async function syncMeCatalogFromRecentQuotes(limit = 20): Promise<number> {
  const { data, error } = await getSupabase()
    .from('shipping_quotes')
    .select('options')
    .eq('provider', 'melhorenvio')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)

  const byId = new Map<number, Record<string, unknown>>()
  for (const row of data ?? []) {
    const opts = row.options
    if (!Array.isArray(opts)) continue
    for (const raw of opts) {
      if (!raw || typeof raw !== 'object') continue
      const o = raw as Record<string, unknown>
      const sid = Number(o.service_id ?? o.serviceId ?? 0)
      if (!Number.isFinite(sid) || sid <= 0) continue
      if (!byId.has(sid)) byId.set(sid, o)
    }
  }
  if (!byId.size) return 0

  const payload = [...byId.values()]
  const { data: count, error: rpcErr } = await getSupabase().rpc(
    'upsert_me_shipping_services_from_options',
    { p_options: payload },
  )
  if (rpcErr) throw new Error(rpcErr.message)
  return Number(count ?? payload.length)
}

/** Sync ao vivo via Edge calculate (atualiza logos/nomes). */
export async function syncMeCatalogFromEdge(): Promise<{ upserted: number; services: number }> {
  const { data, error } = await getSupabase().functions.invoke('quote-shipping', {
    body: { action: 'me_sync_catalog' },
  })
  if (error) throw new Error(error.message || 'Falha ao sincronizar catálogo ME')
  const body = data as { upserted?: number; services?: number; error?: string; message?: string }
  if (body?.error) throw new Error(body.message || body.error)
  return {
    upserted: Number(body?.upserted ?? 0),
    services: Number(body?.services ?? 0),
  }
}

export async function fetchMeAdminStatus(): Promise<MeAdminStatus> {
  const { data, error } = await getSupabase().functions.invoke('quote-shipping', {
    body: { action: 'me_admin_status' },
  })
  if (error) throw new Error(error.message || 'Falha ao ler status ME')
  const body = data as Record<string, unknown>
  if (body?.error) throw new Error(String(body.message ?? body.error))
  return {
    apiBase: String(body.apiBase ?? ''),
    tokenConfigured: Boolean(body.tokenConfigured),
    userAgentConfigured: Boolean(body.userAgentConfigured),
    originPostalCode: body.originPostalCode == null ? null : String(body.originPostalCode),
    originCity: body.originCity == null ? null : String(body.originCity),
    originState: body.originState == null ? null : String(body.originState),
    senderName: body.senderName == null ? null : String(body.senderName),
    catalogCount: Number(body.catalogCount ?? 0),
    enabledCount: Number(body.enabledCount ?? 0),
    lastQuoteAt: body.lastQuoteAt == null ? null : String(body.lastQuoteAt),
    lastQuotePostal: body.lastQuotePostal == null ? null : String(body.lastQuotePostal),
    disclaimer: body.disclaimer == null ? null : String(body.disclaimer),
  }
}
