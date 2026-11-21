import { Button } from '@/components/common/Button'
import { confirmDialog } from '@/components/common/ConfirmDialog'
import { useToast } from '@/components/common/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  adminApplyKitCompositionImport,
  adminPreviewKitCompositionImport,
  type KitCompositionPreviewRow,
} from '@/services/admin/adminKitCompositionImportService'
import { delimiterLabel } from '@/services/import'
import { useState } from 'react'
import { Link } from 'react-router-dom'

function canImport(role: string | undefined): boolean {
  return role === 'administrador' || role === 'gerente'
}

export function AdminKitCompositionImportPage() {
  useDocumentTitle('Importar composição de kits | Admin FAL')
  const { user } = useAuth()
  const toast = useToast()
  const allowed = canImport(user?.role)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [delimiter, setDelimiter] = useState<string | null>(null)
  const [preview, setPreview] = useState<KitCompositionPreviewRow[] | null>(null)
  const [showOnlyErrors, setShowOnlyErrors] = useState(false)

  function pushError(msg: string) {
    setError(msg)
    toast.push(msg, 'error')
  }

  function clearPreview() {
    setPreview(null)
    setFileName(null)
    setDelimiter(null)
  }

  async function onFile(file: File) {
    setBusy(true)
    setError(null)
    clearPreview()
    try {
      setFileName(file.name)
      const { rows, delimiter: d, fileErrors } = await adminPreviewKitCompositionImport(file)
      setDelimiter(d)
      if (fileErrors.length) {
        pushError(fileErrors.join(' · '))
        return
      }
      if (rows.length === 0) {
        pushError('Arquivo sem linhas de dados')
        return
      }
      setPreview(rows)
    } catch (err) {
      pushError(toUserMessage(err, 'Falha no preview'))
    } finally {
      setBusy(false)
    }
  }

  async function onConfirm() {
    if (!preview) return
    const valid = preview.filter((r) => r.ok)
    if (valid.length === 0) return
    const kitCount = new Set(valid.map((r) => r.kitSku)).size
    const { confirmed } = await confirmDialog({
      title: 'Sincronizar composição?',
      message:
        `Aplicar ${valid.length} linha(s) em ${kitCount} kit(s)?\n\n` +
        `O BOM atual de cada kit listado no arquivo será substituído pelas linhas válidas.\n` +
        `Pedidos antigos permanecem intactos. Kits auto terão preço recalculado.`,
      confirmLabel: 'Sincronizar',
    })
    if (!confirmed) return

    setBusy(true)
    setError(null)
    try {
      const result = await adminApplyKitCompositionImport({
        rows: preview,
        note: `import arquivo ${fileName ?? ''}`.trim(),
        actorId: user?.id ?? null,
      })
      toast.push(
        `Sync: ${result.kitsSynced} kit(s), ${result.linesWritten} linha(s).`,
        'success',
      )
      if (result.errors.length) {
        toast.push(`${result.errors.length} aviso(s) no apply — confira o preview.`, 'info')
      }
      clearPreview()
    } catch (err) {
      pushError(toUserMessage(err, 'Falha ao aplicar'))
    } finally {
      setBusy(false)
    }
  }

  if (!allowed) {
    return (
      <div className="space-y-3">
        <h1 className="m-0 text-2xl font-extrabold text-fal-fg">Importar composição de kits</h1>
        <p className="text-sm text-fal-muted">Acesso restrito a administrador/gerente.</p>
      </div>
    )
  }

  const visible = preview
    ? showOnlyErrors
      ? preview.filter((r) => !r.ok)
      : preview
    : []
  const okCount = preview?.filter((r) => r.ok).length ?? 0
  const errCount = preview?.filter((r) => !r.ok).length ?? 0

  return (
    <div className="space-y-6">
      <div>
        <p className="m-0 text-sm">
          <Link to="/admin/kits" className="font-semibold text-fal-fg underline">
            Kits
          </Link>
          <span className="text-fal-muted"> / </span>
          <Link to="/admin/importacoes" className="font-semibold text-fal-fg underline">
            Importações
          </Link>
          <span className="text-fal-muted"> / composição de kits</span>
        </p>
        <h1 className="mt-2 mb-0 text-2xl font-extrabold text-fal-fg">
          Importar composição de kits
        </h1>
        <p className="mt-1 mb-0 text-sm text-fal-muted">
          CSV/XLSX com colunas <code>kit_sku</code>, <code>component_sku</code>,{' '}
          <code>quantity</code>. Não cria produtos — SKUs devem existir (kit + itens). Sync
          substitui o BOM de cada kit presente no arquivo.
        </p>
      </div>

      <section className="rounded-[14px] border border-fal-line bg-fal-surface p-4">
        <label className="block text-sm font-semibold text-fal-fg">
          Arquivo
          <input
            type="file"
            accept=".csv,.txt,.xlsx,.xls"
            className="mt-2 block w-full text-sm"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (f) void onFile(f)
            }}
          />
        </label>
        {fileName ? (
          <p className="mt-2 mb-0 text-xs text-fal-muted">
            {fileName}
            {delimiter ? ` · delimitador ${delimiterLabel(delimiter as ';' | ',' | '\t')}` : ''}
          </p>
        ) : null}
        {error ? <p className="mt-2 mb-0 text-sm text-fal-danger">{error}</p> : null}
      </section>

      {preview ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="m-0 text-sm text-fal-muted">
              {okCount} válida(s) · {errCount} com erro
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showOnlyErrors}
                onChange={(e) => setShowOnlyErrors(e.target.checked)}
              />
              Só erros
            </label>
          </div>

          <div className="overflow-x-auto rounded-fal border border-fal-line bg-fal-surface">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead className="bg-fal-bg text-fal-muted">
                <tr>
                  <th className="px-3 py-2">Linha</th>
                  <th className="px-3 py-2">Kit</th>
                  <th className="px-3 py-2">Componente</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={`${r.lineNumber}-${r.kitSku}-${r.componentSku}`} className="border-t border-fal-line/70">
                    <td className="px-3 py-2 font-mono text-xs">{r.lineNumber}</td>
                    <td className="px-3 py-2">
                      <span className="font-mono text-xs">{r.kitSku}</span>
                      {r.kitName ? (
                        <span className="mt-0.5 block text-xs text-fal-muted">{r.kitName}</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-mono text-xs">{r.componentSku}</span>
                      {r.componentName ? (
                        <span className="mt-0.5 block text-xs text-fal-muted">
                          {r.componentName}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">{r.quantity || '—'}</td>
                    <td className="px-3 py-2">
                      {r.ok ? (
                        <span className="text-xs font-bold text-emerald-800">OK</span>
                      ) : (
                        <span className="text-xs text-fal-danger">{r.errors.join(' · ')}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="primary"
              disabled={busy || okCount === 0}
              onClick={() => void onConfirm()}
            >
              {busy ? 'Aplicando…' : `Sincronizar ${okCount} linha(s)`}
            </Button>
            <Button type="button" variant="outline" disabled={busy} onClick={clearPreview}>
              Limpar
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  )
}
