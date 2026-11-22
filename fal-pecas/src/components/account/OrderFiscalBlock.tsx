import { fiscalDocumentService } from '@/services/fiscal/FiscalDocumentService'
import type { OrderFiscalDocument } from '@/services/fiscal/types'
import { useEffect, useState } from 'react'

type Props = {
  orderId: string
  /** Se já veio do detalhe, evita fetch duplicado. */
  document?: OrderFiscalDocument | null
}

export function OrderFiscalBlock({ orderId, document: initial }: Props) {
  const [doc, setDoc] = useState<OrderFiscalDocument | null | undefined>(initial)
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initial !== undefined) {
      setDoc(initial)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const current = await fiscalDocumentService.getCurrent(orderId)
        if (!cancelled) setDoc(current)
      } catch {
        if (!cancelled) setDoc(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [orderId, initial])

  if (doc === undefined) {
    return null
  }

  async function open() {
    if (!doc) return
    setOpening(true)
    setError(null)
    try {
      const url = await fiscalDocumentService.downloadUrl(doc.storagePath)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível abrir a NF.')
    } finally {
      setOpening(false)
    }
  }

  if (!doc) {
    return (
      <div className="rounded-fal border border-fal-line bg-fal-surface p-5">
        <h3 className="mt-0 text-base font-extrabold text-fal-fg">Nota fiscal</h3>
        <p className="mb-0 mt-1 text-sm text-fal-muted">
          Documento fiscal ainda não disponível neste pedido.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-fal border border-fal-line bg-fal-surface p-5">
      <h3 className="mt-0 text-base font-extrabold text-fal-fg">Nota fiscal</h3>
      <p className="mt-1 mb-3 text-sm text-fal-muted">
        {doc.documentNumber ? `Nº ${doc.documentNumber}` : 'Documento anexado pela loja'}
        {doc.issuedAt ? ` · emissão ${doc.issuedAt}` : ''}
      </p>
      <button
        type="button"
        className="text-sm font-bold text-fal-navy dark:text-fal-fg underline-offset-2 hover:underline disabled:opacity-60"
        disabled={opening}
        onClick={() => void open()}
      >
        {opening ? 'Abrindo…' : 'Baixar / ver documento'}
      </button>
      {error ? (
        <p role="alert" className="mt-2 mb-0 text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  )
}
