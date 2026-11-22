import { Button } from '@/components/common/Button'
import { useAuth } from '@/contexts/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { toUserMessage } from '@/lib/toUserMessage'
import { setModelQualityStatus } from '@/services/admin/adminVehicleService'
import {
  adminFetchVehicleMasterStats,
  listReviewQueue,
  listVerifiedThinShells,
  type VehicleNoEngineItem,
  type VehiclePointLifeItem,
  type VehicleReviewQueueItem,
  type VehicleThinShellItem,
  type ZeroCatalogLookupItem,
} from '@/services/admin/adminVehicleMasterStats'
import {
  applyVehicleMasterIntelligence,
  prepareVehicleMasterIntelligence,
} from '@/services/vehicles/vehicleMasterIntelligence'
import {
  fipeXCsvVehicleMasterSource,
  readVehicleMasterSyncMeta,
  writeVehicleMasterSyncMeta,
  type VehicleMasterSyncMeta,
} from '@/services/vehicles/vehicleMasterSource'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

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

export function AdminVehicleIntegrationsHubPage() {
  useDocumentTitle('Integrações veículos | Admin FAL')
  const { user } = useAuth()
  const allowed = canSync(user?.role)

  const [makers, setMakers] = useState<number | null>(null)
  const [models, setModels] = useState<number | null>(null)
  const [versions, setVersions] = useState<number | null>(null)
  const [withLife, setWithLife] = useState<number | null>(null)
  const [quality, setQuality] = useState<{
    verified: number
    review: number
    quarantined: number
    superseded: number
    thinShells: number
    pointLife: number
    noEngine: number
    zeroCatalog: number
  } | null>(null)
  const [queue, setQueue] = useState<VehicleReviewQueueItem[]>([])
  const [queueError, setQueueError] = useState<string | null>(null)
  const [thinShells, setThinShells] = useState<VehicleThinShellItem[]>([])
  const [thinShellsError, setThinShellsError] = useState<string | null>(null)
  const [pointLifeItems, setPointLifeItems] = useState<VehiclePointLifeItem[]>([])
  const [noEngineItems, setNoEngineItems] = useState<VehicleNoEngineItem[]>([])
  const [zeroCatalogItems, setZeroCatalogItems] = useState<ZeroCatalogLookupItem[]>([])
  const [statsError, setStatsError] = useState<string | null>(null)

  const [syncBusy, setSyncBusy] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<VehicleMasterSyncMeta | null>(null)
  const [queueBusyId, setQueueBusyId] = useState<string | null>(null)
  const [queueActionError, setQueueActionError] = useState<string | null>(null)
  const [queueActionMsg, setQueueActionMsg] = useState<string | null>(null)

  async function onQueueVerify(item: VehicleReviewQueueItem) {
    if (!allowed) {
      setQueueActionError('Sem permissão para alterar qualidade.')
      return
    }
    const url = window.prompt(
      `URL de evidência A1 (OEM) para verificar ${item.makerName} ${item.name}:`,
      '',
    )
    if (url == null) return
    const trimmed = url.trim()
    if (!trimmed) {
      setQueueActionError('URL de evidência obrigatória para verified.')
      return
    }
    setQueueBusyId(item.id)
    setQueueActionError(null)
    setQueueActionMsg(null)
    try {
      await setModelQualityStatus({
        modelId: item.id,
        qualityStatus: 'verified',
        evidenceKind: 'oem_a1',
        evidenceUrl: trimmed,
        reviewNote: `Verificado via hub · ${new Date().toISOString().slice(0, 10)}`,
      })
      setQueueActionMsg(`${item.makerName} ${item.name} → verified`)
      await loadStats()
      const shells = await listVerifiedThinShells()
      if (shells.some((s) => s.id === item.id)) {
        setQueueActionMsg(
          `${item.makerName} ${item.name} → verified (casca: 0 VV — enriquecer configs sem thin-seed inventado)`,
        )
      }
    } catch (err) {
      setQueueActionError(toUserMessage(err, 'Falha ao verificar modelo'))
    } finally {
      setQueueBusyId(null)
    }
  }

  async function onQueueQuarantine(item: VehicleReviewQueueItem) {
    if (!allowed) {
      setQueueActionError('Sem permissão para alterar qualidade.')
      return
    }
    const note =
      window.prompt(`Motivo da quarentena (${item.makerName} ${item.name}):`, item.reviewNote ?? '') ??
      ''
    setQueueBusyId(item.id)
    setQueueActionError(null)
    setQueueActionMsg(null)
    try {
      await setModelQualityStatus({
        modelId: item.id,
        qualityStatus: 'quarantined',
        reviewNote: note.trim() || 'Quarentena via hub',
      })
      setQueueActionMsg(`${item.makerName} ${item.name} → quarantined`)
      await loadStats()
    } catch (err) {
      setQueueActionError(toUserMessage(err, 'Falha ao quarentenar modelo'))
    } finally {
      setQueueBusyId(null)
    }
  }

  const loadStats = useCallback(async () => {
    setStatsError(null)
    try {
      const s = await adminFetchVehicleMasterStats()
      setMakers(s.manufacturersActive)
      setModels(s.modelsActive)
      setVersions(s.versionsActive)
      setWithLife(s.modelsWithProductionYears)
      setQuality({
        verified: s.qualityVerified,
        review: s.qualityReview,
        quarantined: s.qualityQuarantined,
        superseded: s.qualitySuperseded,
        thinShells: s.verifiedThinShells,
        pointLife: s.verifiedPointLife,
        noEngine: s.verifiedNoEngine,
        zeroCatalog: s.zeroCatalogLookups,
      })
      setThinShells(s.verifiedThinShellItems)
      setThinShellsError(null)
      setPointLifeItems(s.verifiedPointLifeItems)
      setNoEngineItems(s.verifiedNoEngineItems)
      setZeroCatalogItems(s.zeroCatalogLookupItems)
    } catch (err) {
      setStatsError(toUserMessage(err, 'Falha ao carregar contadores'))
      setThinShellsError(toUserMessage(err, 'Falha ao listar cascas'))
      setPointLifeItems([])
      setNoEngineItems([])
      setZeroCatalogItems([])
    }
    setQueueError(null)
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

  async function onSyncFile(file: File) {
    if (!allowed) {
      setSyncError('Sem permissão para sincronizar o mestre.')
      return
    }
    setSyncBusy(true)
    setSyncError(null)
    setSyncMsg(null)
    try {
      const text = await file.text()
      const source = await fipeXCsvVehicleMasterSource.fetchNormalizedRows(text)
      if (source.fileErrors.length) {
        setSyncError(source.fileErrors.join(' · '))
        return
      }
      const prepared = prepareVehicleMasterIntelligence(source.rows)
      if (prepared.fileErrors.length) {
        setSyncError(prepared.fileErrors.join(' · '))
        return
      }
      const upsertRows = prepared.prepared.filter((p) => p.action === 'upsert')
      if (!upsertRows.length) {
        setSyncError('Nenhuma linha válida (montadora + modelo + ano).')
        return
      }
      const applied = await applyVehicleMasterIntelligence(upsertRows)
      const meta: VehicleMasterSyncMeta = {
        at: new Date().toISOString(),
        upserted: applied.upserted,
        productionMerged: applied.productionMerged,
        errors: applied.errors,
        skipped: prepared.skipped + source.skipped,
        source: 'fipex_csv',
      }
      writeVehicleMasterSyncMeta(meta)
      setLastSync(meta)
      setSyncMsg(
        `Sync: ${applied.upserted} upserts · ${applied.productionMerged} vidas de linha · ${applied.errors} erros · ${meta.skipped} ignoradas. Sem PVC.`,
      )
      await loadStats()
    } catch (err) {
      setSyncError(toUserMessage(err, 'Falha ao sincronizar mestre'))
    } finally {
      setSyncBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mt-0 text-[28px] font-extrabold text-fal-fg">Integrações · Veículos</h1>
        <p className="m-0 text-sm text-fal-muted">
          Enriquecer o mestre com validação inteligente (padrão FAL). Identificação de placa e
          aplicações (PVC) são caminhos separados — sync/import <strong>não cria PVC</strong> e não
          usa código FIPE para filtrar peças.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusChip label="Import CSV" on />
          <StatusChip label="Sync inteligente" on={allowed} />
          <StatusChip label="Pórtico fipeX" on />
          {makers != null ? (
            <span className="rounded-md bg-fal-line/40 px-2 py-1 text-xs font-bold text-fal-fg">
              Montadoras ativas: {makers}
            </span>
          ) : null}
          {models != null ? (
            <span className="rounded-md bg-fal-line/40 px-2 py-1 text-xs font-bold text-fal-fg">
              Modelos: {models}
            </span>
          ) : null}
          {versions != null ? (
            <span className="rounded-md bg-fal-line/40 px-2 py-1 text-xs font-bold text-fal-fg">
              Configurações: {versions}
            </span>
          ) : null}
          {withLife != null && models != null ? (
            <span className="rounded-md bg-fal-line/40 px-2 py-1 text-xs font-bold text-fal-fg">
              Vida de linha: {withLife}/{models}
            </span>
          ) : null}
          {quality ? (
            <>
              <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-900">
                Verificados: {quality.verified}
              </span>
              <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-bold text-amber-900">
                Em revisão: {quality.review}
              </span>
              <span className="rounded-md bg-red-100 px-2 py-1 text-xs font-bold text-red-900">
                Quarentena: {quality.quarantined}
              </span>
              <span className="rounded-md bg-fal-line/60 px-2 py-1 text-xs font-bold text-fal-muted">
                Substituídos: {quality.superseded}
              </span>
              <span
                className={`rounded-md px-2 py-1 text-xs font-bold ${
                  quality.thinShells > 0
                    ? 'bg-orange-100 text-orange-950'
                    : 'bg-fal-line/40 text-fal-fg'
                }`}
              >
                Cascas (0 VV): {quality.thinShells}
              </span>
              <span
                className={`rounded-md px-2 py-1 text-xs font-bold ${
                  quality.pointLife > 0
                    ? 'bg-orange-50 text-orange-900'
                    : 'bg-fal-line/40 text-fal-fg'
                }`}
              >
                Vida pontual: {quality.pointLife}
              </span>
              <span
                className={`rounded-md px-2 py-1 text-xs font-bold ${
                  quality.noEngine > 0
                    ? 'bg-orange-50 text-orange-900'
                    : 'bg-fal-line/40 text-fal-fg'
                }`}
              >
                Sem motor: {quality.noEngine}
              </span>
              <span
                className={`rounded-md px-2 py-1 text-xs font-bold ${
                  quality.zeroCatalog > 0
                    ? 'bg-sky-100 text-sky-950'
                    : 'bg-fal-line/40 text-fal-fg'
                }`}
              >
                Lookup catálogo 0: {quality.zeroCatalog}
              </span>
            </>
          ) : null}
          <StatusChip label="Lookup read-only" on />
          <StatusChip label="Fonte B não promove" on />
          <StatusChip label="Gate 12 checksum A2" on />
          {lastSync ? (
            <span className="rounded-md bg-fal-line/40 px-2 py-1 text-xs font-bold text-fal-fg">
              Última sync: {new Date(lastSync.at).toLocaleString('pt-BR')} ·{' '}
              {lastSync.upserted} upserts · {lastSync.errors} erros
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
          to="/admin/veiculos/importar-mestre"
          className="block rounded-[14px] border border-fal-line bg-fal-surface p-5 no-underline transition hover:border-fal-navy/40"
        >
          <h2 className="m-0 text-lg font-extrabold text-fal-fg">Enriquecer mestre (CSV)</h2>
          <p className="mb-0 mt-2 text-sm text-fal-muted">
            Preview e apply idempotente — writer de massa clássico. Não cria aplicações (PVC).
          </p>
        </Link>

        <div className="rounded-[14px] border border-fal-line bg-fal-surface p-5">
          <h2 className="m-0 text-lg font-extrabold text-fal-fg">Sincronizar mestre</h2>
          <p className="mt-2 text-sm text-fal-muted">
            Dump fipeX → intelligence (sanitize + ano obrigatório + vida de linha) → upsert
            canônico. Sem PVC. API paga = pórtico futuro.
          </p>
          <input
            className="mt-3 block w-full text-sm"
            type="file"
            accept=".csv,text/csv"
            disabled={syncBusy || !allowed}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void onSyncFile(f)
              e.target.value = ''
            }}
          />
          {!allowed ? (
            <p className="mt-2 text-sm text-fal-muted">Somente administrador/gerente aplica sync.</p>
          ) : null}
          {syncBusy ? <p className="mt-2 text-sm text-fal-muted">Sincronizando…</p> : null}
          {syncMsg ? <p className="mt-2 text-sm text-emerald-800">{syncMsg}</p> : null}
          {syncError ? <p className="mt-2 text-sm text-fal-danger">{syncError}</p> : null}
          <p className="mb-0 mt-3 text-sm">
            <Link to="/admin/veiculos/importar-mestre" className="font-semibold text-fal-fg">
              Ou use o import CSV clássico →
            </Link>
          </p>
        </div>

        <Link
          to="/admin/veiculos"
          className="block rounded-[14px] border border-fal-line bg-fal-surface p-5 no-underline transition hover:border-fal-navy/40"
        >
          <h2 className="m-0 text-lg font-extrabold text-fal-fg">Cadastro manual</h2>
          <p className="mb-0 mt-2 text-sm text-fal-muted">
            CRUD com vida de linha (desde/até). Período de peça continua no PVC.
          </p>
        </Link>
      </div>

      <div className="rounded-[14px] border border-fal-line bg-fal-surface p-4">
        <p className="m-0 text-sm font-bold text-fal-fg">
          Cascas verified sem VV ({thinShells.length})
        </p>
        <p className="mb-2 mt-1 text-sm text-fal-muted">
          Nome ok na loja, sem configuração tipada — não inventar VV/PVC aqui. Abrir no cadastro
          manual para enriquecer quando houver evidência.
        </p>
        {thinShellsError ? <p className="m-0 text-sm text-fal-danger">{thinShellsError}</p> : null}
        {!thinShellsError && thinShells.length === 0 ? (
          <p className="m-0 text-sm text-fal-muted">Nenhuma casca verified.</p>
        ) : null}
        {thinShells.length > 0 ? (
          <ul className="m-0 max-h-40 list-none space-y-1 overflow-y-auto p-0">
            {thinShells.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-fal-line/60 py-1 text-sm"
              >
                <span className="rounded-md bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-950">
                  Casca
                </span>
                <span className="font-semibold text-fal-fg">
                  {s.makerName} {s.name}
                </span>
                {s.reviewNote ? (
                  <span className="text-fal-muted">{s.reviewNote}</span>
                ) : null}
                <Link
                  to={`/admin/veiculos?model=${encodeURIComponent(s.id)}`}
                  className="text-xs font-semibold text-fal-fg"
                >
                  Abrir
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="rounded-[14px] border border-fal-line bg-fal-surface p-4">
        <p className="m-0 text-sm font-bold text-fal-fg">
          Vida pontual verified ({pointLifeItems.length})
        </p>
        <p className="mb-2 mt-1 text-sm text-fal-muted">
          start=end — seletor só oferece um ano. Abrir no cadastro para alargar a vida com evidência
          (sem inventar faixa).
        </p>
        {pointLifeItems.length === 0 ? (
          <p className="m-0 text-sm text-fal-muted">Nenhuma vida pontual verified.</p>
        ) : (
          <ul className="m-0 max-h-40 list-none space-y-1 overflow-y-auto p-0">
            {pointLifeItems.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-fal-line/60 py-1 text-sm"
              >
                <span className="rounded-md bg-orange-50 px-2 py-0.5 text-xs font-bold text-orange-900">
                  {p.year}
                </span>
                <span className="font-semibold text-fal-fg">
                  {p.makerName} {p.name}
                </span>
                {p.reviewNote ? <span className="text-fal-muted">{p.reviewNote}</span> : null}
                <Link
                  to={`/admin/veiculos?model=${encodeURIComponent(p.id)}`}
                  className="text-xs font-semibold text-fal-fg"
                >
                  Abrir
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-[14px] border border-fal-line bg-fal-surface p-4">
        <p className="m-0 text-sm font-bold text-fal-fg">
          VV verified sem motor ({noEngineItems.length})
        </p>
        <p className="mb-2 mt-1 text-sm text-fal-muted">
          Config ativa sem campo engine — abrir no cadastro do modelo e preencher só com evidência
          (sem inventar motorização).
        </p>
        {noEngineItems.length === 0 ? (
          <p className="m-0 text-sm text-fal-muted">Nenhuma VV verified sem motor.</p>
        ) : (
          <ul className="m-0 max-h-48 list-none space-y-1 overflow-y-auto p-0">
            {noEngineItems.map((v) => (
              <li
                key={v.id}
                className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-fal-line/60 py-1 text-sm"
              >
                <span className="rounded-md bg-orange-50 px-2 py-0.5 text-xs font-bold text-orange-900">
                  Sem motor
                </span>
                <span className="font-semibold text-fal-fg">
                  {v.makerName} {v.modelName}
                  {v.versionName ? ` · ${v.versionName}` : ''}
                </span>
                <Link
                  to={`/admin/veiculos?model=${encodeURIComponent(v.modelId)}`}
                  className="text-xs font-semibold text-fal-fg"
                >
                  Abrir
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-[14px] border border-fal-line bg-fal-surface p-4">
        <p className="m-0 text-sm font-bold text-fal-fg">
          Lookups INV catálogo 0 ({zeroCatalogItems.length})
        </p>
        <p className="mb-2 mt-1 text-sm text-fal-muted">
          Últimos 14 dias com <code>catalog_total=0</code> (sem placa completa). Sinal operacional de
          casca — enriquecer mestre com evidência, sem thin-seed inventado.
        </p>
        {zeroCatalogItems.length === 0 ? (
          <p className="m-0 text-sm text-fal-muted">
            Nenhum lookup com catálogo 0 no período (ou telemetria ainda sem dados pós-deploy).
          </p>
        ) : (
          <ul className="m-0 max-h-48 list-none space-y-1 overflow-y-auto p-0">
            {zeroCatalogItems.map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-fal-line/60 py-1 text-sm"
              >
                <span className="rounded-md bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-950">
                  {e.confidenceBand}
                </span>
                <span className="font-semibold text-fal-fg">
                  {[e.maker, e.model, e.year].filter(Boolean).join(' ') || '—'}
                </span>
                <span className="text-fal-muted">{e.status}</span>
                <span className="text-xs text-fal-muted">
                  {new Date(e.createdAt).toLocaleString('pt-BR')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-[14px] border border-fal-line bg-fal-surface p-4">
        <p className="m-0 text-sm font-bold text-fal-fg">
          Fila de revisão ({queue.length})
        </p>
        <p className="mb-2 mt-1 text-sm text-fal-muted">
          Só modelos <strong>verificados</strong> aparecem no seletor público. Revisão e quarentena
          ficam visíveis apenas no admin.
        </p>
        {queueError ? <p className="m-0 text-sm text-fal-danger">{queueError}</p> : null}
        {queueActionError ? <p className="m-0 text-sm text-fal-danger">{queueActionError}</p> : null}
        {queueActionMsg ? <p className="m-0 text-sm text-emerald-800">{queueActionMsg}</p> : null}
        {!queueError && queue.length === 0 ? (
          <p className="m-0 text-sm text-fal-muted">Nenhum modelo pendente.</p>
        ) : null}
        {queue.length > 0 ? (
          <ul className="m-0 max-h-80 list-none space-y-1 overflow-y-auto p-0">
            {queue.map((q) => (
              <li
                key={q.id}
                className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-fal-line/60 py-1 text-sm"
              >
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                    q.qualityStatus === 'quarantined'
                      ? 'bg-red-100 text-red-900'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {q.qualityStatus === 'quarantined' ? 'Quarentena' : 'Revisão'}
                </span>
                <Link
                  to={`/admin/veiculos?model=${encodeURIComponent(q.id)}`}
                  className="font-semibold text-fal-fg no-underline hover:underline"
                >
                  {q.makerName} {q.name}
                </Link>
                <span className="text-xs text-fal-muted">
                  {q.vehicleClass}
                  {q.evidenceKind ? ` · ${q.evidenceKind}` : ''}
                  {q.pvcCount != null ? ` · PVC ${q.pvcCount}` : ''}
                  {q.customerVehicleCount != null ? ` · clientes ${q.customerVehicleCount}` : ''}
                </span>
                {q.reviewNote ? (
                  <span className="w-full text-xs text-fal-muted">{q.reviewNote}</span>
                ) : null}
                <span className="flex w-full flex-wrap gap-2 pt-1">
                  {q.qualityStatus === 'review' ? (
                    <button
                      type="button"
                      className="rounded-md bg-emerald-700 px-2 py-1 text-xs font-bold text-white disabled:opacity-50"
                      disabled={queueBusyId === q.id || !allowed}
                      onClick={() => void onQueueVerify(q)}
                    >
                      Verificar (A1)
                    </button>
                  ) : null}
                  {q.qualityStatus !== 'quarantined' ? (
                    <button
                      type="button"
                      className="rounded-md border border-red-300 px-2 py-1 text-xs font-bold text-red-900 disabled:opacity-50"
                      disabled={queueBusyId === q.id || !allowed}
                      onClick={() => void onQueueQuarantine(q)}
                    >
                      Quarentena
                    </button>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="rounded-[14px] border border-dashed border-fal-line bg-fal-bg/40 p-4">
        <p className="m-0 text-sm font-bold text-fal-fg">Operação</p>
        <p className="mb-2 mt-1 text-sm text-fal-muted">
          Job auto: Edge <code className="text-xs">vehicle-master-sync</code> (cron semanal +
          secret). Runbook no doc híbrido. Migration{' '}
          <code className="text-xs">models.production_year_*</code> necessária no projeto.
        </p>
        <Button type="button" variant="light" size="sm" onClick={() => void loadStats()}>
          Atualizar contadores
        </Button>
      </div>
    </div>
  )
}
