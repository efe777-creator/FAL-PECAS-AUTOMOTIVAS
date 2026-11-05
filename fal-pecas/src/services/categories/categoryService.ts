import { mockCategories } from '@/data/mocks/categories'
import { assertStoreBackendConfigured, allowCatalogMocks } from '@/lib/storeBackend'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { notifyCategoriesChanged } from '@/services/categories/categoryEvents'
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

const CACHE_TTL_MS = 5 * 60_000
let rootsCache: { at: number; data: Category[] } | null = null
let allCache: { at: number; data: Category[] } | null = null

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? undefined,
    parentId: row.parent_id,
    sortOrder: row.sort_order,
    emoji: row.emoji ?? undefined,
    status: 'published',
  }
}

/** Invalida cache de categorias (ex.: após mudança no admin). */
export function invalidateCategoryCache() {
  rootsCache = null
  allCache = null
}

/** Invalida cache + avisa listeners (Header, Catálogo, Admin produtos). */
export function bumpCategoriesRevision() {
  invalidateCategoryCache()
  notifyCategoriesChanged()
}

/**
 * Preenche categoryName/categorySlug a partir do id (lista published).
 * Usado após busca RPC (que não devolve slug).
 */
export async function attachCategoryMeta(products: Array<{
  categoryId?: string | null
  categoryName?: string
  categorySlug?: string
}>): Promise<void> {
  if (!products.length) return
  const cats = await listAllCategories()
  const byId = new Map(cats.map((c) => [c.id, c]))
  for (const p of products) {
    if (!p.categoryId) continue
    const c = byId.get(p.categoryId)
    if (!c) continue
    p.categoryName = c.name
    p.categorySlug = c.slug
  }
}

/**
 * Categorias publicadas (raízes).
 * Fonte de verdade: Supabase (product_categories).
 * Mock só com VITE_ALLOW_CATALOG_MOCKS=true em DEV (IMP-19 U1).
 * Cache em memória 5 min (Onda 2).
 */
export async function listCategories(): Promise<Category[]> {
  assertStoreBackendConfigured()
  if (rootsCache && Date.now() - rootsCache.at < CACHE_TTL_MS) {
    return rootsCache.data
  }
  if (!isSupabaseConfigured || !supabase) {
    if (!allowCatalogMocks()) return []
    const mock = mockCategories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      emoji: c.emoji,
      parentId: null,
    }))
    rootsCache = { at: Date.now(), data: mock }
    return mock
  }

  const { data, error } = await supabase
    .from('product_categories')
    .select('id, name, slug, description, parent_id, sort_order, emoji')
    .eq('status', 'published')
    .is('parent_id', null)
    .order('sort_order', { ascending: true })

  if (error) throw error
  const mapped = (data as CategoryRow[] | null)?.map(mapCategory) ?? []
  rootsCache = { at: Date.now(), data: mapped }
  return mapped
}

export async function listAllCategories(): Promise<Category[]> {
  if (allCache && Date.now() - allCache.at < CACHE_TTL_MS) {
    return allCache.data
  }
  if (!isSupabaseConfigured || !supabase) {
    return listCategories()
  }

  const { data, error } = await supabase
    .from('product_categories')
    .select('id, name, slug, description, parent_id, sort_order, emoji')
    .eq('status', 'published')
    .order('sort_order', { ascending: true })

  if (error) throw error
  const mapped = (data as CategoryRow[] | null)?.map(mapCategory) ?? []
  allCache = { at: Date.now(), data: mapped }
  return mapped
}

/** Elo do caminho Categoria → Grupo → Subgrupo (folha → raiz invertida). */
export type CategoryPathCrumb = {
  id: string
  name: string
  slug: string
}

/** Sobe parent_id até a raiz; ordem raiz→folha. */
export function categoryChainById(all: Category[], id: string): CategoryPathCrumb[] {
  const byId = new Map(all.map((c) => [c.id, c]))
  const chain: Category[] = []
  let cur = byId.get(id)
  const seen = new Set<string>()
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id)
    chain.unshift(cur)
    cur = cur.parentId ? byId.get(cur.parentId) : undefined
  }
  return chain.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))
}

/** Resolve cadeia a partir do slug da folha (ou de qualquer nó). */
export function categoryChainBySlug(all: Category[], slug: string): CategoryPathCrumb[] {
  const node = all.find((c) => c.slug === slug)
  if (!node) return []
  return categoryChainById(all, node.id)
}
