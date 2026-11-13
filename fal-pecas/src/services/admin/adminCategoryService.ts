import { formatCategoryName, normalizeEntityMatchKey } from '@/lib/entityNormalize'
import { getSupabase } from '@/lib/supabase'
import { toSlug } from '@/lib/slug'
import {
  adminApplyGlobalProductMeasures,
  type ApplyGlobalMeasuresMode,
} from '@/services/admin/adminProductService'
import { bumpCategoriesRevision } from '@/services/categories/categoryService'
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
  default_weight_kg?: number | string | null
  default_length_cm?: number | string | null
  default_width_cm?: number | string | null
  default_height_cm?: number | string | null
}

function numOrNull(v: number | string | null | undefined): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
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
    defaultWeightKg: numOrNull(row.default_weight_kg),
    defaultLengthCm: numOrNull(row.default_length_cm),
    defaultWidthCm: numOrNull(row.default_width_cm),
    defaultHeightCm: numOrNull(row.default_height_cm),
  }
}

export async function adminListCategories(): Promise<Category[]> {
  const { data, error } = await getSupabase()
    .from('product_categories')
    .select(
      'id, parent_id, name, slug, description, sort_order, status, emoji, default_weight_kg, default_length_cm, default_width_cm, default_height_cm',
    )
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
  bumpCategoriesRevision()
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
  defaultWeightKg?: number | null
  defaultLengthCm?: number | null
  defaultWidthCm?: number | null
  defaultHeightCm?: number | null
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

  const siblings = all.filter(
    (c) =>
      (c.parentId ?? null) === parentId &&
      (!input.id || c.id !== input.id) &&
      c.status !== 'archived',
  )
  const dup = siblings.find(
    (c) => normalizeEntityMatchKey(c.name) === normalizeEntityMatchKey(name),
  )
  if (dup) {
    throw new Error(`Já existe categoria "${dup.name}" neste nível.`)
  }

  const existing = input.id ? all.find((c) => c.id === input.id) : undefined
  // Update: preserva slug se não veio explícito (evita quebrar ?cat= / links).
  const baseSlug =
    (input.slug?.trim() ||
      (input.id ? existing?.slug : undefined) ||
      toSlug(name) ||
      toSlug(`cat-${Date.now()}`)).trim()
  let slug = baseSlug
  let n = 0
  while (
    all.some(
      (c) => c.slug === slug && (!input.id || c.id !== input.id),
    )
  ) {
    n += 1
    slug = `${baseSlug}-${n}`
  }

  const emoji =
    input.emoji === undefined
      ? undefined
      : input.emoji?.trim()
        ? input.emoji.trim()
        : null

  const payload = {
    name,
    slug,
    description: input.description?.trim() || null,
    parent_id: parentId,
    sort_order: input.sortOrder ?? 0,
    status: input.status ?? 'published',
    ...(emoji !== undefined ? { emoji } : {}),
    ...(input.defaultWeightKg !== undefined
      ? { default_weight_kg: input.defaultWeightKg }
      : {}),
    ...(input.defaultLengthCm !== undefined
      ? { default_length_cm: input.defaultLengthCm }
      : {}),
    ...(input.defaultWidthCm !== undefined
      ? { default_width_cm: input.defaultWidthCm }
      : {}),
    ...(input.defaultHeightCm !== undefined
      ? { default_height_cm: input.defaultHeightCm }
      : {}),
  }
  const q = getSupabase().from('product_categories')
  const { data, error } = input.id
    ? await q.update(payload).eq('id', input.id).select().single()
    : await q.insert(payload).select().single()
  if (error) throw error
  bumpCategoriesRevision()
  return map(data as Row)
}

/** IDs de produto em um nó e toda a subárvore (apply de medidas padrão). */
export async function adminListProductIdsInCategorySubtree(
  items: Category[],
  categoryId: string,
): Promise<string[]> {
  const catIds = collectCategorySubtreeIds(items, categoryId)
  if (!catIds.length) return []
  const { data, error } = await getSupabase()
    .from('products')
    .select('id')
    .in('category_id', catIds)
  if (error) throw error
  return (data ?? []).map((r) => String((r as { id: string }).id))
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
  bumpCategoriesRevision()
}

/** Relatório leve para integridade: nomes duplicados (normalizados) entre nós ativos. */
export async function adminCategoryIntegrityReport(): Promise<{
  duplicateNameGroups: {
    key: string
    ids: string[]
    names: string[]
    productCounts: number[]
  }[]
  archivedWithProducts: { id: string; name: string; productCount: number }[]
}> {
  const items = await adminListCategories()
  const byKey = new Map<string, Category[]>()
  for (const c of items) {
    if (c.status === 'archived') continue
    const key = `${c.parentId ?? 'root'}::${normalizeEntityMatchKey(c.name)}`
    const list = byKey.get(key) ?? []
    list.push(c)
    byKey.set(key, list)
  }
  const duplicateNameGroups = []
  for (const [key, list] of byKey.entries()) {
    if (list.length < 2) continue
    const productCounts = await Promise.all(list.map((c) => adminCountProductsInCategory(c.id)))
    duplicateNameGroups.push({
      key,
      ids: list.map((c) => c.id),
      names: list.map((c) => c.name),
      productCounts,
    })
  }

  const archived = items.filter((c) => c.status === 'archived')
  const archivedWithProducts: { id: string; name: string; productCount: number }[] = []
  for (const c of archived) {
    const productCount = await adminCountProductsInCategory(c.id)
    if (productCount > 0) {
      archivedWithProducts.push({ id: c.id, name: c.name, productCount })
    }
  }
  return { duplicateNameGroups, archivedWithProducts }
}

