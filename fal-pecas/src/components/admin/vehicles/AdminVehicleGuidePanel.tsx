import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { Input } from '@/components/common/Input'
import { Select } from '@/components/common/Select'
import { useToast } from '@/components/common/Toast'
import { entityStatusLabel } from '@/lib/adminLabels'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  assertVersionYearsWithinModelLife,
  formatVersionPeriodLabel,
  groupVersionsByConfig,
  isConfigPeriodOpenEnded,
  versionConfigGroupKey,
  type VersionConfigGroup,
} from '@/lib/vehicles/expandVersionYearRange'
import { peelEngineFromVersionName } from '@/lib/vehicles/peelEngineFromVersionName'
import {
  normalizeVehicleFuel,
  VEHICLE_FUEL_SELECT_OPTIONS,
} from '@/lib/vehicles/normalizeVehicleFuel'
import {
  adminListVersions,
  adminReconcileVersionYearRange,
  adminSetModelStatus,
  adminSetVersionStatus,
  adminUpsertModel,
  adminUpsertVersionYearRange,
  setModelQualityStatus,
} from '@/services/admin/adminVehicleService'
import { yearsFromProductionLife } from '@/services/vehicles/productionLifeYears'
import { STAFF_QUALITY_EVIDENCE_KIND } from '@/services/vehicles/vehicleMasterProvider'
import type { Manufacturer, VehicleModel, VehicleVersion } from '@/types'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

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

export type AdminVehicleGuidePanelProps = {
  model: VehicleModel | null
  makerName: string
  /** Montadoras ativas para trocar o vínculo do modelo. */
  manufacturers: Manufacturer[]
  onClose: () => void
  onModelUpdated: (m: VehicleModel) => void
  /** Abre formulário A1 ao montar (ponte Integrações). */
  initialApprove?: boolean
}

