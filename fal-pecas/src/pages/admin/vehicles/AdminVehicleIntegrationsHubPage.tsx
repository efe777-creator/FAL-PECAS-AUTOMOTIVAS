import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { useAuth } from '@/contexts/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { setGuideBridge, VEHICLES_OPEN_GUIDE_KEY } from '@/lib/adminGuideBridges'
import { ADMIN_CHIP, ADMIN_SEGMENT_OFF, ADMIN_SEGMENT_ON } from '@/lib/adminLabels'
import { toUserMessage } from '@/lib/toUserMessage'
import { setModelQualityStatus } from '@/services/admin/adminVehicleService'
import { adminListVehicleDataSources, type VehicleDataSource } from '@/services/admin/adminVehicleDataSourceService'
import { adminListVehicleImportBatches } from '@/services/admin/adminVehicleImportBatchService'
import { adminFetchVehicleIncompletenessReport, type VehicleIncompletenessReport } from '@/services/admin/adminVehicleIncompletenessReport'
import {
  adminFetchVehicleMasterStats,
  listReviewQueue,
  type VehicleMasterStats,
  type VehicleNoEngineItem,
  type VehiclePointLifeItem,
  type VehicleReviewQueueItem,
  type VehicleThinShellItem,
  type ZeroCatalogLookupItem,
} from '@/services/admin/adminVehicleMasterStats'
import {
  readVehicleMasterSyncMeta,
  type VehicleMasterSyncMeta,
} from '@/services/vehicles/vehicleMasterSource'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

function StatusChip({ label, on }: { label: string; on: boolean }) {
  return (
    <span
      className={`rounded-[10px] px-2 py-1 text-xs font-bold ${
        on ? ADMIN_CHIP.ok : ADMIN_CHIP.neutral
      }`}
    >
      {label}: {on ? 'ligado' : 'off'}
    </span>
  )
}

function canSync(role: string | undefined): boolean {
  return role === 'administrador' || role === 'gerente'
}

type ReviewFilter = 'revisao' | 'casca' | 'vida' | 'sem_motor' | 'catalogo0'

type UnifiedReviewRow = {
  key: string
  kind: ReviewFilter
  badge: string
  badgeClass: string
  title: string
  subtitle?: string
  modelId: string | null
  queueItem?: VehicleReviewQueueItem
}

