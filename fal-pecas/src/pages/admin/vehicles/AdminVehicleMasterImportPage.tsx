import { VehicleMasterConsultPreview } from '@/components/admin/vehicles/VehicleMasterConsultPreview'
import { Button } from '@/components/common/Button'
import { useToast } from '@/components/common/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { setGuideBridge, VEHICLES_OPEN_GUIDE_KEY } from '@/lib/adminGuideBridges'
import { toUserMessage } from '@/lib/toUserMessage'
import { VEHICLE_MASTER_CSV_TEMPLATE } from '@/services/admin/adminVehicleMasterImportService'
import type { MasterDiffCandidate, MasterDiffStatus } from '@/services/vehicles/diffVehicleMasterCandidates'
import {
  applySelectedMasterCandidates,
  buildCandidatesFromFalCsvFile,
  buildCandidatesFromFipeXText,
} from '@/services/vehicles/vehicleMasterConsultService'
import {
  writeVehicleMasterSyncMeta,
  type VehicleMasterSyncMeta,
} from '@/services/vehicles/vehicleMasterSource'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

function canImport(role: string | undefined): boolean {
  return role === 'administrador' || role === 'gerente'
}

function downloadTemplate() {
  const blob = new Blob([VEHICLE_MASTER_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'fal-veiculos-mestre-modelo.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export function AdminVehicleMasterImportPage() {
  useDocumentTitle('Importar veículos mestre | Admin FAL')
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const allowed = canImport(user?.role)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<MasterDiffCandidate[] | null>(null)
  const [statusFilter, setStatusFilter] = useState<MasterDiffStatus | ''>('')
  const [report, setReport] = useState<string | null>(null)
  const [touchedModelIds, setTouchedModelIds] = useState<string[]>([])

  if (!allowed) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-fal-muted">Sem permissão para importar veículos.</p>
        <Link to="/admin/veiculos/integracoes">Integrações</Link>
      </div>
    )
  }

  async function onFile(file: File) {
    setBusy(true)
    setError(null)
    setReport(null)
    setTouchedModelIds([])
    setFileName(file.name)
    try {
      const text = await file.text()
      const looksFal =
        /ano\s*in[ií]cio/i.test(text.slice(0, 400)) ||
        /montadora,\s*modelo/i.test(text.slice(0, 200))
      const out = looksFal
        ? await buildCandidatesFromFalCsvFile(file)
        : await buildCandidatesFromFipeXText(text)
      if (out.fileErrors.length) {
        setError(out.fileErrors.join(' · '))
        setCandidates(null)
        toast.push(out.fileErrors[0]!, 'error')
        return
      }
      if (!out.candidates.length) {
        setError('Arquivo sem linhas válidas')
        setCandidates(null)
        toast.push('Arquivo sem linhas válidas', 'error')
        return
      }
      setCandidates(out.candidates)
      toast.push(`${out.candidates.length} linha(s) na prévia`, 'success')
    } catch (err) {
      const msg = toUserMessage(err, 'Falha ao ler arquivo')
      setError(msg)
      toast.push(msg, 'error')
    } finally {
      setBusy(false)
    }
  }

  async function onApply() {
    if (!candidates?.length) return
    setBusy(true)
    setError(null)
    try {
      const result = await applySelectedMasterCandidates(candidates)
      const meta: VehicleMasterSyncMeta = {
        at: new Date().toISOString(),
        upserted: result.upserted,
        productionMerged: result.productionMerged,
        errors: result.errors,
        skipped: result.skipped,
        source: 'import_csv_selective',
      }
      writeVehicleMasterSyncMeta(meta)
      setTouchedModelIds(result.modelIds)
      setReport(
        `Upserts: ${result.upserted} · vidas: ${result.productionMerged} · fora da seleção: ${result.skipped} · erros: ${result.errors}`,
      )
      toast.push(
        result.errors ? 'Import com erros' : 'Mestre aplicado (selecionados)',
        result.errors ? 'error' : 'success',
      )
      if (result.messages.length) setError(result.messages.slice(0, 5).join(' · '))
    } catch (err) {
      const msg = toUserMessage(err, 'Falha ao aplicar importação')
      setError(msg)
      toast.push(msg, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mt-0 text-[28px] font-extrabold text-fal-fg">Importar veículos (mestre)</h1>
          <p className="m-0 text-sm text-fal-muted">
            Prévia com checkbox e edição. Só as linhas marcadas entram no mestre. Não cria PVC.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="light" onClick={downloadTemplate}>
            Baixar modelo CSV
          </Button>
          <Link
            className="rounded-[10px] border border-fal-line bg-fal-surface px-3 py-2 text-sm font-semibold text-fal-fg"
            to="/admin/veiculos/consultar-mestre"
          >
            Consultar e escolher
          </Link>
          <Link
            className="rounded-[10px] border border-fal-line bg-fal-surface px-3 py-2 text-sm font-semibold text-fal-fg"
            to="/admin/veiculos/integracoes"
          >
            Integrações
          </Link>
        </div>
      </div>

      <div className="rounded-[14px] border border-fal-line bg-fal-surface p-4">
        <input
          type="file"
          accept=".csv,text/csv"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void onFile(f)
            e.target.value = ''
          }}
        />
        {fileName ? <p className="mt-2 text-sm text-fal-muted">Arquivo: {fileName}</p> : null}
        {error ? <p className="mt-2 text-sm text-fal-danger">{error}</p> : null}
        {report ? <p className="mt-2 text-sm text-fal-success">{report}</p> : null}
      </div>

      {touchedModelIds.length ? (
        <div className="flex flex-wrap gap-2">
          {touchedModelIds.slice(0, 8).map((id) => (
            <Button
              key={id}
              type="button"
              variant="light"
              size="sm"
              onClick={() => {
                setGuideBridge(VEHICLES_OPEN_GUIDE_KEY, id)
                navigate(`/admin/veiculos?model=${encodeURIComponent(id)}`)
              }}
            >
              Abrir guia
            </Button>
          ))}
        </div>
      ) : null}

      {candidates ? (
        <VehicleMasterConsultPreview
          rows={candidates}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onChange={setCandidates}
          onApply={() => void onApply()}
          busy={busy}
          allowed={allowed}
        />
      ) : null}
    </div>
  )
}
