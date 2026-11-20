import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { useToast } from '@/components/common/Toast'
import { productStatusLabel } from '@/lib/adminLabels'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  adminAddProductEquivalence,
  adminListProductEquivalences,
  adminRemoveProductEquivalence,
  EQUIVALENCE_EVIDENCE_DEFAULT,
  type AdminEquivalenceRow,
} from '@/services/admin/adminProductEquivalenceService'
import { adminListProducts } from '@/services/admin/adminProductService'
import { useCallback, useEffect, useState } from 'react'

type Props = {
  productId: string
}

export function AdminProductEquivalenceSection({ productId }: Props) {
  const toast = useToast()
  const [rows, setRows] = useState<AdminEquivalenceRow[]>([])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setRows(await adminListProductEquivalences(productId))
  }, [productId])

  useEffect(() => {
    void reload().catch((e) => setError(toUserMessage(e, 'Falha ao carregar equivalentes')))
  }, [reload])

  async function handleLink() {
    const term = q.trim()
    if (!term) return
    setBusy(true)
    setError(null)
    try {
      const found = await adminListProducts({ q: term, limit: 8 })
      const match =
        found.find(
          (p) =>
            p.id !== productId &&
            (p.sku.toLowerCase() === term.toLowerCase() ||
              (p.commercialRef ?? '').toLowerCase() === term.toLowerCase()),
        ) ?? found.find((p) => p.id !== productId)
      if (!match) throw new Error('Nenhum produto encontrado para este código ou nome')
      await adminAddProductEquivalence(productId, match.id)
      setQ('')
      await reload()
      toast.push(`Equivalente vinculado: ${match.commercialRef ?? match.sku}`, 'success')
    } catch (e) {
      const msg = toUserMessage(e, 'Não foi possível vincular')
      setError(msg)
      toast.push(msg, 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove(row: AdminEquivalenceRow) {
    setBusy(true)
    setError(null)
    try {
      await adminRemoveProductEquivalence(productId, row.equivalentProductId)
      await reload()
      toast.push('Equivalência removida (ambos os lados).', 'success')
    } catch (e) {
      const msg = toUserMessage(e, 'Falha ao remover')
      setError(msg)
      toast.push(msg, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-3 rounded-[14px] border border-fal-line bg-fal-surface p-4">
      <div>
        <h2 className="m-0 font-extrabold text-fal-fg">Equivalentes (técnicos)</h2>
        <p className="mt-1 mb-0 text-sm text-fal-muted">
          Vínculo técnico produto↔produto, distinto dos Relacionados comerciais da PDP. Bidirecional
          automático · sem transitividade. Evidência padrão:{' '}
          <code className="text-xs">{EQUIVALENCE_EVIDENCE_DEFAULT}</code>.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[220px] flex-1">
          <Input
            label="Buscar produto (código, referência ou nome)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void handleLink()
              }
            }}
          />
        </div>
        <Button type="button" disabled={busy || !q.trim()} onClick={() => void handleLink()}>
          Vincular
        </Button>
      </div>

      {error ? (
        <p className="m-0 text-sm font-semibold text-fal-danger" role="alert">
          {error}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p className="m-0 text-sm text-fal-muted">Nenhum equivalente técnico vinculado.</p>
      ) : (
        <ul className="m-0 list-none space-y-1 p-0 text-sm">
          {rows.map((row) => (
            <li
              key={row.equivalentProductId}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-fal-line py-2"
            >
              <span>
                <strong>{row.commercialRef}</strong> · {row.name}
                <span className="text-fal-muted"> · {productStatusLabel(row.status)}</span>
                <span className="mt-0.5 block text-[11px] text-fal-muted">
                  Evidência: {row.evidence}
                </span>
              </span>
              <button
                type="button"
                className="font-semibold text-fal-danger"
                disabled={busy}
                onClick={() => void handleRemove(row)}
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
