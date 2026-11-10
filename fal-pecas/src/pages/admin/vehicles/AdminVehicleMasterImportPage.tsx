import { Button } from '@/components/common/Button'
import { useToast } from '@/components/common/Toast'
import { PageShell } from '@/components/layout/PageShell'
import { useAuth } from '@/contexts/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  adminApplyVehicleMasterImport,
  adminPreviewVehicleMasterImport,
  type VehicleMasterApplyResult,
  type VehicleMasterRow,
} from '@/services/admin/adminVehicleMasterImportService'
import { useState } from 'react'
import { Link } from 'react-router-dom'

function canImport(role: string | undefined): boolean {
  return role === 'administrador' || role === 'gerente'
}

export function AdminVehicleMasterImportPage() {
  useDocumentTitle('Importar veículos mestre | Admin FAL')
  const { user } = useAuth()
  const toast = useToast()
  const allowed = canImport(user?.role)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [preview, setPreview] = useState<VehicleMasterRow[] | null>(null)
  const [report, setReport] = useState<VehicleMasterApplyResult | null>(null)

  if (!allowed) {
    return (
      <PageShell>
        <p className="text-sm text-fal-muted">Sem permissão para importar veículos.</p>
        <Link to="/admin/veiculos">Voltar</Link>
      </PageShell>
    )
  }

  async function onFile(file: File) {
    setBusy(true)
    setError(null)
    setPreview(null)
    setReport(null)
    try {
      setFileName(file.name)
      const { rows, fileErrors } = await adminPreviewVehicleMasterImport(file)
      if (fileErrors.length) {
        setError(fileErrors.join(' · '))
        toast.push(fileErrors[0]!, 'error')
        return
      }
      if (!rows.length) {
        setError('Arquivo sem linhas de dados')
        toast.push('Arquivo sem linhas de dados', 'error')
        return
      }
      setPreview(rows)
    } catch (err) {
      const msg = toUserMessage(err, 'Falha ao ler arquivo')
      setError(msg)
      toast.push(msg, 'error')
    } finally {
      setBusy(false)
    }
  }

  async function onApply() {
    if (!preview?.length) return
    setBusy(true)
    setError(null)
    try {
      const result = await adminApplyVehicleMasterImport(preview)
      setReport(result)
      toast.push(
        `Mestre aplicado: ${result.created} upserts, ${result.skipped} ignorados, ${result.errors} erros.`,
        result.errors ? 'error' : 'success',
      )
    } catch (err) {
      const msg = toUserMessage(err, 'Falha ao aplicar importação')
      setError(msg)
      toast.push(msg, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageShell>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-fal-navy">Importar veículos (mestre)</h1>
          <p className="mt-1 text-sm text-fal-muted">
            Colunas: <code>montadora, modelo, ano, motor, versao</code>. Idempotente — não cria
            aplicações (PVC).
          </p>
        </div>
        <Link
          className="rounded-[10px] border border-fal-line bg-white px-3 py-2 text-sm font-semibold text-fal-navy"
          to="/admin/veiculos"
        >
          Voltar a veículos
        </Link>
      </div>

      <div className="rounded-[14px] border border-fal-line bg-white p-4">
        <input
          type="file"
          accept=".csv,text/csv"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void onFile(f)
          }}
        />
        {fileName ? <p className="mt-2 text-sm text-fal-muted">Arquivo: {fileName}</p> : null}
        {error ? <p className="mt-2 text-sm text-fal-danger">{error}</p> : null}
      </div>

      {preview ? (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="m-0 text-sm text-fal-muted">{preview.length} linha(s) na prévia</p>
            <Button type="button" variant="primary" disabled={busy} onClick={() => void onApply()}>
              Aplicar upsert
            </Button>
          </div>
          <div className="max-h-[420px] overflow-auto rounded-[12px] border border-fal-line">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead className="sticky top-0 bg-[#f7f9fa]">
                <tr>
                  <th className="px-2 py-2">#</th>
                  <th className="px-2 py-2">Montadora</th>
                  <th className="px-2 py-2">Modelo</th>
                  <th className="px-2 py-2">Ano</th>
                  <th className="px-2 py-2">Motor</th>
                  <th className="px-2 py-2">Versão</th>
                  <th className="px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 200).map((r) => (
                  <tr key={r.lineNumber} className="border-t border-fal-line/70">
                    <td className="px-2 py-1.5">{r.lineNumber}</td>
                    <td className="px-2 py-1.5">{r.montadora}</td>
                    <td className="px-2 py-1.5">{r.modelo}</td>
                    <td className="px-2 py-1.5">{r.ano || '—'}</td>
                    <td className="px-2 py-1.5">{r.motor || '—'}</td>
                    <td className="px-2 py-1.5">{r.versao || '—'}</td>
                    <td className="px-2 py-1.5">{r.message ?? r.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {report ? (
        <div className="mt-4 rounded-[14px] border border-fal-line bg-white p-4 text-sm">
          <p className="m-0 font-semibold text-fal-navy">Resultado</p>
          <ul className="mt-2 list-disc pl-5 text-fal-muted">
            <li>Upserts: {report.created}</li>
            <li>Duplicatas no arquivo: {report.reused}</li>
            <li>Ignorados: {report.skipped}</li>
            <li>Erros: {report.errors}</li>
          </ul>
        </div>
      ) : null}
    </PageShell>
  )
}
