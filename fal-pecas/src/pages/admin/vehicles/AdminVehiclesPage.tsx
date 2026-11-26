import { OrderSplitTabPanels } from '@/components/admin/orders/OrderSplitTabPanels'
import { AdminVehicleGuidePanel } from '@/components/admin/vehicles/AdminVehicleGuidePanel'
import { AdaptiveWorkspace } from '@/components/admin/workspace/AdaptiveWorkspace'
import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useIdSplitTabs } from '@/hooks/useIdSplitTabs'
import { consumeGuideBridge, VEHICLES_OPEN_GUIDE_KEY } from '@/lib/adminGuideBridges'
import { entityStatusLabel } from '@/lib/adminLabels'
import { toUserMessage } from '@/lib/toUserMessage'
import { adminListManufacturers } from '@/services/admin/adminManufacturerService'
import {
  adminListModels,
  adminListVersions,
  adminSetModelStatus,
  adminUpsertModel,
} from '@/services/admin/adminVehicleService'
import type { Manufacturer, VehicleModel, VehicleVersion } from '@/types'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

function qualityBadge(status: VehicleModel['qualityStatus']): { label: string; className: string } {
  switch (status) {
    case 'verified':
      return { label: 'Verificado', className: 'bg-emerald-100 text-emerald-900' }
    case 'quarantined':
      return { label: 'Quarentena', className: 'bg-red-100 text-red-900' }
    case 'superseded':
      return { label: 'Substituído', className: 'bg-fal-line/60 text-fal-muted' }
    case 'review':
    default:
      return { label: 'Revisão', className: 'bg-amber-100 text-amber-900' }
  }
}

const MODELS_PAGE_SIZE = 40

type ModelSort = 'maker_model' | 'model' | 'maker'
type QualityFilter = '' | 'verified' | 'review' | 'quarantined' | 'superseded'
type StatusFilter = '' | 'active' | 'inactive'

