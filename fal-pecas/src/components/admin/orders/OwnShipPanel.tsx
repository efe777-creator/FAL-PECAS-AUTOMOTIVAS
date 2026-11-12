import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { openRomaneio } from '@/lib/adminOrderPrint'
import { evaluateShipOrderGates } from '@/lib/meLabelShipGates'
import {
  evaluateOwnDeliverGates,
  nextOwnDeliveryAction,
  parseOwnDeliveryOps,
} from '@/lib/ownDeliveryOps'
import { packingCompleteFromMeta } from '@/lib/orderPacking'
import type { OrderShippingKind } from '@/lib/orderShippingKind'
import { formatDateTime } from '@/lib/datetime'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  adminOwnDeliveryAttempt,
  type AdminOrderDetail,
} from '@/services/admin/adminOrderService'
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

/** Expedição frete próprio / mock — Marcha 6 ops reais só para own. */
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
  const [attemptNote, setAttemptNote] = useState('')
  const [attemptBusy, setAttemptBusy] = useState(false)

  const isOwn = kind === 'own'
  const title = isOwn
    ? 'Frete próprio — saída, tentativa e entrega'
    : 'Expedição manual (sem Melhor Envio)'

  const packingOk = useMemo(
    () => packingCompleteFromMeta(order.shipment?.metadata ?? null),
    [order.shipment?.metadata],
  )
  const ownOps = useMemo(
    () => parseOwnDeliveryOps(order.shipment?.metadata ?? null),
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

  const deliverGates = useMemo(
    () =>
      evaluateOwnDeliverGates({
        orderStatus: order.status,
        paymentStatus: order.payment?.status ?? null,
        provider: order.shipment?.provider ?? kind,
        own: ownOps,
        orderCancelledOrRefunded:
          order.status === 'cancelado' || order.payment?.status === 'refunded',
      }),
    [order.status, order.payment?.status, order.shipment?.provider, ownOps, kind],
  )

  const next = useMemo(
    () =>
      nextOwnDeliveryAction({
        orderStatus: order.status,
        paymentStatus: order.payment?.status ?? null,
        packingComplete: packingOk,
        provider: order.shipment?.provider ?? kind,
        own: ownOps,
      }),
    [order.status, order.payment?.status, packingOk, order.shipment?.provider, kind, ownOps],
  )

  async function registerAttempt() {
    setAttemptBusy(true)
    onError(null)
    try {
      const r = await adminOwnDeliveryAttempt({
        orderId: order.id,
        note: attemptNote.trim() || null,
        outcome: 'failed',
      })
      onOk?.(`Tentativa registrada (${r.attempt_count})`)
      setAttemptNote('')
      await onReload?.()
    } catch (e) {
      onError(toUserMessage(e, 'Falha ao registrar tentativa'))
    } finally {
      setAttemptBusy(false)
    }
  }

  const showDeparture =
    isOwn && ['pronto_para_envio', 'preparando_envio'].includes(order.status)
  const showInTransit = isOwn && order.status === 'enviado'
  const showDone = order.status === 'entregue'

  return (
    <section className="space-y-4 rounded-[14px] border border-fal-line bg-white p-4">
      <div>
        <h2 className="m-0 text-lg font-extrabold text-fal-navy">{title}</h2>
        <p className="mt-1 mb-0 text-sm text-fal-muted">
          {isOwn
            ? 'Sem etiqueta Melhor Envio. Fluxo: saída → tentativa(s) opcionais → confirmação de entrega. Mock não entra aqui.'
            : 'Mock/sandbox — sem ops reais de entrega própria.'}
        </p>
        {isOwn ? (
          <p className="mt-2 mb-0 text-sm font-semibold text-fal-navy">
            Próxima ação:{' '}
            {next === 'registrar_saida'
              ? 'Registrar saída'
              : next === 'registrar_tentativa_ou_entrega'
                ? 'Tentativa ou confirmar entrega'
                : next === 'aguardar_packing_ou_pagamento'
                  ? 'Aguardar packing/pagamento'
                  : next === 'entregue'
                    ? 'Concluído'
                    : next}
          </p>
        ) : null}
        {ownOps.departure ? (
          <p className="mt-1 mb-0 text-xs text-fal-muted">
            Saída: {formatDateTime(ownOps.departure.at)}
            {ownOps.attempts.length
              ? ` · ${ownOps.attempts.length} tentativa(s)`
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

      {showDeparture ? (
        <div className="border-t border-fal-line pt-4">
          <h3 className="m-0 text-sm font-bold text-fal-navy">1. Saída (pedido → enviado)</h3>
          {!shipGates.ok ? (
            <p className="mt-2 mb-0 text-sm text-amber-800">Saída bloqueada: {shipGates.message}</p>
          ) : null}
          <div className="mt-3 grid gap-2 md:grid-cols-4">
            <Input
              label="Veículo / motorista"
              value={carrier}
              onChange={(e) => onCarrier(e.target.value)}
            />
            <Input label="Rota / serviço" value={service} onChange={(e) => onService(e.target.value)} />
            <Input
              label="Comprovante / obs."
              value={tracking}
              onChange={(e) => onTracking(e.target.value)}
            />
            <div className="flex items-end">
              <Button
                type="button"
                disabled={busy || pendingShip || !shipGates.ok}
                onClick={onRequestShip}
              >
                Registrar saída
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {showInTransit ? (
        <div className="space-y-4 border-t border-fal-line pt-4">
          <div>
            <h3 className="m-0 text-sm font-bold text-fal-navy">2. Tentativa de entrega</h3>
            <p className="mt-1 text-xs text-fal-muted">
              Ausente, recusa, reagendamento — não marca entregue. Histórico append-only.
            </p>
            <div className="mt-2 grid gap-2 md:grid-cols-3">
              <Input
                label="Nota da tentativa"
                value={attemptNote}
                onChange={(e) => setAttemptNote(e.target.value)}
              />
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="light"
                  disabled={busy || attemptBusy}
                  onClick={() => void registerAttempt()}
                >
                  Registrar tentativa
                </Button>
              </div>
            </div>
            {ownOps.attempts.length > 0 ? (
              <ul className="mb-0 mt-2 list-none space-y-1 p-0 text-xs text-fal-muted">
                {ownOps.attempts.map((a, i) => (
                  <li key={`${a.at}-${i}`}>
                    #{i + 1} {formatDateTime(a.at)}
                    {a.note ? ` — ${a.note}` : ''} ({a.outcome})
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div>
            <h3 className="m-0 text-sm font-bold text-fal-navy">3. Confirmar entrega ao cliente</h3>
            {!deliverGates.ok ? (
              <p className="mt-2 mb-0 text-sm text-amber-800">
                Entrega bloqueada: {deliverGates.message}
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

      {!isOwn && ['pronto_para_envio', 'preparando_envio'].includes(order.status) ? (
        <div className="border-t border-fal-line pt-4">
          <p className="mt-0 text-sm text-amber-800">
            Mock bloqueado para postagem/entrega real. Use frete próprio ou Melhor Envio.
          </p>
        </div>
      ) : null}
    </section>
  )
}
