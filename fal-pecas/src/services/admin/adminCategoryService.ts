import { formatCategoryName, normalizeEntityMatchKey } from '@/lib/entityNormalize'
import { getSupabase } from '@/lib/supabase'
import { toSlug } from '@/lib/slug'
import type { Category } from '@/types'

/** Alinhado à planilha de import: categoria(1) → grupo(2) → subgrupo(3). */
export const CATEGORY_MAX_DEPTH = 3

type Row = {
  id: string
  parent_id: string | null
  name: string
  slug: string
  description: string | null
  sort_order: number
  status: string
  emoji?: string | null
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
    emoji: row.emoji ?? undefined,
  }
}

export async function adminListCategories(): Promise<Category[]> {
  const { data, error } = await getSupabase()
    .from('product_categories')
    .select('id, parent_id, name, slug, description, sort_order, status, emoji')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  if (error) throw error
  return (data as Row[]).map(map)
}

/** Depth 1 = Categoria (raiz), 2 = Grupo, 3 = Subgrupo. */
export function categoryDepth(items: Category[], id: string | null | undefined): number {
  if (!id) return 0
  let depth = 0
  let cur: string | null | undefined = id
  const seen = new Set<string>()
  while (cur) {
    if (seen.has(cur)) break
    seen.add(cur)
    depth += 1
    cur = items.find((c) => c.id === cur)?.parentId ?? null
  }
  return depth
}

export function categoryLevelLabel(depth: number): string {
  if (depth <= 1) return 'Categoria'
  if (depth === 2) return 'Grupo'
  if (depth === 3) return 'Subgrupo'
  return `Nível ${depth}`
}

/** Path "Categoria / Grupo / Subgrupo" (mesmo vocabulário da planilha). */
export function categoryPath(items: Category[], id: string): string {
  const parts: string[] = []
  let cur: string | null | undefined = id
  const seen = new Set<string>()
  while (cur) {
    if (seen.has(cur)) break
    seen.add(cur)
    const node = items.find((c) => c.id === cur)
    if (!node) break
    parts.unshift(node.name)
    cur = node.parentId
  }
  return parts.join(' / ')
}

/** IDs do nó + todos os descendentes (filtro de classificação inclui folhas). */
export function collectCategorySubtreeIds(items: Category[], rootId: string): string[] {
  if (!items.some((c) => c.id === rootId)) return []
  const ids = [rootId]
  const queue = [rootId]
  while (queue.length) {
    const parent = queue.shift()!
    for (const child of items) {
      if (child.parentId === parent && !ids.includes(child.id)) {
        ids.push(child.id)
        queue.push(child.id)
      }
    }
  }
  return ids
}

/** Pais permitidos: Categoria ou Grupo (depth 1–2). Subgrupo não pode ser pai. */
export function allowedCategoryParents(
  items: Category[],
  editingId?: string | null,
): Category[] {
  return items.filter((c) => {
    if (editingId && c.id === editingId) return false
    const d = categoryDepth(items, c.id)
    return d >= 1 && d <= 2
  })
}

export async function adminCountProductsInCategory(categoryId: string): Promise<number> {
  const { count, error } = await getSupabase()
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', categoryId)
  if (error) throw error
  return count ?? 0
}

/** Contagem direta por `category_id` (não inclui descendentes). */
export async function adminCountProductsPerCategory(): Promise<Record<string, number>> {
  const { data, error } = await getSupabase()
    .from('products')
    .select('category_id')
    .not('category_id', 'is', null)
  if (error) throw error
  const out: Record<string, number> = {}
  for (const row of data ?? []) {
    const id = (row as { category_id: string | null }).category_id
    if (!id) continue
    out[id] = (out[id] ?? 0) + 1
  }
  return out
}

function sortedSiblings(items: Category[], parentId: string | null): Category[] {
  return items
    .filter((c) => (c.parentId ?? null) === parentId && c.status !== 'archived')
    .slice()
    .sort(
      (a, b) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name),
    )
}

