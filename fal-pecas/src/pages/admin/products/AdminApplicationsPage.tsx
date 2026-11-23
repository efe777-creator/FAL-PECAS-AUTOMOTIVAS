import {
  ApplicationWorkSurface,
  type ApplicationGuideMode,
} from '@/components/admin/applications/ApplicationWorkSurface'
import { ProductApplicationsEditor } from '@/components/admin/applications/ProductApplicationsEditor'
import { OrderSplitTabPanels } from '@/components/admin/orders/OrderSplitTabPanels'
import { AdaptiveWorkspace } from '@/components/admin/workspace/AdaptiveWorkspace'
import { Button, buttonClassName } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { useIdSplitTabs } from '@/hooks/useIdSplitTabs'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import {
  APPLICATIONS_OPEN_GUIDE_KEY,
  consumeGuideBridge,
} from '@/lib/adminGuideBridges'
import { pvcEngineOptions, pvcVersionNameOptions } from '@/lib/pvcVehicleCascade'
import { formatVehicleAppYear } from '@/lib/vehicleAppYear'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  ADMIN_APPLICATIONS_PAGE_SIZE,
  adminListApplicationsGlobal,
  type AdminApplicationRow,
} from '@/services/admin/adminApplicationService'
import { adminListManufacturers } from '@/services/admin/adminManufacturerService'
import { adminListModels, adminListVersions } from '@/services/admin/adminVehicleService'
import type { Manufacturer, VehicleModel, VehicleVersion } from '@/types'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

const FILTERS_KEY = 'fal.applications.filtersExpanded'

function canManage(role: string | undefined): boolean {
  return role === 'administrador' || role === 'gerente'
}

function readFiltersExpanded(): boolean {
  try {
    return sessionStorage.getItem(FILTERS_KEY) === '1'
  } catch {
    return false
  }
}

