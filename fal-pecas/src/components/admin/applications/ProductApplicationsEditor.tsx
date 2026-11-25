import { Button, buttonClassName } from '@/components/common/Button'
import { confirmDialog } from '@/components/common/ConfirmDialog'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { PRODUCTS_OPEN_GUIDE_KEY, setGuideBridge } from '@/lib/adminGuideBridges'
import {
  PVC_CASCADE_HINT,
  pvcEngineOptions,
  pvcMatchingVersions,
  pvcVersionNameOptions,
} from '@/lib/pvcVehicleCascade'
import { SKU_FAL_LABEL } from '@/lib/productLabels'
import { toUserMessage } from '@/lib/toUserMessage'
import { formatVehicleAppYear, validatePvcYearInputs } from '@/lib/vehicleAppYear'
import { adminListManufacturers } from '@/services/admin/adminManufacturerService'
import {
  adminAddApplicationsBulk,
  adminGetProduct,
  adminListApplications,
  adminRemoveApplication,
  adminUpdateApplicationVehicleVersion,
  adminUpdateApplicationYears,
} from '@/services/admin/adminProductService'
import { adminListModels, adminListVersions } from '@/services/admin/adminVehicleService'
import type { Manufacturer, Product, VehicleModel, VehicleVersion } from '@/types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export type ProductAppRow = {
  id: string
  year_start?: number | null
  year_end?: number | null
  vehicle_version_id?: string
  vehicle_versions?: {
    id?: string
    year: number | null
    engine: string | null
    version_name: string | null
    manufacturer_id?: string
    model_id?: string
    manufacturers?: { id?: string; name: string } | { id?: string; name: string }[]
    models?: { id?: string; name: string } | { id?: string; name: string }[]
  }
}

type QueueItem = {
  id: string
  versionIds: string[]
  label: string
  yearStart: number
  yearEnd: number | null
}

type Props = {
  productId: string
  /** Montadoras pré-carregadas (hub); se omitido, carrega sozinho. */
  makers?: Manufacturer[]
  onClose?: () => void
  onMutated?: () => void
  /** `section` = aba/ficha; `guide` = Adaptive hub; `embedded` = menu na guia do produto. */
  variant?: 'guide' | 'section' | 'embedded'
}

function oneName(
  v: { id?: string; name: string } | { id?: string; name: string }[] | undefined,
): { id: string | null; name: string | null } {
  if (!v) return { id: null, name: null }
  if (Array.isArray(v)) {
    const first = v[0]
    return { id: first?.id ?? null, name: first?.name ?? null }
  }
  return { id: v.id ?? null, name: v.name }
}

function appVehicleParts(row: ProductAppRow): {
  title: string
  detail: string | null
} {
  const vv = row.vehicle_versions
  const maker = oneName(vv?.manufacturers).name
  const model = oneName(vv?.models).name
  const title = [maker, model].filter(Boolean).join(' ') || 'Veículo'
  const detail = [vv?.engine || null, vv?.version_name || null].filter(Boolean).join(' · ') || null
  return { title, detail }
}

/**
 * Editor centrado no produto: lista todos os PVC, fila multi-montadora,
 * editar período / trocar veículo / retirar.
 */