/** Troca ordem com o irmão imediatamente acima/abaixo. */
export async function adminReorderSiblingCategories(
  items: Category[],
  categoryId: string,
  direction: 'up' | 'down',
): Promise<void> {
  const node = items.find((c) => c.id === categoryId)
  if (!node) throw new Error('Classificação não encontrada')
  const siblings = sortedSiblings(items, node.parentId ?? null)
  const idx = siblings.findIndex((s) => s.id === categoryId)
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (idx < 0 || swapIdx < 0 || swapIdx >= siblings.length) return

  const reordered = siblings.slice()
  const tmp = reordered[idx]!
  reordered[idx] = reordered[swapIdx]!
  reordered[swapIdx] = tmp

  const client = getSupabase()
  for (let i = 0; i < reordered.length; i++) {
    const { error } = await client
      .from('product_categories')
      .update({ sort_order: i })
      .eq('id', reordered[i]!.id)
    if (error) throw error
  }
}

export async function adminUpsertCategory(input: {
  id?: string
  name: string
  slug?: string
  description?: string
  parentId?: string | null
  sortOrder?: number
  status?: Category['status']
  /** Emoji unicode ou chave img:suspensao|freios|filtros. */
  emoji?: string | null
  /** Lista atual para validar profundidade (obrigatória para hard-limit). */
  allCategories?: Category[]
}): Promise<Category> {
  const all = input.allCategories ?? (await adminListCategories())
  const parentId = input.parentId || null

  if (parentId) {
    const parentDepth = categoryDepth(all, parentId)
    if (parentDepth >= CATEGORY_MAX_DEPTH) {
      throw new Error(
        'Não é permitido 4º nível. Hierarquia máxima: Categoria → Grupo → Subgrupo.',
      )
    }
    if (parentDepth < 1) {
      throw new Error('Pai inválido.')
    }
    // Filho terá parentDepth + 1
    if (parentDepth + 1 > CATEGORY_MAX_DEPTH) {
      throw new Error(
        'Não é permitido 4º nível. Hierarquia máxima: Categoria → Grupo → Subgrupo.',
      )
    }
  }

  if (input.id && parentId) {
    // Evitar ciclo / mover sob próprio descendente
    let cur: string | null = parentId
    const seen = new Set<string>()
    while (cur) {
      if (cur === input.id) {
        throw new Error('Não é possível definir um descendente como pai.')
      }
      if (seen.has(cur)) break
      seen.add(cur)
      cur = all.find((c) => c.id === cur)?.parentId ?? null
    }
  }

  const name = formatCategoryName(input.name)
  if (!name) throw new Error('Informe o nome da categoria.')

  if (!input.id) {
    const siblings = all.filter((c) => (c.parentId ?? null) === parentId)
    const dup = siblings.find(
      (c) =>
        c.status !== 'archived' &&
        normalizeEntityMatchKey(c.name) === normalizeEntityMatchKey(name),
    )
    if (dup) {
      throw new Error(`Já existe categoria "${dup.name}" neste nível.`)
    }
  }

  const emoji =
    input.emoji === undefined
      ? undefined
      : input.emoji?.trim()
        ? input.emoji.trim()
        : null

  const payload = {
    name,
    slug: (input.slug?.trim() || toSlug(name)) || toSlug(`cat-${Date.now()}`),
    description: input.description?.trim() || null,
    parent_id: parentId,
    sort_order: input.sortOrder ?? 0,
    status: input.status ?? 'published',
    ...(emoji !== undefined ? { emoji } : {}),
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

/** Republica todos os nós arquivados (ex.: hierarquia de import sem produto ainda). */
export async function adminPublishAllArchivedCategories(): Promise<number> {
  const { data, error } = await getSupabase()
    .from('product_categories')
    .update({ status: 'published' })
    .eq('status', 'archived')
    .select('id')
  if (error) throw error
  return data?.length ?? 0
}

/**
 * Exclusão permanente. Bloqueia se houver filhos ou produtos ligados (direto).
 * Prefira Arquivar para remoção comercial.
 */
export async function adminDeleteCategory(id: string, all?: Category[]): Promise<void> {
  const items = all ?? (await adminListCategories())
  const node = items.find((c) => c.id === id)
  if (!node) throw new Error('Classificação não encontrada')
  const kids = items.filter((c) => c.parentId === id && c.status !== 'archived')
  if (kids.length > 0) {
    throw new Error(
      `Não é possível excluir "${node.name}" com ${kids.length} filho(s). Remova ou mova os filhos antes.`,
    )
  }
  const productCount = await adminCountProductsInCategory(id)
  if (productCount > 0) {
    throw new Error(
      `Há ${productCount} produto(s) em "${node.name}". Reclassifique-os antes de excluir.`,
    )
  }
  const { error } = await getSupabase().from('product_categories').delete().eq('id', id)
  if (error) throw error
}
