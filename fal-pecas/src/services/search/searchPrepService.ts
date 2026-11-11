import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import {
  expandSearchQuery,
  synonymMapFromRows,
  type SynonymMap,
} from '@/lib/searchQueryExpand'

const CACHE_TTL_MS = 5 * 60_000

type PrepCache = {
  at: number
  expansionEnabled: boolean
  map: SynonymMap
}

let cache: PrepCache | null = null

export type SearchPrepSettings = {
  id: string
  synonymExpansionEnabled: boolean
  notes: string | null
}

export type SearchSynonymRow = {
  id: string
  term: string
  expandsTo: string
  active: boolean
}

export function invalidateSearchPrepCache() {
  cache = null
}

async function loadPrepCache(): Promise<PrepCache> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache
  if (!isSupabaseConfigured || !supabase) {
    cache = { at: Date.now(), expansionEnabled: false, map: new Map() }
    return cache
  }
  try {
    const [flagRes, synRes] = await Promise.all([
      supabase
        .from('store_search_prep')
        .select('synonym_expansion_enabled')
        .limit(1)
        .maybeSingle(),
      supabase.from('search_synonyms').select('term, expands_to').eq('active', true),
    ])
    const enabled = Boolean(flagRes.data?.synonym_expansion_enabled)
    const map = synonymMapFromRows(
      (synRes.data ?? []).map((r) => ({
        term: String((r as { term: string }).term),
        expandsTo: String((r as { expands_to: string }).expands_to),
      })),
    )
    cache = { at: Date.now(), expansionEnabled: enabled, map }
    return cache
  } catch {
    cache = { at: Date.now(), expansionEnabled: false, map: new Map() }
    return cache
  }
}

/** Aplica expansão se a flag estiver ligada. */
export async function prepareSearchQuery(q: string | null | undefined): Promise<string> {
  const raw = (q ?? '').trim()
  if (!raw) return ''
  const prep = await loadPrepCache()
  if (!prep.expansionEnabled) return raw
  return expandSearchQuery(raw, prep.map)
}

export async function adminGetSearchPrepSettings(): Promise<SearchPrepSettings | null> {
  if (!supabase) return null
  invalidateSearchPrepCache()
  const { data, error } = await supabase
    .from('store_search_prep')
    .select('id, synonym_expansion_enabled, notes')
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    id: String(data.id),
    synonymExpansionEnabled: Boolean(data.synonym_expansion_enabled),
    notes: (data.notes as string | null) ?? null,
  }
}

export async function adminUpsertSearchPrepSettings(input: {
  id?: string
  synonymExpansionEnabled: boolean
  notes?: string | null
}): Promise<SearchPrepSettings> {
  if (!supabase) throw new Error('Supabase não configurado')
  const payload = {
    synonym_expansion_enabled: input.synonymExpansionEnabled,
    notes: input.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  }
  if (input.id) {
    const { data, error } = await supabase
      .from('store_search_prep')
      .update(payload)
      .eq('id', input.id)
      .select('id, synonym_expansion_enabled, notes')
      .single()
    if (error) throw error
    invalidateSearchPrepCache()
    return {
      id: String(data.id),
      synonymExpansionEnabled: Boolean(data.synonym_expansion_enabled),
      notes: (data.notes as string | null) ?? null,
    }
  }
  const { data, error } = await supabase
    .from('store_search_prep')
    .insert(payload)
    .select('id, synonym_expansion_enabled, notes')
    .single()
  if (error) throw error
  invalidateSearchPrepCache()
  return {
    id: String(data.id),
    synonymExpansionEnabled: Boolean(data.synonym_expansion_enabled),
    notes: (data.notes as string | null) ?? null,
  }
}

export async function adminListSearchSynonyms(): Promise<SearchSynonymRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('search_synonyms')
    .select('id, term, expands_to, active')
    .order('term')
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: String(r.id),
    term: String(r.term),
    expandsTo: String(r.expands_to),
    active: Boolean(r.active),
  }))
}

export async function adminUpsertSearchSynonym(input: {
  id?: string
  term: string
  expandsTo: string
  active: boolean
}): Promise<SearchSynonymRow> {
  if (!supabase) throw new Error('Supabase não configurado')
  const payload = {
    term: input.term.trim(),
    expands_to: input.expandsTo.trim(),
    active: input.active,
    updated_at: new Date().toISOString(),
  }
  if (input.id) {
    const { data, error } = await supabase
      .from('search_synonyms')
      .update(payload)
      .eq('id', input.id)
      .select('id, term, expands_to, active')
      .single()
    if (error) throw error
    invalidateSearchPrepCache()
    return {
      id: String(data.id),
      term: String(data.term),
      expandsTo: String(data.expands_to),
      active: Boolean(data.active),
    }
  }
  const { data, error } = await supabase
    .from('search_synonyms')
    .insert(payload)
    .select('id, term, expands_to, active')
    .single()
  if (error) throw error
  invalidateSearchPrepCache()
  return {
    id: String(data.id),
    term: String(data.term),
    expandsTo: String(data.expands_to),
    active: Boolean(data.active),
  }
}

export async function adminDeleteSearchSynonym(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase não configurado')
  const { error } = await supabase.from('search_synonyms').delete().eq('id', id)
  if (error) throw error
  invalidateSearchPrepCache()
}

export type SearchZeroResultRow = {
  id: string
  q: string | null
  maker: string | null
  model: string | null
  year: string | null
  createdAt: string
}

/** Últimas buscas sem resultado (monitor). */
export async function adminListSearchZeroResults(limit = 40): Promise<SearchZeroResultRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('search_zero_results')
    .select('id, q, maker, model, year, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: String(r.id),
    q: (r.q as string | null) ?? null,
    maker: (r.maker as string | null) ?? null,
    model: (r.model as string | null) ?? null,
    year: (r.year as string | null) ?? null,
    createdAt: String(r.created_at),
  }))
}

/** Rebuild search_document (null = todos). */
export async function adminRebuildSearchDocuments(productIds?: string[]): Promise<number> {
  if (!supabase) throw new Error('Supabase não configurado')
  const { data, error } = await supabase.rpc('rebuild_product_search_documents', {
    p_ids: productIds?.length ? productIds : null,
  })
  if (error) throw error
  return Number(data ?? 0)
}