export function AdminVehicleGuidePanel({
  model,
  makerName,
  manufacturers,
  onClose,
  onModelUpdated,
  initialApprove = false,
}: AdminVehicleGuidePanelProps) {
  const toast = useToast()
  const [versions, setVersions] = useState<VehicleVersion[]>([])
  const [loadingVv, setLoadingVv] = useState(false)

  const [manufacturerId, setManufacturerId] = useState('')
  const [modelName, setModelName] = useState('')
  const [productionYearStart, setProductionYearStart] = useState('')
  const [productionYearEnd, setProductionYearEnd] = useState('')
  const [busyModel, setBusyModel] = useState(false)

  /** Chave motor|versão da família em edição (null = criar nova). */
  const [editingGroupKey, setEditingGroupKey] = useState<string | null>(null)
  const [yearStart, setYearStart] = useState('')
  const [yearEnd, setYearEnd] = useState('')
  const [engine, setEngine] = useState('')
  const [versionName, setVersionName] = useState('')
  const [fuel, setFuel] = useState('')
  const [busyVv, setBusyVv] = useState(false)
  const [highlightGroupKey, setHighlightGroupKey] = useState<string | null>(null)
  const highlightRef = useRef<HTMLElement | null>(null)

  type QualityStatus = 'verified' | 'review' | 'quarantined' | 'superseded'
  const [qualityDraft, setQualityDraft] = useState<QualityStatus>('review')
  const [qualityNote, setQualityNote] = useState('')
  const [busyQuality, setBusyQuality] = useState(false)

  const reloadVersions = useCallback(async (modelId: string) => {
    setLoadingVv(true)
    try {
      setVersions(await adminListVersions(modelId))
    } catch (e) {
      toast.push(toUserMessage(e, 'Erro ao carregar configurações'), 'error')
      setVersions([])
    } finally {
      setLoadingVv(false)
    }
  }, [toast])

  useEffect(() => {
    if (!model) {
      setVersions([])
      return
    }
    setManufacturerId(model.manufacturerId)
    setModelName(model.name)
    setProductionYearStart(
      model.productionYearStart != null ? String(model.productionYearStart) : '',
    )
    setProductionYearEnd(model.productionYearEnd != null ? String(model.productionYearEnd) : '')
    setEditingGroupKey(null)
    setYearStart('')
    setYearEnd('')
    setEngine('')
    setVersionName('')
    setFuel('')
    setQualityNote(model.reviewNote ?? '')
    setQualityDraft(
      initialApprove
        ? 'verified'
        : ((model.qualityStatus as QualityStatus | undefined) ?? 'review'),
    )
    void reloadVersions(model.id)
  }, [model, initialApprove, reloadVersions])

  const modelLifeYears = useMemo(() => {
    if (
      !model ||
      model.productionYearStart == null ||
      !Number.isFinite(Number(model.productionYearStart))
    ) {
      return [] as number[]
    }
    return yearsFromProductionLife(
      Number(model.productionYearStart),
      model.productionYearEnd ?? null,
    )
  }, [model])

  const yearSelectOptions = useMemo(() => {
    const set = new Set(modelLifeYears)
    for (const raw of [yearStart, yearEnd]) {
      const n = Number(raw)
      if (raw.trim() && Number.isFinite(n)) set.add(n)
    }
    return [...set]
      .sort((a, b) => a - b)
      .map((y) => ({ value: String(y), label: String(y) }))
  }, [modelLifeYears, yearStart, yearEnd])

  const configGroups = useMemo(
    () => groupVersionsByConfig<VehicleVersion>(versions),
    [versions],
  )

  useEffect(() => {
    if (!highlightGroupKey || !highlightRef.current) return
    highlightRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [highlightGroupKey, configGroups])

  const makerSelectOptions = useMemo(() => {
    const currentMakerId = model?.manufacturerId ?? manufacturerId
    const opts = manufacturers
      .filter((m) => m.status === 'active' || m.id === manufacturerId || m.id === currentMakerId)
      .map((m) => ({ value: m.id, label: m.name }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
    if (manufacturerId && !opts.some((o) => o.value === manufacturerId)) {
      opts.unshift({
        value: manufacturerId,
        label: makerName !== '—' ? makerName : 'Montadora atual',
      })
    }
    return opts
  }, [manufacturers, manufacturerId, model?.manufacturerId, makerName])

  if (!model) {
    return (
      <div className="space-y-3 p-1">
        <EmptyState title="Modelo não encontrado" description="Feche a guia ou escolha outro na lista." />
        <Button type="button" variant="light" onClick={onClose}>
          Fechar
        </Button>
      </div>
    )
  }

  const current = model
  const q = qualityBadge(current.qualityStatus)

  async function saveModel(e: FormEvent) {
    e.preventDefault()
    if (!manufacturerId.trim()) {
      toast.push('Selecione a montadora.', 'error')
      return
    }
    setBusyModel(true)
    try {
      const saved = await adminUpsertModel({
        id: current.id,
        manufacturerId: manufacturerId.trim(),
        name: modelName.trim(),
        status: current.status,
        productionYearStart: productionYearStart.trim()
          ? Number(productionYearStart.trim())
          : null,
        productionYearEnd: productionYearEnd.trim() ? Number(productionYearEnd.trim()) : null,
      })
      onModelUpdated(saved)
      toast.push(
        saved.manufacturerId !== current.manufacturerId
          ? 'Modelo atualizado (montadora alterada).'
          : 'Modelo atualizado.',
        'success',
      )
      if (saved.manufacturerId !== current.manufacturerId) {
        await reloadVersions(saved.id)
      }
    } catch (err) {
      toast.push(toUserMessage(err, 'Falha ao salvar modelo'), 'error')
    } finally {
      setBusyModel(false)
    }
  }

  function startEditGroup(group: VersionConfigGroup<VehicleVersion>) {
    setEditingGroupKey(group.key)
    setYearStart(group.yearStart != null ? String(group.yearStart) : '')
    const open = isConfigPeriodOpenEnded(
      group.yearEnd,
      current.productionYearStart,
      current.productionYearEnd,
    )
    setYearEnd(open ? '' : group.yearEnd != null ? String(group.yearEnd) : '')
    setEngine(group.engine ?? '')
    setVersionName(group.versionName ?? '')
    setFuel(group.fuel ?? '')
  }

  function clearVersionForm() {
    setEditingGroupKey(null)
    setYearStart('')
    setYearEnd('')
    setEngine('')
    setVersionName('')
    setFuel('')
  }

  async function saveVersion(
    e: { preventDefault: () => void },
    mode: 'edit' | 'create' = 'edit',
  ) {
    e.preventDefault()
    if (manufacturerId && manufacturerId !== current.manufacturerId) {
      toast.push('Salve a montadora do modelo antes de criar/editar configurações.', 'error')
      return
    }
    const asCreate = mode === 'create' || !editingGroupKey
    setBusyVv(true)
    try {
      const eng = engine.trim() || null
      const peeled = peelEngineFromVersionName(eng, versionName.trim() || null)
      const fuelNorm = normalizeVehicleFuel(fuel)
      const endBlank = !yearEnd.trim()
      const { years, yearStart: ys, yearEnd: ye, openEnded } =
        assertVersionYearsWithinModelLife({
          yearStart: Number(yearStart),
          yearEnd: endBlank ? null : Number(yearEnd),
          productionYearStart: current.productionYearStart,
          productionYearEnd: current.productionYearEnd,
        })
      const periodLabel = formatVersionPeriodLabel(ys, ye, { openEnded })
      const identityLabel = `${periodLabel} · ${eng ?? '—'} · ${peeled ?? '—'} · ${fuelNorm ?? '—'}`
      const resultKey = versionConfigGroupKey({
        engine: eng,
        versionName: peeled,
        fuel: fuelNorm,
      })

      if (peeled !== (versionName.trim() || null) && eng && versionName.trim()) {
        toast.push('Versão ajustada: motor removido do nome (higiene).', 'success')
      }

      if (!asCreate && editingGroupKey) {
        const { created, reactivated, inactivated, skipped, renamed } =
          await adminReconcileVersionYearRange({
            manufacturerId: current.manufacturerId,
            modelId: current.id,
            years,
            engine: eng,
            versionName: peeled,
            fuel: fuelNorm,
            sourceGroupKey: editingGroupKey,
            existing: versions,
          })
        toast.push(
          `Atualizada ${identityLabel}: ${created} novas, ${reactivated} reativadas, ${renamed} motor/versão/fuel, ${inactivated} fora do período` +
            (skipped ? `, ${skipped} ok` : '') +
            '.',
          'success',
        )
      } else {
        const existedBefore = versions.some(
          (v) => versionConfigGroupKey(v) === resultKey && v.status !== 'inactive',
        )
        const { created, skipped } = await adminUpsertVersionYearRange({
          manufacturerId: current.manufacturerId,
          modelId: current.id,
          years,
          engine: eng,
          versionName: peeled,
          fuel: fuelNorm,
          existing: versions,
        })
        if (created === 0 && skipped > 0) {
          toast.push(
            `Config já existia (anos ok): ${identityLabel}. Destacada na lista (ordem por ano).`,
            'info',
          )
        } else if (existedBefore) {
          toast.push(
            `Config existente atualizada: ${identityLabel} (${created} ano(s)).`,
            'success',
          )
        } else {
          toast.push(`Criada ${identityLabel} (${created} ano(s)` + (skipped ? `, ${skipped} ok` : '') + ').', 'success')
        }
      }
      clearVersionForm()
      setHighlightGroupKey(resultKey)
      await reloadVersions(current.id)
    } catch (err) {
      toast.push(toUserMessage(err, 'Falha ao salvar configuração'), 'error')
    } finally {
      setBusyVv(false)
    }
  }

  async function toggleGroupStatus(group: VersionConfigGroup<VehicleVersion>) {
    const anyActive = group.rows.some((r) => r.status === 'active')
    const next: VehicleVersion['status'] = anyActive ? 'inactive' : 'active'
    try {
      for (const row of group.rows) {
        if (row.status !== next) await adminSetVersionStatus(row.id, next)
      }
      await reloadVersions(current.id)
      toast.push(
        next === 'inactive' ? 'Configuração inativada no período.' : 'Configuração ativada no período.',
        'success',
      )
    } catch (err) {
      toast.push(toUserMessage(err, 'Falha ao atualizar status'), 'error')
    }
  }

  async function saveQuality(e: FormEvent) {
    e.preventDefault()
    const status = qualityDraft
    setBusyQuality(true)
    try {
      const note =
        qualityNote.trim() ||
        (status === 'verified'
          ? `Staff override · ${new Date().toISOString().slice(0, 10)}`
          : status === 'quarantined'
            ? 'Quarentena via guia'
            : status === 'review'
              ? 'Revisão via guia'
              : 'Substituído via guia')
      // Sem URL: staff_override até a API de mestre (master_api) assumir o cadastro.
      await setModelQualityStatus({
        modelId: current.id,
        qualityStatus: status,
        evidenceKind: STAFF_QUALITY_EVIDENCE_KIND,
        evidenceUrl: null,
        reviewNote: note,
      })
      onModelUpdated({
        ...current,
        qualityStatus: status,
        evidenceKind: STAFF_QUALITY_EVIDENCE_KIND,
        evidenceUrl: null,
        reviewNote: note,
      })
      toast.push(`Situação: ${qualityBadge(status).label}.`, 'success')
    } catch (err) {
      toast.push(toUserMessage(err, 'Falha ao alterar situação'), 'error')
    } finally {
      setBusyQuality(false)
    }
  }

  return (
    <div className="space-y-4 p-1">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="m-0 text-xs text-fal-muted">{makerName}</p>
          <h2 className="m-0 text-lg font-extrabold text-fal-fg">{model.name}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-fal-muted">
            <span>{entityStatusLabel(model.status)}</span>
            <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${q.className}`}>{q.label}</span>
          </p>
        </div>
        <Link
          to="/admin/aplicacoes"
          className="inline-flex min-h-11 items-center rounded-[10px] border border-fal-line px-3 text-sm font-semibold text-fal-fg no-underline"
        >
          Aplicações
        </Link>
      </div>

      <form
        onSubmit={(e) => void saveQuality(e)}
        className="space-y-2 rounded-[12px] border border-fal-line bg-fal-surface p-3"
      >
        <div className="flex flex-wrap items-end gap-2">
          <label className="block min-w-[160px] flex-1 text-sm">
            <span className="mb-1 block text-xs font-extrabold text-fal-muted">Situação</span>
            <select
              className="w-full rounded-[9px] border border-fal-line px-3 py-3"
              value={qualityDraft}
              onChange={(e) => setQualityDraft(e.target.value as QualityStatus)}
              disabled={busyQuality}
            >
              <option value="verified">Verificado</option>
              <option value="review">Revisão</option>
              <option value="quarantined">Quarentena</option>
              <option value="superseded">Substituído</option>
            </select>
          </label>
          <Button
            type="submit"
            disabled={busyQuality || qualityDraft === (model.qualityStatus ?? 'review')}
          >
            Salvar situação
          </Button>
        </div>
        {qualityDraft === 'quarantined' ? (
          <Input
            label="Nota (opcional)"
            value={qualityNote}
            onChange={(e) => setQualityNote(e.target.value)}
            placeholder="Motivo da quarentena"
          />
        ) : null}
      </form>

      <form
        onSubmit={(e) => void saveModel(e)}
        className="grid gap-2 rounded-[12px] border border-fal-line bg-fal-surface p-3 sm:grid-cols-2"
      >
        <div className="sm:col-span-2">
          <Select
            label="Montadora"
            name="model-manufacturer"
            placeholder="Selecione a montadora"
            options={makerSelectOptions}
            value={manufacturerId}
            onChange={(e) => setManufacturerId(e.target.value)}
            required
          />
        </div>
        <div className="sm:col-span-2">
          <Input
            label="Nome do modelo"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            required
          />
        </div>
        <Input
          label="Linha desde"
          inputMode="numeric"
          value={productionYearStart}
          onChange={(e) => setProductionYearStart(e.target.value)}
        />
        <Input
          label="Linha até"
          inputMode="numeric"
          value={productionYearEnd}
          onChange={(e) => setProductionYearEnd(e.target.value)}
          hint="Vazio = em linha"
        />
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button type="submit" disabled={busyModel}>
            Salvar modelo
          </Button>
          <Button
            type="button"
            variant="light"
            disabled={busyModel}
            onClick={() =>
              void adminSetModelStatus(model.id, model.status === 'active' ? 'inactive' : 'active')
                .then(async () => {
                  const next = {
                    ...model,
                    status: (model.status === 'active' ? 'inactive' : 'active') as VehicleModel['status'],
                  }
                  onModelUpdated(next)
                  toast.push(
                    model.status === 'active' ? 'Modelo inativado.' : 'Modelo ativado.',
                    'success',
                  )
                })
                .catch((err) => toast.push(toUserMessage(err, 'Falha ao atualizar status'), 'error'))
            }
          >
            {model.status === 'active' ? 'Inativar' : 'Ativar'}
          </Button>
        </div>
      </form>

      <div>
        <p className="mb-2 mt-0 text-sm font-bold text-fal-fg">
          Configurações (VV)
          {loadingVv
            ? '…'
            : ` · ${configGroups.length} config${configGroups.length === 1 ? '' : 's'}`}
        </p>
        <form
          onSubmit={(e) => void saveVersion(e, editingGroupKey ? 'edit' : 'create')}
          className="mb-3 grid gap-2 rounded-[12px] border border-fal-line bg-fal-bg/40 p-3 sm:grid-cols-3"
        >
          <Select
            label="Ano início"
            name="vv-year-start"
            placeholder="Selecione"
            options={yearSelectOptions}
            value={yearStart}
            disabled={yearSelectOptions.length === 0}
            onChange={(e) => setYearStart(e.target.value)}
          />
          <Select
            label="Ano fim"
            name="vv-year-end"
            placeholder="Vazio = vigente"
            options={yearSelectOptions}
            value={yearEnd}
            disabled={yearSelectOptions.length === 0}
            onChange={(e) => setYearEnd(e.target.value)}
          />
          <Input
            label="Motor"
            value={engine}
            onChange={(e) => setEngine(e.target.value)}
          />
          <Input
            label="Versão"
            value={versionName}
            onChange={(e) => setVersionName(e.target.value)}
            hint="Motor no início é peelado no save"
          />
          <Select
            label="Combustível"
            name="vv-fuel"
            placeholder="Não informado"
            options={VEHICLE_FUEL_SELECT_OPTIONS}
            value={fuel}
            onChange={(e) => setFuel(e.target.value)}
          />
          <p className="m-0 text-[11px] text-fal-muted sm:col-span-3">
            {yearSelectOptions.length === 0
              ? 'Defina a linha do modelo (Linha desde/até) antes de criar configurações.'
              : editingGroupKey
                ? 'Altere período, motor, versão e/ou combustível. Ano fim vazio = vigente até o fim da linha do modelo.'
                : 'Ano início obrigatório; Ano fim vazio = vigente. Gera 1 VV por ano até o fim da linha.'}
          </p>
          <div className="flex flex-wrap gap-2 sm:col-span-3">
            <Button type="submit" disabled={busyVv || yearSelectOptions.length === 0}>
              {editingGroupKey ? 'Salvar alterações' : 'Criar config'}
            </Button>
            {editingGroupKey ? (
              <>
                <Button
                  type="button"
                  variant="light"
                  disabled={busyVv || yearSelectOptions.length === 0}
                  onClick={(ev) => void saveVersion(ev, 'create')}
                >
                  Criar como nova
                </Button>
                <Button type="button" variant="light" onClick={clearVersionForm}>
                  Cancelar
                </Button>
              </>
            ) : null}
          </div>
        </form>

        {configGroups.length === 0 && !loadingVv ? (
          <EmptyState
            title="Nenhuma configuração"
            description="Informe Ano início (fim opcional = vigente) + motor/versão/combustível."
          />
        ) : (
          <div className="fal-admin-scroll max-h-[min(40dvh,360px)] space-y-2 overflow-y-auto">
            {configGroups.map((g) => {
              const open = isConfigPeriodOpenEnded(
                g.yearEnd,
                current.productionYearStart,
                current.productionYearEnd,
              )
              const period = formatVersionPeriodLabel(g.yearStart, g.yearEnd, {
                openEnded: open,
              })
              const allInactive = g.activeCount === 0
              const highlighted = highlightGroupKey === g.key
              return (
                <article
                  key={g.key}
                  ref={highlighted ? highlightRef : undefined}
                  className={[
                    'cursor-pointer rounded-[10px] border border-fal-line bg-fal-surface px-3 py-2 text-sm',
                    editingGroupKey === g.key || highlighted
                      ? 'border-fal-yellow bg-fal-yellow/20'
                      : '',
                    allInactive ? 'opacity-70' : '',
                  ].join(' ')}
                  onDoubleClick={() => startEditGroup(g)}
                >
                  <p className="m-0 font-semibold text-fal-fg">
                    {period} · {g.engine ?? '—'} · {g.versionName ?? '—'} · {g.fuel ?? '—'}
                  </p>
                  <p className="mb-0 mt-1 flex flex-wrap gap-2 text-xs text-fal-muted">
                    <span>
                      {g.years.length} ano{g.years.length === 1 ? '' : 's'}
                      {allInactive ? ' · inativa' : ` · ${g.activeCount} ativo(s)`}
                    </span>
                    <button
                      type="button"
                      className="font-semibold text-fal-auth-link"
                      onClick={() => startEditGroup(g)}
                    >
                      Editar config
                    </button>
                    <button
                      type="button"
                      className="font-semibold text-fal-muted"
                      onClick={() => void toggleGroupStatus(g)}
                    >
                      {allInactive ? 'Ativar' : 'Inativar'}
                    </button>
                  </p>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
