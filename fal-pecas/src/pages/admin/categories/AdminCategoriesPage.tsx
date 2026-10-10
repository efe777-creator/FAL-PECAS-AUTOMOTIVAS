import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import {
  CATEGORY_EMOJI_PALETTE,
  CATEGORY_IMG_KEYS,
  resolveCategoryIcon,
} from '@/lib/categoryEmoji'
import {
  adminCountProductsInCategory,
  adminCountProductsPerCategory,
  adminDeleteCategory,
  adminListCategories,
  adminPublishAllArchivedCategories,
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

type CreateLevel = 1 | 2 | 3

function statusLabel(status: Category['status']): string {
  if (status === 'archived') return 'Arquivado'
  if (status === 'published') return 'Publicado'
  if (status === 'draft') return 'Rascunho'
  return status ?? '—'
}

function CategoryIconThumb({ cat }: { cat: Pick<Category, 'slug' | 'name' | 'emoji'> }) {
  const icon = resolveCategoryIcon(cat)
  if (icon.type === 'image') {
    return (
      <img src={icon.src} alt={icon.alt} className="h-7 w-7 object-contain" loading="lazy" />
    )
  }
  return <span className="text-xl leading-none">{icon.value}</span>
}

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
  /** Importados sem produto costumam ficar arquivados — mostrar por padrão para editar. */
  const [showArchived, setShowArchived] = useState(true)
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('list')
  const [levelFilter, setLevelFilter] = useState<0 | 1 | 2 | 3>(0)
  const formRef = useRef<HTMLFormElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

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

  const treeItems = useMemo(
    () => (showArchived ? items : items.filter((c) => c.status !== 'archived')),
    [items, showArchived],
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
    let archived = 0
    for (const c of items) {
      const d = categoryDepth(items, c.id)
      if (d === 1) cat += 1
      else if (d === 2) grp += 1
      else if (d === 3) sub += 1
      if (c.status === 'archived') archived += 1
    }
    return { cat, grp, sub, archived, total: items.length }
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

  async function onPublishAllArchived() {
    if (levelStats.archived === 0) return
    if (
      !window.confirm(
        `Publicar ${levelStats.archived} classificação(ões) arquivada(s)?\n\nÚtil para reativar categoria/grupo/subgrupo vindos da importação e usá-los de novo na planilha.`,
      )
    ) {
      return
    }
    setBusyId('__bulk__')
    setError(null)
    try {
      const n = await adminPublishAllArchivedCategories()
      setInfo(`${n} classificação(ões) publicadas. Já aparecem para edição e importação.`)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao publicar arquivadas')
    } finally {
      setBusyId(null)
    }
  }

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
    if (
      !window.confirm(
        `Excluir permanentemente "${cat.name}"?\n\nSó funciona sem filhos e sem produtos. Prefira Arquivar para remoção comercial.`,
      )
    ) {
      return
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
          <span className="text-xs">{statusLabel(cat.status)}</span>
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

  const previewIcon = resolveCategoryIcon({
    name,
    slug: editing?.slug,
    emoji: emoji || null,
  })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold text-fal-navy">Classificação</h1>
      <p className="text-sm text-fal-muted">
        Mesma árvore da planilha e do cadastro manual:{' '}
        <strong>Categoria</strong> → <strong>Grupo</strong> → <strong>Subgrupo</strong>. Tudo que
        a importação criou ou que você cadastrou aparece aqui para editar, publicar ou excluir.
      </p>

      <div className="flex flex-wrap gap-3 rounded-[12px] border border-fal-line bg-fal-bg px-3 py-2 text-sm text-fal-navy">
        <span>
          <strong>{levelStats.cat}</strong> categorias
        </span>
        <span>
          <strong>{levelStats.grp}</strong> grupos
        </span>
        <span>
          <strong>{levelStats.sub}</strong> subgrupos
        </span>
        {levelStats.archived > 0 ? (
          <span className="text-amber-800">
            <strong>{levelStats.archived}</strong> arquivadas (import sem produto costuma arquivar —
            use Publicar)
          </span>
        ) : null}
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
        {levelStats.archived > 0 ? (
          <Button
            type="button"
            variant="primary"
            disabled={busyId === '__bulk__'}
            onClick={() => void onPublishAllArchived()}
          >
            Publicar todas arquivadas ({levelStats.archived})
          </Button>
        ) : null}
      </div>

      <form
        ref={formRef}
        onSubmit={onSubmit}
        className={`grid gap-3 rounded-[14px] border bg-white p-4 md:grid-cols-2 ${
          editing || name || parentId || createLevel > 1
            ? 'border-fal-yellow-dark ring-2 ring-fal-yellow/40'
            : 'border-fal-line'
        }`}
      >
        <div className="md:col-span-2 flex flex-wrap items-center gap-3">
          <span className="text-xs font-extrabold uppercase tracking-wide text-fal-muted">
            {editing
              ? `Editando ${categoryLevelLabel(categoryDepth(items, editing.id))}`
              : `Criando ${categoryLevelLabel(createLevel)}`}
          </span>
          {!editing ? (
            <div className="flex flex-wrap gap-1">
              {([1, 2, 3] as CreateLevel[]).map((lv) => (
                <button
                  key={lv}
                  type="button"
                  className={`rounded-md px-2 py-1 text-xs font-bold ${
                    createLevel === lv
                      ? 'bg-fal-navy text-white'
                      : 'bg-fal-bg text-fal-navy'
                  }`}
                  onClick={() => startCreate(lv)}
                >
                  {categoryLevelLabel(lv)}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <Input
          ref={nameInputRef}
          label="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          hint="Nós da planilha e manuais: edite nome/pai/ícone aqui."
        />
        <Input
          label="Descrição (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {createLevel === 2 ? (
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-fal-navy">Categoria pai</span>
            <select
              className="w-full rounded-[10px] border border-fal-line bg-white px-3 py-2"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              required
            >
              <option value="">Selecione…</option>
              {parentOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-[13px] text-fal-muted">
              Só categorias cadastradas (manual ou importação).
            </span>
          </label>
        ) : null}

        {createLevel === 3 ? (
          <>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-fal-navy">Categoria</span>
              <select
                className="w-full rounded-[10px] border border-fal-line bg-white px-3 py-2"
                value={subgrupoCategoriaId}
                onChange={(e) => {
                  const catId = e.target.value
                  setSubgrupoCategoriaId(catId)
                  const grupos = items
                    .filter(
                      (c) =>
                        c.parentId === catId &&
                        c.status !== 'archived' &&
                        categoryDepth(items, c.id) === 2,
                    )
                    .sort((a, b) => a.name.localeCompare(b.name))
                  const first = grupos[0]
                  setParentId(first?.id ?? '')
                  setSortOrder(first ? String(childrenOf(first.id).length) : '0')
                }}
                required
              >
                <option value="">Selecione…</option>
                {categoriaOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-fal-navy">Grupo pai</span>
              <select
                className="w-full rounded-[10px] border border-fal-line bg-white px-3 py-2"
                value={parentId}
                onChange={(e) => {
                  setParentId(e.target.value)
                  if (e.target.value) {
                    setSortOrder(String(childrenOf(e.target.value).length))
                  }
                }}
                required
                disabled={!subgrupoCategoriaId}
              >
                <option value="">
                  {subgrupoCategoriaId ? 'Selecione o grupo…' : 'Escolha a categoria antes…'}
                </option>
                {parentOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-[13px] text-fal-muted">
                Só grupos cadastrados nesta categoria (manual ou importação).
              </span>
            </label>
          </>
        ) : null}

        {createLevel === 1 ? (
          <div className="rounded-[10px] border border-dashed border-fal-line bg-fal-bg px-3 py-3 text-sm text-fal-muted">
            Categoria raiz (planilha: coluna <code className="text-xs">categoria</code>) — sem pai.
          </div>
        ) : null}

        <Input
          label="Ordem"
          inputMode="numeric"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          hint="Menor número primeiro entre irmãos. Também dá para usar ↑↓ na árvore."
        />

        {resultingDepth === 1 ? (
          <div className="md:col-span-2 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-fal-navy">Ícone (só categoria raiz)</span>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-fal-line bg-fal-bg">
                {previewIcon.type === 'image' ? (
                  <img
                    src={previewIcon.src}
                    alt={previewIcon.alt}
                    className="h-7 w-7 object-contain"
                  />
                ) : (
                  <span className="text-2xl">{previewIcon.value}</span>
                )}
              </span>
              <button
                type="button"
                className="text-xs font-semibold text-fal-muted underline"
                onClick={() => setEmoji('')}
              >
                Automático (slug/nome)
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                title="Asset Suspensão"
                className={`rounded-[10px] border px-2 py-1 ${
                  emoji === CATEGORY_IMG_KEYS.suspensao
                    ? 'border-fal-navy ring-2 ring-fal-yellow/50'
                    : 'border-fal-line'
                }`}
                onClick={() => setEmoji(CATEGORY_IMG_KEYS.suspensao)}
              >
                <img
                  src="/icons/categories/suspensao.png"
                  alt="Suspensão"
                  className="h-7 w-7 object-contain"
                />
              </button>
              <button
                type="button"
                title="Asset Freios"
                className={`rounded-[10px] border px-2 py-1 ${
                  emoji === CATEGORY_IMG_KEYS.freios
                    ? 'border-fal-navy ring-2 ring-fal-yellow/50'
                    : 'border-fal-line'
                }`}
                onClick={() => setEmoji(CATEGORY_IMG_KEYS.freios)}
              >
                <img
                  src="/icons/categories/freios.png"
                  alt="Freios"
                  className="h-7 w-7 object-contain"
                />
              </button>
              <button
                type="button"
                title="Asset Filtros"
                className={`rounded-[10px] border px-2 py-1 ${
                  emoji === CATEGORY_IMG_KEYS.filtros
                    ? 'border-fal-navy ring-2 ring-fal-yellow/50'
                    : 'border-fal-line'
                }`}
                onClick={() => setEmoji(CATEGORY_IMG_KEYS.filtros)}
              >
                <img
                  src="/icons/categories/filtros.png"
                  alt="Filtros"
                  className="h-7 w-7 object-contain"
                />
              </button>
              {CATEGORY_EMOJI_PALETTE.map((em) => (
                <button
                  key={em}
                  type="button"
                  className={`grid h-10 w-10 place-items-center rounded-[10px] border text-xl ${
                    emoji === em
                      ? 'border-fal-navy ring-2 ring-fal-yellow/50'
                      : 'border-fal-line'
                  }`}
                  onClick={() => setEmoji(em)}
                >
                  {em}
                </button>
              ))}
            </div>
            <Input
              label="Ícone customizado (opcional)"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              hint="Apenas Categoria (raiz). Emoji ou img:suspensao / img:freios / img:filtros. Vazio = automático."
            />
          </div>
        ) : (
          <p className="md:col-span-2 text-sm text-fal-muted">
            Ícone só na <strong>Categoria</strong> (raiz). Grupo e subgrupo não têm ícone.
          </p>
        )}

        <div className="flex flex-wrap items-end gap-2 md:col-span-2">
          <Button type="submit" variant="primary" disabled={resultingDepth > CATEGORY_MAX_DEPTH}>
            {editing ? 'Salvar alterações' : `Criar ${categoryLevelLabel(createLevel).toLowerCase()}`}
          </Button>
          {editing || name || parentId || createLevel > 1 ? (
            <Button type="button" variant="light" onClick={resetForm}>
              Cancelar
            </Button>
          ) : null}
          {editing ? (
            <Button
              type="button"
              variant="light"
              disabled={busyId === editing.id}
              onClick={() => void onDelete(editing)}
            >
              Excluir
            </Button>
          ) : null}
        </div>
      </form>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <Input
            label="Buscar classificação"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nome, path, slug ou descrição…"
          />
        </div>
        <label className="block text-sm pb-2">
          <span className="mb-1 block font-semibold text-fal-navy">Nível</span>
          <select
            className="rounded-[10px] border border-fal-line bg-white px-3 py-2"
            value={levelFilter}
            onChange={(e) => {
              const v = Number(e.target.value) as 0 | 1 | 2 | 3
              setLevelFilter(v)
              if (v === 2 || v === 3) setViewMode('list')
            }}
          >
            <option value={0}>Todos</option>
            <option value={1}>Só categorias</option>
            <option value={2}>Só grupos</option>
            <option value={3}>Só subgrupos</option>
          </select>
        </label>
        <div className="flex flex-wrap gap-1 pb-2">
          <button
            type="button"
            className={`rounded-md px-3 py-2 text-xs font-bold ${
              viewMode === 'list' ? 'bg-fal-navy text-white' : 'bg-fal-bg text-fal-navy'
            }`}
            onClick={() => setViewMode('list')}
          >
            Lista
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-2 text-xs font-bold ${
              viewMode === 'tree' ? 'bg-fal-navy text-white' : 'bg-fal-bg text-fal-navy'
            }`}
            onClick={() => setViewMode('tree')}
          >
            Árvore
          </button>
        </div>
        <label className="inline-flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Mostrar arquivadas
        </label>
        {viewMode === 'tree' ? (
          <>
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
          </>
        ) : null}
      </div>

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
                description="Ajuste o filtro de nível, marque “Mostrar arquivadas” ou limpe a busca."
              >
                <div className="mt-4 flex justify-center gap-2">
                  <Button type="button" variant="light" onClick={() => setShowArchived(true)}>
                    Mostrar arquivadas
                  </Button>
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
                      <td className="px-3 py-2 text-xs">{statusLabel(cat.status)}</td>
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
              description="Marque “Mostrar arquivadas” para ver nós da importação sem produto, ou limpe a busca."
            >
              <div className="mt-4 flex justify-center gap-2">
                <Button type="button" variant="light" onClick={() => setShowArchived(true)}>
                  Mostrar arquivadas
                </Button>
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
