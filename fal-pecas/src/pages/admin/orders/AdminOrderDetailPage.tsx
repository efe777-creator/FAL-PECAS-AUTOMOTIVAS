import { AdminOrderCommandBar } from '@/components/admin/orders/AdminOrderCommandBar'
import { OrderOpsSurface } from '@/components/admin/orders/OrderOpsSurface'
import { PurchasedShippingSummary } from '@/components/admin/orders/PurchasedShippingSummary'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { adminActorBadgeLabel, adminActorKind, orderStatusOperatorLabel } from '@/lib/adminOrderOps'
import { consumeOrdersReturnPath } from '@/lib/adminOrdersNav'
import {
  contractedShippingShortLine,
  readContractedShipping,
} from '@/lib/contractedShipping'
import {
  isOrderStorePickup,
  orderShippingKind,
} from '@/lib/orderShippingKind'
import { isStorePickupAuthorized } from '@/lib/storePickupOps'
import { type AdminOrderDetail } from '@/services/admin/adminOrderService'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

/**
 * Casco full: OrderOpsSurface é a fonte do pedido (sem double-fetch).
 * CommandBar sem “Faça agora” duplicado — pendência vive só no surface.
 * Expedição/retirada: aba Logística do OrderOpsSurface (mesmo surface).
 */
export function AdminOrderDetailPage() {
  const { id = '' } = useParams()
  const [order, setOrder] = useState<AdminOrderDetail | null>(null)
  const [returnPath] = useState(() => consumeOrdersReturnPath() || '/admin/pedidos')

  useDocumentTitle(
    order ? `Pedido ${order.id.slice(0, 8)} | Admin FAL` : 'Pedido | Admin FAL',
  )

  const storePickup = order ? isOrderStorePickup(order) : false
  const shipKind = order ? orderShippingKind(order) : 'unknown'
  const actor = order
    ? adminActorKind(order.status, order.customerDecision)
    : 'team'
  const pickupAuthorized = order
    ? isStorePickupAuthorized(order.shipment?.metadata ?? null)
    : false

  const statusLabel = !order
    ? ''
      : storePickup &&
          pickupAuthorized &&
        ['pronto_para_envio', 'preparando_envio'].includes(order.status)
        ? 'Pronto para retirar'
        : (orderStatusOperatorLabel[order.status] ?? order.status)

  const modalityLabel = storePickup
    ? 'Retirada na loja'
    : shipKind === 'melhorenvio'
      ? 'Melhor Envio'
      : shipKind === 'own'
        ? 'Frete próprio'
        : ''

  const freightChoiceLabel = useMemo(() => {
    if (!order) return ''
    return contractedShippingShortLine(
      readContractedShipping(order.shipment, order.shippingAmount),
    )
  }, [order])

  return (
    <div className="space-y-4">
      {order ? (
        <>
      <AdminOrderCommandBar
        order={order}
        returnPath={returnPath}
        statusLabel={statusLabel}
        modalityLabel={modalityLabel}
        freightChoiceLabel={freightChoiceLabel}
        actorLabel={adminActorBadgeLabel(actor)}
            nextStep={null}
        separationProgress={
              order.status === 'confirmado' || order.status === 'em_separacao'
                ? `Separação em andamento`
            : null
        }
      />
      <PurchasedShippingSummary order={order} variant="banner" />
            </>
          ) : (
        <Link to={returnPath} className="text-sm font-bold text-fal-accent">
          ← Voltar
        </Link>
      )}

      <OrderOpsSurface
        orderId={id}
        density="comfortable"
        wave={1}
        hideFooter
        onOrderChange={setOrder}
      />
              </div>
            )
}
