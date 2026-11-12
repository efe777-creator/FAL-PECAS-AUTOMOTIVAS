import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { openRomaneio } from '@/lib/adminOrderPrint'
import { evaluateShipOrderGates } from '@/lib/meLabelShipGates'
import {
  evaluateOwnDeliverGates,
  nextOwnDeliveryAction,
  parseOwnDeliveryOps,
} from '@/lib/ownDeliveryOps'
import { isOrderStorePickup, type OrderShippingKind } from '@/lib/orderShippingKind'
import { formatDateTime } from '@/lib/datetime'
import {
  adminSetShipmentTracking,
  type AdminOrderDetail,
} from '@/services/admin/adminOrderService'
import { toUserMessage } from '@/lib/toUserMessage'
import { useMemo, useState } from 'react'

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
  onRequestDeliver?: () => void
  proofRef?: string
  onProofRef?: (v: string) => void
  onReload?: () => Promise<void>
  onOk?: (msg: string) => void
  onError: (msg: string | null) => void
}

/** Frete próprio — fluxo simples: confirmar envio (+ rastreio) → confirmar entrega. */
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
  onRequestDeliver,
  proofRef = '',
  onProofRef,
  onReload,
  onOk,
  onError,
}: Props) {
  const [opsNote, setOpsNote] = useState('')
  const [trackBusy, setTrackBusy] = useState(false)

  const isOwn = kind === 'own'
  const pickup = isOrderStorePickup(order)
  // Retirada tem painel próprio (StorePickupPanel).
  if (pickup) return null
  if (!isOwn) {
    return (
      <section className="space-y-3 rounded-[14px] border border-fal-line bg-white p-4">
        <h2 className="m-0 text-lg font-extrabold text-fal-navy">Expedição manual</h2>
        <p className="mb-0 mt-1 text-sm text-fal-muted">
          Modalidade mock sem ops reais. Use frete próprio, Melhor Envio ou retirada na loja.
        </p>
      </section>
    )
  }

  const ownOps = useMemo(
    () => parseOwnDeliveryOps(order.shipment?.metadata ?? null),
    [order.shipment?.metadata],
  )

  const shipGates = useMemo(
    () =>
      evaluateShipOrderGates({
        orderStatus: order.status,
        paymentStatus: order.payment?.status ?? null,
        packingComplete: true,
        provider: order.shipment?.provider ?? 'own',
        labelState: 'none',
        orderCancelledOrRefunded:
          order.status === 'cancelado' || order.payment?.status === 'refunded',
      }),
    [order.status, order.payment?.status, order.shipment?.provider],
  )

  const deliverGates = useMemo(
    () =>
      evaluateOwnDeliverGates({
        orderStatus: order.status,
        paymentStatus: order.payment?.status ?? null,
        provider: order.shipment?.provider ?? 'own',
        own: ownOps,
        orderCancelledOrRefunded:
          order.status === 'cancelado' || order.payment?.status === 'refunded',
      }),
    [order.status, order.payment?.status, order.shipment?.provider, ownOps],
  )

  const next = useMemo(
    () =>
      nextOwnDeliveryAction({
        orderStatus: order.status,
        paymentStatus: order.payment?.status ?? null,
        packingComplete: true,
        provider: order.shipment?.provider ?? 'own',
        own: ownOps,
      }),
    [order.status, order.payment?.status, order.shipment?.provider, ownOps],
  )

  const showShip = ['pronto_para_envio', 'preparando_envio'].includes(order.status)
  const showInTransit = order.status === 'enviado'
  const showDone = order.status === 'entregue'

  async function saveTracking() {
    setTrackBusy(true)
    onError(null)
    try {
      await adminSetShipmentTracking({
        orderId: order.id,
        trackingCode: tracking.trim() || null,
        note: opsNote.trim() || null,
      })
      onOk?.('Rastreio/obs. atualizados')
      await onReload?.()
    } catch (e) {
      onError(toUserMessage(e, 'Falha ao salvar rastreio'))
    } finally {
      setTrackBusy(false)
    }
  }

  return (
    <section className="space-y-4 rounded-[14px] border border-fal-line bg-white p-4">
      <div>
        <h2 className="m-0 text-lg font-extrabold text-fal-navy">Frete próprio — envio</h2>
        <p className="mt-1 mb-0 text-sm text-fal-muted">
          Após a separação, confirme o envio (rastreio/link opcional). Depois confirme a entrega
          ao cliente. Combinar entrega ao vivo fica para uma próxima onda.
        </p>
        <p className="mt-2 mb-0 text-sm font-semibold text-fal-navy">
          Próxima ação:{' '}
          {next === 'registrar_saida'
            ? 'Confirmar envio'
            : next === 'registrar_tentativa_ou_entrega'
              ? 'Confirmar entrega'
              : next === 'aguardar_packing_ou_pagamento'
                ? 'Aguardar pagamento'
                : next === 'entregue'
                  ? 'Concluído'
                  : next}
        </p>
        {ownOps.departure ? (
          <p className="mt-1 mb-0 text-xs text-fal-muted">
            Enviado em {formatDateTime(ownOps.departure.at)}
            {order.shipment?.trackingCode
              ? ` · Rastreio: ${order.shipment.trackingCode}`
              : ''}
          </p>
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

      {showShip ? (
        <div className="border-t border-fal-line pt-4">
          <h3 className="m-0 text-sm font-bold text-fal-navy">Confirmar envio</h3>
          {!shipGates.ok ? (
            <p className="mt-2 mb-0 text-sm text-amber-800">Bloqueado: {shipGates.message}</p>
          ) : null}
          <div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-4">
            <Input
              label="Motorista / veículo (opc.)"
              value={carrier}
              onChange={(e) => onCarrier(e.target.value)}
            />
            <Input
              label="Rota / obs. (opc.)"
              value={service}
              onChange={(e) => onService(e.target.value)}
            />
            <Input
              label="Link / código de rastreio (opc.)"
              value={tracking}
              onChange={(e) => onTracking(e.target.value)}
            />
            <div className="flex items-end">
              <Button
                type="button"
                disabled={busy || pendingShip || !shipGates.ok}
                onClick={onRequestShip}
              >
                Confirmar envio
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {showInTransit ? (
        <div className="space-y-4 border-t border-fal-line pt-4">
          <div>
            <h3 className="m-0 text-sm font-bold text-fal-navy">Rastreio / obs. (pós-envio)</h3>
            <div className="mt-2 grid gap-2 md:grid-cols-3">
              <Input
                label="Link / código de rastreio"
                value={tracking}
                onChange={(e) => onTracking(e.target.value)}
              />
              <Input
                label="Observação operacional"
                value={opsNote}
                onChange={(e) => setOpsNote(e.target.value)}
              />
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="light"
                  disabled={busy || trackBusy}
                  onClick={() => void saveTracking()}
                >
                  Salvar rastreio
                </Button>
              </div>
            </div>
          </div>

          <div>
            <h3 className="m-0 text-sm font-bold text-fal-navy">Confirmar entrega</h3>
            {!deliverGates.ok ? (
              <p className="mt-2 mb-0 text-sm text-amber-800">
                Bloqueado: {deliverGates.message}
              </p>
            ) : null}
            <div className="mt-2 grid gap-2 md:grid-cols-3">
              {onProofRef ? (
                <Input
                  label="Comprovante (ref. opcional)"
                  value={proofRef}
                  onChange={(e) => onProofRef(e.target.value)}
                />
              ) : null}
              <div className="flex items-end">
                <Button
                  type="button"
                  disabled={busy || pendingShip || !deliverGates.ok || !onRequestDeliver}
                  onClick={onRequestDeliver}
                >
                  Confirmar entrega
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showDone ? (
        <p className="mb-0 text-sm font-semibold text-green-800">Entregue ao cliente.</p>
      ) : null}
    </section>
  )
}
