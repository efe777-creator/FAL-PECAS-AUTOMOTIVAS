import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { openRomaneio } from '@/lib/adminOrderPrint'
import { formatMoney } from '@/lib/money'
import { evaluateShipOrderGates } from '@/lib/meLabelShipGates'
import {
  evaluateOwnDeliverGates,
  nextOwnDeliveryAction,
  parseOwnDeliveryOps,
} from '@/lib/ownDeliveryOps'
import {
  OWN_TRANSPORT_OPTIONS,
  ownTransportLabel,
  parseOwnDispatchDetails,
  type OwnTransportOption,
} from '@/lib/ownTransportOptions'
import { formatContractedDims, parseOrderPacking } from '@/lib/orderPacking'
import { isOrderStorePickup, type OrderShippingKind } from '@/lib/orderShippingKind'
import { formatDateTime } from '@/lib/datetime'
import {
  adminOwnDeliveryAttempt,
  adminSetOwnDispatchDetails,
  adminSetShipmentTracking,
  type AdminOrderDetail,
} from '@/services/admin/adminOrderService'
import { listActiveOwnTransportOptions } from '@/services/admin/adminOwnTransportProvidersService'
import { toUserMessage } from '@/lib/toUserMessage'
import { useEffect, useMemo, useState } from 'react'

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

