import { Button } from '@/components/common/Button'
import { Loading } from '@/components/common/Loading'
import { Modal } from '@/components/common/Modal'
import { CompatibilityStateBadge } from '@/components/product/CompatibilityStateBadge'
import { useGarageOptional } from '@/contexts/GarageContext'
import { formatMoney } from '@/lib/money'
import { formatReferenciaFromProduct } from '@/lib/productLabels'
import { filterDisplayLabel } from '@/services/garage/activeGarageStorage'
import {
  listCompatibleSubstitutes,
  type CompatSubstituteCandidate,
} from '@/services/compatibility/compatSubstitutes'
import { displayPrice } from '@/services/pricing/priceResolutionService'
import type { CartItem, Product } from '@/types'
import { useEffect, useState } from 'react'

type Props = {
  open: boolean
  item: CartItem | null
  excludeCartProductIds: string[]
  onClose: () => void
  onReplace: (
    fromProductId: string,
    replacement: Product,
    quantity: number,
    fromEquivalence?: boolean,
  ) => void
}

export function ReplaceCartItemModal({
  open,
  item,
  excludeCartProductIds,
  onClose,
  onReplace,
}: Props) {
  const garage = useGarageOptional()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<CompatSubstituteCandidate[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !item) {
      setCandidates([])
      setSelectedId(null)
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    setSelectedId(null)
    void listCompatibleSubstitutes({
      excludeProductId: item.productId,
      excludeCartProductIds,
      filter: garage?.activeFilter,
      limit: 8,
    })
      .then((rows) => {
        if (cancelled) return
        setCandidates(rows)
      })
      .catch(() => {
        if (cancelled) return
        setError('Não foi possível carregar alternativas compatíveis.')
        setCandidates([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, item, excludeCartProductIds, garage?.activeFilter])

  if (!item) return null

  const selected = candidates.find((c) => c.product.id === selectedId) ?? null
  const vehicleLabel = filterDisplayLabel(garage?.activeFilter)

  return (
    <Modal open={open} title={`Substituir ${item.name}`} onClose={onClose}>
      <p className="m-0 text-sm text-fal-muted">
        Veículo: <span className="font-semibold text-fal-fg">{vehicleLabel}</span>
      </p>
      <p className="mb-0 mt-1 text-xs text-fal-muted">
        Só entram peças Compatível ou Compatível similar para o veículo ativo.
      </p>

      {loading ? (
        <div className="py-6">
          <Loading />
        </div>
      ) : null}
      {error ? <p className="mt-3 text-sm font-semibold text-fal-danger">{error}</p> : null}
      {!loading && !error && candidates.length === 0 ? (
        <p className="mt-3 text-sm text-fal-muted">
          Nenhuma alternativa Compatível/similar encontrada nesta categoria para o veículo ativo.
          Tente o catálogo filtrado.
        </p>
      ) : null}

      {!loading && candidates.length > 0 ? (
        <ul className="mt-3 max-h-[50vh] list-none space-y-2 overflow-y-auto p-0">
          {candidates.map((c) => {
            const checked = selectedId === c.product.id
            const price = displayPrice(c.product)
            return (
              <li key={c.product.id}>
                <label
                  className={[
                    'flex cursor-pointer gap-3 rounded-[10px] border px-3 py-2',
                    checked
                      ? 'border-fal-yellow bg-fal-yellow/10'
                      : 'border-fal-line bg-fal-surface hover:border-fal-yellow/40',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    className="mt-1"
                    name="compat-substitute"
                    checked={checked}
                    onChange={() => setSelectedId(c.product.id)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-fal-fg">{c.product.name}</span>
                    <span className="block text-[11px] text-fal-muted">
                      {formatReferenciaFromProduct(c.product)} · {formatMoney(price)}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                      <CompatibilityStateBadge verdict={c.verdict} variant="card" />
                      {c.fromEquivalence ? (
                        <span className="text-[10px] font-bold text-fal-muted">Equivalente</span>
                      ) : null}
                    </span>
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      ) : null}

      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="light" type="button" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          type="button"
          disabled={!selected}
          onClick={() => {
            if (!selected) return
            onReplace(
              item.productId,
              selected.product,
              item.quantity,
              selected.fromEquivalence,
            )
            onClose()
          }}
        >
          Substituir no carrinho
        </Button>
      </div>
    </Modal>
  )
}
