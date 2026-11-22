import { Button } from '@/components/common/Button'
import { useAuth } from '@/contexts/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { toUserMessage } from '@/lib/toUserMessage'
import { adminFetchVehicleMasterStats } from '@/services/admin/adminVehicleMasterStats'
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
  const [statsError, setStatsError] = useState<string | null>(null)

  const [syncBusy, setSyncBusy] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<VehicleMasterSyncMeta | null>(null)

  const loadStats = useCallback(async () => {
    setStatsError(null)
    try {
      const s = await adminFetchVehicleMasterStats()
      setMakers(s.manufacturersActive)
      setModels(s.modelsActive)
      setVersions(s.versionsActive)
      setWithLife(s.modelsWithProductionYears)
    } catch (err) {
      setStatsError(toUserMessage(err, 'Falha ao carregar contadores'))
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
          <StatusChip label="Lookup read-only" on />
          <StatusChip label="FIPE assist (flag)" on={false} />
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