export function ProductApplicationsEditor({
  productId,
  makers: makersProp,
  onClose,
  onMutated,
  variant = 'guide',
}: Props) {
  const toast = useToast()
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)
  const [apps, setApps] = useState<ProductAppRow[]>([])
  const [makersLocal, setMakersLocal] = useState<Manufacturer[]>([])
  const makers = makersProp?.length ? makersProp : makersLocal

  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [makerId, setMakerId] = useState('')
  const [modelId, setModelId] = useState('')
  const [engineFilter, setEngineFilter] = useState('')
  const [versionNameFilter, setVersionNameFilter] = useState('')
  const [yearStart, setYearStart] = useState('')
  const [yearEnd, setYearEnd] = useState('')
  const [models, setModels] = useState<VehicleModel[]>([])
  const [versions, setVersions] = useState<VehicleVersion[]>([])
  const [queue, setQueue] = useState<QueueItem[]>([])

  const [editingAppId, setEditingAppId] = useState<string | null>(null)
  const [editYearStart, setEditYearStart] = useState('')
  const [editYearEnd, setEditYearEnd] = useState('')

  const [swapAppId, setSwapAppId] = useState<string | null>(null)
  const [swapMakerId, setSwapMakerId] = useState('')
  const [swapModelId, setSwapModelId] = useState('')
  const [swapEngine, setSwapEngine] = useState('')
  const [swapVersion, setSwapVersion] = useState('')
  const [swapModels, setSwapModels] = useState<VehicleModel[]>([])
  const [swapVersions, setSwapVersions] = useState<VehicleVersion[]>([])

  const reload = useCallback(async () => {
    const [p, list] = await Promise.all([
      adminGetProduct(productId),
      adminListApplications(productId),
    ])
    setProduct(p)
    setApps(list as unknown as ProductAppRow[])
  }, [productId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    void reload()
      .catch((e) => {
        if (!cancelled) setError(toUserMessage(e, 'Falha ao carregar aplicações'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [reload])

  useEffect(() => {
    if (makersProp?.length) return
    void adminListManufacturers()
      .then((m) => setMakersLocal(m.filter((x) => x.status === 'active')))
      .catch((e) => setError(toUserMessage(e, 'Falha ao carregar montadoras')))
  }, [makersProp])

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
      setVersionNameFilter('')
      return
    }
    void adminListVersions(modelId).then(setVersions)
  }, [modelId])

  useEffect(() => {
    if (!swapMakerId) {
      setSwapModels([])
      setSwapModelId('')
      return
    }
    void adminListModels(swapMakerId).then(setSwapModels)
  }, [swapMakerId])

  useEffect(() => {
    if (!swapModelId) {
      setSwapVersions([])
      setSwapEngine('')
      setSwapVersion('')
      return
    }
    void adminListVersions(swapModelId).then(setSwapVersions)
  }, [swapModelId])

  const engineOptions = useMemo(() => pvcEngineOptions(versions), [versions])
  const versionNameOptions = useMemo(
    () => pvcVersionNameOptions(versions, engineFilter),
    [versions, engineFilter],
  )
  const matchingVersions = useMemo(
    () => pvcMatchingVersions(versions, engineFilter, versionNameFilter),
    [versions, engineFilter, versionNameFilter],
  )

  /** Sugere período PVC a partir dos anos das configs (VV) batendo motor/versão. */
  useEffect(() => {
    if (!engineFilter && !versionNameFilter) return
    const years = matchingVersions
      .map((v) => v.year)
      .filter((y): y is number => y != null && Number.isFinite(y))
    if (!years.length) return
    const lo = Math.min(...years)
    const hi = Math.max(...years)
    setYearStart(String(lo))
    setYearEnd(String(hi))
  }, [matchingVersions, engineFilter, versionNameFilter])

  const swapEngineOptions = useMemo(() => pvcEngineOptions(swapVersions), [swapVersions])
  const swapVersionOptions = useMemo(
    () => pvcVersionNameOptions(swapVersions, swapEngine),
    [swapVersions, swapEngine],
  )
  const matchingSwap = useMemo(
    () => pvcMatchingVersions(swapVersions, swapEngine, swapVersion),
    [swapVersions, swapEngine, swapVersion],
  )

  const queueVersionCount = useMemo(
    () => queue.reduce((n, item) => n + item.versionIds.length, 0),
    [queue],
  )

  const selectCls = 'w-full rounded-[9px] border border-fal-line px-3 py-2.5 text-sm text-fal-fg'
  const sku = product?.commercialRef || product?.sku || '—'
  const name = product?.name || 'Produto'

  function notifyMutated() {
    onMutated?.()
  }

  function addToQueue() {
    setError(null)
    if (!modelId) {
      setError('Selecione montadora e modelo')
      return
    }
    if (matchingVersions.length === 0) {
      setError('Nenhuma configuração bate com motorização/versão')
      return
    }
    const period = validatePvcYearInputs(yearStart, yearEnd)
    if (!period.ok) {
      setError(period.message)
      return
    }
    const makerName = makers.find((m) => m.id === makerId)?.name ?? ''
    const modelName = models.find((m) => m.id === modelId)?.name ?? ''
    const label = [
      makerName,
      modelName,
      engineFilter || 'todas motors',
      versionNameFilter || 'todas versões',
      `${matchingVersions.length} config`,
    ]
      .filter(Boolean)
      .join(' · ')
    setQueue((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        versionIds: matchingVersions.map((v) => v.id),
        label,
        yearStart: period.yearStart,
        yearEnd: period.yearEnd,
      },
    ])
  }

  function removeQueueItem(id: string) {
    setQueue((prev) => prev.filter((x) => x.id !== id))
  }

  async function commitQueue() {
    if (!queue.length) return
    setBusy(true)
    setError(null)
    try {
      let total = 0
      for (const item of queue) {
        total += await adminAddApplicationsBulk(productId, item.versionIds, {
          yearStart: item.yearStart,
          yearEnd: item.yearEnd,
        })
      }
      setQueue([])
      await reload()
      notifyMutated()
      toast.push(
        total === 1 ? '1 aplicação vinculada.' : `${total} aplicações vinculadas.`,
        'success',
      )
    } catch (e) {
      const msg = toUserMessage(e, 'Falha ao vincular aplicações')
      setError(msg)
      toast.push(msg, 'error')
    } finally {
      setBusy(false)
    }
  }

  async function savePeriod(appId: string) {
    const period = validatePvcYearInputs(editYearStart, editYearEnd)
    if (!period.ok) {
      setError(period.message)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await adminUpdateApplicationYears(appId, {
        yearStart: period.yearStart,
        yearEnd: period.yearEnd,
      })
      setEditingAppId(null)
      await reload()
      notifyMutated()
      toast.push('Período atualizado.', 'success')
    } catch (e) {
      const msg = toUserMessage(e, 'Falha ao salvar período')
      setError(msg)
      toast.push(msg, 'error')
    } finally {
      setBusy(false)
    }
  }

  function startSwap(row: ProductAppRow) {
    const vv = row.vehicle_versions
    const maker = oneName(vv?.manufacturers)
    const model = oneName(vv?.models)
    setSwapAppId(row.id)
    setSwapMakerId(maker.id ?? vv?.manufacturer_id ?? '')
    setSwapModelId(model.id ?? vv?.model_id ?? '')
    setSwapEngine((vv?.engine ?? '').trim())
    setSwapVersion((vv?.version_name ?? '').trim())
    setEditingAppId(null)
  }

  async function saveSwap() {
    if (!swapAppId) return
    if (!swapModelId) {
      toast.push('Selecione montadora e modelo', 'error')
      return
    }
    if (matchingSwap.length === 0) {
      toast.push('Nenhuma configuração bate com motorização/versão', 'error')
      return
    }
    if (matchingSwap.length > 1 && (!swapEngine || !swapVersion)) {
      toast.push('Refine motorização e versão até restar uma configuração', 'error')
      return
    }
    const nextVersionId = matchingSwap[0]!.id
    const current = apps.find((a) => a.id === swapAppId)
    const currentVid = current?.vehicle_version_id ?? current?.vehicle_versions?.id
    if (currentVid && nextVersionId === currentVid) {
      toast.push('Selecione uma configuração diferente da atual', 'error')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await adminUpdateApplicationVehicleVersion(swapAppId, nextVersionId)
      setSwapAppId(null)
      await reload()
      notifyMutated()
      toast.push('Configuração veicular atualizada.', 'success')
    } catch (e) {
      const msg = toUserMessage(e, 'Falha ao trocar configuração')
      setError(msg)
      toast.push(msg, 'error')
    } finally {
      setBusy(false)
    }
  }

  async function removeApp(appId: string) {
    const { confirmed } = await confirmDialog({
      title: 'Remover aplicação?',
      message: 'O vínculo deste produto com o veículo será removido.',
      confirmLabel: 'Remover',
      danger: true,
    })
    if (!confirmed) return
    setBusy(true)
    setError(null)
    try {
      await adminRemoveApplication(appId)
      if (swapAppId === appId) setSwapAppId(null)
      if (editingAppId === appId) setEditingAppId(null)
      await reload()
      notifyMutated()
      toast.push('Aplicação removida.', 'success')
    } catch (e) {
      const msg = toUserMessage(e, 'Falha ao remover aplicação')
      setError(msg)
      toast.push(msg, 'error')
    } finally {
      setBusy(false)
    }
  }

  const shellCls =
    variant === 'section'
      ? 'space-y-3 rounded-[14px] border border-fal-line bg-fal-surface p-4'
      : variant === 'embedded'
        ? 'space-y-3'
        : 'flex h-full min-h-0 flex-col gap-3 p-3'

  return (
    <div className={shellCls} data-product-applications-editor={variant}>
      {variant === 'guide' ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-fal-line pb-2">
          <p className="m-0 text-xs font-semibold text-fal-muted">
            Guia do item · aplicações PVC
          </p>
          {onClose ? (
            <button
              type="button"
              className="text-xs font-semibold text-fal-muted underline"
              onClick={onClose}
            >
              Fechar guia
            </button>
          ) : null}
        </div>
      ) : variant === 'section' ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="m-0 font-extrabold text-fal-fg">Aplicações</h2>
          <Link
            className="text-sm font-semibold text-fal-fg underline"
            to={`/admin/aplicacoes?productId=${productId}`}
          >
            Hub Aplicações
          </Link>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="m-0 text-xs text-fal-muted">
            Troque modelo, motor ou versão nos vínculos; adicione mais na fila.
          </p>
          <Link
            className="text-xs font-semibold text-fal-fg underline"
            to={`/admin/aplicacoes?productId=${productId}`}
          >
            Hub Aplicações
          </Link>
        </div>
      )}

      {loading ? <Loading label="Carregando aplicações…" /> : null}

      {!loading && product && variant !== 'embedded' ? (
        <section
          className={
            variant === 'guide'
              ? 'rounded-[12px] border border-fal-line bg-fal-bg/40 p-3'
              : 'space-y-1'
          }
        >
          <p className="m-0 font-mono text-xs text-fal-muted">
            {SKU_FAL_LABEL}: {sku}
          </p>
          <h3 className="mt-0.5 mb-0 text-base font-extrabold text-fal-fg">{name}</h3>
          <p className="mt-1 mb-0 text-xs text-fal-muted">
            {apps.length} vínculo(s) · adicione quantos veículos quiser na fila abaixo
          </p>
          {variant === 'guide' ? (
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  setGuideBridge(PRODUCTS_OPEN_GUIDE_KEY, productId)
                  navigate('/admin/produtos')
                }}
              >
                Abrir guia produto
              </Button>
              <Link
                to={`/admin/produtos/${productId}`}
                className={buttonClassName({ variant: 'light', size: 'sm' })}
              >
                Cadastro completo
              </Link>
            </div>
          ) : null}
        </section>
      ) : null}

      {!loading && product && variant === 'embedded' ? (
        <p className="m-0 text-xs text-fal-muted">
          {apps.length} vínculo(s) · Período · Trocar veículo · Retirar
        </p>
      ) : null}

      {!loading && !product ? (
        <p className="m-0 text-sm text-fal-danger">Produto não encontrado.</p>
      ) : null}

      {error ? <p className="m-0 text-sm text-fal-danger">{error}</p> : null}

      <div
        className={
          variant === 'guide'
            ? 'min-h-0 flex-1 space-y-3 overflow-y-auto fal-admin-scroll'
            : 'space-y-3'
        }
      >
        <section className="space-y-2 rounded-[12px] border border-fal-line bg-fal-surface p-3">
          <h4 className="m-0 text-sm font-extrabold text-fal-fg">Adicionar veículos</h4>
          <p className="m-0 text-xs text-fal-muted">
            {PVC_CASCADE_HINT} Elegíveis agora: {matchingVersions.length}. Use a fila para
            montadoras/modelos diferentes na mesma sessão.
          </p>
          <div
            className={
              variant === 'embedded'
                ? 'grid gap-2'
                : 'grid gap-2 sm:grid-cols-2'
            }
          >
            <label className="block min-w-0 text-sm">
              <span className="mb-1 block text-xs font-extrabold text-fal-muted">Montadora</span>
              <select
                className={selectCls}
                value={makerId}
                onChange={(e) => {
                  setMakerId(e.target.value)
                  setModelId('')
                }}
              >
                <option value="">Selecione</option>
                {makers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block min-w-0 text-sm">
              <span className="mb-1 block text-xs font-extrabold text-fal-muted">Modelo</span>
              <select
                className={selectCls}
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                disabled={!makerId}
              >
                <option value="">Selecione</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block min-w-0 text-sm">
              <span className="mb-1 block text-xs font-extrabold text-fal-muted">Motorização</span>
              <select
                className={selectCls}
                value={engineFilter}
                onChange={(e) => {
                  setEngineFilter(e.target.value)
                  setVersionNameFilter('')
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
            <label className="block min-w-0 text-sm">
              <span className="mb-1 block text-xs font-extrabold text-fal-muted">Versão</span>
              <select
                className={selectCls}
                value={versionNameFilter}
                onChange={(e) => setVersionNameFilter(e.target.value)}
                disabled={!modelId}
              >
                <option value="">Todas</option>
                {versionNameOptions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <Input
              label="Ano inicial *"
              inputMode="numeric"
              value={yearStart}
              onChange={(e) => setYearStart(e.target.value)}
              disabled={!modelId}
            />
            <Input
              label="Ano final"
              inputMode="numeric"
              value={yearEnd}
              onChange={(e) => setYearEnd(e.target.value)}
              disabled={!modelId}
              hint="Em branco = vigente até o ano atual"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="light"
              size="sm"
              disabled={!modelId || matchingVersions.length === 0 || busy}
              onClick={addToQueue}
            >
              Adicionar à fila
              {matchingVersions.length > 1 ? ` (${matchingVersions.length})` : ''}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!queue.length || busy}
              onClick={() => void commitQueue()}
            >
              {busy
                ? 'Vinculando…'
                : queue.length
                  ? `Vincular fila (${queueVersionCount})`
                  : 'Vincular fila'}
            </Button>
          </div>
          {queue.length > 0 ? (
            <ul className="m-0 list-none space-y-1 p-0 text-xs text-fal-muted">
              {queue.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-fal-line px-2 py-1.5"
                >
                  <span className="min-w-0 flex-1 text-fal-fg">
                    {item.label} · {item.yearStart}
                    {item.yearEnd != null ? `–${item.yearEnd}` : '+'}
                  </span>
                  <button
                    type="button"
                    className="font-semibold text-fal-danger underline"
                    onClick={() => removeQueueItem(item.id)}
                  >
                    Tirar
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="space-y-2">
          <h4 className="m-0 text-sm font-extrabold text-fal-fg">Vínculos do item</h4>
          {apps.length === 0 ? (
            <p className="m-0 text-sm text-fal-muted">Nenhuma aplicação vinculada.</p>
          ) : (
            <ul className="m-0 list-none space-y-2 p-0">
              {apps.map((row) => {
                const yearLabel = formatVehicleAppYear({
                  yearStart: row.year_start,
                  yearEnd: row.year_end,
                  versionYear: row.vehicle_versions?.year,
                })
                const { title, detail } = appVehicleParts(row)
                const isEditing = editingAppId === row.id
                const isSwapping = swapAppId === row.id
                const actionBtn =
                  'inline-flex min-h-9 shrink-0 items-center rounded-[8px] border border-fal-line bg-fal-bg px-2.5 text-xs font-semibold text-fal-fg'
                return (
                  <li
                    key={row.id}
                    className="space-y-2 rounded-[12px] border border-fal-line bg-fal-surface p-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="m-0 break-words font-semibold leading-snug text-fal-fg">
                        {title}
                      </p>
                      {detail ? (
                        <p className="mb-0 mt-0.5 break-words text-xs leading-snug text-fal-muted">
                          {detail}
                        </p>
                      ) : null}
                      <p className="mb-0 mt-1 text-xs font-semibold tabular-nums text-fal-fg">
                        {yearLabel ?? '—'}
                      </p>
                    </div>

                    {!isEditing && !isSwapping ? (
                      <div className="flex flex-wrap gap-1.5 border-t border-fal-line pt-2">
                        <button
                          type="button"
                          className={actionBtn}
                          onClick={() => {
                            setEditingAppId(row.id)
                            setEditYearStart(
                              row.year_start != null ? String(row.year_start) : '',
                            )
                            setEditYearEnd(row.year_end != null ? String(row.year_end) : '')
                            setSwapAppId(null)
                          }}
                        >
                          Período
                        </button>
                        <button
                          type="button"
                          className={actionBtn}
                          onClick={() => startSwap(row)}
                        >
                          Trocar veículo
                        </button>
                        <button
                          type="button"
                          className={`${actionBtn} border-fal-danger/40 text-fal-danger`}
                          disabled={busy}
                          onClick={() => void removeApp(row.id)}
                        >
                          Retirar
                        </button>
                      </div>
                    ) : null}

                    {isEditing ? (
                      <div className="grid gap-2 border-t border-fal-line pt-2 sm:grid-cols-2">
                        <Input
                          label="Ano inicial *"
                          inputMode="numeric"
                          value={editYearStart}
                          onChange={(e) => setEditYearStart(e.target.value)}
                        />
                        <Input
                          label="Ano final"
                          inputMode="numeric"
                          value={editYearEnd}
                          onChange={(e) => setEditYearEnd(e.target.value)}
                        />
                        <div className="flex flex-wrap gap-2 sm:col-span-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={busy}
                            onClick={() => void savePeriod(row.id)}
                          >
                            Salvar
                          </Button>
                          <button
                            type="button"
                            className="text-xs font-semibold text-fal-muted underline"
                            onClick={() => setEditingAppId(null)}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {isSwapping ? (
                      <div className="grid gap-2 border-t border-fal-line pt-2">
                        <label className="block text-sm">
                          <span className="mb-1 block text-xs font-extrabold text-fal-muted">
                            Montadora
                          </span>
                          <select
                            className={selectCls}
                            value={swapMakerId}
                            onChange={(e) => {
                              setSwapMakerId(e.target.value)
                              setSwapModelId('')
                            }}
                          >
                            <option value="">Montadora</option>
                            {makers.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block text-sm">
                          <span className="mb-1 block text-xs font-extrabold text-fal-muted">
                            Modelo
                          </span>
                          <select
                            className={selectCls}
                            value={swapModelId}
                            onChange={(e) => setSwapModelId(e.target.value)}
                            disabled={!swapMakerId}
                          >
                            <option value="">Modelo</option>
                            {swapModels.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block text-sm">
                          <span className="mb-1 block text-xs font-extrabold text-fal-muted">
                            Motorização
                          </span>
                          <select
                            className={selectCls}
                            value={swapEngine}
                            onChange={(e) => {
                              setSwapEngine(e.target.value)
                              setSwapVersion('')
                            }}
                            disabled={!swapModelId}
                          >
                            <option value="">Motor</option>
                            {swapEngineOptions.map((e) => (
                              <option key={e} value={e}>
                                {e}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block text-sm">
                          <span className="mb-1 block text-xs font-extrabold text-fal-muted">
                            Versão
                          </span>
                          <select
                            className={selectCls}
                            value={swapVersion}
                            onChange={(e) => setSwapVersion(e.target.value)}
                            disabled={!swapModelId}
                          >
                            <option value="">Versão</option>
                            {swapVersionOptions.map((v) => (
                              <option key={v} value={v}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </label>
                        <p className="m-0 text-[11px] text-fal-muted">
                          {matchingSwap.length} config.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={busy}
                            onClick={() => void saveSwap()}
                          >
                            {busy ? 'Salvando…' : 'Salvar veículo'}
                          </Button>
                          <button
                            type="button"
                            className="text-xs font-semibold text-fal-muted underline"
                            onClick={() => setSwapAppId(null)}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
