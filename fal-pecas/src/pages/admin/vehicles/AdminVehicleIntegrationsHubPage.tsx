import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { toUserMessage } from '@/lib/toUserMessage'
import { adminFetchVehicleMasterStats } from '@/services/admin/adminVehicleMasterStats'
import { normalizeFipeXToFalCsv } from '@/services/admin/fipeXToFalVehicleMasterCsv'
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

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function AdminVehicleIntegrationsHubPage() {
  useDocumentTitle('Integrações veículos | Admin FAL')

  const [makers, setMakers] = useState<number | null>(null)
  const [models, setModels] = useState<number | null>(null)
  const [versions, setVersions] = useState<number | null>(null)
  const [statsError, setStatsError] = useState<string | null>(null)

  const [seedBusy, setSeedBusy] = useState(false)
  const [seedMsg, setSeedMsg] = useState<string | null>(null)
  const [seedError, setSeedError] = useState<string | null>(null)

  const loadStats = useCallback(async () => {
    setStatsError(null)
    try {
      const s = await adminFetchVehicleMasterStats()
      setMakers(s.manufacturersActive)
      setModels(s.modelsActive)
      setVersions(s.versionsActive)
    } catch (err) {
      setStatsError(toUserMessage(err, 'Falha ao carregar contadores'))
    }
  }, [])

  useEffect(() => {
    void loadStats()
  }, [loadStats])

  async function onSeedFile(file: File) {
    setSeedBusy(true)
    setSeedError(null)
    setSeedMsg(null)
    try {
      const text = await file.text()
      const result = normalizeFipeXToFalCsv(text)
      if (result.fileErrors.length) {
        setSeedError(result.fileErrors.join(' · '))
        return
      }
      if (!result.rows.length) {
        setSeedError('Nenhuma linha gerada (filtros de marca/ano ou arquivo vazio).')
        return
      }
      const stamp = new Date().toISOString().slice(0, 10)
      downloadText(`fal-mestre-fipex-${stamp}.csv`, result.csv)
      setSeedMsg(
        `${result.rows.length} linhas no CSV FAL (${result.skipped} ignoradas). Aplique em Enriquecer mestre — sem PVC.`,
      )
    } catch (err) {
      setSeedError(toUserMessage(err, 'Falha ao normalizar seed'))
    } finally {
      setSeedBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mt-0 text-[28px] font-extrabold text-fal-fg">Integrações · Veículos</h1>
        <p className="m-0 text-sm text-fal-muted">
          Enriquecer o mestre (montadora → modelo → configuração). Identificação de placa e aplicações
          (PVC) são caminhos separados — o seed/import <strong>não cria PVC</strong> e não usa código
          FIPE para filtrar peças.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusChip label="Import CSV" on />
          <StatusChip label="Seed fipeX" on />
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
            Preview e apply idempotente — único writer de massa. Não cria aplicações (PVC).
          </p>
        </Link>

        <div className="rounded-[14px] border border-fal-line bg-fal-surface p-5">
          <h2 className="m-0 text-lg font-extrabold text-fal-fg">Seed fipeX</h2>
          <p className="mt-2 text-sm text-fal-muted">
            Dump CSV (marca/modelo/ano) → gera CSV FAL para baixar. Depois aplique no card CSV. Sem
            API no browser; código FIPE é ignorado.
          </p>
          <input
            className="mt-3 block w-full text-sm"
            type="file"
            accept=".csv,text/csv"
            disabled={seedBusy}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void onSeedFile(f)
              e.target.value = ''
            }}
          />
          {seedBusy ? <p className="mt-2 text-sm text-fal-muted">Gerando…</p> : null}
          {seedMsg ? <p className="mt-2 text-sm text-emerald-800">{seedMsg}</p> : null}
          {seedError ? <p className="mt-2 text-sm text-fal-danger">{seedError}</p> : null}
          <p className="mb-0 mt-3 text-sm">
            <Link to="/admin/veiculos/importar-mestre" className="font-semibold text-fal-fg">
              Abrir import para aplicar →
            </Link>
          </p>
        </div>

        <Link
          to="/admin/veiculos"
          className="block rounded-[14px] border border-fal-line bg-fal-surface p-5 no-underline transition hover:border-fal-navy/40"
        >
          <h2 className="m-0 text-lg font-extrabold text-fal-fg">Cadastro manual</h2>
          <p className="mb-0 mt-2 text-sm text-fal-muted">
            CRUD Montadora → Modelo → Configuração. Período de aplicação fica no PVC, não só no ano
            da versão.
          </p>
        </Link>
      </div>

      <div className="rounded-[14px] border border-dashed border-fal-line bg-fal-bg/40 p-4">
        <p className="m-0 text-sm font-bold text-fal-fg">Operação</p>
        <p className="mb-2 mt-1 text-sm text-fal-muted">
          Redeploy Edge <code className="text-xs">plate-lookup</code> (faixa confidenceBand) e
          runbook do seed: doc{' '}
          <code className="text-xs">FAL_PLANO_MESTRE_VEICULOS_HIBRIDO_INTEGRACOES_2026-11-21.md</code>.
        </p>
        <button
          type="button"
          className="text-sm font-semibold text-fal-fg underline"
          onClick={() => void loadStats()}
        >
          Atualizar contadores
        </button>
      </div>
    </div>
  )
}
