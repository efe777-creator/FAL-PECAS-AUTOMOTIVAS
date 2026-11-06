import { Button } from '@/components/common/Button'
import { useToast } from '@/components/common/Toast'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { CODIGO_REFERENCIA_LABEL, SKU_FAL_LABEL } from '@/lib/productLabels'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  adminApplyImageSkuImport,
  adminPreviewImageSkuImport,
  type ImageSkuMatchRow,
} from '@/services/admin/adminImageSkuImportService'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

type Phase = 'idle' | 'preview' | 'running' | 'done'

export function AdminImageSkuImportPage() {
  useDocumentTitle('Importar imagens | Admin FAL')
  const { push } = useToast()
  const [files, setFiles] = useState<File[]>([])
  const [preview, setPreview] = useState<ImageSkuMatchRow[] | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [skipIfHasImage, setSkipIfHasImage] = useState(true)
  const [progress, setProgress] = useState<{ done: number; total: number; current: string | null }>({
    done: 0,
    total: 0,
    current: null,
  })
  const [report, setReport] = useState<{ ok: number; skip: number; error: number } | null>(null)

  const counts = useMemo(() => {
    if (!preview) return null
    return {
      ok: preview.filter((r) => r.status === 'ok').length,
      skip: preview.filter((r) => r.status === 'skip').length,
      error: preview.filter((r) => r.status === 'error').length,
    }
  }, [preview])

  async function onPick(list: FileList | null) {
    if (!list?.length) return
    setBusy(true)
    setError(null)
    setReport(null)
    setPhase('idle')
    try {
      const arr = Array.from(list)
      setFiles(arr)
      const rows = await adminPreviewImageSkuImport(arr, { skipIfHasImage })
      setPreview(rows)
      setPhase('preview')
    } catch (err) {
      setPreview(null)
      const msg = toUserMessage(err, 'Falha ao analisar arquivos')
      setError(msg)
      push(msg, 'error')
    } finally {
      setBusy(false)
    }
  }

  async function onApply() {
    if (!preview?.length || !files.length) return
    setBusy(true)
    setError(null)
    setPhase('running')
    setProgress({ done: 0, total: preview.filter((r) => r.status === 'ok').length, current: null })
    try {
      const result = await adminApplyImageSkuImport(files, preview, (p) =>
        setProgress({ done: p.done, total: p.total, current: p.currentFile }),
      )
      setPreview(result.rows)
      setReport({ ok: result.ok, skip: result.skip, error: result.error })
      setPhase('done')
      push(
        `Imagens: ${result.ok} enviada(s), ${result.skip} pulada(s), ${result.error} erro(s)`,
        result.error ? 'error' : 'success',
      )
    } catch (err) {
      const msg = toUserMessage(err, 'Falha ao enviar imagens')
      setError(msg)
      push(msg, 'error')
      setPhase('preview')
    } finally {
      setBusy(false)
    }
  }

  const pct =
    progress.total > 0 ? Math.min(100, Math.round((progress.done / progress.total) * 100)) : 0

  return (
    <div className="space-y-4">
      <div>
        <h1 className="m-0 text-2xl font-extrabold text-fal-navy">Importar imagens por SKU</h1>
        <p className="mt-1 max-w-2xl text-sm text-fal-muted">
          Selecione várias fotos. O nome do arquivo deve ser o {SKU_FAL_LABEL} ou o{' '}
          {CODIGO_REFERENCIA_LABEL} (ex.: <code className="text-fal-ink">BRD5605.jpg</code>,{' '}
          <code className="text-fal-ink">BRD5605_2.png</code> para foto extra).
        </p>
      </div>

      <div className="space-y-3 rounded-fal border border-fal-line bg-white p-4">
        <label className="flex items-center gap-2 text-sm font-semibold text-fal-navy">
          <input
            type="checkbox"
            checked={skipIfHasImage}
            disabled={busy || phase === 'running'}
            onChange={(e) => {
              const next = e.target.checked
              setSkipIfHasImage(next)
              if (files.length && phase !== 'running' && phase !== 'done') {
                void (async () => {
                  setBusy(true)
                  try {
                    setPreview(await adminPreviewImageSkuImport(files, { skipIfHasImage: next }))
                    setPhase('preview')
                  } catch (err) {
                    const msg = toUserMessage(err, 'Falha ao reanalisar')
                    setError(msg)
                    push(msg, 'error')
                  } finally {
                    setBusy(false)
                  }
                })()
              }
            }}
          />
          Pular produtos que já têm imagem
        </label>
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={busy}
          onChange={(e) => {
            const list = e.target.files
            e.target.value = ''
            void onPick(list)
          }}
        />
        {files.length ? (
          <p className="m-0 text-sm text-fal-muted">{files.length} arquivo(s) selecionado(s)</p>
        ) : null}
        {error ? <p className="m-0 text-sm font-semibold text-fal-danger">{error}</p> : null}
      </div>

      {phase === 'running' ? (
        <div className="rounded-fal border border-fal-line bg-white p-4">
          <p className="m-0 text-sm font-bold text-fal-navy">
            Enviando… {progress.done}/{progress.total} ({pct}%)
          </p>
          {progress.current ? (
            <p className="mt-1 mb-0 truncate text-xs text-fal-muted">{progress.current}</p>
          ) : null}
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-fal-bg">
            <div className="h-full bg-fal-navy transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      ) : null}

      {counts && preview ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="m-0 text-sm text-fal-ink">
            Prévia: <strong>{counts.ok}</strong> ok · <strong>{counts.skip}</strong> pular ·{' '}
            <strong>{counts.error}</strong> erro
          </p>
          {phase === 'preview' ? (
            <Button
              type="button"
              variant="primary"
              disabled={busy || counts.ok === 0}
              onClick={() => void onApply()}
            >
              Enviar {counts.ok} imagem(ns)
            </Button>
          ) : null}
          {report && phase === 'done' ? (
            <p className="m-0 text-sm font-semibold text-fal-navy">
              Resultado: {report.ok} ok · {report.skip} pulada(s) · {report.error} erro(s)
            </p>
          ) : null}
        </div>
      ) : null}

      {preview?.length ? (
        <div className="overflow-x-auto rounded-fal border border-fal-line bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-fal-line bg-fal-bg text-xs uppercase text-fal-muted">
              <tr>
                <th className="px-3 py-2 font-bold">Arquivo</th>
                <th className="px-3 py-2 font-bold">Chave</th>
                <th className="px-3 py-2 font-bold">Produto</th>
                <th className="px-3 py-2 font-bold">Status</th>
                <th className="px-3 py-2 font-bold">Obs.</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((row) => (
                <tr key={row.fileName + row.key} className="border-b border-fal-line/60">
                  <td className="max-w-[12rem] truncate px-3 py-2 font-medium">{row.fileName}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.key ?? '—'}</td>
                  <td className="px-3 py-2">
                    {row.productId ? (
                      <Link
                        className="font-semibold text-fal-auth-link hover:underline"
                        to={`/admin/produtos/${row.productId}`}
                      >
                        {row.productLabel}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        row.status === 'ok'
                          ? 'font-bold text-fal-success'
                          : row.status === 'skip'
                            ? 'font-semibold text-fal-muted'
                            : 'font-bold text-fal-danger'
                      }
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="max-w-[16rem] truncate px-3 py-2 text-fal-muted">{row.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
