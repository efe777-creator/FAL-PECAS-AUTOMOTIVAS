import { Button, buttonClassName } from '@/components/common/Button'
import { confirmDialog } from '@/components/common/ConfirmDialog'
import { Input } from '@/components/common/Input'
import { useToast } from '@/components/common/Toast'
import { formatVehicleAppYear, validatePvcYearInputs } from '@/lib/vehicleAppYear'
import { SKU_FAL_LABEL } from '@/lib/productLabels'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  adminAddApplicationsBulk,
  adminFindProductIdBySku,
  adminRemoveApplication,
  adminRemoveApplicationsBulk,
  adminUpdateApplicationVehicleVersion,
  adminUpdateApplicationYears,
  type AdminApplicationRow,
} from '@/services/admin/adminApplicationService'
import { adminListModels, adminListVersions } from '@/services/admin/adminVehicleService'
import type { Manufacturer, VehicleModel, VehicleVersion } from '@/types'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

export type ApplicationGuideMode = 'create' | 'focus' | 'bulk'

type Props = {
  mode: ApplicationGuideMode
  focused: AdminApplicationRow | null
  selectedRows: AdminApplicationRow[]
  makers: Manufacturer[]
  onClose: () => void
  onMutated: (opts?: { focusSku?: string }) => void
}

