import { EmptyState } from '@/components/common/EmptyState'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  collapsePurchaseEventsForHistory,
  listVehiclePartEvents,
  type CollapsedPurchaseRow,
} from '@/services/garage/vehiclePartEventService'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

/**
 * Histórico do veículo (fundação 2026-11-21): só peças compradas na FAL (G7 colapsado).
 * Sem vehicle_events / form manutenção / km.
 */
export function VehicleIdentityTimeline({
  membershipId,
  vehicleIdentityId: _vehicleIdentityId,
}: {
  membershipId: string
  /** Mantido por compatibilidade da página; listagem usa membership G7. */
  vehicleIdentityId: string
}) {
  const toast = useToast()
  const [items, setItems] = useState<CollapsedPurchaseRow[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const events = await listVehiclePartEvents(membershipId)
      setItems(collapsePurchaseEventsForHistory(events))
    } catch (e) {
      toast.push(toUserMessage(e, 'Erro ao carregar compras'), 'error')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [membershipId, toast])

  useEffect(() => {
    void reload()
  }, [reload])

  const pecasHref = `/conta/veiculos/${membershipId}?modulo=pecas`

  return (
    <div className="space-y-4">
      <div>
        <h3 className="m-0 text-base font-extrabold text-fal-fg">Peças compradas</h3>
        <p className="mt-1 mb-0 text-sm text-fal-muted">
          Peças que você comprou na FAL vinculadas a este veículo. Diferente de Peças (o que
          cabe no carro).
        </p>
      </div>

      {loading ? (
        <Loading label="Carregando compras…" />
      ) : !items.length ? (
        <EmptyState
          title="Nenhuma peça comprada ainda"
          description="Quando você comprar peças para este carro na FAL, elas aparecem aqui."
          actionLabel="Ver peças que cabem"
          actionTo={pecasHref}
        />
      ) : (
        <ol className="m-0 list-none space-y-3 p-0">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-fal border border-fal-line bg-fal-bg/40 px-3 py-2"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-extrabold text-fal-fg">{item.productLabel}</span>
                <time className="text-xs text-fal-muted" dateTime={item.occurredAt}>
                  {formatWhen(item.occurredAt)}
                </time>
              </div>
              <p className="m-0 mt-1 text-xs font-semibold text-fal-muted">Compra na FAL</p>
              {item.orderId ? (
                <Link
                  to={`/conta/pedidos/${item.orderId}`}
                  className="mt-2 inline-block text-xs font-semibold text-fal-accent underline-offset-2 hover:underline"
                >
                  Ver pedido
                </Link>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
