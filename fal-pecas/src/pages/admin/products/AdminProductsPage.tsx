import { Button } from '@/components/common/Button'
import { confirmDialog } from '@/components/common/ConfirmDialog'
import { Input } from '@/components/common/Input'
import { EmptyState } from '@/components/common/EmptyState'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import {
  CategoryCascadeSelects,
  effectiveCategoryId,
  type CategoryCascadeValue,
} from '@/components/admin/CategoryCascadeSelects'
import { productStatusLabel } from '@/lib/adminLabels'
import {
  adminListCategories,
  collectCategorySubtreeIds,
} from '@/services/admin/adminCategoryService'
import { subscribeCategoriesChanged } from '@/services/categories/categoryEvents'
import { adminListManufacturers } from '@/services/admin/adminManufacturerService'
import {
  ADMIN_PRODUCTS_PAGE_SIZE,
  adminApplyGlobalProductMeasures,
  adminBulkSetProductCategory,
  adminEvaluateReleaseChecklistBatch,
  adminListProductsPage,
  adminReleaseProductsToStore,
  adminSetProductStatus,
  adminSetProductsAvailability,
  type ApplyGlobalMeasuresMode,
  type ReleasePreflightRow,
} from '@/services/admin/adminProductService'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { CODIGO_REFERENCIA_LABEL } from '@/lib/productLabels'
import type { Category, Manufacturer, Product } from '@/types'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const EMPTY_CASCADE: CategoryCascadeValue = {
  categoriaId: '',
  grupoId: '',
  subgrupoId: '',
}