export function AdminApplicationsPage() {
  useDocumentTitle('Aplicações | Admin FAL')
  const { user } = useAuth()
  const toast = useToast()
  const allowed = canManage(user?.role)
  const [searchParams, setSearchParams] = useSearchParams()
  const splitTabs = useIdSplitTabs()

  const [rows, setRows] = useState<AdminApplicationRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [q, setQ] = useState(searchParams.get('q') ?? '')
  const [qDebounced, setQDebounced] = useState(q)
  const [makerId, setMakerId] = useState(searchParams.get('maker') ?? '')
  const [modelId, setModelId] = useState(searchParams.get('model') ?? '')
  const [engineFilter, setEngineFilter] = useState(searchParams.get('engine') ?? '')
  const [versionFilter, setVersionFilter] = useState(searchParams.get('versao') ?? '')

  const [makers, setMakers] = useState<Manufacturer[]>([])
  const [models, setModels] = useState<VehicleModel[]>([])
  const [versions, setVersions] = useState<VehicleVersion[]>([])

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filtersExpanded, setFiltersExpanded] = useState(readFiltersExpanded)
  const [createOpen, setCreateOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [pendingGuideId, setPendingGuideId] = useState<string | null>(() =>
    consumeGuideBridge(APPLICATIONS_OPEN_GUIDE_KEY),
  )

  useEffect(() => {
    const t = window.setTimeout(() => setQDebounced(q.trim()), 250)
    return () => window.clearTimeout(t)
  }, [q])

  useEffect(() => {
    void adminListManufacturers().then((list) =>
      setMakers(list.filter((m) => m.status === 'active')),
    )
  }, [])

  useEffect(() => {
    if (!makerId) {
      setModels([])
      setModelId('')
      return
    }
    void adminListModels(makerId).then(setModels)
  }, [makerId])

  useEffect(() => {
    if (!modelId) {
      setVersions([])
      setEngineFilter('')
      setVersionFilter('')
      return
    }
    void adminListVersions(modelId).then(setVersions)
  }, [modelId])

  const engineOptions = useMemo(() => pvcEngineOptions(versions), [versions])

  const versionOptions = useMemo(
    () => pvcVersionNameOptions(versions, engineFilter),
    [versions, engineFilter],
  )

  const productIdFilter = searchParams.get('productId') || ''

  function listFilter(offset: number) {
    return {
      q: qDebounced || undefined,
      manufacturerId: makerId || undefined,
      modelId: modelId || undefined,
      engine: engineFilter || undefined,
      versionName: versionFilter || undefined,
      productId: productIdFilter || undefined,
      limit: ADMIN_APPLICATIONS_PAGE_SIZE,
      offset,
    }
  }

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      const { rows: list, total: n } = await adminListApplicationsGlobal(listFilter(0))
      setRows(list)
      setTotal(n)
      setSelected(new Set())
    } catch (e) {
      const msg = toUserMessage(e, 'Falha ao carregar aplicações')
      setError(msg)
      toast.push(msg, 'error')
      setRows([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  async function loadMore() {
    setLoadingMore(true)
    setError(null)
    try {
      const { rows: next, total: n } = await adminListApplicationsGlobal(listFilter(rows.length))
      setRows((prev) => {
        const seen = new Set(prev.map((r) => r.id))
        return [...prev, ...next.filter((r) => !seen.has(r.id))]
      })
      setTotal(n)
    } catch (e) {
      const msg = toUserMessage(e, 'Falha ao carregar mais aplicações')
      setError(msg)
      toast.push(msg, 'error')
    } finally {
      setLoadingMore(false)
    }
  }

  const hasMore = rows.length < total

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (qDebounced) p.set('q', qDebounced)
        else p.delete('q')
        if (makerId) p.set('maker', makerId)
        else p.delete('maker')
        if (modelId) p.set('model', modelId)
        else p.delete('model')
        if (engineFilter) p.set('engine', engineFilter)
        else p.delete('engine')
        if (versionFilter) p.set('versao', versionFilter)
        else p.delete('versao')
        return p
      },
      { replace: true },
    )
  }, [qDebounced, makerId, modelId, engineFilter, versionFilter, setSearchParams])

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDebounced, makerId, modelId, engineFilter, versionFilter, productIdFilter])

  function setFiltersExpandedPersist(next: boolean) {
    setFiltersExpanded(next)
    try {
      sessionStorage.setItem(FILTERS_KEY, next ? '1' : '0')
    } catch {
      /* ignore */
    }
  }

  const filterChips = useMemo(() => {
    const chips: string[] = []
    if (productIdFilter) chips.push('Produto (ficha)')
    if (makerId) {
      const m = makers.find((x) => x.id === makerId)
      chips.push(m?.name ? `Montadora: ${m.name}` : 'Montadora')
    }
    if (modelId) {
      const m = models.find((x) => x.id === modelId)
      chips.push(m?.name ? `Modelo: ${m.name}` : 'Modelo')
    }
    if (engineFilter) chips.push(`Motor: ${engineFilter}`)
    if (versionFilter) chips.push(`Versão: ${versionFilter}`)
    return chips
  }, [productIdFilter, makerId, makers, modelId, models, engineFilter, versionFilter])

  function clearProductIdFilter() {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        p.delete('productId')
        return p
      },
      { replace: true },
    )
  }

  function clearAllFilters() {
    setQ('')
    setQDebounced('')
    setMakerId('')
    setModelId('')
    setEngineFilter('')
    setVersionFilter('')
    clearProductIdFilter()
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAllVisible() {
    if (rows.length > 0 && selected.size === rows.length) {
      setSelected(new Set())
      return
    }
    setSelected(new Set(rows.map((r) => r.id)))
  }

  /** Guia Adaptive centrada no produto (não na linha PVC). */
  function openProductGuide(productId: string) {
    if (!productId) return
    setCreateOpen(false)
    setBulkOpen(false)
    setPendingGuideId(null)
    splitTabs.openTab(productId)
  }

  function openCreate() {
    splitTabs.closeAll()
    setBulkOpen(false)
    setCreateOpen(true)
  }

  function openBulk() {
    if (!selected.size) return
    splitTabs.closeAll()
    setCreateOpen(false)
    setBulkOpen(true)
  }

  function closeContextual() {
    setCreateOpen(false)
    setBulkOpen(false)
    splitTabs.closeAll()
  }

  const productMetaById = useMemo(() => {
    const map: Record<string, { sku: string; name: string }> = {}
    for (const r of rows) {
      if (!r.productId || map[r.productId]) continue
      map[r.productId] = { sku: r.productSku || 'SKU', name: r.productName || '' }
    }
    return map
  }, [rows])

  // Ponte guia Produto → guia Aplicações por productId
  useEffect(() => {
    if (!pendingGuideId || loading) return
    openProductGuide(pendingGuideId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingGuideId, loading])

  // Auto-abre guia uma vez quando chega com ?productId= da ficha (não reabre no reload)
  const autoOpenedProductRef = useRef<string | null>(null)
  useEffect(() => {
    if (!productIdFilter) {
      autoOpenedProductRef.current = null
      return
    }
    if (loading || createOpen || bulkOpen) return
    if (autoOpenedProductRef.current === productIdFilter) return
    autoOpenedProductRef.current = productIdFilter
    openProductGuide(productIdFilter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productIdFilter, loading, createOpen, bulkOpen])

  const selectedRows = useMemo(
    () => rows.filter((r) => selected.has(r.id)),
    [rows, selected],
  )

  const guideMode: ApplicationGuideMode = createOpen ? 'create' : 'bulk'

  const contextualOpen = createOpen || bulkOpen || splitTabs.hasOpen

  if (!allowed) {
    return (
      <p className="text-sm text-fal-danger">
        Somente administrador ou gerente podem gerenciar aplicações.
      </p>
    )
  }

  const guideLabelForProduct = (productId: string) => {
    const meta = productMetaById[productId]
    return meta ? meta.sku : productId.slice(0, 8)
  }

  const activeProductId = splitTabs.activeId
  const activeMeta = activeProductId ? productMetaById[activeProductId] : undefined

  const primary = (
    <div className="admin-applications-hub space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-fal-fg">Aplicações</h1>
          <p className="mt-1 mb-0 max-w-2xl text-sm text-fal-muted">
            Compatibilidades produto × veículo (PVC): a guia abre o item com todos os
            vínculos — adicione, retire e edite à vontade.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/admin/produtos/importar-aplicacoes"
            className={buttonClassName({ variant: 'light' })}
          >
            Importar planilha
          </Link>
          <Button type="button" variant="primary" onClick={openCreate}>
            Nova aplicação
          </Button>
        </div>
      </div>

      <form
        className="admin-applications-filters space-y-2 rounded-[14px] border border-fal-line bg-fal-surface p-3"
        data-filters-expanded={filtersExpanded ? 'true' : 'false'}
        onSubmit={(e) => {
          e.preventDefault()
          setQDebounced(q.trim())
        }}
      >
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[200px] flex-1">
            <Input
              label="Buscar (SKU, fabricante, marca, veículo)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ex.: Nakata, PVI1032, Fiat…"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="primary">
              Buscar
            </Button>
            <Button type="button" variant="outline" onClick={clearAllFilters}>
              Limpar
            </Button>
            <Button
              type="button"
              variant="light"
              aria-expanded={filtersExpanded}
              onClick={() => setFiltersExpandedPersist(!filtersExpanded)}
            >
              {filtersExpanded
                ? 'Recolher filtros'
                : filterChips.length > 0
                  ? `Filtros (${filterChips.length})`
                  : 'Mais filtros'}
            </Button>
          </div>
        </div>

        {!filtersExpanded && filterChips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wide text-fal-muted">
              Ativos
            </span>
            {filterChips.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-fal-line bg-fal-bg px-2 py-0.5 text-xs font-semibold text-fal-fg"
              >
                {chip}
              </span>
            ))}
            <button
              type="button"
              className="text-xs font-semibold text-fal-muted underline"
              onClick={() => setFiltersExpandedPersist(true)}
            >
              Editar
            </button>
          </div>
        ) : null}

        {filtersExpanded ? (
          <div className="grid gap-2 border-t border-fal-line pt-2 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-extrabold text-fal-muted">Montadora</span>
              <select
                className="w-full rounded-[9px] border border-fal-line px-3 py-2.5"
                value={makerId}
                onChange={(e) => setMakerId(e.target.value)}
              >
                <option value="">Todas</option>
                {makers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-extrabold text-fal-muted">Modelo</span>
              <select
                className="w-full rounded-[9px] border border-fal-line px-3 py-2.5"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                disabled={!makerId}
              >
                <option value="">Todos</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-extrabold text-fal-muted">Motorização</span>
              <select
                className="w-full rounded-[9px] border border-fal-line px-3 py-2.5"
                value={engineFilter}
                onChange={(e) => {
                  setEngineFilter(e.target.value)
                  setVersionFilter('')
                }}
                disabled={!modelId}
              >
                <option value="">Todas</option>
                {engineOptions.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-extrabold text-fal-muted">Versão</span>
              <select
                className="w-full rounded-[9px] border border-fal-line px-3 py-2.5"
                value={versionFilter}
                onChange={(e) => setVersionFilter(e.target.value)}
                disabled={!modelId}
              >
                <option value="">Todas</option>
                {versionOptions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
      </form>

      {error ? <p className="text-sm text-fal-danger">{error}</p> : null}
      {!loading && hasMore ? (
        <p className="rounded-[10px] border border-fal-warning/40 bg-fal-warning/10 px-3 py-2 text-sm text-fal-fg">
          Exibindo {rows.length} de {total} aplicações (até {ADMIN_APPLICATIONS_PAGE_SIZE} por carga).
        </p>
      ) : null}

      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-[10px] border border-fal-line bg-fal-bg px-3 py-2 text-sm">
          <span className="font-semibold text-fal-fg">{selected.size} selecionada(s)</span>
          <Button type="button" variant="light" onClick={openBulk}>
            Excluir na guia
          </Button>
        </div>
      ) : null}

      {loading ? <Loading label="Carregando aplicações…" /> : null}

      {!loading && rows.length === 0 ? (
        <EmptyState
          title="Nenhuma aplicação encontrada"
          description="Importe uma planilha ou crie na guia."
        >
          <div className="mt-4 flex justify-center gap-3">
            <Link
              className="font-semibold text-fal-fg underline"
              to="/admin/produtos/importar-aplicacoes"
            >
              Importar
            </Link>
            <button
              type="button"
              className="font-semibold text-fal-fg underline"
              onClick={openCreate}
            >
              Criar
            </button>
          </div>
        </EmptyState>
      ) : null}

      {!loading && rows.length > 0 ? (
        <>
          <div className="admin-applications-list-mobile space-y-3 md:hidden">
            {rows.map((row) => {
              const onGuide = splitTabs.openIds.includes(row.productId)
              const period =
                formatVehicleAppYear({
                  yearStart: row.yearStart,
                  yearEnd: row.yearEnd,
                  versionYear: row.versionYear,
                }) ?? '—'
              return (
                <article
                  key={row.id}
                  className="rounded-[14px] border border-fal-line bg-fal-surface p-3"
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-1 h-5 w-5"
                      checked={selected.has(row.id)}
                      onChange={() => toggleSelect(row.id)}
                      aria-label={`Selecionar ${row.productSku}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="m-0 font-mono text-xs text-fal-muted">{row.productSku}</p>
                      <p className="mb-0 mt-0.5 text-sm font-extrabold text-fal-fg">
                        {row.productName}
                      </p>
                      <p className="m-0 text-xs text-fal-muted">
                        {[row.makerName, row.modelName, row.engine, row.versionName]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      <p className="mb-0 mt-1 text-sm font-semibold text-fal-fg">{period}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="inline-flex min-h-11 items-center rounded-[10px] bg-fal-yellow px-3 text-sm font-extrabold text-fal-navy-dark"
                          onClick={() => openProductGuide(row.productId)}
                        >
                          {onGuide ? 'Na guia' : splitTabs.hasOpen ? '+ Guia' : 'Abrir guia'}
                        </button>
                        <Link
                          className="inline-flex min-h-11 items-center rounded-[10px] border border-fal-line px-3 text-sm font-semibold text-fal-fg"
                          to={`/admin/produtos/${row.productId}`}
                        >
                          Cadastro
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
            {hasMore ? (
              <Button
                type="button"
                variant="outline"
                fullWidth
                disabled={loadingMore || loading}
                onClick={() => void loadMore()}
              >
                {loadingMore ? 'Carregando…' : 'Carregar mais aplicações'}
              </Button>
            ) : null}
          </div>

          <div className="admin-applications-list-desktop fal-admin-scroll hidden max-h-[min(60dvh,640px)] overflow-y-auto overflow-x-auto rounded-[14px] border border-fal-line bg-fal-surface md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 z-[1] border-b border-fal-line bg-fal-bg text-fal-muted">
                <tr>
                  <th className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={rows.length > 0 && selected.size === rows.length}
                      onChange={toggleAllVisible}
                      aria-label="Selecionar todas"
                    />
                  </th>
                  <th className="px-3 py-2">Produto</th>
                  <th className="px-3 py-2">Montadora</th>
                  <th className="px-3 py-2">Modelo</th>
                  <th className="px-3 py-2">Motor</th>
                  <th className="px-3 py-2">Versão</th>
                  <th className="px-3 py-2">Período</th>
                  <th className="px-3 py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const onGuide = splitTabs.openIds.includes(row.productId)
                  const period =
                    formatVehicleAppYear({
                      yearStart: row.yearStart,
                      yearEnd: row.yearEnd,
                      versionYear: row.versionYear,
                    }) ?? '—'
                  return (
                    <tr key={row.id} className="border-b border-fal-line/70">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selected.has(row.id)}
                          onChange={() => toggleSelect(row.id)}
                          aria-label={`Selecionar ${row.productSku}`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          className="font-semibold text-fal-fg underline"
                          to={`/admin/produtos/${row.productId}`}
                        >
                          {row.productSku || '—'}
                        </Link>
                        <div className="text-xs text-fal-muted">{row.productName}</div>
                      </td>
                      <td className="px-3 py-2">{row.makerName ?? '—'}</td>
                      <td className="px-3 py-2">{row.modelName ?? '—'}</td>
                      <td className="px-3 py-2">{row.engine || '—'}</td>
                      <td className="px-3 py-2">{row.versionName || '—'}</td>
                      <td className="px-3 py-2">{period}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="inline-flex min-h-9 items-center rounded-[10px] bg-fal-yellow px-2.5 text-xs font-bold text-fal-navy-dark"
                            onClick={() => openProductGuide(row.productId)}
                          >
                            {onGuide ? 'Na guia' : splitTabs.hasOpen ? '+ Guia' : 'Abrir guia'}
                          </button>
                          <Link
                            className="inline-flex min-h-9 items-center rounded-[10px] border border-fal-line px-2.5 text-xs font-semibold text-fal-fg"
                            to={`/admin/produtos/${row.productId}`}
                          >
                            Abrir cadastro
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-fal-line px-3 py-2 text-xs text-fal-muted">
              <span>
                Exibindo {rows.length} de {total} (até {ADMIN_APPLICATIONS_PAGE_SIZE} por carga).
              </span>
              {hasMore ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={loadingMore || loading}
                  onClick={() => void loadMore()}
                >
                  {loadingMore ? 'Carregando…' : 'Carregar mais aplicações'}
                </Button>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )

  return (
    <AdaptiveWorkspace
      moduleKey="applications"
      primary={primary}
      contextualOpen={contextualOpen}
      onContextualOpenChange={(open) => {
        if (!open) closeContextual()
      }}
      contextualTitle={
        createOpen
          ? 'Nova aplicação'
          : bulkOpen
            ? `Lote · ${selected.size}`
            : splitTabs.openIds.length > 1
              ? `${activeMeta?.sku ?? 'Item'} · ${splitTabs.openIds.length} guias`
              : activeMeta
                ? activeMeta.sku
                : activeProductId
                  ? guideLabelForProduct(activeProductId)
                  : 'Aplicações do item'
      }
      contextual={
        contextualOpen ? (
          createOpen || bulkOpen ? (
            <ApplicationWorkSurface
              mode={guideMode}
              selectedRows={selectedRows}
              onClose={closeContextual}
              onMutated={(opts) => {
                if (opts?.focusSku) {
                  setQ(opts.focusSku)
                  setQDebounced(opts.focusSku)
                }
                void reload()
              }}
              onOpenProduct={(productId, sku) => {
                setQ(sku)
                setQDebounced(sku)
                openProductGuide(productId)
              }}
            />
          ) : (
            <OrderSplitTabPanels
              orderIds={splitTabs.openIds}
              meta={splitTabs.openIds.map((id) => {
                const meta = productMetaById[id]
                return {
                  id,
                  label: meta?.sku ?? id.slice(0, 8),
                  statusLabel: meta?.name || undefined,
                }
              })}
              onCloseTab={splitTabs.closeTab}
              render={(productId) => (
                <ProductApplicationsEditor
                  productId={productId}
                  makers={makers}
                  variant="guide"
                  onClose={() => splitTabs.closeTab(productId)}
                  onMutated={() => void reload()}
                />
              )}
            />
          )
        ) : null
      }
    />
  )
}