export function AdminVehiclesPage() {
  useDocumentTitle('Veículos | Admin FAL')
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const splitTabs = useIdSplitTabs()
  const [approveIds, setApproveIds] = useState<Record<string, true>>({})
  const deepLinkDone = useRef(false)

  const [makers, setMakers] = useState<Manufacturer[]>([])
  const [models, setModels] = useState<VehicleModel[]>([])
  const [allVersions, setAllVersions] = useState<VehicleVersion[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchName, setSearchName] = useState('')
  const [filterMakerId, setFilterMakerId] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [filterQuality, setFilterQuality] = useState<QualityFilter>('')
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('')
  const [sortBy, setSortBy] = useState<ModelSort>('maker_model')
  const [modelsPage, setModelsPage] = useState(1)

  const [createMakerId, setCreateMakerId] = useState('')
  const [createName, setCreateName] = useState('')
  const [createYearStart, setCreateYearStart] = useState('')
  const [createYearEnd, setCreateYearEnd] = useState('')
  const [busyCreate, setBusyCreate] = useState(false)

  function pushError(msg: string) {
    setError(msg)
    toast.push(msg, 'error')
  }

  function pushOk(msg: string) {
    setError(null)
    toast.push(msg, 'success')
  }

  const makerNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of makers) map.set(m.id, m.name)
    return map
  }, [makers])

  const versionsByModelId = useMemo(() => {
    const map = new Map<string, VehicleVersion[]>()
    if (!allVersions) return map
    for (const v of allVersions) {
      const list = map.get(v.modelId)
      if (list) list.push(v)
      else map.set(v.modelId, [v])
    }
    return map
  }, [allVersions])

  async function reloadModels() {
    setModels(await adminListModels())
  }

  function openGuide(modelId: string, opts?: { approve?: boolean }) {
    const id = modelId.trim()
    if (!id) return
    if (opts?.approve) {
      setApproveIds((prev) => ({ ...prev, [id]: true }))
    }
    setSelectedId(id)
    splitTabs.openTab(id)
  }

  useEffect(() => {
    void (async () => {
      try {
        const [makerList, modelList] = await Promise.all([
          adminListManufacturers(),
          adminListModels(),
        ])
        setMakers(makerList)
        setModels(modelList)

        if (!deepLinkDone.current) {
          deepLinkDone.current = true
          const bridgeId = consumeGuideBridge(VEHICLES_OPEN_GUIDE_KEY)
          const deepModel = (bridgeId || searchParams.get('model')?.trim() || '').trim()
          const wantApprove = searchParams.get('approve') === '1'
          if (deepModel) {
            const found = modelList.find((m) => m.id === deepModel)
            if (found) {
              setFilterMakerId(found.manufacturerId)
              setSelectedId(found.id)
              if (wantApprove || found.qualityStatus === 'review') {
                setApproveIds((prev) => ({ ...prev, [found.id]: true }))
              }
              splitTabs.openTab(found.id)
            }
          }
          if (bridgeId || searchParams.get('model') || wantApprove) {
            const next = new URLSearchParams(searchParams)
            next.delete('model')
            next.delete('approve')
            setSearchParams(next, { replace: true })
          }
        }
      } catch (e) {
        const msg = toUserMessage(e, 'Erro ao carregar veículos')
        setError(msg)
        toast.push(msg, 'error')
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount + deep-link once
  }, [])

  // Índice VV em memória para busca termo livre (ano/motor/versão) e filtro ano.
  useEffect(() => {
    let cancelled = false
    void adminListVersions()
      .then((rows) => {
        if (!cancelled) setAllVersions(rows)
      })
      .catch((e) => {
        if (!cancelled) {
          toast.push(toUserMessage(e, 'Erro ao indexar configurações'), 'error')
          setAllVersions([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [toast])

  const filteredModels = useMemo(() => {
    const q = searchName.trim().toLowerCase()
    const yearN = filterYear.trim() ? Number(filterYear.trim()) : null
    const yearOk = yearN != null && Number.isInteger(yearN)

    let list = models.filter((m) => {
      if (filterMakerId && m.manufacturerId !== filterMakerId) return false
      if (filterQuality && (m.qualityStatus ?? 'review') !== filterQuality) return false
      if (filterStatus && m.status !== filterStatus) return false

      if (yearOk) {
        const vvs = versionsByModelId.get(m.id) ?? []
        if (!vvs.some((v) => v.year === yearN)) return false
      }

      if (q) {
        const maker = (makerNameById.get(m.manufacturerId) ?? '').toLowerCase()
        const qualityLabel = qualityBadge(m.qualityStatus).label.toLowerCase()
        const statusLabel = entityStatusLabel(m.status).toLowerCase()
        const hayModel = [
          m.name,
          maker,
          qualityLabel,
          statusLabel,
          m.qualityStatus ?? '',
          m.reviewNote ?? '',
        ]
          .join(' ')
          .toLowerCase()
        const vvs = versionsByModelId.get(m.id) ?? []
        const hayVv = vvs
          .map((v) => [v.year, v.engine, v.versionName].filter(Boolean).join(' '))
          .join(' ')
          .toLowerCase()
        if (!hayModel.includes(q) && !hayVv.includes(q)) return false
      }
      return true
    })

    list = [...list].sort((a, b) => {
      const ma = makerNameById.get(a.manufacturerId) ?? ''
      const mb = makerNameById.get(b.manufacturerId) ?? ''
      if (sortBy === 'model') return a.name.localeCompare(b.name, 'pt-BR')
      if (sortBy === 'maker') {
        const c = ma.localeCompare(mb, 'pt-BR')
        return c !== 0 ? c : a.name.localeCompare(b.name, 'pt-BR')
      }
      const c = ma.localeCompare(mb, 'pt-BR')
      return c !== 0 ? c : a.name.localeCompare(b.name, 'pt-BR')
    })
    return list
  }, [
    models,
    filterMakerId,
    filterQuality,
    filterStatus,
    filterYear,
    searchName,
    makerNameById,
    sortBy,
    versionsByModelId,
  ])

  const totalFiltered = filteredModels.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / MODELS_PAGE_SIZE))
  const safePage = Math.min(modelsPage, totalPages)
  const pageModels = filteredModels.slice(
    (safePage - 1) * MODELS_PAGE_SIZE,
    safePage * MODELS_PAGE_SIZE,
  )

  useEffect(() => {
    setModelsPage(1)
  }, [searchName, filterMakerId, filterYear, filterQuality, filterStatus, sortBy])

  async function createModel(e: FormEvent) {
    e.preventDefault()
    if (!createMakerId) {
      pushError('Selecione a montadora para criar o modelo.')
      return
    }
    setBusyCreate(true)
    try {
      const saved = await adminUpsertModel({
        manufacturerId: createMakerId,
        name: createName.trim(),
        status: 'active',
        productionYearStart: createYearStart.trim() ? Number(createYearStart.trim()) : null,
        productionYearEnd: createYearEnd.trim() ? Number(createYearEnd.trim()) : null,
      })
      setCreateName('')
      setCreateYearStart('')
      setCreateYearEnd('')
      await reloadModels()
      pushOk('Modelo criado (verified).')
      openGuide(saved.id)
    } catch (err) {
      pushError(toUserMessage(err, 'Falha ao salvar modelo'))
    } finally {
      setBusyCreate(false)
    }
  }

  function onGuideModelUpdated(saved: VehicleModel) {
    setModels((prev) => prev.map((m) => (m.id === saved.id ? { ...m, ...saved } : m)))
  }

  const focused = models.find((m) => m.id === splitTabs.activeId) ?? null
  const contextualOpen = splitTabs.hasOpen

  const primary = (
    <div className="admin-vehicles-hub space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-fal-fg">Veículos</h1>
          <p className="mt-1 text-sm text-fal-muted">
            Lista + guia: modelo e configurações (VV). Cadastro manual nasce{' '}
            <strong>verified</strong>. Import CSV pode marcar Verificado ou Quarentena; sync sem
            Status fica em revisão no hub Integrações.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="rounded-[10px] border border-fal-line bg-fal-surface px-3 py-2 text-sm font-semibold text-fal-fg"
            to="/admin/veiculos/integracoes"
          >
            Integrações
          </Link>
          <Link
            className="rounded-[10px] border border-fal-line bg-fal-surface px-3 py-2 text-sm font-semibold text-fal-fg"
            to="/admin/veiculos/importar-mestre"
          >
            Importar veículos
          </Link>
          <Link
            className="rounded-[10px] border border-fal-line bg-fal-surface px-3 py-2 text-sm font-semibold text-fal-fg"
            to="/admin/aplicacoes"
          >
            Aplicações
          </Link>
        </div>
      </div>
      {error ? <p className="text-sm text-fal-danger">{error}</p> : null}
      {loading ? <Loading /> : null}

      <div className="grid gap-3 rounded-[14px] border border-fal-line bg-fal-surface p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="sm:col-span-2">
          <Input
            label="Buscar (qualquer termo)"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            placeholder="Montadora, modelo, qualidade, ano, motor…"
          />
        </div>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-extrabold text-fal-muted">Montadora</span>
          <select
            className="w-full rounded-[9px] border border-fal-line px-3 py-3"
            value={filterMakerId}
            onChange={(e) => setFilterMakerId(e.target.value)}
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
          <span className="mb-1 block text-xs font-extrabold text-fal-muted">Qualidade</span>
          <select
            className="w-full rounded-[9px] border border-fal-line px-3 py-3"
            value={filterQuality}
            onChange={(e) => setFilterQuality(e.target.value as QualityFilter)}
          >
            <option value="">Todas</option>
            <option value="verified">Verificado</option>
            <option value="review">Revisão</option>
            <option value="quarantined">Quarentena</option>
            <option value="superseded">Substituído</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-extrabold text-fal-muted">Status</span>
          <select
            className="w-full rounded-[9px] border border-fal-line px-3 py-3"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as StatusFilter)}
          >
            <option value="">Todos</option>
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
          </select>
        </label>
        <Input
          label="Ano (config)"
          inputMode="numeric"
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-sm font-semibold text-fal-fg">
          {totalFiltered} modelo{totalFiltered === 1 ? '' : 's'}
          {totalFiltered !== models.length ? ` (de ${models.length})` : ''}
        </p>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-xs font-extrabold text-fal-muted">Ordenar</span>
          <select
            className="rounded-[9px] border border-fal-line px-2 py-2"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as ModelSort)}
          >
            <option value="maker_model">Montadora + modelo</option>
            <option value="model">Modelo</option>
            <option value="maker">Montadora</option>
          </select>
        </label>
      </div>

      <form
        onSubmit={(e) => void createModel(e)}
        className="flex flex-wrap items-end gap-3 rounded-[14px] border border-fal-line bg-fal-surface p-4"
      >
        <label className="block min-w-[160px] text-sm">
          <span className="mb-1 block text-xs font-extrabold text-fal-muted">Montadora</span>
          <select
            className="w-full rounded-[9px] border border-fal-line px-3 py-3"
            value={createMakerId}
            onChange={(e) => setCreateMakerId(e.target.value)}
            required
          >
            <option value="">Selecione</option>
            {makers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <div className="min-w-[180px] flex-1">
          <Input
            label="Novo modelo"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            required
            disabled={!createMakerId}
          />
        </div>
        <div className="w-[100px]">
          <Input
            label="Desde"
            inputMode="numeric"
            value={createYearStart}
            onChange={(e) => setCreateYearStart(e.target.value)}
            disabled={!createMakerId}
          />
        </div>
        <div className="w-[100px]">
          <Input
            label="Até"
            inputMode="numeric"
            value={createYearEnd}
            onChange={(e) => setCreateYearEnd(e.target.value)}
            disabled={!createMakerId}
          />
        </div>
        <Button type="submit" disabled={!createMakerId || busyCreate}>
          Criar modelo
        </Button>
      </form>

      {pageModels.length === 0 && !loading ? (
        <EmptyState
          title={models.length === 0 ? 'Nenhum veículo cadastrado' : 'Nenhum resultado'}
          description={
            models.length === 0
              ? 'Cadastre o primeiro modelo acima.'
              : 'Ajuste busca ou filtros para ver modelos.'
          }
        />
      ) : null}

      <div className="admin-vehicles-list-mobile fal-admin-scroll max-h-[min(60dvh,640px)] space-y-3 overflow-y-auto md:hidden">
        {pageModels.map((m) => {
          const qb = qualityBadge(m.qualityStatus)
          return (
            <article
              key={m.id}
              className={[
                'cursor-pointer rounded-[14px] border border-fal-line bg-fal-surface p-3 shadow-sm',
                selectedId === m.id || splitTabs.openIds.includes(m.id)
                  ? 'border-fal-yellow bg-fal-yellow/30'
                  : '',
              ].join(' ')}
              onClick={() => setSelectedId(m.id)}
              onDoubleClick={() => openGuide(m.id)}
            >
              <p className="m-0 text-xs text-fal-muted">
                {makerNameById.get(m.manufacturerId) ?? '—'}
              </p>
              <p className="mb-1 mt-0.5 text-sm font-extrabold text-fal-fg">{m.name}</p>
              <p className="m-0 flex flex-wrap items-center gap-2 text-xs text-fal-muted">
                <span>{entityStatusLabel(m.status)}</span>
                <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${qb.className}`}>
                  {qb.label}
                </span>
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center rounded-[10px] bg-fal-navy px-3 text-sm font-bold text-white"
                  onClick={(ev) => {
                    ev.stopPropagation()
                    openGuide(m.id)
                  }}
                >
                  Abrir guia
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center rounded-[10px] border border-fal-line px-3 text-sm font-semibold text-fal-muted"
                  onClick={(ev) => {
                    ev.stopPropagation()
                    void adminSetModelStatus(m.id, m.status === 'active' ? 'inactive' : 'active')
                      .then(async () => {
                        await reloadModels()
                        pushOk(m.status === 'active' ? 'Modelo inativado.' : 'Modelo ativado.')
                      })
                      .catch((err) => pushError(toUserMessage(err, 'Falha ao atualizar status')))
                  }}
                >
                  {m.status === 'active' ? 'Inativar' : 'Ativar'}
                </button>
              </div>
            </article>
          )
        })}
      </div>

      <div className="admin-vehicles-list-desktop fal-admin-scroll hidden max-h-[min(60dvh,640px)] overflow-y-auto overflow-x-auto rounded-[14px] border border-fal-line bg-fal-surface md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 bg-fal-bg text-fal-muted">
            <tr>
              <th className="px-3 py-2">Montadora</th>
              <th className="px-3 py-2">Modelo</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Qualidade</th>
              <th className="px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {pageModels.map((m) => {
              const qb = qualityBadge(m.qualityStatus)
              return (
                <tr
                  key={m.id}
                  className={[
                    'cursor-pointer border-t border-fal-line',
                    selectedId === m.id || splitTabs.openIds.includes(m.id)
                      ? 'bg-fal-yellow/30'
                      : '',
                  ].join(' ')}
                  onClick={() => setSelectedId(m.id)}
                  onDoubleClick={() => openGuide(m.id)}
                >
                  <td className="px-3 py-2">{makerNameById.get(m.manufacturerId) ?? '—'}</td>
                  <td className="px-3 py-2 font-semibold">{m.name}</td>
                  <td className="px-3 py-2">{entityStatusLabel(m.status)}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${qb.className}`}>
                      {qb.label}
                    </span>
                  </td>
                  <td className="space-x-2 px-3 py-2">
                    <button
                      type="button"
                      className="font-semibold text-fal-auth-link"
                      onClick={(ev) => {
                        ev.stopPropagation()
                        openGuide(m.id)
                      }}
                    >
                      Abrir guia
                    </button>
                    <button
                      type="button"
                      className="font-semibold text-fal-muted"
                      onClick={(ev) => {
                        ev.stopPropagation()
                        void adminSetModelStatus(
                          m.id,
                          m.status === 'active' ? 'inactive' : 'active',
                        )
                          .then(async () => {
                            await reloadModels()
                            pushOk(
                              m.status === 'active' ? 'Modelo inativado.' : 'Modelo ativado.',
                            )
                          })
                          .catch((err) =>
                            pushError(toUserMessage(err, 'Falha ao atualizar status')),
                          )
                      }}
                    >
                      {m.status === 'active' ? 'Inativar' : 'Ativar'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="light"
            disabled={safePage <= 1}
            onClick={() => setModelsPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </Button>
          <span className="text-sm text-fal-muted">
            Página {safePage} de {totalPages}
          </span>
          <Button
            type="button"
            variant="light"
            disabled={safePage >= totalPages}
            onClick={() => setModelsPage((p) => Math.min(totalPages, p + 1))}
          >
            Próxima
          </Button>
        </div>
      ) : null}
    </div>
  )

  return (
    <AdaptiveWorkspace
      moduleKey="vehicles"
      primary={primary}
      contextualOpen={contextualOpen}
      onContextualOpenChange={(open) => {
        if (!open) splitTabs.closeAll()
      }}
      contextualTitle={
        splitTabs.openIds.length > 1
          ? `${focused?.name ?? 'Veículo'} · ${splitTabs.openIds.length} guias`
          : focused
            ? focused.name
            : 'Veículo'
      }
      contextual={
        contextualOpen ? (
          <OrderSplitTabPanels
            orderIds={splitTabs.openIds}
            meta={splitTabs.openIds.map((id) => {
              const m = models.find((x) => x.id === id)
              return {
                id,
                label: m
                  ? `${makerNameById.get(m.manufacturerId) ?? '?'} · ${m.name}`
                  : id.slice(0, 8),
                statusLabel: m ? qualityBadge(m.qualityStatus).label : undefined,
              }
            })}
            onCloseTab={splitTabs.closeTab}
            render={(modelId) => {
              const m = models.find((x) => x.id === modelId) ?? null
              return (
                <AdminVehicleGuidePanel
                  model={m}
                  makerName={
                    m ? (makerNameById.get(m.manufacturerId) ?? '—') : '—'
                  }
                  manufacturers={makers}
                  initialApprove={Boolean(approveIds[modelId]) || m?.qualityStatus === 'review'}
                  onClose={() => splitTabs.closeTab(modelId)}
                  onModelUpdated={onGuideModelUpdated}
                />
              )
            }}
          />
        ) : null
      }
    />
  )
}