export function AdminProductsPage() {
  useDocumentTitle('Produtos | Admin FAL')
  const toast = useToast()
  const [items, setItems] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([])
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [availableFilter, setAvailableFilter] = useState('')
  const [manufacturerId, setManufacturerId] = useState('')
  const [filterCascade, setFilterCascade] = useState<CategoryCascadeValue>(EMPTY_CASCADE)
  const [withoutImage, setWithoutImage] = useState(false)
  const [measureGap, setMeasureGap] = useState<'' | 'weight' | 'dims' | 'any'>('')
  const [loading, setLoading] = useState(true)
  const [busyBulk, setBusyBulk] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [releasePreflight, setReleasePreflight] = useState<ReleasePreflightRow[] | null>(null)
  const [bulkWeight, setBulkWeight] = useState('')
  const [bulkHeight, setBulkHeight] = useState('')
  const [bulkWidth, setBulkWidth] = useState('')
  const [bulkLength, setBulkLength] = useState('')
  const [bulkMode, setBulkMode] = useState<ApplyGlobalMeasuresMode>('skip_manual')
  const [busyMeasures, setBusyMeasures] = useState(false)
  const [bulkCascade, setBulkCascade] = useState<CategoryCascadeValue>(EMPTY_CASCADE)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextOffset, setNextOffset] = useState(0)

  function pushError(message: string) {
    setError(message)
    toast.push(message, 'error')
  }

  function pushOk(message: string) {
    setError(null)
    toast.push(message, 'success')
  }

  const allPageSelected = items.length > 0 && items.every((p) => selected.has(p.id))
  const somePageSelected = items.some((p) => selected.has(p.id))
  const hasSelection = selected.size > 0
  const panelDisabled = !hasSelection || busyBulk || busyMeasures

  function listParams(overrides?: {
    q?: string
    status?: string
    availableFilter?: string
    manufacturerId?: string
    withoutImage?: boolean
    measureGap?: '' | 'weight' | 'dims' | 'any'
    filterCascade?: CategoryCascadeValue
    offset?: number
  }) {
    const nextQ = overrides?.q ?? q
    const nextStatus = overrides?.status ?? status
    const nextAvailable = overrides?.availableFilter ?? availableFilter
    const nextMaker = overrides?.manufacturerId ?? manufacturerId
    const nextNoImage = overrides?.withoutImage ?? withoutImage
    const nextGap = overrides?.measureGap ?? measureGap
    const nextCascade = overrides?.filterCascade ?? filterCascade
    const filterNode = effectiveCategoryId(nextCascade)
    const categoryIds = filterNode
      ? collectCategorySubtreeIds(categories, filterNode)
      : undefined
    const available =
      nextAvailable === 'true' ? true : nextAvailable === 'false' ? false : undefined
    return {
      q: nextQ,
      status: nextStatus || undefined,
      available,
      withoutImage: nextNoImage,
      measureGap: nextGap || undefined,
      categoryIds,
      manufacturerId: nextMaker || undefined,
      offset: overrides?.offset ?? 0,
      limit: ADMIN_PRODUCTS_PAGE_SIZE,
    }
  }

  async function reload(overrides?: {
    q?: string
    status?: string
    availableFilter?: string
    manufacturerId?: string
    withoutImage?: boolean
    measureGap?: '' | 'weight' | 'dims' | 'any'
    filterCascade?: CategoryCascadeValue
  }) {
    setLoading(true)
    setSelected(new Set())
    try {
      const page = await adminListProductsPage(listParams({ ...overrides, offset: 0 }))
      setItems(page.items)
      setHasMore(page.hasMore)
      setNextOffset(ADMIN_PRODUCTS_PAGE_SIZE)
      setError(null)
    } catch (e) {
      pushError(e instanceof Error ? e.message : 'Erro ao listar produtos')
    } finally {
      setLoading(false)
    }
  }

  async function loadMore() {
    setLoadingMore(true)
    setError(null)
    try {
      const page = await adminListProductsPage(listParams({ offset: nextOffset }))
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id))
        return [...prev, ...page.items.filter((p) => !seen.has(p.id))]
      })
      setHasMore(page.hasMore)
      setNextOffset((o) => o + ADMIN_PRODUCTS_PAGE_SIZE)
    } catch (e) {
      pushError(e instanceof Error ? e.message : 'Erro ao carregar mais produtos')
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    void (async () => {
      try {
        const [cats, makers] = await Promise.all([
          adminListCategories(),
          adminListManufacturers(),
        ])
        setCategories(cats)
        setManufacturers(makers)
      } catch (e) {
        pushError(e instanceof Error ? e.message : 'Erro ao carregar filtros')
      }
    })()
  }, [])

  useEffect(() => {
    return subscribeCategoriesChanged(() => {
      void adminListCategories()
        .then(setCategories)
        .catch(() => undefined)
    })
  }, [])

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function clearFilters() {
    setQ('')
    setStatus('')
    setAvailableFilter('')
    setManufacturerId('')
    setMeasureGap('')
    setFilterCascade(EMPTY_CASCADE)
    setWithoutImage(false)
  }

  function toggleSelectAllPage() {
    if (allPageSelected) {
      setSelected(new Set())
      return
    }
    setSelected(new Set(items.map((p) => p.id)))
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function toggleArchive(p: Product) {
    const next = p.status === 'archived' ? 'published' : 'archived'
    if (next === 'archived') {
      const { confirmed } = await confirmDialog({
        title: 'Arquivar produto?',
        message: `Remover "${p.name}" do catálogo público?\n\nO produto será arquivado (permanece no banco; some da loja e da busca).`,
        confirmLabel: 'Arquivar',
        danger: true,
      })
      if (!confirmed) return
    }
    setError(null)
    try {
      await adminSetProductStatus(p.id, next)
      pushOk(next === 'archived' ? 'Produto arquivado e removido da loja.' : 'Produto publicado novamente.')
      await reload()
    } catch (e) {
      pushError(e instanceof Error ? e.message : 'Falha ao alterar status')
    }
  }

  async function bulkSetStatus(next: 'published' | 'archived') {
    const ids = [...selected]
    if (ids.length === 0) return
    if (next === 'archived') {
      const { confirmed } = await confirmDialog({
        title: 'Arquivar produtos?',
        message: `Arquivar ${ids.length} produto(s)?\n\nRemoção comercial da loja (permanecem no banco).`,
        confirmLabel: 'Arquivar',
        danger: true,
      })
      if (!confirmed) return
    }
    setBusyBulk(true)
    setError(null)
    try {
      await Promise.all(ids.map((id) => adminSetProductStatus(id, next)))
      pushOk(
        next === 'archived'
          ? `${ids.length} produto(s) arquivado(s).`
          : `${ids.length} produto(s) ativado(s) (publicado).`,
      )
      await reload()
    } catch (e) {
      pushError(e instanceof Error ? e.message : 'Falha na ação em massa')
    } finally {
      setBusyBulk(false)
    }
  }

  async function bulkSetAvailability(available: boolean) {
    const ids = [...selected]
    if (ids.length === 0) return
    setBusyBulk(true)
    setError(null)
    try {
      const r = await adminSetProductsAvailability(ids, available)
      pushOk(
        available
          ? `${r.updated} produto(s) marcado(s) como disponível.`
          : `${r.updated} produto(s) marcado(s) como indisponível.`,
      )
      await reload()
    } catch (e) {
      pushError(e instanceof Error ? e.message : 'Falha ao alterar situação')
    } finally {
      setBusyBulk(false)
    }
  }

  async function bulkLiberarNaLoja() {
    const ids = [...selected]
    if (ids.length === 0) return
    setBusyBulk(true)
    setError(null)
    setReleasePreflight(null)
    try {
      const rows = await adminEvaluateReleaseChecklistBatch(ids, {
        publishIfNeeded: true,
      })
      setReleasePreflight(rows)
    } catch (e) {
      pushError(e instanceof Error ? e.message : 'Falha no pré-flight de liberação')
    } finally {
      setBusyBulk(false)
    }
  }

  async function confirmBulkLiberarEligible() {
    if (!releasePreflight?.length) return
    const eligible = releasePreflight.filter((r) => r.canRelease).map((r) => r.productId)
    if (!eligible.length) {
      pushError('Nenhum produto passou no checklist de liberação.')
      return
    }
    const blocked = releasePreflight.length - eligible.length
    const { confirmed } = await confirmDialog({
      title: 'Liberar na loja?',
      message:
        `Liberar ${eligible.length} produto(s) que passaram no checklist?\n` +
        (blocked > 0 ? `${blocked} bloqueado(s) serão ignorados.\n` : '') +
        '\nExige: nome, código ref., categoria, preço resolvido > 0, publicação.\n' +
        'Avisos (app/imagem) não bloqueiam.',
      confirmLabel: 'Liberar',
    })
    if (!confirmed) return
    setBusyBulk(true)
    setError(null)
    try {
      const { released, failed } = await adminReleaseProductsToStore({
        productIds: eligible,
        publishIfNeeded: true,
      })
      const failHint =
        failed.length > 0
          ? ` · ${failed.length} falha(s): ${failed
              .filter((f): f is Extract<(typeof failed)[number], { ok: false }> => !f.ok)
              .slice(0, 3)
              .map((f) => f.reason)
              .join('; ')}${failed.length > 3 ? '…' : ''}`
          : ''
      pushOk(`${released} liberado(s) na loja${failHint}`)
      setReleasePreflight(null)
      await reload()
    } catch (e) {
      pushError(e instanceof Error ? e.message : 'Falha ao liberar na loja')
    } finally {
      setBusyBulk(false)
    }
  }

  async function applyBulkClassification() {
    const ids = [...selected]
    if (ids.length === 0) return
    const leaf = effectiveCategoryId(bulkCascade)
    if (!leaf) {
      pushError('Escolha ao menos a Categoria na seção Classificação.')
      return
    }
    if (!bulkCascade.subgrupoId) {
      const level = bulkCascade.grupoId ? 'grupo' : 'categoria'
      const { confirmed } = await confirmDialog({
        title: 'Aplicar classificação?',
        message: `Aplicar classificação no nível ${level} (sem subgrupo) a ${ids.length} produto(s)?`,
        confirmLabel: 'Aplicar',
      })
      if (!confirmed) return
    }
    setBusyBulk(true)
    setError(null)
    try {
      const r = await adminBulkSetProductCategory(ids, leaf)
      pushOk(`Classificação aplicada a ${r.updated} produto(s).`)
      setBulkCascade(EMPTY_CASCADE)
      await reload()
    } catch (e) {
      pushError(e instanceof Error ? e.message : 'Falha ao aplicar classificação')
    } finally {
      setBusyBulk(false)
    }
  }

  async function applyBulkMeasures() {
    if (selected.size === 0) {
      pushError('Selecione ao menos um produto.')
      return
    }
    const patch: {
      weightKg?: number | null
      heightCm?: number | null
      widthCm?: number | null
      lengthCm?: number | null
    } = {}
    if (bulkWeight.trim()) patch.weightKg = Number(bulkWeight)
    if (bulkHeight.trim()) patch.heightCm = Number(bulkHeight)
    if (bulkWidth.trim()) patch.widthCm = Number(bulkWidth)
    if (bulkLength.trim()) patch.lengthCm = Number(bulkLength)
    if (Object.keys(patch).length === 0) {
      pushError('Informe ao menos uma medida para aplicar.')
      return
    }
    if (bulkMode === 'overwrite_manual') {
      const { confirmed } = await confirmDialog({
        title: 'Sobrescrever medidas manuais?',
        message: `Sobrescrever também campos Manual em ${selected.size} produto(s)? Eles passam a Global.`,
        confirmLabel: 'Sobrescrever',
        danger: true,
      })
      if (!confirmed) return
    }
    setBusyMeasures(true)
    setError(null)
    try {
      const r = await adminApplyGlobalProductMeasures({
        productIds: [...selected],
        patch,
        mode: bulkMode,
      })
      pushOk(
        `Medidas globais: ${r.updatedFieldRows} atualização(ões) de campo · modo ${
          bulkMode === 'skip_manual' ? 'respeitar Manual' : 'sobrescrever Manual'
        }.`,
      )
      await reload()
    } catch (e) {
      pushError(e instanceof Error ? e.message : 'Falha ao aplicar medidas')
    } finally {
      setBusyMeasures(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-fal-navy">Produtos</h1>
          <p className="mt-1 text-sm text-fal-muted">
            Arquivar tira da loja (fica no banco). Status ≠ disponibilidade.
            {items.length > 0
              ? ` · ${items.length} carregado${items.length === 1 ? '' : 's'}.`
              : null}
          </p>
          <nav className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm font-semibold text-fal-navy">
            <Link className="hover:underline" to="/admin/produtos/importar">
              Importar
            </Link>
            <Link className="hover:underline" to="/admin/aplicacoes">
              Aplicações
            </Link>
            <Link className="hover:underline" to="/admin/produtos/importar-aplicacoes">
              Importar apps
            </Link>
            <Link className="hover:underline" to="/admin/produtos/importar-hf">
              Importar HF
            </Link>
            <Link className="hover:underline" to="/admin/produtos/importar-imagens">
              Importar imagens
            </Link>
            <Link className="hover:underline" to="/admin/importacoes">
              Histórico
            </Link>
            <Link className="hover:underline" to="/admin/home">
              Home / Destaques
            </Link>
          </nav>
        </div>
        <Link to="/admin/produtos/novo">
          <Button variant="primary">Novo produto</Button>
        </Link>
      </div>

      <form
        className="space-y-2 rounded-[14px] border border-fal-line bg-white p-3"
        onSubmit={(e) => {
          e.preventDefault()
          void reload()
        }}
      >
        <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(7.5rem,9rem)_minmax(7.5rem,9rem)_minmax(0,1fr)_auto_auto]">
          <Input
            label="Buscar"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nome, código ou SKU"
          />
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-extrabold text-fal-muted">Status</span>
            <select
              className="w-full rounded-[9px] border border-fal-line px-2 py-2.5"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="draft">Rascunho</option>
              <option value="published">Publicado</option>
              <option value="archived">Arquivado</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-extrabold text-fal-muted">Estoque</span>
            <select
              className="w-full rounded-[9px] border border-fal-line px-2 py-2.5"
              value={availableFilter}
              onChange={(e) => setAvailableFilter(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="true">Disponível</option>
              <option value="false">Indisponível</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-extrabold text-fal-muted">Montadora</span>
            <select
              className="w-full rounded-[9px] border border-fal-line px-2 py-2.5"
              value={manufacturerId}
              onChange={(e) => setManufacturerId(e.target.value)}
            >
              <option value="">Todas</option>
              {manufacturers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-h-[42px] items-center gap-2 text-sm font-semibold text-fal-navy">
            <input
              type="checkbox"
              checked={withoutImage}
              onChange={(e) => setWithoutImage(e.target.checked)}
            />
            Sem imagem
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="primary">
              Buscar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                clearFilters()
                void reload({
                  q: '',
                  status: '',
                  availableFilter: '',
                  manufacturerId: '',
                  withoutImage: false,
                  measureGap: '',
                  filterCascade: EMPTY_CASCADE,
                })
              }}
            >
              Limpar
            </Button>
          </div>
        </div>
        <label className="block max-w-xs text-sm">
          <span className="mb-1 block text-xs font-extrabold text-fal-muted">Medidas (logística)</span>
          <select
            className="w-full rounded-[9px] border border-fal-line px-2 py-2.5"
            value={measureGap}
            onChange={(e) => setMeasureGap(e.target.value as '' | 'weight' | 'dims' | 'any')}
          >
            <option value="">Todas</option>
            <option value="weight">Sem peso</option>
            <option value="dims">Sem dimensões</option>
            <option value="any">Sem peso ou dimensões</option>
          </select>
        </label>
        <CategoryCascadeSelects
          categories={categories}
          value={filterCascade}
          onChange={setFilterCascade}
          idPrefix="filter-cat"
          emptyLabel="Todas"
          publishedOnly
          className="grid gap-2 sm:grid-cols-3"
        />
      </form>

      {hasSelection || releasePreflight ? (
      <div className="space-y-4 rounded-[14px] border border-fal-navy/15 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="m-0 text-lg font-extrabold text-fal-navy">Alterações em lote</h2>
            <p className="mt-1 text-sm text-fal-muted">
              {hasSelection
                ? `${selected.size} selecionado(s).`
                : 'Pré-flight em andamento.'}
            </p>
          </div>
          {hasSelection ? (
            <button
              type="button"
              className="text-sm font-semibold text-fal-muted underline"
              onClick={() => setSelected(new Set())}
            >
              Limpar seleção
            </button>
          ) : null}
        </div>

        {releasePreflight ? (
          <div className="space-y-3 rounded-[12px] border border-fal-navy/20 bg-fal-bg/40 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="m-0 text-base font-extrabold text-fal-navy">
                  Pré-flight Liberar
                </h3>
                <p className="mt-1 text-sm text-fal-muted">
                  Hard bloqueia; aplicação/imagem são avisos. Só quem passa hard será liberado.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="primary"
                  disabled={busyBulk || !releasePreflight.some((r) => r.canRelease)}
                  onClick={() => void confirmBulkLiberarEligible()}
                >
                  Confirmar elegíveis (
                  {releasePreflight.filter((r) => r.canRelease).length})
                </Button>
                <Button
                  type="button"
                  variant="light"
                  disabled={busyBulk}
                  onClick={() => setReleasePreflight(null)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
            <div className="max-h-72 overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-fal-bg text-fal-muted">
                  <tr>
                    <th className="px-2 py-1">Código</th>
                    <th className="px-2 py-1">Nome</th>
                    <th className="px-2 py-1">Resultado</th>
                    <th className="px-2 py-1">Detalhe</th>
                  </tr>
                </thead>
                <tbody>
                  {releasePreflight.map((row) => (
                    <tr key={row.productId} className="border-b border-fal-line/60">
                      <td className="px-2 py-1 font-mono text-xs">
                        {row.commercialRef || row.sku}
                      </td>
                      <td className="px-2 py-1">{row.name}</td>
                      <td className="px-2 py-1">
                        {row.canRelease ? (
                          <span className="font-semibold text-emerald-800">
                            Passa
                            {row.softWarnings.length
                              ? ` (${row.softWarnings.length} aviso)`
                              : ''}
                          </span>
                        ) : (
                          <span className="font-semibold text-red-700">Bloqueado</span>
                        )}
                      </td>
                      <td className="px-2 py-1 text-xs text-fal-muted">{row.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <section className="space-y-3 rounded-[12px] border border-fal-line p-3">
          <div>
            <h3 className="m-0 text-base font-extrabold text-fal-navy">Situação</h3>
            <p className="mt-1 text-xs text-fal-muted">
              Status comercial e disponibilidade na loja. Liberar usa o checklist de publicação.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="primary"
              disabled={panelDisabled}
              onClick={() => void bulkLiberarNaLoja()}
            >
              Liberar na loja (checklist)
            </Button>
            <Button
              type="button"
              variant="light"
              disabled={panelDisabled}
              onClick={() => void bulkSetStatus('published')}
            >
              Publicar
            </Button>
            <Button
              type="button"
              variant="light"
              disabled={panelDisabled}
              onClick={() => void bulkSetStatus('archived')}
            >
              Arquivar
            </Button>
            <Button
              type="button"
              variant="light"
              disabled={panelDisabled}
              onClick={() => void bulkSetAvailability(true)}
            >
              Marcar disponível
            </Button>
            <Button
              type="button"
              variant="light"
              disabled={panelDisabled}
              onClick={() => void bulkSetAvailability(false)}
            >
              Marcar indisponível
            </Button>
          </div>
        </section>

        <section className="space-y-3 rounded-[12px] border border-fal-line p-3">
          <div>
            <h3 className="m-0 text-base font-extrabold text-fal-navy">Classificação</h3>
            <p className="mt-1 text-xs text-fal-muted">
              Atribui Categoria → Grupo → Subgrupo aos selecionados (não cria nós novos).
            </p>
          </div>
          <CategoryCascadeSelects
            categories={categories}
            value={bulkCascade}
            onChange={setBulkCascade}
            idPrefix="bulk-cat"
            disabled={panelDisabled}
            emptyLabel="—"
          />
          <Button
            type="button"
            variant="primary"
            disabled={panelDisabled || !effectiveCategoryId(bulkCascade)}
            onClick={() => void applyBulkClassification()}
          >
            Aplicar classificação
          </Button>
        </section>

        <section className="space-y-3 rounded-[12px] border border-fal-line p-3">
          <div>
            <h3 className="m-0 text-base font-extrabold text-fal-navy">Medidas logísticas</h3>
            <p className="mt-1 text-xs text-fal-muted">
              Campos vazios neste painel não são alterados. Padrão: não sobrescreve Manual.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              label="Peso (kg)"
              type="number"
              step="0.001"
              min="0"
              value={bulkWeight}
              disabled={panelDisabled}
              onChange={(e) => setBulkWeight(e.target.value)}
            />
            <Input
              label="Altura (cm)"
              type="number"
              step="0.01"
              min="0"
              value={bulkHeight}
              disabled={panelDisabled}
              onChange={(e) => setBulkHeight(e.target.value)}
            />
            <Input
              label="Largura (cm)"
              type="number"
              step="0.01"
              min="0"
              value={bulkWidth}
              disabled={panelDisabled}
              onChange={(e) => setBulkWidth(e.target.value)}
            />
            <Input
              label="Comprimento (cm)"
              type="number"
              step="0.01"
              min="0"
              value={bulkLength}
              disabled={panelDisabled}
              onChange={(e) => setBulkLength(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block min-w-[220px] text-sm">
              <span className="mb-1 block font-semibold text-fal-navy">Tratar manuais</span>
              <select
                className="w-full rounded-[10px] border border-fal-line px-3 py-2 disabled:opacity-60"
                value={bulkMode}
                disabled={panelDisabled}
                onChange={(e) => setBulkMode(e.target.value as ApplyGlobalMeasuresMode)}
              >
                <option value="skip_manual">Respeitar Manual (só Global)</option>
                <option value="overwrite_manual">Sobrescrever Manual também</option>
              </select>
            </label>
            <Button
              type="button"
              variant="primary"
              disabled={panelDisabled}
              onClick={() => void applyBulkMeasures()}
            >
              {busyMeasures ? 'Aplicando…' : 'Aplicar medidas'}
            </Button>
          </div>
        </section>
      </div>
      ) : null}

      {error ? <p className="text-sm text-fal-danger">{error}</p> : null}
      {hasMore ? (
        <p className="rounded-[10px] border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Exibindo até {ADMIN_PRODUCTS_PAGE_SIZE} registros por carga ({items.length} carregados).
          Use “Carregar mais produtos” para ampliar
          {withoutImage
            ? ' — filtro «Sem imagem» aplica-se a cada página carregada'
            : ''}
          .
        </p>
      ) : null}
      {loading ? <Loading /> : null}

      <div className="overflow-x-auto rounded-[14px] border border-fal-line bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-fal-bg text-fal-muted">
            <tr>
              <th className="px-3 py-2">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = somePageSelected && !allPageSelected
                  }}
                  onChange={toggleSelectAllPage}
                  aria-label="Selecionar página"
                  disabled={items.length === 0 || loading}
                />
              </th>
              <th className="px-3 py-2">{CODIGO_REFERENCIA_LABEL}</th>
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Situação</th>
              <th className="px-3 py-2">Preço</th>
              <th className="px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && !loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-4">
                  <EmptyState
                    title="Nenhum produto encontrado"
                    description="Ajuste os filtros ou cadastre um novo produto."
                    actionLabel="Novo produto"
                    actionTo="/admin/produtos/novo"
                  />
                </td>
              </tr>
            ) : null}
            {items.map((p) => (
              <tr key={p.id} className="border-t border-fal-line">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggleRow(p.id)}
                    aria-label={`Selecionar ${p.commercialRef ?? p.sku}`}
                  />
                </td>
                <td className="px-3 py-2 font-mono text-xs">{p.commercialRef ?? p.sku}</td>
                <td className="px-3 py-2 font-semibold">
                  {p.name}
                  {p.isIncomplete ? (
                    <span className="ml-2 text-xs font-bold text-fal-yellow-dark">INCOMPLETO</span>
                  ) : null}
                </td>
                <td className="px-3 py-2">{productStatusLabel(p.status)}</td>
                <td className="px-3 py-2">
                  {p.available ? (
                    <span className="font-semibold text-emerald-800">Disponível</span>
                  ) : (
                    <span className="text-fal-muted">Indisponível</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {p.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td className="px-3 py-2 space-x-2">
                  <Link className="font-semibold text-fal-auth-link" to={`/admin/produtos/${p.id}`}>
                    Editar
                  </Link>
                  <button
                    type="button"
                    className="font-semibold text-fal-muted"
                    onClick={() => void toggleArchive(p)}
                  >
                    {p.status === 'archived' ? 'Publicar' : 'Arquivar (remover da loja)'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {hasMore ? (
          <div className="flex justify-center border-t border-fal-line p-3">
            <Button
              type="button"
              variant="outline"
              disabled={loadingMore || loading}
              onClick={() => void loadMore()}
            >
              {loadingMore ? 'Carregando…' : 'Carregar mais produtos'}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
