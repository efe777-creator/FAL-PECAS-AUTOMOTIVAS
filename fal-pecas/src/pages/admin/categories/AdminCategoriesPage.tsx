import { CategoriesArchivedMenu } from '@/components/admin/categories/CategoriesArchivedMenu'
import { CategoriesBrowseBar } from '@/components/admin/categories/CategoriesBrowseBar'
import {
  CategoriesEditorForm,
  type CreateLevel,
} from '@/components/admin/categories/CategoriesEditorForm'
import {
  CategoryIconThumb,
  categoryStatusLabel,
} from '@/components/admin/categories/categoryAdminUi'
import { Button } from '@/components/common/Button'
import { confirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { Loading } from '@/components/common/Loading'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  adminApplyCategoryDefaultMeasures,
  adminCountProductsInCategory,
  adminCountProductsPerCategory,
  adminDeleteCategory,
  adminListCategories,
  adminReorderSiblingCategories,
  adminSetCategoryStatus,
  adminUpsertCategory,
  allowedCategoryParents,
  categoryDepth,
  categoryLevelLabel,
  categoryPath,
  CATEGORY_MAX_DEPTH,
} from '@/services/admin/adminCategoryService'
import type { Category } from '@/types'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'

export function AdminCategoriesPage() {
  const [items, setItems] = useState<Category[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [parentId, setParentId] = useState('')
  /** Ao criar/editar Subgrupo: filtra Grupos pela Categoria escolhida. */
  const [subgrupoCategoriaId, setSubgrupoCategoriaId] = useState('')
  const [sortOrder, setSortOrder] = useState('0')
  const [emoji, setEmoji] = useState('')
  const [editing, setEditing] = useState<Category | null>(null)
  const [createLevel, setCreateLevel] = useState<CreateLevel>(1)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [busyId, setBusyId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('list')
  const [levelFilter, setLevelFilter] = useState<0 | 1 | 2 | 3>(0)
  const [defaultWeightKg, setDefaultWeightKg] = useState('')
  const [defaultLengthCm, setDefaultLengthCm] = useState('')
  const [defaultWidthCm, setDefaultWidthCm] = useState('')
  const [defaultHeightCm, setDefaultHeightCm] = useState('')
  const [busyApplyMeasures, setBusyApplyMeasures] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const measuresSectionRef = useRef<HTMLDivElement>(null)

  function parseOptionalMeasure(raw: string): number | null {
    const t = raw.trim()
    if (!t) return null
    const n = Number(t.replace(',', '.'))
    if (!Number.isFinite(n) || n <= 0) {
      throw new Error('Medidas padrão devem ser números maiores que zero (ou vazias).')
    }
    return n
  }

  function fmtMeasure(v: number | null | undefined): string {
    if (v == null) return ''
    return String(v)
  }

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const [cats, productCounts] = await Promise.all([
        adminListCategories(),
        adminCountProductsPerCategory(),
      ])
      setItems(cats)
      setCounts(productCounts)
      // Expande categoria + grupo para ver subgrupos da importação de imediato.
      const withKids = new Set(
        cats.filter((c) => cats.some((ch) => ch.parentId === c.id)).map((c) => c.id),
      )
      setExpanded(withKids)
    } catch (e) {
      const msg =
        e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string'
          ? (e as { message: string }).message
          : e instanceof Error
            ? e.message
            : 'Erro ao carregar categorias'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  useEffect(() => {
    if (window.location.hash !== '#medidas-padrao') return
    window.requestAnimationFrame(() => {
      measuresSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [loading])

  /** Lista principal só com ativos; arquivados ficam no menu “Ver arquivados”. */
  const treeItems = useMemo(
    () => items.filter((c) => c.status !== 'archived'),
    [items],
  )

  const roots = useMemo(() => treeItems.filter((c) => !c.parentId), [treeItems])

  const childrenOf = (id: string) =>
    treeItems
      .filter((c) => c.parentId === id)
      .slice()
      .sort(
        (a, b) =>
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name),
      )

  const siblingsOf = (cat: Category) =>
    treeItems
      .filter((c) => (c.parentId ?? null) === (cat.parentId ?? null))
      .slice()
      .sort(
        (a, b) =>
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name),
      )

  const categoriaOptions = useMemo(() => {
    return items
      .filter(
        (c) =>
          !c.parentId &&
          (c.status !== 'archived' ||
            c.id === subgrupoCategoriaId ||
            c.id === parentId),
      )
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [items, subgrupoCategoriaId, parentId])

  /** Pai do Grupo = só Categorias; pai do Subgrupo = só Grupos (da categoria filtrada). */
  const parentOptions = useMemo(() => {
    const wantParentDepth = createLevel - 1
    if (wantParentDepth < 1) return []
    const pool = items.filter(
      (c) => c.status !== 'archived' || c.id === editing?.parentId,
    )
    let list = allowedCategoryParents(pool, editing?.id).filter(
      (p) => categoryDepth(items, p.id) === wantParentDepth,
    )
    if (createLevel === 3 && subgrupoCategoriaId) {
      list = list.filter((p) => p.parentId === subgrupoCategoriaId)
    } else if (createLevel === 3) {
      list = []
    }
    return list.sort((a, b) => a.name.localeCompare(b.name))
  }, [items, editing, createLevel, subgrupoCategoriaId])

  const resultingDepth = editing
    ? parentId
      ? categoryDepth(
          items.filter((c) => c.status !== 'archived' || c.id === editing.id),
          parentId,
        ) + 1
      : 1
    : createLevel

  const searchQ = search.trim().toLowerCase()
  const matchesSearch = (c: Category) =>
    !searchQ ||
    c.name.toLowerCase().includes(searchQ) ||
    c.slug.toLowerCase().includes(searchQ) ||
    (c.description ?? '').toLowerCase().includes(searchQ) ||
    categoryPath(treeItems, c.id).toLowerCase().includes(searchQ)

  const nodeOrDescendantMatches = (id: string): boolean => {
    const node = treeItems.find((c) => c.id === id)
    if (!node) return false
    if (matchesSearch(node)) return true
    return childrenOf(id).some((ch) => nodeOrDescendantMatches(ch.id))
  }

  const visibleRoots = useMemo(() => {
    const sorted = roots
      .slice()
      .sort(
        (a, b) =>
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name),
      )
    if (!searchQ) return sorted
    return sorted.filter((root) => nodeOrDescendantMatches(root.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roots, treeItems, searchQ])

  const levelStats = useMemo(() => {
    let cat = 0
    let grp = 0
    let sub = 0
    for (const c of items) {
      if (c.status === 'archived') continue
      const d = categoryDepth(items, c.id)
      if (d === 1) cat += 1
      else if (d === 2) grp += 1
      else if (d === 3) sub += 1
    }
    return { cat, grp, sub }
  }, [items])

  const flatRows = useMemo(() => {
    return treeItems
      .map((c) => ({
        cat: c,
        depth: categoryDepth(items, c.id) as 1 | 2 | 3,
        path: categoryPath(items, c.id),
      }))
      .filter((row) => {
        if (levelFilter && row.depth !== levelFilter) return false
        if (!searchQ) return true
        return (
          row.cat.name.toLowerCase().includes(searchQ) ||
          row.cat.slug.toLowerCase().includes(searchQ) ||
          row.path.toLowerCase().includes(searchQ) ||
          (row.cat.description ?? '').toLowerCase().includes(searchQ)
        )
      })
      .sort((a, b) => a.path.localeCompare(b.path) || a.depth - b.depth)
  }, [treeItems, items, levelFilter, searchQ])

  useEffect(() => {
    if (!searchQ) return
    setExpanded((prev) => {
      const next = new Set(prev)
      for (const root of roots) {
        if (!nodeOrDescendantMatches(root.id)) continue
        next.add(root.id)
        for (const cat of childrenOf(root.id)) {
          if (
            matchesSearch(cat) ||
            childrenOf(cat.id).some(matchesSearch) ||
            matchesSearch(root)
          ) {
            next.add(cat.id)
          }
        }
      }
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQ, treeItems])

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function resetForm() {
    setEditing(null)
    setName('')
    setDescription('')
    setParentId('')
    setSubgrupoCategoriaId('')
    setSortOrder('0')
    setEmoji('')
    setDefaultWeightKg('')
    setDefaultLengthCm('')
    setDefaultWidthCm('')
    setDefaultHeightCm('')
    setCreateLevel(1)
  }

  function focusForm() {
    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    })
  }

  function startCreate(level: CreateLevel) {
    setEditing(null)
    setName('')
    setDescription('')
    setEmoji('') // ícone só na Categoria (raiz / L1)
    setDefaultWeightKg('')
    setDefaultLengthCm('')
    setDefaultWidthCm('')
    setDefaultHeightCm('')
    setCreateLevel(level)
    setError(null)
    setInfo(
      level === 1
        ? 'Nova Categoria (raiz — coluna categoria da planilha).'
        : level === 2
          ? 'Novo Grupo — escolha a Categoria pai (coluna grupo da planilha).'
          : 'Novo Subgrupo — escolha o Grupo pai (coluna subgrupo da planilha).',
    )
    if (level === 1) {
      setParentId('')
      setSubgrupoCategoriaId('')
      setSortOrder(String(roots.length))
    } else if (level === 2) {
      setSubgrupoCategoriaId('')
      const cats = items
        .filter((c) => !c.parentId && c.status !== 'archived')
        .sort((a, b) => a.name.localeCompare(b.name))
      const first = cats[0]
      setParentId(first?.id ?? '')
      setSortOrder(first ? String(childrenOf(first.id).length) : '0')
    } else {
      // Subgrupo: escolhe categoria, depois só grupos dessa categoria.
      const cats = items
        .filter((c) => !c.parentId && c.status !== 'archived')
        .sort((a, b) => a.name.localeCompare(b.name))
      const catId = cats[0]?.id ?? ''
      setSubgrupoCategoriaId(catId)
      const grupos = items
        .filter(
          (c) =>
            c.parentId === catId &&
            c.status !== 'archived' &&
            categoryDepth(items, c.id) === 2,
        )
        .sort((a, b) => a.name.localeCompare(b.name))
      const firstGrupo = grupos[0]
      setParentId(firstGrupo?.id ?? '')
      setSortOrder(firstGrupo ? String(childrenOf(firstGrupo.id).length) : '0')
    }
    focusForm()
  }

  function startEdit(cat: Category) {
    const depth = Math.min(3, Math.max(1, categoryDepth(items, cat.id))) as CreateLevel
    setEditing(cat)
    setName(cat.name)
    setDescription(cat.description ?? '')
    setParentId(cat.parentId ?? '')
    setSortOrder(String(cat.sortOrder ?? 0))
    setEmoji(depth === 1 ? (cat.emoji ?? '') : '')
    setDefaultWeightKg(fmtMeasure(cat.defaultWeightKg))
    setDefaultLengthCm(fmtMeasure(cat.defaultLengthCm))
    setDefaultWidthCm(fmtMeasure(cat.defaultWidthCm))
    setDefaultHeightCm(fmtMeasure(cat.defaultHeightCm))
    setCreateLevel(depth)
    if (depth === 3 && cat.parentId) {
      const grupo = items.find((c) => c.id === cat.parentId)
      setSubgrupoCategoriaId(grupo?.parentId ?? '')
    } else {
      setSubgrupoCategoriaId('')
    }
    setError(null)
    setInfo(null)
    focusForm()
  }

  function startAddChild(parent: Category) {
    const depth = categoryDepth(items, parent.id)
    if (depth >= CATEGORY_MAX_DEPTH) {
      setError('Subgrupo não pode ter filhos (máx. 3 níveis).')
      return
    }
    const nextLevel = (depth + 1) as CreateLevel
    setEditing(null)
    setName('')
    setDescription('')
    setEmoji('')
    setDefaultWeightKg('')
    setDefaultLengthCm('')
    setDefaultWidthCm('')
    setDefaultHeightCm('')
    setCreateLevel(nextLevel)
    setParentId(parent.id)
    if (nextLevel === 3) {
      setSubgrupoCategoriaId(parent.parentId ?? '')
    } else if (nextLevel === 2) {
      setSubgrupoCategoriaId('')
    } else {
      setSubgrupoCategoriaId('')
    }
    setSortOrder(String(childrenOf(parent.id).length))
    setError(null)
    setInfo(`Nova ${categoryLevelLabel(nextLevel).toLowerCase()} sob "${parent.name}".`)
    setExpanded((prev) => new Set(prev).add(parent.id))
    focusForm()
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    const effectiveParent = createLevel === 1 && !editing ? '' : parentId
    if (!editing && createLevel > 1 && !effectiveParent) {
      setError(`Selecione o pai para criar ${categoryLevelLabel(createLevel).toLowerCase()}.`)
      return
    }
    try {
      const depthForIcon = editing
        ? resultingDepth
        : createLevel
      // Só Categoria (raiz / planilha) guarda ícone; Grupo/Subgrupo limpam.
      const emojiToSave = depthForIcon === 1 ? emoji || null : null
      const saved = await adminUpsertCategory({
        id: editing?.id,
        name,
        description: description || undefined,
        parentId: effectiveParent || null,
        status: editing?.status ?? 'published',
        sortOrder: Number(sortOrder) || 0,
        emoji: emojiToSave,
        defaultWeightKg: parseOptionalMeasure(defaultWeightKg),
        defaultLengthCm: parseOptionalMeasure(defaultLengthCm),
        defaultWidthCm: parseOptionalMeasure(defaultWidthCm),
        defaultHeightCm: parseOptionalMeasure(defaultHeightCm),
        allCategories: items,
      })
      if (saved.parentId) {
        setExpanded((prev) => new Set(prev).add(saved.parentId!))
      }
      resetForm()
      await reload()
      setInfo('Classificação salva.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar')
    }
  }

  async function onApplyDefaultMeasures() {
    if (!editing) return
    setError(null)
    setInfo(null)
    const { confirmed } = await confirmDialog({
      title: 'Aplicar medidas padrão',
      message:
        `Aplicar peso/dimensões padrão de "${editing.name}" aos produtos desta classificação e subárvore? ` +
        'Medidas marcadas como Manual no produto não serão alteradas.',
      confirmLabel: 'Aplicar (respeitar Manual)',
    })
    if (!confirmed) return
    setBusyApplyMeasures(true)
    try {
      // Garante defaults salvos antes do apply (mesmo se o operador não clicou Salvar).
      await adminUpsertCategory({
        id: editing.id,
        name: editing.name,
        description: editing.description,
        parentId: editing.parentId ?? null,
        status: editing.status ?? 'published',
        sortOrder: editing.sortOrder ?? 0,
        emoji: editing.emoji ?? null,
        defaultWeightKg: parseOptionalMeasure(defaultWeightKg),
        defaultLengthCm: parseOptionalMeasure(defaultLengthCm),
        defaultWidthCm: parseOptionalMeasure(defaultWidthCm),
        defaultHeightCm: parseOptionalMeasure(defaultHeightCm),
        allCategories: items,
      })
      const r = await adminApplyCategoryDefaultMeasures({
        categoryId: editing.id,
        allCategories: await adminListCategories(),
        mode: 'skip_manual',
      })
      await reload()
      const refreshed = (await adminListCategories()).find((c) => c.id === editing.id)
      if (refreshed) startEdit(refreshed)
      setInfo(
        r.productCount === 0
          ? 'Nenhum produto nesta classificação/subárvore.'
          : `Padrão aplicado: ${r.productCount} produto(s) no escopo · ${r.updatedFieldRows} campo(s) atualizado(s) (origem Global).`,
      )
    } catch (err) {
      setError(toUserMessage(err, 'Falha ao aplicar medidas padrão'))
    } finally {
      setBusyApplyMeasures(false)
    }
  }

  async function onArchiveToggle(cat: Category) {
    setError(null)
    setBusyId(cat.id)
    try {
      if (cat.status !== 'archived') {
        const kids = items.filter((c) => c.parentId === cat.id && c.status !== 'archived')
        if (kids.length > 0) {
          setError(
            `Não é possível arquivar "${cat.name}" enquanto houver filhos (${kids.length}). Arquive ou mova os filhos antes.`,
          )
          return
        }
        const productCount = counts[cat.id] ?? (await adminCountProductsInCategory(cat.id))
        if (productCount > 0) {
          setError(
            `Há ${productCount} produto(s) nesta classificação. Reclassifique-os antes de arquivar.`,
          )
          return
        }
      }
      await adminSetCategoryStatus(
        cat.id,
        cat.status === 'archived' ? 'published' : 'archived',
      )
      await reload()
      setInfo(cat.status === 'archived' ? 'Publicado novamente.' : 'Arquivado.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao alterar status')
    } finally {
      setBusyId(null)
    }
  }

  async function onDelete(cat: Category) {
    {
      const { confirmed } = await confirmDialog({
        title: 'Excluir categoria?',
        message: `Excluir permanentemente "${cat.name}"?\n\nSó funciona sem filhos e sem produtos. Prefira Arquivar para remoção comercial.`,
        confirmLabel: 'Excluir',
        danger: true,
      })
      if (!confirmed) return
    }
    setError(null)
    setBusyId(cat.id)
    try {
      await adminDeleteCategory(cat.id, items)
      if (editing?.id === cat.id) resetForm()
      await reload()
      setInfo('Classificação excluída.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao excluir')
    } finally {
      setBusyId(null)
    }
  }

  async function onReorder(cat: Category, direction: 'up' | 'down') {
    setError(null)
    setBusyId(cat.id)
    try {
      await adminReorderSiblingCategories(
        items.filter((c) => c.status !== 'archived'),
        cat.id,
        direction,
      )
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao reordenar')
    } finally {
      setBusyId(null)
    }
  }

  function renderNode(cat: Category, depth: number) {
    const kids = childrenOf(cat.id)
    const hasKids = kids.length > 0
    const isOpen = expanded.has(cat.id) || Boolean(searchQ && hasKids)
    const level = categoryLevelLabel(depth)
    const canAddChild = depth < CATEGORY_MAX_DEPTH
    const sibs = siblingsOf(cat)
    const sibIdx = sibs.findIndex((s) => s.id === cat.id)
    const indentPx = (depth - 1) * 20
    const productCount = counts[cat.id] ?? 0
    const highlight =
      searchQ && matchesSearch(cat)
        ? 'bg-fal-yellow/20'
        : editing?.id === cat.id
          ? 'bg-fal-yellow/15'
          : cat.status === 'archived'
            ? 'opacity-60'
            : ''

    return (
      <div key={cat.id}>
        <div
          className={`flex flex-wrap items-center gap-2 border-t border-fal-line px-3 py-2 text-sm ${highlight}`}
          style={{ paddingLeft: 12 + indentPx }}
        >
          <button
            type="button"
            className="w-6 shrink-0 font-bold text-fal-navy disabled:opacity-30"
            disabled={!hasKids}
            aria-label={isOpen ? 'Recolher' : 'Expandir'}
            onClick={() => toggleExpanded(cat.id)}
          >
            {hasKids ? (isOpen ? '▾' : '▸') : '·'}
          </button>
          {depth === 1 ? <CategoryIconThumb cat={cat} /> : null}
          <div className="min-w-[160px] flex-1">
            <div
              className={depth === 1 ? 'font-extrabold text-fal-navy' : 'font-semibold text-fal-navy'}
            >
              {cat.name}
            </div>
            <div className="text-xs text-fal-muted">
              {level}
              {cat.description ? ` · ${cat.description}` : ''}
              {' · '}
              {productCount} prod.
            </div>
          </div>
          <span className="hidden text-xs text-fal-muted lg:inline">
            {categoryPath(treeItems, cat.id)}
          </span>
          <span className="text-xs text-fal-muted">#{cat.sortOrder ?? 0}</span>
          <span className="text-xs">{categoryStatusLabel(cat.status)}</span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="font-semibold text-fal-navy underline disabled:opacity-40"
              disabled={busyId === cat.id || sibIdx <= 0}
              onClick={() => void onReorder(cat, 'up')}
              title="Subir entre irmãos"
            >
              ↑
            </button>
            <button
              type="button"
              className="font-semibold text-fal-navy underline disabled:opacity-40"
              disabled={busyId === cat.id || sibIdx < 0 || sibIdx >= sibs.length - 1}
              onClick={() => void onReorder(cat, 'down')}
              title="Descer entre irmãos"
            >
              ↓
            </button>
            <button
              type="button"
              className="font-semibold text-fal-auth-link"
              onClick={() => startEdit(cat)}
            >
              Editar
            </button>
            {canAddChild && cat.status !== 'archived' ? (
              <button
                type="button"
                className="font-semibold text-fal-navy underline"
                onClick={() => startAddChild(cat)}
              >
                + {categoryLevelLabel(depth + 1)}
              </button>
            ) : null}
            <button
              type="button"
              className="font-semibold text-fal-muted"
              disabled={busyId === cat.id}
              onClick={() => void onArchiveToggle(cat)}
            >
              {cat.status === 'archived' ? 'Publicar' : 'Arquivar'}
            </button>
            <button
              type="button"
              className="font-semibold text-red-700 underline disabled:opacity-50"
              disabled={busyId === cat.id}
              onClick={() => void onDelete(cat)}
            >
              Excluir
            </button>
          </div>
        </div>
        {hasKids && isOpen
          ? kids
              .filter(
                (ch) =>
                  !searchQ ||
                  matchesSearch(ch) ||
                  nodeOrDescendantMatches(ch.id) ||
                  matchesSearch(cat),
              )
              .map((ch) => renderNode(ch, depth + 1))
          : null}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold text-fal-navy">Classificação</h1>
      <p className="text-sm text-fal-muted">
        Mesma árvore da planilha e do cadastro manual:{' '}
        <strong>Categoria</strong> → <strong>Grupo</strong> → <strong>Subgrupo</strong>. Edite,
        arquive ou exclua aqui; arquivados ficam no menu discreto abaixo.
      </p>

      <div className="flex flex-wrap items-center gap-3 rounded-[12px] border border-fal-line bg-fal-bg px-3 py-2 text-sm text-fal-navy">
        <span>
          <strong>{levelStats.cat}</strong> categorias
        </span>
        <span>
          <strong>{levelStats.grp}</strong> grupos
        </span>
        <span>
          <strong>{levelStats.sub}</strong> subgrupos
        </span>
        <CategoriesArchivedMenu items={items} onChanged={reload} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="light" onClick={() => startCreate(1)}>
          + Categoria
        </Button>
        <Button type="button" variant="light" onClick={() => startCreate(2)}>
          + Grupo
        </Button>
        <Button type="button" variant="light" onClick={() => startCreate(3)}>
          + Subgrupo
        </Button>
      </div>

      <CategoriesEditorForm
        formRef={formRef}
        nameInputRef={nameInputRef}
        measuresSectionRef={measuresSectionRef}
        items={items}
        editing={editing}
        createLevel={createLevel}
        name={name}
        description={description}
        parentId={parentId}
        subgrupoCategoriaId={subgrupoCategoriaId}
        sortOrder={sortOrder}
        emoji={emoji}
        defaultWeightKg={defaultWeightKg}
        defaultLengthCm={defaultLengthCm}
        defaultWidthCm={defaultWidthCm}
        defaultHeightCm={defaultHeightCm}
        resultingDepth={resultingDepth}
        categoriaOptions={categoriaOptions}
        parentOptions={parentOptions}
        busyId={busyId}
        busyApplyMeasures={busyApplyMeasures}
        childrenCount={(id) => childrenOf(id).length}
        onSubmit={onSubmit}
        onStartCreate={startCreate}
        onReset={resetForm}
        onDelete={(c) => void onDelete(c)}
        onApplyDefaultMeasures={() => void onApplyDefaultMeasures()}
        onName={setName}
        onDescription={setDescription}
        onParentId={setParentId}
        onSubgrupoCategoriaId={setSubgrupoCategoriaId}
        onSortOrder={setSortOrder}
        onEmoji={setEmoji}
        onDefaultWeightKg={setDefaultWeightKg}
        onDefaultLengthCm={setDefaultLengthCm}
        onDefaultWidthCm={setDefaultWidthCm}
        onDefaultHeightCm={setDefaultHeightCm}
      />

      <CategoriesBrowseBar
        search={search}
        levelFilter={levelFilter}
        viewMode={viewMode}
        onSearch={setSearch}
        onLevelFilter={setLevelFilter}
        onViewMode={setViewMode}
      />
      {viewMode === 'tree' ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="light"
            onClick={() =>
              setExpanded(
                new Set(
                  treeItems
                    .filter((c) => treeItems.some((ch) => ch.parentId === c.id))
                    .map((c) => c.id),
                ),
              )
            }
          >
            Expandir tudo
          </Button>
          <Button type="button" variant="light" onClick={() => setExpanded(new Set())}>
            Recolher tudo
          </Button>
        </div>
      ) : null}

      {error ? <p className="text-sm text-fal-danger">{error}</p> : null}
      {info ? <p className="text-sm text-green-700">{info}</p> : null}
      {loading ? <Loading /> : null}

      <div className="rounded-[14px] border border-fal-line bg-white">
        <div className="flex flex-wrap gap-4 border-b border-fal-line bg-fal-bg px-3 py-2 text-xs font-extrabold text-fal-muted">
          <span>Categoria</span>
          <span>→ Grupo</span>
          <span>→ Subgrupo</span>
          <span className="font-normal">
            · {viewMode === 'list' ? 'Lista plana' : 'Árvore'} · import + manual
          </span>
        </div>
        {viewMode === 'list' ? (
          flatRows.length === 0 ? (
            <div className="px-3 py-4">
              <EmptyState
                title="Nenhuma classificação encontrada"
                description="Ajuste o filtro de nível ou limpe a busca. Arquivados ficam no link “Ver arquivados” do resumo acima."
              >
                <div className="mt-4 flex justify-center gap-2">
                  <Button type="button" onClick={() => startCreate(1)}>
                    + Criar categoria
                  </Button>
                </div>
              </EmptyState>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-fal-bg text-xs font-extrabold uppercase text-fal-muted">
                  <tr>
                    <th className="px-3 py-2">Nível</th>
                    <th className="px-3 py-2">Nome</th>
                    <th className="px-3 py-2">Caminho</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Prod.</th>
                    <th className="px-3 py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {flatRows.map(({ cat, depth, path }) => (
                    <tr
                      key={cat.id}
                      className={`border-t border-fal-line ${
                        editing?.id === cat.id
                          ? 'bg-fal-yellow/15'
                          : cat.status === 'archived'
                            ? 'bg-amber-50/80'
                            : ''
                      }`}
                    >
                      <td className="px-3 py-2 whitespace-nowrap text-xs font-bold text-fal-muted">
                        {categoryLevelLabel(depth)}
                      </td>
                      <td className="px-3 py-2 font-semibold text-fal-navy">
                        <span className="inline-flex items-center gap-2">
                          {depth === 1 ? <CategoryIconThumb cat={cat} /> : null}
                          {cat.name}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-fal-muted">{path}</td>
                      <td className="px-3 py-2 text-xs">{categoryStatusLabel(cat.status)}</td>
                      <td className="px-3 py-2 text-xs">{counts[cat.id] ?? 0}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="font-semibold text-fal-auth-link"
                            onClick={() => startEdit(cat)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="font-semibold text-fal-muted"
                            disabled={busyId === cat.id}
                            onClick={() => void onArchiveToggle(cat)}
                          >
                            {cat.status === 'archived' ? 'Publicar' : 'Arquivar'}
                          </button>
                          {depth < CATEGORY_MAX_DEPTH && cat.status !== 'archived' ? (
                            <button
                              type="button"
                              className="font-semibold text-fal-navy underline"
                              onClick={() => startAddChild(cat)}
                            >
                              + {categoryLevelLabel(depth + 1)}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : visibleRoots.length === 0 ? (
          <div className="px-3 py-4">
            <EmptyState
              title="Nenhuma classificação encontrada"
              description="Limpe a busca. Arquivados ficam no link “Ver arquivados” do resumo acima."
            >
              <div className="mt-4 flex justify-center gap-2">
                <Button type="button" onClick={() => startCreate(1)}>
                  + Criar categoria
                </Button>
              </div>
            </EmptyState>
          </div>
        ) : (
          visibleRoots.map((root) => renderNode(root, 1))
        )}
      </div>
    </div>
  )
}
