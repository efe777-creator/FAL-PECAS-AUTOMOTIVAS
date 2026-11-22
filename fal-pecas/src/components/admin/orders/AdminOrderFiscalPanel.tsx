import { Button } from '@/components/common/Button'
import { formatDateTime } from '@/lib/datetime'
import { fiscalDocumentService } from '@/services/fiscal/FiscalDocumentService'
import type { OrderFiscalDocument } from '@/services/fiscal/types'
import { useCallback, useEffect, useState } from 'react'

type Props = {
  orderId: string
  busy?: boolean
  onAttached?: () => void
}

export function AdminOrderFiscalPanel({ orderId, busy = false, onAttached }: Props) {
  const [docs, setDocs] = useState<OrderFiscalDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [number, setNumber] = useState('')
  const [issuedAt, setIssuedAt] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const list = await fiscalDocumentService.list(orderId)
      setDocs(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar NF.')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    void reload()
  }, [reload])

  async function onAttach(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!file) {
      setError('Selecione o arquivo da NF.')
      return
    }
    setSaving(true)
    try {
      await fiscalDocumentService.attachManual({
        orderId,
        file,
        documentNumber: number,
        issuedAt: issuedAt || null,
      })
      setFile(null)
      setNumber('')
      setIssuedAt('')
      await reload()
      onAttached?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao anexar NF.')
    } finally {
      setSaving(false)
    }
  }

  async function openDoc(doc: OrderFiscalDocument) {
    try {
      const url = await fiscalDocumentService.downloadUrl(doc.storagePath)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao abrir arquivo.')
    }
  }

  const current = docs.find((d) => d.isCurrent) ?? null

  return (
    <section className="rounded-[10px] border border-fal-line bg-fal-bg/50 px-2.5 py-2">
      <p className="m-0 text-[11px] font-bold uppercase tracking-wide text-fal-muted">
        Nota fiscal (anexo manual)
      </p>
      <p className="mt-1 mb-2 text-xs text-fal-muted">
        PDF anexado ≠ emissão automática. Despacho não é bloqueado por ausência de NF nesta fase.
      </p>

      {loading ? (
        <p className="m-0 text-xs text-fal-muted">Carregando…</p>
      ) : current ? (
        <div className="mb-2 rounded-[8px] border border-fal-line bg-fal-surface px-2 py-1.5 text-xs">
          <p className="m-0 font-semibold text-fal-fg">
            Atual{current.documentNumber ? `: ${current.documentNumber}` : ''}
          </p>
          <p className="mb-1 mt-0.5 text-fal-muted">
            {current.fileName ?? 'arquivo'} · {formatDateTime(current.createdAt)} · {current.source}
          </p>
          <button
            type="button"
            className="font-semibold text-fal-accent underline-offset-2 hover:underline"
            onClick={() => void openDoc(current)}
          >
            Abrir arquivo
          </button>
        </div>
      ) : (
        <p className="mb-2 text-xs text-fal-muted">Nenhuma NF anexada ainda.</p>
      )}

      {docs.length > 1 ? (
        <details className="mb-2 text-xs">
          <summary className="cursor-pointer font-semibold text-fal-fg">Histórico</summary>
          <ul className="mt-1 list-none space-y-1 p-0">
            {docs.map((d) => (
              <li key={d.id} className="text-fal-muted">
                {d.isCurrent ? '● ' : '○ '}
                {d.documentNumber ?? 's/n'} · {formatDateTime(d.createdAt)}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <form onSubmit={(e) => void onAttach(e)} className="space-y-2">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="block text-xs">
            <span className="font-semibold text-fal-fg">Número</span>
            <input
              className="mt-0.5 w-full rounded-[8px] border border-fal-line bg-fal-surface px-2 py-1.5 text-sm"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="Opcional"
            />
          </label>
          <label className="block text-xs">
            <span className="font-semibold text-fal-fg">Data emissão</span>
            <input
              type="date"
              className="mt-0.5 w-full rounded-[8px] border border-fal-line bg-fal-surface px-2 py-1.5 text-sm"
              value={issuedAt}
              onChange={(e) => setIssuedAt(e.target.value)}
            />
          </label>
        </div>
        <label className="block text-xs">
          <span className="font-semibold text-fal-fg">Arquivo (PDF/imagem)</span>
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            className="mt-0.5 block w-full text-sm"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        {error ? (
          <p role="alert" className="m-0 text-xs font-semibold text-red-700">
            {error}
          </p>
        ) : null}
        <Button type="submit" variant="outline" disabled={busy || saving || !file}>
          {saving ? 'Anexando…' : current ? 'Substituir NF' : 'Anexar NF'}
        </Button>
      </form>
    </section>
  )
}