export function AdminVehicleIntegrationsHubPage() {
  useDocumentTitle('Integrações veículos | Admin FAL')
  const { user } = useAuth()
  const navigate = useNavigate()
  const allowed = canSync(user?.role)

  const [queue, setQueue] = useState<VehicleReviewQueueItem[]>([])
  const [thinShells, setThinShells] = useState<VehicleThinShellItem[]>([])
  const [pointLifeItems, setPointLifeItems] = useState<VehiclePointLifeItem[]>([])
  const [noEngineItems, setNoEngineItems] = useState<VehicleNoEngineItem[]>([])
  const [zeroCatalogItems, setZeroCatalogItems] = useState<ZeroCatalogLookupItem[]>([])
  const [masterStats, setMasterStats] = useState<VehicleMasterStats | null>(null)
  const [incompleteness, setIncompleteness] = useState<VehicleIncompletenessReport | null>(null)
  const [sources, setSources] = useState<VehicleDataSource[]>([])
  const [batches, setBatches] = useState<unknown[]>([])
  const [statsError, setStatsError] = useState<string | null>(null)
  const [queueError, setQueueError] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<VehicleMasterSyncMeta | null>(null)
  const [filter, setFilter] = useState<ReviewFilter>('revisao')
  const [queueBusyId, setQueueBusyId] = useState<string | null>(null)
  const [queueActionError, setQueueActionError] = useState<string | null>(null)
  const [queueActionMsg, setQueueActionMsg] = useState<string | null>(null)
  const [quarantineFormId, setQuarantineFormId] = useState<string | null>(null)
  const [quarantineNote, setQuarantineNote] = useState('')

  function openVehicleGuide(modelId: string, opts?: { approve?: boolean }) {
    setGuideBridge(VEHICLES_OPEN_GUIDE_KEY, modelId)
    const qs = opts?.approve
      ? `?model=${encodeURIComponent(modelId)}&approve=1`
      : `?model=${encodeURIComponent(modelId)}`
    navigate(`/admin/veiculos${qs}`)
  }

  function onQueueVerify(item: VehicleReviewQueueItem) {
    if (!allowed) {
      setQueueActionError('Sem permissão para alterar qualidade.')
      return
    }
    openVehicleGuide(item.id, { approve: true })
  }

  async function onQueueQuarantineSubmit(item: VehicleReviewQueueItem) {
    if (!allowed) {
      setQueueActionError('Sem permissão para alterar qualidade.')
      return
    }
    setQueueBusyId(item.id)
    setQueueActionError(null)
    setQueueActionMsg(null)
    try {
      await setModelQualityStatus({
        modelId: item.id,
        qualityStatus: 'quarantined',
        reviewNote: quarantineNote.trim() || 'Quarentena via hub',
      })
      setQueueActionMsg(`${item.makerName} ${item.name} → quarantined`)
      setQuarantineFormId(null)
      setQuarantineNote('')
      await loadStats()
    } catch (err) {
      setQueueActionError(toUserMessage(err, 'Falha ao quarentenar modelo'))
    } finally {
      setQueueBusyId(null)
    }
  }

  const loadStats = useCallback(async () => {
    setStatsError(null)
    setQueueError(null)
    try {
      const s = await adminFetchVehicleMasterStats()
      setMasterStats(s)
      setThinShells(s.verifiedThinShellItems)
      setPointLifeItems(s.verifiedPointLifeItems)
      setNoEngineItems(s.verifiedNoEngineItems)
      setZeroCatalogItems(s.zeroCatalogLookupItems)
    } catch (err) {
      setStatsError(toUserMessage(err, 'Falha ao carregar listas'))
      setMasterStats(null)
      setThinShells([])
      setPointLifeItems([])
      setNoEngineItems([])
      setZeroCatalogItems([])
    }
    try {
      setQueue(await listReviewQueue())
    } catch (err) {
      setQueueError(toUserMessage(err, 'Falha ao carregar fila de revisão'))
    }
    try {
      setIncompleteness(await adminFetchVehicleIncompletenessReport())
    } catch {
      setIncompleteness(null)
    }
    try {
      setSources(await adminListVehicleDataSources())
    } catch {
      setSources([])
    }
    try {
      setBatches(await adminListVehicleImportBatches(8))
    } catch {
      setBatches([])
    }
  }, [])

  useEffect(() => {
    void loadStats()
    setLastSync(readVehicleMasterSyncMeta())
  }, [loadStats])

  const unified = useMemo((): UnifiedReviewRow[] => {
    if (filter === 'revisao') {
      return queue.map((q) => ({
        key: `q-${q.id}`,
        kind: 'revisao',
        badge: q.qualityStatus === 'quarantined' ? 'Quarentena' : 'Revisão',
        badgeClass:
          q.qualityStatus === 'quarantined' ? ADMIN_CHIP.danger : ADMIN_CHIP.warn,
        title: `${q.makerName} ${q.name}`,
        subtitle: [
          q.vehicleClass,
          q.evidenceKind,
          q.pvcCount != null ? `PVC ${q.pvcCount}` : null,
          q.customerVehicleCount != null ? `clientes ${q.customerVehicleCount}` : null,
          q.reviewNote,
        ]
          .filter(Boolean)
          .join(' · '),
        modelId: q.id,
        queueItem: q,
      }))
    }
    if (filter === 'casca') {
      return thinShells.map((s) => ({
        key: `t-${s.id}`,
        kind: 'casca',
        badge: 'Casca',
        badgeClass: ADMIN_CHIP.warn,
        title: `${s.makerName} ${s.name}`,
        subtitle: s.reviewNote ?? undefined,
        modelId: s.id,
      }))
    }
    if (filter === 'vida') {
      return pointLifeItems.map((p) => ({
        key: `p-${p.id}`,
        kind: 'vida',
        badge: String(p.year),
        badgeClass: ADMIN_CHIP.warn,
        title: `${p.makerName} ${p.name}`,
        subtitle: p.reviewNote ?? undefined,
        modelId: p.id,
      }))
    }
    if (filter === 'sem_motor') {
      return noEngineItems.map((v) => ({
        key: `e-${v.id}`,
        kind: 'sem_motor',
        badge: 'Sem motor',
        badgeClass: ADMIN_CHIP.warn,
        title: `${v.makerName} ${v.modelName}${v.versionName ? ` · ${v.versionName}` : ''}`,
        modelId: v.modelId,
      }))
    }
    return zeroCatalogItems.map((e) => ({
      key: `z-${e.id}`,
      kind: 'catalogo0',
      badge: e.confidenceBand,
      badgeClass: ADMIN_CHIP.info,
      title: [e.maker, e.model, e.year].filter(Boolean).join(' ') || '—',
      subtitle: `${e.status} · ${new Date(e.createdAt).toLocaleString('pt-BR')}`,
      modelId: null,
    }))
  }, [filter, queue, thinShells, pointLifeItems, noEngineItems, zeroCatalogItems])

  const filterCounts: Record<ReviewFilter, number> = {
    revisao: queue.length,
    casca: thinShells.length,
    vida: pointLifeItems.length,
    sem_motor: noEngineItems.length,
    catalogo0: zeroCatalogItems.length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mt-0 text-[28px] font-extrabold text-fal-fg">Integrações · Veículos</h1>
        <p className="m-0 text-sm text-fal-muted">
          Enriquecer o mestre com consulta e escolha. Placa e aplicações (PVC) ficam em caminhos
          separados — import/consulta não cria PVC.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusChip label="Import CSV" on />
          <StatusChip label="Consulta" on={allowed} />
          {lastSync ? (
            <span className="rounded-md bg-fal-line/40 px-2 py-1 text-xs font-bold text-fal-fg">
              Última sync: {new Date(lastSync.at).toLocaleString('pt-BR')} · {lastSync.upserted}{' '}
              upserts
            </span>
          ) : (
            <span className="rounded-md bg-fal-line/60 px-2 py-1 text-xs font-bold text-fal-muted">
              Última sync: —
            </span>
          )}
        </div>
        {statsError ? <p className="mt-2 text-sm text-fal-danger">{statsError}</p> : null}
      </div>

      {masterStats ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          {[
            ['Montadoras', masterStats.manufacturersActive],
            ['Modelos', masterStats.modelsActive],
            ['Versões', masterStats.versionsActive],
            ['Verificados', masterStats.qualityVerified],
            ['Em revisão', masterStats.qualityReview],
            ['Quarentena', masterStats.qualityQuarantined],
          ].map(([label, n]) => (
            <div
              key={String(label)}
              className="rounded-[14px] border border-fal-line bg-fal-surface px-4 py-3"
            >
              <p className="m-0 text-xs font-extrabold uppercase tracking-wide text-fal-muted">
                {label}
              </p>
              <p className="mb-0 mt-1 text-2xl font-extrabold text-fal-fg">{n}</p>
            </div>
          ))}
        </div>
      ) : null}

      {incompleteness ? (
        <div className="rounded-[14px] border border-fal-line bg-fal-surface p-4">
          <p className="m-0 text-sm font-bold text-fal-fg">Incompletude (versões ativas)</p>
          <p className="mb-2 mt-1 text-xs text-fal-muted">
            Indicador de qualidade — não bloqueia cadastro. Atualizado em{' '}
            {new Date(incompleteness.generatedAt).toLocaleString('pt-BR')}.
          </p>
          <div className="flex flex-wrap gap-2 text-xs font-semibold text-fal-fg">
            <span className={`rounded-[10px] px-2.5 py-1 ${ADMIN_CHIP.neutral}`}>
              Total {incompleteness.totalActiveVersions}
            </span>
            {(
              [
                ['Sem motor', incompleteness.withoutEngine],
                ['Sem versão', incompleteness.withoutVersionName],
                ['Sem combustível', incompleteness.withoutFuel],
                ['Sem transmissão', incompleteness.withoutTransmission],
                ['Sem tração', incompleteness.withoutTraction],
                ['Sem configuração', incompleteness.withoutBodyConfiguration],
                ['Sem ano', incompleteness.withoutYear],
              ] as const
            ).map(([label, n]) => (
              <span key={label} className={`rounded-[10px] px-2.5 py-1 ${ADMIN_CHIP.warn}`}>
                {label} {n}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {(sources.length > 0 || batches.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {sources.length > 0 ? (
            <div className="rounded-[14px] border border-fal-line bg-fal-surface p-4">
              <p className="m-0 text-sm font-bold text-fal-fg">Fontes de dados</p>
              <ul className="mb-0 mt-2 list-none space-y-1 p-0 text-sm">
                {sources.map((s) => (
                  <li key={s.id} className="flex justify-between gap-2 border-b border-fal-line/60 py-1">
                    <span className="font-semibold text-fal-fg">{s.name}</span>
                    <span className="text-xs text-fal-muted">
                      {s.providerType} · {s.status}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mb-0 mt-2 text-[11px] text-fal-muted">
                Credenciais ficam só em secrets do backend — nunca nesta tela.
              </p>
            </div>
          ) : null}
          {batches.length > 0 ? (
            <div className="rounded-[14px] border border-fal-line bg-fal-surface p-4">
              <p className="m-0 text-sm font-bold text-fal-fg">Histórico de importações</p>
              <ul className="mb-0 mt-2 list-none space-y-1 p-0 text-sm">
                {(batches as Array<Record<string, unknown>>).map((b) => {
                  const src = b.vehicle_data_sources as { name?: string } | null
                  return (
                    <li key={String(b.id)} className="border-b border-fal-line/60 py-1">
                      <span className="font-semibold text-fal-fg">
                        {String(b.file_name ?? 'lote')} · {String(b.status)}
                      </span>
                      <span className="mt-0.5 block text-xs text-fal-muted">
                        {src?.name ?? 'fonte'} · {String(b.total_records ?? 0)} linhas · +
                        {String(b.created_count ?? 0)} / ~
                        {String(b.updated_count ?? 0)} / !{String(b.conflict_count ?? 0)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          to="/admin/veiculos/consultar-mestre"
          className="block rounded-[14px] border border-fal-line bg-fal-surface p-5 no-underline transition hover:border-fal-navy/40"
        >
          <h2 className="m-0 text-lg font-extrabold text-fal-fg">Consultar e escolher</h2>
          <p className="mb-0 mt-2 text-sm text-fal-muted">
            FIPE com vários modelos, demanda por qualquer termo ou arquivo → prévia com checkbox.
            Versões com “/” viram linhas separadas; só o marcado grava.
          </p>
        </Link>

        <Link
          to="/admin/veiculos/importar-mestre"
          className="block rounded-[14px] border border-fal-line bg-fal-surface p-5 no-underline transition hover:border-fal-navy/40"
        >
          <h2 className="m-0 text-lg font-extrabold text-fal-fg">Importar arquivo</h2>
          <p className="mb-0 mt-2 text-sm text-fal-muted">
            CSV FAL ou dump fipeX → prévia editável; marque vários e aplique. Versões com “/”
            separam. Não cria PVC.
          </p>
        </Link>

        <Link
          to="/admin/veiculos"
          className="block rounded-[14px] border border-fal-line bg-fal-surface p-5 no-underline transition hover:border-fal-navy/40"
        >
          <h2 className="m-0 text-lg font-extrabold text-fal-fg">Cadastro manual</h2>
          <p className="mb-0 mt-2 text-sm text-fal-muted">
            Lista + guia. Modelo manual nasce <strong>verified</strong>. Import/consulta entra em
            revisão abaixo.
          </p>
        </Link>
      </div>

      <div className="rounded-[14px] border border-fal-line bg-fal-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="m-0 text-sm font-bold text-fal-fg">Para revisar</p>
          <Button type="button" variant="light" size="sm" onClick={() => void loadStats()}>
            Atualizar lista
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Filtros da revisão">
          {(
            [
              ['revisao', 'Revisão'],
              ['casca', 'Casca'],
              ['vida', 'Vida pontual'],
              ['sem_motor', 'Sem motor'],
              ['catalogo0', 'Catálogo 0'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={filter === id}
              className={`min-h-11 rounded-[10px] border px-3 text-xs font-bold ${
                filter === id ? ADMIN_SEGMENT_ON : ADMIN_SEGMENT_OFF
              }`}
              onClick={() => setFilter(id)}
            >
              {label} ({filterCounts[id]})
            </button>
          ))}
        </div>
        {queueError && filter === 'revisao' ? (
          <p className="mt-2 text-sm text-fal-danger">{queueError}</p>
        ) : null}
        {queueActionError ? <p className="mt-2 text-sm text-fal-danger">{queueActionError}</p> : null}
        {queueActionMsg ? <p className="mt-2 text-sm text-fal-success">{queueActionMsg}</p> : null}
        {unified.length === 0 ? (
          <p className="mb-0 mt-3 text-sm text-fal-muted">Nenhum item neste filtro.</p>
        ) : (
          <ul className="mb-0 mt-3 max-h-80 list-none space-y-1 overflow-y-auto p-0">
            {unified.map((row) => (
              <li
                key={row.key}
                className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-fal-line/60 py-1.5 text-sm"
              >
                <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${row.badgeClass}`}>
                  {row.badge}
                </span>
                {row.modelId ? (
                  <button
                    type="button"
                    className="font-semibold text-fal-fg underline"
                    onClick={() => openVehicleGuide(row.modelId!)}
                  >
                    {row.title}
                  </button>
                ) : (
                  <span className="font-semibold text-fal-fg">{row.title}</span>
                )}
                {row.subtitle ? (
                  <span className="w-full text-xs text-fal-muted sm:w-auto">{row.subtitle}</span>
                ) : null}
                <span className="flex w-full flex-wrap gap-2 pt-1">
                  {row.modelId ? (
                    <button
                      type="button"
                      className="text-xs font-semibold text-fal-fg underline"
                      onClick={() => openVehicleGuide(row.modelId!)}
                    >
                      Abrir guia
                    </button>
                  ) : null}
                  {row.kind === 'catalogo0' ? (
                    <Link
                      to={`/admin/veiculos/consultar-mestre?demanda=${encodeURIComponent(row.title)}`}
                      className="text-xs font-semibold text-fal-fg underline"
                    >
                      Buscar este
                    </Link>
                  ) : null}
                  {row.queueItem?.qualityStatus === 'review' ? (
                    <Button
                      type="button"
                      size="sm"
                      className="min-h-11"
                      disabled={queueBusyId === row.queueItem.id || !allowed}
                      onClick={() => onQueueVerify(row.queueItem!)}
                    >
                      Verificar
                    </Button>
                  ) : null}
                  {row.queueItem && row.queueItem.qualityStatus !== 'quarantined' ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="danger"
                      className="min-h-11"
                      disabled={queueBusyId === row.queueItem.id || !allowed}
                      onClick={() => {
                        setQuarantineFormId(row.queueItem!.id)
                        setQuarantineNote(row.queueItem!.reviewNote ?? '')
                      }}
                    >
                      Quarentena
                    </Button>
                  ) : null}
                </span>
                {row.queueItem && quarantineFormId === row.queueItem.id ? (
                  <form
                    className="mt-2 w-full space-y-2 rounded-[10px] border border-fal-danger/40 bg-fal-danger/10 p-3"
                    onSubmit={(e) => {
                      e.preventDefault()
                      void onQueueQuarantineSubmit(row.queueItem!)
                    }}
                  >
                    <Input
                      label="Motivo da quarentena"
                      value={quarantineNote}
                      onChange={(ev) => setQuarantineNote(ev.target.value)}
                      placeholder="Motivo"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" size="sm" disabled={queueBusyId === row.queueItem.id || !allowed}>
                        Confirmar quarentena
                      </Button>
                      <Button
                        type="button"
                        variant="light"
                        size="sm"
                        onClick={() => {
                          setQuarantineFormId(null)
                          setQuarantineNote('')
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
