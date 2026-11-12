import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { openRomaneio } from '@/lib/adminOrderPrint'
import { evaluateShipOrderGates } from '@/lib/meLabelShipGates'
import { packingCompleteFromMeta } from '@/lib/orderPacking'
import type { OrderShippingKind } from '@/lib/orderShippingKind'
import type { AdminOrderDetail } from '@/services/admin/adminOrderService'
import { useMemo } from 'react'

type Props = {
  order: AdminOrderDetail
  kind: Exclude<OrderShippingKind, 'melhorenvio'>
  busy: boolean
  pendingShip: boolean
  carrier: string
  service: string
  tracking: string
  onCarrier: (v: string) => void
  onService: (v: string) => void
  onTracking: (v: string) => void
  onRequestShip: () => void
  onError: (msg: string | null) => void
}

/** Expedição sem Melhor Envio (own / mock / unknown) — CP-OWN-ME / CP-OWN-OPS. */
export function OwnShipPanel({
  order,
  kind,
  busy,
  pendingShip,
  carrier,
  service,
  tracking,
  onCarrier,
  onService,
  onTracking,
  onRequestShip,
  onError,
}: Props) {
  const title =
    kind === 'own' ? 'Frete próprio — postagem / entrega' : 'Expedição manual (sem Melhor Envio)'

  const packingOk = useMemo(
    () => packingCompleteFromMeta(order.shipment?.metadata ?? null),
    [order.shipment?.metadata],
  )
  const shipGates = useMemo(
    () =>
      evaluateShipOrderGates({
        orderStatus: order.status,
        paymentStatus: order.payment?.status ?? null,
        packingComplete: packingOk,
        provider: order.shipment?.provider ?? kind,
        labelState: 'none',
        orderCancelledOrRefunded:
          order.status === 'cancelado' || order.payment?.status === 'refunded',
      }),
    [order.status, order.payment?.status, order.shipment?.provider, packingOk, kind],
  )

  return (
    <section className="space-y-4 rounded-[14px] border border-fal-line bg-white p-4">
      <div>
        <h2 className="m-0 text-lg font-extrabold text-fal-navy">{title}</h2>
        <p className="mt-1 mb-0 text-sm text-fal-muted">
          Este pedido não usa etiqueta Melhor Envio. Registre transportadora e rastreio ao entregar
          à transportadora ou ao cliente (moto/próprio). Só esta ação marca o pedido como enviado.
        </p>
        {!shipGates.ok ? (
          <p className="mt-2 mb-0 text-sm text-amber-800">Envio bloqueado: {shipGates.message}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="light"
          disabled={busy}
          onClick={() => {
            if (!openRomaneio(order)) {
              onError('Não foi possível abrir o romaneio. Libere pop-ups para este site.')
            }
          }}
        >
          Romaneio interno
        </Button>
      </div>
      <div className="border-t border-fal-line pt-4">
        <h3 className="m-0 text-sm font-bold text-fal-navy">Registrar envio</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <Input label="Transportadora / veículo" value={carrier} onChange={(e) => onCarrier(e.target.value)} />
          <Input label="Serviço" value={service} onChange={(e) => onService(e.target.value)} />
          <Input label="Rastreio / comprovante" value={tracking} onChange={(e) => onTracking(e.target.value)} />
          <div className="flex items-end">
            <Button
              type="button"
              disabled={busy || pendingShip || !shipGates.ok}
              onClick={onRequestShip}
            >
              Registrar como enviado
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
