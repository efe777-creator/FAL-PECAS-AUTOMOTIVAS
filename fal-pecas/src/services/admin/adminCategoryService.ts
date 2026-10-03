import { getSupabase } from '@/lib/supabase'
import { toSlug } from '@/lib/slug'
import type { Category } from '@/types'

type Row = {
  id: string
  parent_id: string | null
  name: string
  slug: string
  description: string | null
  sort_order: number
  status: string
}

function map(row: Row): Category {
  return {
    id: row.id,
    parentId: row.parent_id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? undefined,
    sortOrder: row.sort_order,
    status: row.status as Category['status'],
  }
}

export async function adminListCategories(): Promise<Category[]> {
  const { data, error } = await getSupabase()
    .from('product_categories')
    .select('id, parent_id, name, slug, description, sort_order, status')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  if (error) throw error
  return (data as Row[]).map(map)
}

export async function adminUpsertCategory(input: {
  id?: string
  name: string
  slug?: string
  description?: string
  parentId?: string | null
  sortOrder?: number
  status?: Category['status']
}): Promise<Category> {
  const payload = {
    name: input.name.trim(),
    slug: (input.slug?.trim() || toSlug(input.name)) || toSlug(`cat-${Date.now()}`),
    description: input.description?.trim() || null,
    parent_id: input.parentId || null,
    sort_order: input.sortOrder ?? 0,
    status: input.status ?? 'published',
  }
  const q = getSupabase().from('product_categories')
  const { data, error } = input.id
    ? await q.update(payload).eq('id', input.id).select().single()
    : await q.insert(payload).select().single()
  if (error) throw error
  return map(data as Row)
}

export async function adminSetCategoryStatus(
  id: string,
  status: NonNullable<Category['status']>,
): Promise<void> {
  const { error } = await getSupabase()
    .from('product_categories')
    .update({ status })
    .eq('id', id)
  if (error) throw error
}
