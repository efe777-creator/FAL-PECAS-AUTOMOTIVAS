import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { useAuth } from '@/contexts/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { setGuideBridge, VEHICLES_OPEN_GUIDE_KEY } from '@/lib/adminGuideBridges'
import { toUserMessage } from '@/lib/toUserMessage'
import { setModelQualityStatus } from '@/services/admin/adminVehicleService'
import {
  adminFetchVehicleMasterStats,
  listReviewQueue,
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
      className={`rounded-md px-2 py-1 text-xs font-bold ${
        on ? 'bg-emerald-100 text-emerald-900' : 'bg-fal-line/60 text-fal-muted'
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
      setThinShells(s.verifiedThinShellItems)
      setPointLifeItems(s.verifiedPointLifeItems)
      setNoEngineItems(s.verifiedNoEngineItems)
      setZeroCatalogItems(s.zeroCatalogLookupItems)
    } catch (err) {
      setStatsError(toUserMessage(err, 'Falha ao carregar listas'))
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
          q.qualityStatus === 'quarantined'
            ? 'bg-red-100 text-red-900'
            : 'bg-amber-100 text-amber-900',
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
        badgeClass: 'bg-orange-100 text-orange-950',
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
        badgeClass: 'bg-orange-50 text-orange-900',
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
        badgeClass: 'bg-orange-50 text-orange-900',
        title: `${v.makerName} ${v.modelName}${v.versionName ? ` · ${v.versionName}` : ''}`,
        modelId: v.modelId,
      }))
    }
    return zeroCatalogItems.map((e) => ({
      key: `z-${e.id}`,
      kind: 'catalogo0',
      badge: e.confidenceBand,
      badgeClass: 'bg-sky-100 text-sky-950',
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          to="/admin/veiculos/consultar-mestre"
          className="block rounded-[14px] border border-fal-line bg-fal-surface p-5 no-underline transition hover:border-fal-navy/40"
        >
          <h2 className="m-0 text-lg font-extrabold text-fal-fg">Consultar e escolher</h2>
          <p className="mb-0 mt-2 text-sm text-fal-muted">
            Arquivo, FIPE ou demanda da loja → comparar com o mestre → marcar, editar e gravar só o
            escolhido.
          </p>
        </Link>

        <Link
          to="/admin/veiculos/importar-mestre"
          className="block rounded-[14px] border border-fal-line bg-fal-surface p-5 no-underline transition hover:border-fal-navy/40"
        >
          <h2 className="m-0 text-lg font-extrabold text-fal-fg">Importar arquivo</h2>
          <p className="mb-0 mt-2 text-sm text-fal-muted">
            CSV FAL ou dump fipeX com prévia editável. Não cria aplicações (PVC).
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
        <div className="mt-3 flex flex-wrap gap-2">
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
              className={`rounded-md px-2 py-1 text-xs font-bold ${
                filter === id
                  ? 'bg-fal-navy text-white'
                  : 'bg-fal-line/50 text-fal-fg hover:bg-fal-line'
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
        {queueActionMsg ? <p className="mt-2 text-sm text-emerald-800">{queueActionMsg}</p> : null}
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
                    <button
                      type="button"
                      className="rounded-md bg-emerald-700 px-2 py-1 text-xs font-bold text-white disabled:opacity-50"
                      disabled={queueBusyId === row.queueItem.id || !allowed}
                      onClick={() => onQueueVerify(row.queueItem!)}
                    >
                      Verificar
                    </button>
                  ) : null}
                  {row.queueItem && row.queueItem.qualityStatus !== 'quarantined' ? (
                    <button
                      type="button"
                      className="rounded-md border border-red-300 px-2 py-1 text-xs font-bold text-red-900 disabled:opacity-50"
                      disabled={queueBusyId === row.queueItem.id || !allowed}
                      onClick={() => {
                        setQuarantineFormId(row.queueItem!.id)
                        setQuarantineNote(row.queueItem!.reviewNote ?? '')
                      }}
                    >
                      Quarentena
                    </button>
                  ) : null}
                </span>
                {row.queueItem && quarantineFormId === row.queueItem.id ? (
                  <form
                    className="mt-2 w-full space-y-2 rounded-md border border-red-200 bg-red-50/40 p-2"
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
