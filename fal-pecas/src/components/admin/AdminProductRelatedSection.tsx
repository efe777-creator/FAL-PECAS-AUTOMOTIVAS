import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { useToast } from '@/components/common/Toast'
import { productStatusLabel } from '@/lib/adminLabels'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  adminAddProductRelated,
  adminListProductRelated,
  adminRemoveProductRelated,
  adminSwapProductRelatedOrder,
  type AdminRelatedRow,
} from '@/services/admin/adminProductRelatedService'
import { adminListProducts } from '@/services/admin/adminProductService'
import { RELATED_PRODUCTS_CURATED_MAX } from '@/services/products/relatedProducts'
import { useCallback, useEffect, useState } from 'react'

type Props = {
  productId: string
}

export function AdminProductRelatedSection({ productId }: Props) {
  const toast = useToast()
  const [rows, setRows] = useState<AdminRelatedRow[]>([])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setRows(await adminListProductRelated(productId))
  }, [productId])

  useEffect(() => {
    void reload().catch((e) => setError(toUserMessage(e, 'Falha ao carregar relacionados')))
  }, [reload])

  async function handleAdd() {
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
      await adminAddProductRelated(productId, match.id)
      setQ('')
      await reload()
      toast.push(`Relacionado adicionado: ${match.commercialRef ?? match.sku}`, 'success')
    } catch (e) {
      const msg = toUserMessage(e, 'Não foi possível adicionar')
      setError(msg)
      toast.push(msg, 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove(row: AdminRelatedRow) {
    setBusy(true)
    setError(null)
    try {
      await adminRemoveProductRelated(productId, row.relatedProductId)
      await reload()
      toast.push('Relacionado removido.', 'success')
    } catch (e) {
      const msg = toUserMessage(e, 'Falha ao remover')
      setError(msg)
      toast.push(msg, 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleMove(index: number, dir: -1 | 1) {
    const other = rows[index + dir]
    const current = rows[index]
    if (!other || !current) return
    setBusy(true)
    setError(null)
    try {
      await adminSwapProductRelatedOrder(productId, current, other)
      await reload()
    } catch (e) {
      const msg = toUserMessage(e, 'Falha ao reordenar')
      setError(msg)
      toast.push(msg, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-3 rounded-[14px] border border-fal-line bg-white p-4">
      <div>
        <h2 className="m-0 font-extrabold text-fal-navy">Produtos relacionados</h2>
        <p className="mt-1 mb-0 text-sm text-fal-muted">
          Curadoria na PDP (até {RELATED_PRODUCTS_CURATED_MAX}). Se a lista estiver vazia ou incompleta,
          a loja completa com produtos da mesma categoria.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[220px] flex-1">
          <Input
            label="Código, referência ou nome"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void handleAdd()
              }
            }}
          />
        </div>
        <Button type="button" disabled={busy || !q.trim()} onClick={() => void handleAdd()}>
          Adicionar
        </Button>
      </div>

      {error ? (
        <p className="m-0 text-sm font-semibold text-fal-danger" role="alert">
          {error}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p className="m-0 text-sm text-fal-muted">
          Nenhum relacionado escolhido — a loja sugere pela mesma classificação.
        </p>
      ) : (
        <ul className="m-0 list-none space-y-1 p-0 text-sm">
          {rows.map((row, index) => (
            <li
              key={row.relatedProductId}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-fal-line py-2"
            >
              <span>
                <strong>{row.commercialRef}</strong> · {row.name}
                <span className="text-fal-muted"> · {productStatusLabel(row.status)}</span>
              </span>
              <span className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="font-semibold text-fal-navy disabled:opacity-40"
                  disabled={busy || index === 0}
                  onClick={() => void handleMove(index, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="font-semibold text-fal-navy disabled:opacity-40"
                  disabled={busy || index >= rows.length - 1}
                  onClick={() => void handleMove(index, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="font-semibold text-fal-danger"
                  disabled={busy}
                  onClick={() => void handleRemove(row)}
                >
                  Remover
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
