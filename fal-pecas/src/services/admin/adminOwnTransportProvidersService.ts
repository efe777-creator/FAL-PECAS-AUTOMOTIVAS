import { getSupabase } from '@/lib/supabase'
import {
  OWN_TRANSPORT_OPTIONS,
  type OwnTransportOption,
} from '@/lib/ownTransportOptions'

export type OwnTransportProviderRow = {
  id: string
  slug: string
  label: string
  active: boolean
  sortOrder: number
}

function mapRow(r: Record<string, unknown>): OwnTransportProviderRow {
  return {
    id: String(r.id),
    slug: String(r.slug),
    label: String(r.label),
    active: Boolean(r.active),
    sortOrder: Number(r.sort_order ?? 100),
  }
}

/** Lista completa (staff) — inclui inativos. */
export async function listOwnTransportProviders(): Promise<OwnTransportProviderRow[]> {
  const { data, error } = await getSupabase()
    .from('own_transport_providers')
    .select('id, slug, label, active, sort_order')
    .order('sort_order', { ascending: true })
    .order('label', { ascending: true })
  if (error) throw error
  return (data ?? []).map((r) => mapRow(r as Record<string, unknown>))
}

/** Opções ativas para select de despacho (fallback seed se tabela vazia/erro). */
export async function listActiveOwnTransportOptions(): Promise<OwnTransportOption[]> {
  try {
    const { data, error } = await getSupabase()
      .from('own_transport_providers')
      .select('slug, label, active, sort_order')
      .eq('active', true)
      .order('sort_order', { ascending: true })
    if (error) throw error
    const rows = (data ?? []) as Array<{ slug: string; label: string }>
    if (!rows.length) return [...OWN_TRANSPORT_OPTIONS]
    return rows.map((r) => ({ id: String(r.slug), label: String(r.label) }))
  } catch {
    return [...OWN_TRANSPORT_OPTIONS]
  }
}

export async function upsertOwnTransportProvider(input: {
  id?: string
  slug: string
  label: string
  active: boolean
  sortOrder: number
}): Promise<OwnTransportProviderRow> {
  const slug = input.slug.trim().toLowerCase().replace(/\s+/g, '_')
  const label = input.label.trim()
  if (!slug || !label) throw new Error('Informe slug e nome')
  const payload = {
    slug,
    label,
    active: input.active,
    sort_order: input.sortOrder,
    updated_at: new Date().toISOString(),
  }
  if (input.id) {
    const { data, error } = await getSupabase()
      .from('own_transport_providers')
      .update(payload)
      .eq('id', input.id)
      .select('id, slug, label, active, sort_order')
      .single()
    if (error) throw error
    return mapRow(data as Record<string, unknown>)
  }
  const { data, error } = await getSupabase()
    .from('own_transport_providers')
    .insert(payload)
    .select('id, slug, label, active, sort_order')
    .single()
  if (error) throw error
  return mapRow(data as Record<string, unknown>)
}

export async function deleteOwnTransportProvider(id: string): Promise<void> {
  const { error } = await getSupabase().from('own_transport_providers').delete().eq('id', id)
  if (error) throw error
}
