import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { Input } from '@/components/common/Input'
import { useToast } from '@/components/common/Toast'
import { entityStatusLabel } from '@/lib/adminLabels'
import { toUserMessage } from '@/lib/toUserMessage'
import { peelEngineFromVersionName } from '@/lib/vehicles/peelEngineFromVersionName'
import {
  adminListVersions,
  adminSetModelStatus,
  adminSetVersionStatus,
  adminUpsertModel,
  adminUpsertVersion,
  setModelQualityStatus,
} from '@/services/admin/adminVehicleService'
import { STAFF_QUALITY_EVIDENCE_KIND } from '@/services/vehicles/vehicleMasterProvider'
import type { VehicleModel, VehicleVersion } from '@/types'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
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
  onClose: () => void
  onModelUpdated: (m: VehicleModel) => void
  /** Abre formulário A1 ao montar (ponte Integrações). */
  initialApprove?: boolean
}

export function AdminVehicleGuidePanel({
  model,
  makerName,
  onClose,
  onModelUpdated,
  initialApprove = false,
}: AdminVehicleGuidePanelProps) {
  const toast = useToast()
  const [versions, setVersions] = useState<VehicleVersion[]>([])
  const [loadingVv, setLoadingVv] = useState(false)

  const [modelName, setModelName] = useState('')
  const [productionYearStart, setProductionYearStart] = useState('')
  const [productionYearEnd, setProductionYearEnd] = useState('')
  const [busyModel, setBusyModel] = useState(false)

  const [editingVersionId, setEditingVersionId] = useState<string | null>(null)
  const [year, setYear] = useState('')
  const [engine, setEngine] = useState('')
  const [versionName, setVersionName] = useState('')
  const [busyVv, setBusyVv] = useState(false)

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
    setModelName(model.name)
    setProductionYearStart(
      model.productionYearStart != null ? String(model.productionYearStart) : '',
    )
    setProductionYearEnd(model.productionYearEnd != null ? String(model.productionYearEnd) : '')
    setEditingVersionId(null)
    setYear('')
    setEngine('')
    setVersionName('')
    setQualityNote(model.reviewNote ?? '')
    setQualityDraft(
      initialApprove
        ? 'verified'
        : ((model.qualityStatus as QualityStatus | undefined) ?? 'review'),
    )
    void reloadVersions(model.id)
  }, [model, initialApprove, reloadVersions])

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

  const q = qualityBadge(model.qualityStatus)

  async function saveModel(e: FormEvent) {
    e.preventDefault()
    setBusyModel(true)
    try {
      const saved = await adminUpsertModel({
        id: model.id,
        manufacturerId: model.manufacturerId,
        name: modelName.trim(),
        status: model.status,
        productionYearStart: productionYearStart.trim()
          ? Number(productionYearStart.trim())
          : null,
        productionYearEnd: productionYearEnd.trim() ? Number(productionYearEnd.trim()) : null,
      })
      onModelUpdated(saved)
      toast.push('Modelo atualizado.', 'success')
    } catch (err) {
      toast.push(toUserMessage(err, 'Falha ao salvar modelo'), 'error')
    } finally {
      setBusyModel(false)
    }
  }

  function startEditVersion(v: VehicleVersion) {
    setEditingVersionId(v.id)
    setYear(v.year != null ? String(v.year) : '')
    setEngine(v.engine ?? '')
    setVersionName(v.versionName ?? '')
  }

  async function saveVersion(e: FormEvent) {
    e.preventDefault()
    setBusyVv(true)
    try {
      const eng = engine.trim() || null
      const peeled = peelEngineFromVersionName(eng, versionName.trim() || null)
      const saved = await adminUpsertVersion({
        id: editingVersionId ?? undefined,
        manufacturerId: model.manufacturerId,
        modelId: model.id,
        year: year.trim() ? Number(year) : null,
        engine: eng,
        versionName: peeled,
        status: versions.find((v) => v.id === editingVersionId)?.status ?? 'active',
      })
      if (peeled !== (versionName.trim() || null) && eng && versionName.trim()) {
        toast.push('Versão ajustada: motor removido do nome (higiene).', 'success')
      } else {
        toast.push(editingVersionId ? 'Configuração atualizada.' : 'Configuração criada.', 'success')
      }
      setEditingVersionId(null)
      setYear('')
      setEngine('')
      setVersionName('')
      await reloadVersions(model.id)
      void saved
    } catch (err) {
      toast.push(toUserMessage(err, 'Falha ao salvar configuração'), 'error')
    } finally {
      setBusyVv(false)
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
        modelId: model.id,
        qualityStatus: status,
        evidenceKind: STAFF_QUALITY_EVIDENCE_KIND,
        evidenceUrl: null,
        reviewNote: note,
      })
      onModelUpdated({
        ...model,
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
          Configurações (VV){loadingVv ? '…' : ` · ${versions.length}`}
        </p>
        <form
          onSubmit={(e) => void saveVersion(e)}
          className="mb-3 grid gap-2 rounded-[12px] border border-fal-line bg-fal-bg/40 p-3 sm:grid-cols-3"
        >
          <Input
            label="Ano"
            inputMode="numeric"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
          <Input label="Motor" value={engine} onChange={(e) => setEngine(e.target.value)} />
          <Input
            label="Versão"
            value={versionName}
            onChange={(e) => setVersionName(e.target.value)}
            hint="Motor no início é peelado no save"
          />
          <div className="flex flex-wrap gap-2 sm:col-span-3">
            <Button type="submit" disabled={busyVv}>
              {editingVersionId ? 'Salvar config' : 'Criar config'}
            </Button>
            {editingVersionId ? (
              <Button
                type="button"
                variant="light"
                onClick={() => {
                  setEditingVersionId(null)
                  setYear('')
                  setEngine('')
                  setVersionName('')
                }}
              >
                Cancelar
              </Button>
            ) : null}
          </div>
        </form>

        {versions.length === 0 && !loadingVv ? (
          <EmptyState
            title="Nenhuma configuração"
            description="Crie ano/motor/versão nesta guia (casca verified sem VV)."
          />
        ) : (
          <div className="fal-admin-scroll max-h-[min(40dvh,360px)] space-y-2 overflow-y-auto">
            {versions.map((v) => (
              <article
                key={v.id}
                className={[
                  'cursor-pointer rounded-[10px] border border-fal-line bg-fal-surface px-3 py-2 text-sm',
                  editingVersionId === v.id ? 'border-fal-yellow bg-fal-yellow/20' : '',
                ].join(' ')}
                onDoubleClick={() => startEditVersion(v)}
              >
                <p className="m-0 font-semibold text-fal-fg">
                  {v.year ?? '—'} · {v.engine ?? '—'} · {v.versionName ?? '—'}
                </p>
                <p className="mb-0 mt-1 flex flex-wrap gap-2 text-xs text-fal-muted">
                  <span>{entityStatusLabel(v.status)}</span>
                  <button
                    type="button"
                    className="font-semibold text-fal-auth-link"
                    onClick={() => startEditVersion(v)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="font-semibold text-fal-muted"
                    onClick={() =>
                      void adminSetVersionStatus(
                        v.id,
                        v.status === 'active' ? 'inactive' : 'active',
                      )
                        .then(async () => {
                          await reloadVersions(model.id)
                          toast.push(
                            v.status === 'active'
                              ? 'Configuração inativada.'
                              : 'Configuração ativada.',
                            'success',
                          )
                        })
                        .catch((err) =>
                          toast.push(toUserMessage(err, 'Falha ao atualizar status'), 'error'),
                        )
                    }
                  >
                    {v.status === 'active' ? 'Inativar' : 'Ativar'}
                  </button>
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
