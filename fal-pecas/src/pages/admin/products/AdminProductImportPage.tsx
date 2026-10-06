import { Button } from '@/components/common/Button'
import { useAuth } from '@/contexts/AuthContext'
import {
  adminApplyCatalogImport,
  adminCreateCatalogImport,
  adminPreviewCatalogImport,
  type CatalogImportPreviewRow,
} from '@/services/admin/adminCatalogImportService'
import { delimiterLabel, type CsvDelimiter } from '@/services/import'
import { useState } from 'react'
import { Link } from 'react-router-dom'

function canImportCatalog(role: string | undefined): boolean {
  return role === 'administrador' || role === 'gerente'
}

export function AdminProductImportPage() {
  const { user } = useAuth()
  const allowed = canImportCatalog(user?.role)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [delimiter, setDelimiter] = useState<string | null>(null)
  const [preview, setPreview] = useState<CatalogImportPreviewRow[] | null>(null)
  const [importId, setImportId] = useState<string | null>(null)
  const [report, setReport] = useState<string | null>(null)
  const [showOnlyErrors, setShowOnlyErrors] = useState(false)

  async function onFile(file: File) {
    setBusy(true)
    setError(null)
    setReport(null)
    setImportId(null)
    setPreview(null)
    try {
      setFileName(file.name)
      const { rows, delimiter: d, fileErrors } = await adminPreviewCatalogImport(file)
      setDelimiter(d)
      if (fileErrors.length) {
        setError(fileErrors.join(' · '))
        return
      }
      if (rows.length === 0) {
        setError('Arquivo sem linhas de dados')
        return
      }
      setPreview(rows)
      const id = await adminCreateCatalogImport({
        filename: file.name,
        createdBy: user?.id ?? null,
        rows,
      })
      setImportId(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no preview')
    } finally {
      setBusy(false)
    }
  }

  async function onConfirm() {
    if (!importId) return
    const valid = preview?.filter((r) => r.ok).length ?? 0
    if (valid === 0) return
    const ok = window.confirm(
      `Confirmar importação de ${valid} linha(s) válida(s)?\n\n` +
        `Novos produtos entram como rascunho e indisponíveis.\n` +
        `Linhas com erro serão ignoradas.`,
    )
    if (!ok) return

    setBusy(true)
    setError(null)
    try {
      const result = await adminApplyCatalogImport(importId)
      setReport(
        `Criados: ${result.created}. Atualizados: ${result.updated}. ` +
          `Falhas: ${result.failed}. Ignorados: ${result.skipped}. ` +
          `Enriquecidos (grupo/montadora): ${result.enriched}.`,
      )
      setPreview(null)
      setImportId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao aplicar importação')
    } finally {
      setBusy(false)
    }
  }

  const validCount = preview?.filter((r) => r.ok).length ?? 0
  const invalidCount = preview?.filter((r) => !r.ok).length ?? 0
  const visible = preview
    ? showOnlyErrors
      ? preview.filter((r) => !r.ok)
      : preview
    : []

  return (
    <div className="space-y-4">
      <div>
        <Link to="/admin/produtos" className="text-sm font-semibold text-fal-navy underline">
          ← Voltar aos produtos
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold text-fal-navy">Importar produtos</h1>
        <p className="mt-1 text-sm text-fal-muted">
          Layout canônico FAL:{' '}
          <code className="rounded bg-fal-bg px-1">CODIGO;GRUPO;MONTADORA;DESCRICAO</code> (CSV
          UTF-8 com <strong>;</strong> ou XLSX). Mínimo: código + descrição. Preview obrigatório.
          Novos = <strong>draft</strong> + indisponível. Montadora = sugestão (sem compatibilidade).
          Não publica automaticamente.
        </p>
      </div>

      {!allowed ? (
        <p className="rounded-[14px] border border-fal-danger/40 bg-red-50 p-4 text-sm text-fal-danger">
          Somente administrador ou gerente podem importar o catálogo.
        </p>
      ) : (
        <div className="rounded-[14px] border border-fal-line bg-white p-4">
          <h2 className="m-0 text-lg font-extrabold text-fal-navy">Arquivo</h2>
          <p className="mt-1 text-sm text-fal-muted">
            Upsert por SKU. SKU duplicado no arquivo = erro. Reimportação atualiza a descrição.
          </p>
          <input
            className="mt-3 block w-full text-sm"
            type="file"
            accept=".csv,.xlsx,.xls,text/csv"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void onFile(f)
              e.target.value = ''
            }}
          />
        </div>
      )}

      {error ? <p className="text-sm text-fal-danger">{error}</p> : null}
      {report ? <p className="text-sm text-green-700">{report}</p> : null}

      {preview ? (
        <div className="space-y-3 rounded-[14px] border border-fal-line bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="m-0 text-sm">
              Arquivo <strong>{fileName}</strong>
              {delimiter
                ? ` · delimitador ${delimiterLabel(delimiter as CsvDelimiter)}`
                : null}{' '}
              — válidos: {validCount}, inválidos: {invalidCount}
            </p>
            <label className="flex items-center gap-2 text-sm font-semibold text-fal-navy">
              <input
                type="checkbox"
                checked={showOnlyErrors}
                onChange={(e) => setShowOnlyErrors(e.target.checked)}
              />
              Somente erros
            </label>
          </div>

          <div className="max-h-80 overflow-auto rounded border border-fal-line text-xs">
            <table className="min-w-full">
              <thead>
                <tr className="bg-fal-bg text-left">
                  <th className="px-2 py-1">Linha</th>
                  <th className="px-2 py-1">Código</th>
                  <th className="px-2 py-1">Grupo</th>
                  <th className="px-2 py-1">Montadora</th>
                  <th className="px-2 py-1">Descrição</th>
                  <th className="px-2 py-1">Ação</th>
                  <th className="px-2 py-1">Erros</th>
                </tr>
              </thead>
              <tbody>
                {visible.slice(0, 100).map((r) => (
                  <tr key={r.line} className={r.ok ? '' : 'bg-red-50'}>
                    <td className="px-2 py-1">{r.line}</td>
                    <td className="px-2 py-1 font-mono">{r.sku || '—'}</td>
                    <td className="px-2 py-1">{r.grupo || '—'}</td>
                    <td className="px-2 py-1">{r.montadora || '—'}</td>
                    <td className="px-2 py-1">{r.name || '—'}</td>
                    <td className="px-2 py-1">
                      {r.action === 'create'
                        ? 'Criar (draft)'
                        : r.action === 'update'
                          ? 'Atualizar'
                          : '—'}
                    </td>
                    <td className="px-2 py-1 text-fal-danger">{r.errors.join('; ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {visible.length > 100 ? (
            <p className="text-xs text-fal-muted">Exibindo as primeiras 100 linhas do filtro.</p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={busy || validCount === 0 || !importId}
              onClick={() => void onConfirm()}
            >
              {busy ? 'Processando…' : `Confirmar importação (${validCount})`}
            </Button>
            <Button
              type="button"
              variant="light"
              disabled={busy}
              onClick={() => {
                setPreview(null)
                setImportId(null)
                setFileName(null)
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
