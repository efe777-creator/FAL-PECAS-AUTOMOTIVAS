import { CategoriesArchivedMenu } from '@/components/admin/categories/CategoriesArchivedMenu'
import { CategoriesBrowseBar } from '@/components/admin/categories/CategoriesBrowseBar'
import { CategoriesBrowsePanel } from '@/components/admin/categories/CategoriesBrowsePanel'
import { CategoriesIntegrityPanel } from '@/components/admin/categories/CategoriesIntegrityPanel'
import {
  CategoriesEditorForm,
  type CreateLevel,
} from '@/components/admin/categories/CategoriesEditorForm'
import { Button } from '@/components/common/Button'
import { confirmDialog } from '@/components/common/ConfirmDialog'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useUnsavedChangesBlocker } from '@/hooks/useUnsavedChangesBlocker'
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
  useDocumentTitle('Classificação | Admin FAL')
  const toast = useToast()
  const [items, setItems] = useState<Category[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  function pushError(msg: string) {
    setError(msg)
    toast.push(msg, 'error')
  }

  function pushOk(msg: string) {
    setInfo(msg)
    toast.push(msg, 'success')
  }
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
  const [dirty, setDirty] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const measuresSectionRef = useRef<HTMLDivElement>(null)

  useUnsavedChangesBlocker(dirty, {
    message:
      'Há alterações na classificação ainda não salvas. Sair mesmo assim?',
  })
  useEffect(() => {
    if (!dirty) return
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

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
      pushError(toUserMessage(e, 'Erro ao carregar categorias'))
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
    setDirty(false)
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
    setDirty(false)
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
    setDirty(false)
    focusForm()
  }

  function startAddChild(parent: Category) {
    const depth = categoryDepth(items, parent.id)
    if (depth >= CATEGORY_MAX_DEPTH) {
      pushError('Subgrupo não pode ter filhos (máx. 3 níveis).')
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
    setDirty(false)
    setExpanded((prev) => new Set(prev).add(parent.id))
    focusForm()
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    const effectiveParent = createLevel === 1 && !editing ? '' : parentId
    if (!editing && createLevel > 1 && !effectiveParent) {
      pushError(`Selecione o pai para criar ${categoryLevelLabel(createLevel).toLowerCase()}.`)
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
      pushOk('Classificação salva.')
    } catch (err) {
      pushError(toUserMessage(err, 'Falha ao salvar'))
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
        'Medidas manuais do produto não serão alteradas.',
      confirmLabel: 'Aplicar (respeitar medidas manuais)',
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
      pushOk(
        r.productCount === 0
          ? 'Nenhum produto nesta classificação/subárvore.'
          : `Padrão aplicado: ${r.productCount} produto(s) no escopo · ${r.updatedFieldRows} campo(s) atualizado(s) (medida padrão da classificação).`,
      )
    } catch (err) {
      pushError(toUserMessage(err, 'Falha ao aplicar medidas padrão'))
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
          pushError(
            `Não é possível arquivar "${cat.name}" enquanto houver filhos (${kids.length}). Arquive ou mova os filhos antes.`,
          )
          return
        }
        const productCount = counts[cat.id] ?? (await adminCountProductsInCategory(cat.id))
        if (productCount > 0) {
          pushError(
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
      pushOk(cat.status === 'archived' ? 'Publicado novamente.' : 'Arquivado.')
    } catch (err) {
      pushError(toUserMessage(err, 'Falha ao alterar status'))
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
      pushOk('Classificação excluída.')
    } catch (err) {
      pushError(toUserMessage(err, 'Falha ao excluir'))
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
      pushError(toUserMessage(err, 'Falha ao reordenar'))
    } finally {
      setBusyId(null)
    }
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

      <CategoriesIntegrityPanel
        items={items}
        onChanged={reload}
        onError={pushError}
        onOk={pushOk}
      />

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

      {dirty ? (
        <p
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950"
          role="status"
        >
          Alterações na classificação não salvas. Clique em Salvar antes de sair do admin.
        </p>
      ) : null}

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
        onName={(v) => {
          setDirty(true)
          setName(v)
        }}
        onDescription={(v) => {
          setDirty(true)
          setDescription(v)
        }}
        onParentId={(v) => {
          setDirty(true)
          setParentId(v)
        }}
        onSubgrupoCategoriaId={(v) => {
          setDirty(true)
          setSubgrupoCategoriaId(v)
        }}
        onSortOrder={(v) => {
          setDirty(true)
          setSortOrder(v)
        }}
        onEmoji={(v) => {
          setDirty(true)
          setEmoji(v)
        }}
        onDefaultWeightKg={(v) => {
          setDirty(true)
          setDefaultWeightKg(v)
        }}
        onDefaultLengthCm={(v) => {
          setDirty(true)
          setDefaultLengthCm(v)
        }}
        onDefaultWidthCm={(v) => {
          setDirty(true)
          setDefaultWidthCm(v)
        }}
        onDefaultHeightCm={(v) => {
          setDirty(true)
          setDefaultHeightCm(v)
        }}
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

      <CategoriesBrowsePanel
        viewMode={viewMode}
        flatRows={flatRows}
        visibleRoots={visibleRoots}
        treeItems={treeItems}
        counts={counts}
        editingId={editing?.id ?? null}
        busyId={busyId}
        searchQ={searchQ}
        expanded={expanded}
        childrenOf={childrenOf}
        siblingsOf={siblingsOf}
        matchesSearch={matchesSearch}
        nodeOrDescendantMatches={nodeOrDescendantMatches}
        onToggleExpanded={toggleExpanded}
        onReorder={(cat, dir) => void onReorder(cat, dir)}
        onEdit={startEdit}
        onAddChild={startAddChild}
        onArchiveToggle={(cat) => void onArchiveToggle(cat)}
        onDelete={(cat) => void onDelete(cat)}
        onStartCreateRoot={() => startCreate(1)}
      />
    </div>
  )
}