/** Frete próprio — transporte (Uber/99/…) + custo app + rastreio → entrega. */
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
  const [transportMode, setTransportMode] = useState('')
  const [appCost, setAppCost] = useState('')
  const [trackingUrl, setTrackingUrl] = useState('')
  const [transportOptions, setTransportOptions] = useState<OwnTransportOption[]>([
    ...OWN_TRANSPORT_OPTIONS,
  ])
  const [attemptNote, setAttemptNote] = useState('')
  const [attemptBusy, setAttemptBusy] = useState(false)

  const isOwn = kind === 'own'
  const pickup = isOrderStorePickup(order)

  useEffect(() => {
    void listActiveOwnTransportOptions().then(setTransportOptions)
  }, [])

  const ownOps = useMemo(
    () => parseOwnDeliveryOps(order.shipment?.metadata ?? null),
    [order.shipment?.metadata],
  )
  const dispatch = useMemo(
    () => parseOwnDispatchDetails(order.shipment?.metadata ?? null),
    [order.shipment?.metadata],
  )

  useEffect(() => {
    if (!isOwn || pickup) return
    if (dispatch.transportMode) setTransportMode(dispatch.transportMode)
    if (dispatch.appCost != null) setAppCost(String(dispatch.appCost))
    if (dispatch.trackingUrl) setTrackingUrl(dispatch.trackingUrl)
  }, [
    isOwn,
    pickup,
    dispatch.transportMode,
    dispatch.appCost,
    dispatch.trackingUrl,
  ])

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

  const packing = useMemo(
    () => parseOrderPacking(order.shipment?.metadata ?? null),
    [order.shipment?.metadata],
  )
  const packingSummary = useMemo(() => {
    if (!packing.volumes.length) {
      return formatContractedDims(order.shipment?.metadata ?? null)
    }
    return packing.volumes
      .map(
        (v, i) =>
          `Vol ${i + 1}: ${v.lengthCm}×${v.widthCm}×${v.heightCm} cm · ${v.weightKg} kg`,
      )
      .join(' · ')
  }, [packing.volumes, order.shipment?.metadata])

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

  async function saveDispatchDetails() {
    setTrackBusy(true)
    onError(null)
    try {
      const cost = appCost.trim() ? Number(appCost) : null
      if (cost != null && (!Number.isFinite(cost) || cost < 0)) {
        throw new Error('Informe um custo de app válido (>= 0)')
      }
      await adminSetOwnDispatchDetails({
        orderId: order.id,
        transportMode: transportMode || null,
        appCost: cost,
        trackingCode: tracking.trim() || null,
        trackingUrl: trackingUrl.trim() || null,
        note: opsNote.trim() || null,
      })
      if (transportMode) onCarrier(ownTransportLabel(transportMode, transportOptions))
      onOk?.('Transporte / custo app / rastreio salvos (frete do cliente inalterado)')
      await onReload?.()
    } catch (e) {
      onError(toUserMessage(e, 'Falha ao salvar detalhes do envio'))
    } finally {
      setTrackBusy(false)
    }
  }

  async function saveTracking() {
    setTrackBusy(true)
    onError(null)
    try {
      await adminSetShipmentTracking({
        orderId: order.id,
        trackingCode: tracking.trim() || null,
        trackingUrl: trackingUrl.trim() || null,
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

  async function registerAttempt() {
    setAttemptBusy(true)
    onError(null)
    try {
      const res = await adminOwnDeliveryAttempt({
        orderId: order.id,
        note: attemptNote.trim() || null,
        outcome: 'failed',
      })
      onOk?.(`Tentativa registrada (${res.attempt_count})`)
      setAttemptNote('')
      await onReload?.()
    } catch (e) {
      onError(toUserMessage(e, 'Falha ao registrar tentativa'))
    } finally {
      setAttemptBusy(false)
    }
  }

  return (
    <section className="space-y-4 rounded-[14px] border border-fal-line bg-white p-4">
      <div>
        <h2 className="m-0 text-lg font-extrabold text-fal-navy">Frete próprio — envio</h2>
        <p className="mt-1 mb-0 text-sm text-fal-muted">
          Escolha o app/transporte, registre o custo real (só interno — frete cobrado do cliente:{' '}
          <strong>{formatMoney(order.shippingAmount)}</strong>) e confirme o envio.
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
            {dispatch.transportMode
              ? ` · ${ownTransportLabel(dispatch.transportMode, transportOptions)}`
              : ''}
            {order.shipment?.trackingCode
              ? ` · Rastreio: ${order.shipment.trackingCode}`
              : ''}
          </p>
        ) : null}
        <p className="mt-2 mb-0 text-xs text-fal-muted">
          Volumes / peso: <strong>{packingSummary}</strong>
          {packing.volumes.length ? ` (${packing.volumes.length} vol.)` : ''}
        </p>
      </div>

      <div className="rounded-[10px] border border-amber-200 bg-amber-50/50 p-3 space-y-3">
        <p className="m-0 text-xs font-bold uppercase tracking-wide text-amber-950">
          Transporte e custo interno
        </p>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          <label className="block text-xs font-medium text-fal-navy">
            App / transporte
            <select
              className="mt-1 w-full rounded-lg border border-fal-line bg-white px-2 py-2 text-sm"
              value={transportMode}
              disabled={busy || trackBusy}
              onChange={(e) => setTransportMode(e.target.value)}
            >
              <option value="">Selecione…</option>
              {transportOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <Input
            label="Custo real no app (R$)"
            value={appCost}
            onChange={(e) => setAppCost(e.target.value)}
            disabled={busy || trackBusy}
            placeholder="Ex.: 28.90"
          />
          <Input
            label="Link de rastreio / corrida"
            value={trackingUrl}
            onChange={(e) => setTrackingUrl(e.target.value)}
            disabled={busy || trackBusy}
            placeholder="https://…"
          />
          <Input
            label="Código / ref. rastreio"
            value={tracking}
            onChange={(e) => onTracking(e.target.value)}
            disabled={busy || trackBusy}
          />
          <Input
            label="Obs. operacional"
            value={opsNote}
            onChange={(e) => setOpsNote(e.target.value)}
            disabled={busy || trackBusy}
          />
          <div className="flex items-end">
            <Button
              type="button"
              variant="light"
              disabled={busy || trackBusy}
              onClick={() => void saveDispatchDetails()}
            >
              Salvar transporte / custo
            </Button>
          </div>
        </div>
        <p className="mb-0 text-xs text-amber-900">
          O valor cobrado do cliente não muda. O custo do app alimenta o financeiro interno (G8).
        </p>
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
            <h3 className="m-0 text-sm font-bold text-fal-navy">Histórico de tentativas</h3>
            {ownOps.attempts.length ? (
              <ul className="mt-2 list-none space-y-1 p-0 text-xs text-fal-muted">
                {ownOps.attempts.map((a, i) => (
                  <li key={`${a.at}-${i}`}>
                    {formatDateTime(a.at)} · {a.outcome}
                    {a.note ? ` — ${a.note}` : ''}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 mb-0 text-xs text-fal-muted">Nenhuma tentativa registrada.</p>
            )}
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <Input
                label="Nota da tentativa"
                value={attemptNote}
                onChange={(e) => setAttemptNote(e.target.value)}
                disabled={busy || attemptBusy}
              />
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

          <div>
            <h3 className="m-0 text-sm font-bold text-fal-navy">Rastreio / obs. (pós-envio)</h3>
            <div className="mt-2 grid gap-2 md:grid-cols-3">
              <Input
                label="Link / código de rastreio"
                value={tracking}
                onChange={(e) => onTracking(e.target.value)}
              />
              <Input
                label="URL de rastreio"
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
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