/**
 * Mescla classificação A → B: reatribui `products.category_id`, arquiva A.
 * Bloqueia se A tiver filhos ativos ou se B estiver sob A.
 */
export async function adminMergeCategory(opts: {
  fromId: string
  toId: string
}): Promise<{ movedProducts: number; fromName: string; toName: string }> {
  if (opts.fromId === opts.toId) {
    throw new Error('Origem e destino devem ser diferentes.')
  }
  const items = await adminListCategories()
  const from = items.find((c) => c.id === opts.fromId)
  const to = items.find((c) => c.id === opts.toId)
  if (!from) throw new Error('Classificação de origem não encontrada.')
  if (!to) throw new Error('Classificação de destino não encontrada.')
  if (to.status === 'archived') {
    throw new Error(`Destino "${to.name}" está arquivado. Escolha um destino ativo.`)
  }

  let walk: string | null | undefined = to.parentId
  const seen = new Set<string>()
  while (walk) {
    if (seen.has(walk)) break
    seen.add(walk)
    if (walk === from.id) {
      throw new Error('Não é possível mesclar um ancestral no próprio descendente.')
    }
    walk = items.find((c) => c.id === walk)?.parentId ?? null
  }

  const kids = items.filter((c) => c.parentId === from.id && c.status !== 'archived')
  if (kids.length > 0) {
    throw new Error(
      `"${from.name}" ainda tem ${kids.length} filho(s) ativo(s). Mova ou mescle os filhos antes.`,
    )
  }

  const beforeCount = await adminCountProductsInCategory(from.id)

  const { error: moveError } = await getSupabase()
    .from('products')
    .update({ category_id: opts.toId })
    .eq('category_id', opts.fromId)
  if (moveError) throw moveError

  await adminSetCategoryStatus(opts.fromId, 'archived')

  return {
    movedProducts: beforeCount,
    fromName: from.name,
    toName: to.name,
  }
}

/**
 * Exclusão permanente. Bloqueia se houver filhos ou produtos ligados (direto).
 * Prefira Arquivar para remoção comercial.
 */
export async function adminDeleteCategory(id: string, all?: Category[]): Promise<void> {
  const items = all ?? (await adminListCategories())
  const node = items.find((c) => c.id === id)
  if (!node) throw new Error('Classificação não encontrada')
  const kids = items.filter((c) => c.parentId === id)
  if (kids.length > 0) {
    throw new Error(
      `Não é possível excluir "${node.name}" com ${kids.length} filho(s). Exclua os filhos antes.`,
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
  bumpCategoriesRevision()
}

/**
 * Aplica `default_*` da classificação aos produtos do nó + subárvore.
 * Default: `skip_manual` (não sobrescreve medidas deste produto).
 */
/**
 * Resolve medidas padrão andando pais acima até achar ao menos um eixo > 0.
 * Cotação ainda lê só o produto; isto só alimenta o apply admin.
 */
export function resolveCategoryDefaultMeasures(
  items: Category[],
  categoryId: string,
): {
  weightKg: number | null
  lengthCm: number | null
  widthCm: number | null
  heightCm: number | null
  sourceCategoryId: string | null
} {
  let cur: string | null | undefined = categoryId
  const seen = new Set<string>()
  while (cur) {
    if (seen.has(cur)) break
    seen.add(cur)
    const cat = items.find((c) => c.id === cur)
    if (!cat) break
    const weightKg = cat.defaultWeightKg != null && cat.defaultWeightKg > 0 ? cat.defaultWeightKg : null
    const lengthCm = cat.defaultLengthCm != null && cat.defaultLengthCm > 0 ? cat.defaultLengthCm : null
    const widthCm = cat.defaultWidthCm != null && cat.defaultWidthCm > 0 ? cat.defaultWidthCm : null
    const heightCm = cat.defaultHeightCm != null && cat.defaultHeightCm > 0 ? cat.defaultHeightCm : null
    if (weightKg != null || lengthCm != null || widthCm != null || heightCm != null) {
      return { weightKg, lengthCm, widthCm, heightCm, sourceCategoryId: cat.id }
    }
    cur = cat.parentId
  }
  return {
    weightKg: null,
    lengthCm: null,
    widthCm: null,
    heightCm: null,
    sourceCategoryId: null,
  }
}

export async function adminApplyCategoryDefaultMeasures(opts: {
  categoryId: string
  allCategories?: Category[]
  mode?: ApplyGlobalMeasuresMode
}): Promise<{ productCount: number; updatedFieldRows: number }> {
  const items = opts.allCategories ?? (await adminListCategories())
  const cat = items.find((c) => c.id === opts.categoryId)
  if (!cat) throw new Error('Classificação não encontrada.')

  const resolved = resolveCategoryDefaultMeasures(items, opts.categoryId)
  const patch: {
    weightKg?: number | null
    lengthCm?: number | null
    widthCm?: number | null
    heightCm?: number | null
  } = {}
  if (resolved.weightKg != null) patch.weightKg = resolved.weightKg
  if (resolved.lengthCm != null) patch.lengthCm = resolved.lengthCm
  if (resolved.widthCm != null) patch.widthCm = resolved.widthCm
  if (resolved.heightCm != null) patch.heightCm = resolved.heightCm
  if (!Object.keys(patch).length) {
    throw new Error(
      'Defina ao menos uma medida padrão nesta classificação (ou em um pai) antes de aplicar.',
    )
  }

  const productIds = await adminListProductIdsInCategorySubtree(items, opts.categoryId)
  if (!productIds.length) {
    return { productCount: 0, updatedFieldRows: 0 }
  }
  const { updatedFieldRows } = await adminApplyGlobalProductMeasures({
    productIds,
    patch,
    mode: opts.mode ?? 'skip_manual',
  })
  return { productCount: productIds.length, updatedFieldRows }
}
