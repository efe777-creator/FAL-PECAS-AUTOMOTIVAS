import { mockCategories } from '@/data/mocks/categories'
import { assertStoreBackendConfigured, allowCatalogMocks } from '@/lib/storeBackend'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { Category } from '@/types'

type CategoryRow = {
  id: string
  name: string
  slug: string
  description: string | null
  parent_id: string | null
  sort_order: number
  emoji?: string | null
}

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? undefined,
    parentId: row.parent_id,
    emoji: row.emoji ?? undefined,
  }
}

/**
 * Categorias publicadas.
 * Fonte de verdade: Supabase (product_categories).
 * Mock só com VITE_ALLOW_CATALOG_MOCKS=true em DEV (IMP-19 U1).
 */
export async function listCategories(): Promise<Category[]> {
  assertStoreBackendConfigured()
  if (!isSupabaseConfigured || !supabase) {
    if (!allowCatalogMocks()) return []
    return mockCategories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      emoji: c.emoji,
      parentId: null,
    }))
  }

  const { data, error } = await supabase
    .from('product_categories')
    .select('id, name, slug, description, parent_id, sort_order, emoji')
    .eq('status', 'published')
    .is('parent_id', null)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return (data as CategoryRow[] | null)?.map(mapCategory) ?? []
}

export async function listAllCategories(): Promise<Category[]> {
  if (!isSupabaseConfigured || !supabase) {
    return listCategories()
  }

  const { data, error } = await supabase
    .from('product_categories')
    .select('id, name, slug, description, parent_id, sort_order, emoji')
    .eq('status', 'published')
    .order('sort_order', { ascending: true })

  if (error) throw error
  return (data as CategoryRow[] | null)?.map(mapCategory) ?? []
}