function engineOpts(versions: VehicleVersion[]) {
  const set = new Set<string>()
  for (const v of versions) {
    const e = (v.engine ?? '').trim()
    if (e) set.add(e)
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

function versionOpts(versions: VehicleVersion[], engine: string) {
  const filtered = engine
    ? versions.filter((v) => (v.engine ?? '').trim() === engine)
    : versions
  const set = new Set<string>()
  for (const v of filtered) {
    const name = (v.versionName ?? '').trim()
    if (name) set.add(name)
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

function matchingVersions(
  versions: VehicleVersion[],
  engine: string,
  versionName: string,
) {
  return versions.filter((v) => {
    if (engine && (v.engine ?? '').trim() !== engine) return false
    if (versionName && (v.versionName ?? '').trim() !== versionName) return false
    return true
  })
}

/**
 * Superfície contextual do hub Aplicações (Adaptive).
 * Criar / editar período / trocar veículo / bulk — não é OrderOps.
 */
export function ApplicationWorkSurface({
  mode,
  focused,
  selectedRows,
  makers,
  onClose,
  onMutated,
}: Props) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  const [yearStart, setYearStart] = useState('')
  const [yearEnd, setYearEnd] = useState('')

  const [swapMakerId, setSwapMakerId] = useState('')
  const [swapModelId, setSwapModelId] = useState('')
  const [swapEngine, setSwapEngine] = useState('')
  const [swapVersion, setSwapVersion] = useState('')
  const [swapModels, setSwapModels] = useState<VehicleModel[]>([])
  const [swapVersions, setSwapVersions] = useState<VehicleVersion[]>([])

  const [createSku, setCreateSku] = useState('')
  const [createMakerId, setCreateMakerId] = useState('')
  const [createModelId, setCreateModelId] = useState('')
  const [createEngine, setCreateEngine] = useState('')
  const [createVersion, setCreateVersion] = useState('')
  const [createYearStart, setCreateYearStart] = useState('')
  const [createYearEnd, setCreateYearEnd] = useState('')
  const [createModels, setCreateModels] = useState<VehicleModel[]>([])
  const [createVersions, setCreateVersions] = useState<VehicleVersion[]>([])

  useEffect(() => {
    if (!focused) return
    setYearStart(focused.yearStart != null ? String(focused.yearStart) : '')
    setYearEnd(focused.yearEnd != null ? String(focused.yearEnd) : '')
    setSwapMakerId(focused.makerId ?? '')
    setSwapModelId(focused.modelId ?? '')
    setSwapEngine((focused.engine ?? '').trim())
    setSwapVersion((focused.versionName ?? '').trim())
  }, [focused])

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

  useEffect(() => {
    if (!createMakerId) {
      setCreateModels([])
      setCreateModelId('')
      return
    }
    void adminListModels(createMakerId).then(setCreateModels)
  }, [createMakerId])

  useEffect(() => {
    if (!createModelId) {
      setCreateVersions([])
      setCreateEngine('')
      setCreateVersion('')
      return
    }
    void adminListVersions(createModelId).then(setCreateVersions)
  }, [createModelId])

  const swapEngineOptions = useMemo(() => engineOpts(swapVersions), [swapVersions])
  const swapVersionOptions = useMemo(
    () => versionOpts(swapVersions, swapEngine),
    [swapVersions, swapEngine],
  )
  const matchingSwap = useMemo(
    () => matchingVersions(swapVersions, swapEngine, swapVersion),
    [swapVersions, swapEngine, swapVersion],
  )

  const createEngineOptions = useMemo(() => engineOpts(createVersions), [createVersions])
  const createVersionOptions = useMemo(
    () => versionOpts(createVersions, createEngine),
    [createVersions, createEngine],
  )
  const matchingCreate = useMemo(
    () => matchingVersions(createVersions, createEngine, createVersion),
    [createVersions, createEngine, createVersion],
  )

  async function savePeriod() {
    if (!focused) return
    const period = validatePvcYearInputs(yearStart, yearEnd)
    if (!period.ok) {
      toast.push(period.message, 'error')
      return
    }
    setBusy(true)
    try {
      await adminUpdateApplicationYears(focused.id, {
        yearStart: period.yearStart,
        yearEnd: period.yearEnd,
      })
      toast.push('Período atualizado.', 'success')
      onMutated()
    } catch (e) {
      toast.push(toUserMessage(e, 'Falha ao salvar período'), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function saveSwap() {
    if (!focused) return
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
    if (nextVersionId === focused.vehicleVersionId) {
      toast.push('Selecione uma configuração diferente da atual', 'error')
      return
    }
    setBusy(true)
    try {
      await adminUpdateApplicationVehicleVersion(focused.id, nextVersionId)
      toast.push('Configuração veicular atualizada.', 'success')
      onMutated()
    } catch (e) {
      toast.push(toUserMessage(e, 'Falha ao trocar configuração'), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function deleteOne() {
    if (!focused) return
    const { confirmed } = await confirmDialog({
      title: 'Excluir aplicação?',
      message: 'Excluir esta aplicação?',
      confirmLabel: 'Excluir',
      danger: true,
    })
    if (!confirmed) return
    setBusy(true)
    try {
      await adminRemoveApplication(focused.id)
      toast.push('Aplicação excluída.', 'success')
      onClose()
      onMutated()
    } catch (e) {
      toast.push(toUserMessage(e, 'Falha ao excluir'), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function deleteBulk() {
    if (!selectedRows.length) return
    const { confirmed } = await confirmDialog({
      title: 'Excluir aplicações?',
      message: `Excluir ${selectedRows.length} aplicação(ões)?`,
      confirmLabel: 'Excluir',
      danger: true,
    })
    if (!confirmed) return
    setBusy(true)
    try {
      const n = await adminRemoveApplicationsBulk(selectedRows.map((r) => r.id))
      toast.push(`${n} aplicação(ões) excluída(s).`, 'success')
      onClose()
      onMutated()
    } catch (e) {
      toast.push(toUserMessage(e, 'Falha ao excluir seleção'), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function onCreate() {
    const sku = createSku.trim()
    if (!sku) {
      toast.push(`Informe o ${SKU_FAL_LABEL.toLowerCase()} do produto`, 'error')
      return
    }
    if (!createModelId) {
      toast.push('Selecione montadora e modelo', 'error')
      return
    }
    if (matchingCreate.length === 0) {
      toast.push('Nenhuma configuração bate com motorização/versão', 'error')
      return
    }
    const period = validatePvcYearInputs(createYearStart, createYearEnd)
    if (!period.ok) {
      toast.push(period.message, 'error')
      return
    }
    setBusy(true)
    try {
      const productId = await adminFindProductIdBySku(sku)
      if (!productId) {
        toast.push(`Produto não encontrado: ${sku}`, 'error')
        return
      }
      const n = await adminAddApplicationsBulk(
        productId,
        matchingCreate.map((v) => v.id),
        { yearStart: period.yearStart, yearEnd: period.yearEnd },
      )
      toast.push(`${n} aplicação(ões) criada(s) para ${sku}.`, 'success')
      onClose()
      onMutated({ focusSku: sku })
    } catch (e) {
      toast.push(toUserMessage(e, 'Falha ao criar aplicação'), 'error')
    } finally {
      setBusy(false)
    }
  }

  const selectCls = 'w-full rounded-[9px] border border-fal-line px-3 py-2.5 text-sm text-fal-fg'

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3" data-application-ops-density="compact">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-fal-line pb-2">
        <p className="m-0 text-xs font-semibold text-fal-muted">
          {mode === 'create'
            ? 'Nova aplicação na guia'
            : mode === 'bulk'
              ? `Lote · ${selectedRows.length} selecionada(s)`
              : 'Aberto na guia · PVC'}
        </p>
        <button
          type="button"
          className="text-xs font-semibold text-fal-muted underline"
          onClick={onClose}
        >
          Fechar guia
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto fal-admin-scroll">
        {mode === 'create' ? (
          <section className="space-y-3 rounded-[12px] border border-fal-line bg-fal-surface p-3">
            <p className="m-0 text-xs text-fal-muted">
              Motorização/versão vazia = todas as configs elegíveis ({matchingCreate.length}).
            </p>
            <Input
              label={SKU_FAL_LABEL}
              value={createSku}
              onChange={(e) => setCreateSku(e.target.value)}
              placeholder="Código do produto"
            />
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-extrabold text-fal-muted">Montadora</span>
              <select
                className={selectCls}
                value={createMakerId}
                onChange={(e) => setCreateMakerId(e.target.value)}
              >
                <option value="">Selecione</option>
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
                className={selectCls}
                value={createModelId}
                onChange={(e) => setCreateModelId(e.target.value)}
                disabled={!createMakerId}
              >
                <option value="">Selecione</option>
                {createModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-extrabold text-fal-muted">Motorização</span>
              <select
                className={selectCls}
                value={createEngine}
                onChange={(e) => {
                  setCreateEngine(e.target.value)
                  setCreateVersion('')
                }}
                disabled={!createModelId}
              >
                <option value="">Todas</option>
                {createEngineOptions.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-extrabold text-fal-muted">Versão</span>
              <select
                className={selectCls}
                value={createVersion}
                onChange={(e) => setCreateVersion(e.target.value)}
                disabled={!createModelId}
              >
                <option value="">Todas</option>
                {createVersionOptions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <Input
              label="Ano inicial *"
              inputMode="numeric"
              value={createYearStart}
              onChange={(e) => setCreateYearStart(e.target.value)}
            />
            <Input
              label="Ano final"
              inputMode="numeric"
              value={createYearEnd}
              onChange={(e) => setCreateYearEnd(e.target.value)}
              hint="Em branco = vigente até o ano atual"
            />
            <Button
              type="button"
              disabled={busy || !createModelId || matchingCreate.length === 0}
              onClick={() => void onCreate()}
            >
              {busy
                ? 'Criando…'
                : `Criar${matchingCreate.length > 1 ? ` (${matchingCreate.length})` : ''}`}
            </Button>
          </section>
        ) : null}

        {mode === 'bulk' ? (
          <section className="space-y-3 rounded-[12px] border border-fal-line bg-fal-surface p-3">
            <p className="m-0 text-sm text-fal-fg">
              {selectedRows.length} aplicação(ões) selecionada(s) na lista.
            </p>
            <ul className="m-0 max-h-40 list-none space-y-1 overflow-y-auto p-0 text-xs text-fal-muted">
              {selectedRows.slice(0, 20).map((r) => (
                <li key={r.id}>
                  {r.productSku} · {r.makerName} {r.modelName}
                </li>
              ))}
              {selectedRows.length > 20 ? (
                <li>… e mais {selectedRows.length - 20}</li>
              ) : null}
            </ul>
            <Button type="button" variant="danger" disabled={busy} onClick={() => void deleteBulk()}>
              {busy ? 'Excluindo…' : 'Excluir seleção'}
            </Button>
          </section>
        ) : null}

        {mode === 'focus' && focused ? (
          <>
            <section className="rounded-[12px] border border-fal-line bg-fal-bg/40 p-3">
              <p className="m-0 font-mono text-xs text-fal-muted">{focused.productSku}</p>
              <h2 className="mt-0.5 mb-0 text-base font-extrabold text-fal-fg">
                {focused.productName}
              </h2>
              <p className="mt-1 mb-0 text-sm text-fal-muted">
                {[focused.makerName, focused.modelName, focused.engine, focused.versionName]
                  .filter(Boolean)
                  .join(' · ') || 'Veículo'}
              </p>
              <p className="mt-1 mb-0 text-sm font-semibold text-fal-fg">
                {formatVehicleAppYear({
                  yearStart: focused.yearStart,
                  yearEnd: focused.yearEnd,
                  versionYear: focused.versionYear,
                }) ?? '—'}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Link
                  to={`/admin/produtos/${focused.productId}`}
                  className={buttonClassName({ variant: 'primary', size: 'sm' })}
                >
                  Abrir cadastro
                </Link>
                <Button type="button" variant="danger" size="sm" disabled={busy} onClick={() => void deleteOne()}>
                  Excluir
                </Button>
              </div>
            </section>

            <section className="space-y-2 rounded-[12px] border border-fal-line bg-fal-surface p-3">
              <h3 className="m-0 text-sm font-extrabold text-fal-fg">Período</h3>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Ano inicial *"
                  inputMode="numeric"
                  value={yearStart}
                  onChange={(e) => setYearStart(e.target.value)}
                />
                <Input
                  label="Ano final"
                  inputMode="numeric"
                  value={yearEnd}
                  onChange={(e) => setYearEnd(e.target.value)}
                />
              </div>
              <Button type="button" size="sm" disabled={busy} onClick={() => void savePeriod()}>
                {busy ? 'Salvando…' : 'Salvar período'}
              </Button>
            </section>

            <section className="space-y-2 rounded-[12px] border border-fal-line bg-fal-surface p-3">
              <h3 className="m-0 text-sm font-extrabold text-fal-fg">Trocar veículo</h3>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-extrabold text-fal-muted">Montadora</span>
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
                <span className="mb-1 block text-xs font-extrabold text-fal-muted">Modelo</span>
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
                <span className="mb-1 block text-xs font-extrabold text-fal-muted">Motorização</span>
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
                <span className="mb-1 block text-xs font-extrabold text-fal-muted">Versão</span>
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
              <p className="m-0 text-[11px] text-fal-muted">{matchingSwap.length} config.</p>
              <Button type="button" size="sm" disabled={busy} onClick={() => void saveSwap()}>
                {busy ? 'Salvando…' : 'Salvar veículo'}
              </Button>
            </section>
          </>
        ) : null}
      </div>
    </div>
  )
}
