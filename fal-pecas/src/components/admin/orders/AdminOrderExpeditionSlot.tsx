/**
 * Seções de expedição / packing / frete (onda 2 no registry).
 * Montadas no casco full via renderAfterWave1 até a onda 2 plugar no surface.
 */
import { ContractedFreightSnapshotPanel } from '@/components/admin/orders/ContractedFreightSnapshotPanel'
import { FreightFinancePanel } from '@/components/admin/orders/FreightFinancePanel'
import { MeExpeditionPanel } from '@/components/admin/orders/MeExpeditionPanel'
import { OrderOccurrencesPanel } from '@/components/admin/orders/OrderOccurrencesPanel'
import { OrderPackingPanel } from '@/components/admin/orders/OrderPackingPanel'
import { OwnShipPanel } from '@/components/admin/orders/OwnShipPanel'
import { StorePickupPanel } from '@/components/admin/orders/StorePickupPanel'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import type { OrderOpsActionRunner } from '@/lib/orderOpsActions'
import { meLabelState, meLabelStateLabel } from '@/lib/melhorEnvioLabelState'
import {
  isOrderStorePickup,
  orderShippingKind,
  orderUsesMelhorEnvio,
} from '@/lib/orderShippingKind'
import {
  adminDeliverOrder,
  adminShipOrder,
  type AdminOrderDetail,
} from '@/services/admin/adminOrderService'
import { toUserMessage } from '@/lib/toUserMessage'
import { useEffect, useState } from 'react'

type Props = {
  order: AdminOrderDetail
  busy: boolean
  reload: () => Promise<void>
  pushOk: (m: string) => void
  pushError: (m: string) => void
  onBusy?: (v: boolean) => void
  actionRunner: OrderOpsActionRunner
}

export function AdminOrderExpeditionSlot({
  order,
  busy,
  reload,
  pushOk,
  pushError,
  onBusy,
  actionRunner,
}: Props) {
  const [carrier, setCarrier] = useState('')
  const [service, setService] = useState('')
  const [tracking, setTracking] = useState('')
  const [trackingUrl, setTrackingUrl] = useState('')
  const [proofRef, setProofRef] = useState('')
  const [pendingShip, setPendingShip] = useState(false)
  const [localBusy, setLocalBusy] = useState(false)

  const storePickup = isOrderStorePickup(order)
  const shipKind = orderShippingKind(order)
  const effectiveBusy = busy || localBusy || pendingShip

  useEffect(() => {
    const meRaw = order.shipment?.metadata?.me
    const me =
      meRaw && typeof meRaw === 'object'
        ? (meRaw as {
            company_name?: string
            tracking?: string
            tracking_url?: string
          })
        : null
    setCarrier((prev) => prev || order.shipment?.carrier || me?.company_name || '')
    setService((prev) => prev || order.shipment?.service || '')
    setTracking((prev) => prev || order.shipment?.trackingCode || me?.tracking || '')
    setTrackingUrl((prev) => prev || order.shipment?.trackingUrl || me?.tracking_url || '')
  }, [order])

  function setBusyBoth(v: boolean) {
    setLocalBusy(v)
    onBusy?.(v)
  }

  async function runShip() {
    setPendingShip(true)
    setBusyBoth(true)
    try {
      await adminShipOrder({
        orderId: order.id,
        carrier: carrier || undefined,
        service: service || undefined,
        trackingCode: tracking || undefined,
        trackingUrl: trackingUrl || undefined,
      })
      pushOk('Pedido expedido')
      await reload()
    } catch (e) {
      pushError(toUserMessage(e, 'Falha na expedição'))
    } finally {
      setPendingShip(false)
      setBusyBoth(false)
    }
  }

  async function runDeliver() {
    setBusyBoth(true)
    try {
      await adminDeliverOrder(order.id, proofRef || undefined)
      pushOk('Pedido entregue')
      await reload()
    } catch (e) {
      pushError(toUserMessage(e, 'Falha na entrega'))
    } finally {
      setBusyBoth(false)
    }
  }

  return (
    <div className="space-y-4" data-order-ops-block="expedition-wave2-slot">
      <p className="m-0 text-xs font-bold uppercase tracking-wide text-fal-muted">
        Expedição · volumes · frete (mesmo surface — slot onda 2)
      </p>

      {storePickup &&
      ['pronto_para_envio', 'preparando_envio', 'enviado', 'entregue'].includes(
        order.status,
      ) ? (
        <div id="ops-expedicao" className="scroll-mt-20 rounded-[14px] ring-1 ring-fal-navy/15">
          <StorePickupPanel
            order={order}
            busy={effectiveBusy}
            onBusy={setBusyBoth}
            onReload={reload}
            onOk={pushOk}
            onError={pushError}
            actionRunner={actionRunner}
          />
        </div>
      ) : null}

      {!storePickup &&
      (order.status === 'pronto_para_envio' ||
        order.status === 'preparando_envio' ||
        ((shipKind === 'own' || orderUsesMelhorEnvio(order)) &&
          (order.status === 'enviado' || order.status === 'entregue'))) ? (
        <div id="ops-expedicao" className="scroll-mt-20 space-y-4">
          {orderUsesMelhorEnvio(order) ? (
            <>
              <div id="ops-volumes" className="scroll-mt-20">
                <OrderPackingPanel
                  order={order}
                  busy={effectiveBusy}
                  onBusy={setBusyBoth}
                  onReload={reload}
                  onOk={pushOk}
                  onError={pushError}
                />
              </div>
              <ContractedFreightSnapshotPanel order={order} />
              <div className="rounded-[14px] ring-1 ring-fal-navy/15">
                <MeExpeditionPanel
                  order={order}
                  busy={effectiveBusy}
                  pendingShip={pendingShip}
                  carrier={carrier}
                  service={service}
                  tracking={tracking}
                  trackingUrl={trackingUrl}
                  onCarrier={setCarrier}
                  onService={setService}
                  onTracking={setTracking}
                  onTrackingUrl={setTrackingUrl}
                  onRequestShip={() => void runShip()}
                  onReload={() => void reload()}
                  onMessage={(m) => {
                    if (m) pushOk(m)
                  }}
                  onError={(m) => {
                    if (m) pushError(m)
                  }}
                />
              </div>
            </>
          ) : (
            <>
              <ContractedFreightSnapshotPanel order={order} />
              <div className="rounded-[14px] ring-1 ring-fal-navy/15">
                <OwnShipPanel
                  order={order}
                  kind={shipKind === 'own' ? 'own' : 'mock'}
                  busy={effectiveBusy}
                  pendingShip={pendingShip}
                  carrier={carrier}
                  service={service}
                  tracking={tracking}
                  onCarrier={setCarrier}
                  onService={setService}
                  onTracking={setTracking}
                  onRequestShip={() => void runShip()}
                  onRequestDeliver={() => void runDeliver()}
                  proofRef={proofRef}
                  onProofRef={setProofRef}
                  onReload={() => void reload()}
                  onOk={pushOk}
                  onError={(m) => {
                    if (m) pushError(m)
                  }}
                />
              </div>
              {['confirmado', 'em_separacao', 'pronto_para_envio', 'preparando_envio'].includes(
                order.status,
              ) ? (
                <details className="rounded-[14px] border border-fal-line bg-fal-surface" open>
                  <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-fal-muted [&::-webkit-details-marker]:hidden">
                    Volumes / medidas (own)
                  </summary>
                  <div id="ops-volumes" className="border-t border-fal-line p-0">
                    <OrderPackingPanel
                      order={order}
                      busy={effectiveBusy}
                      onBusy={setBusyBoth}
                      onReload={reload}
                      onOk={pushOk}
                      onError={pushError}
                    />
                  </div>
                </details>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {storePickup &&
      ['confirmado', 'em_separacao', 'pronto_para_envio', 'preparando_envio', 'enviado', 'entregue'].includes(
        order.status,
      ) ? (
        <details className="rounded-[14px] border border-fal-line bg-fal-surface">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-fal-muted [&::-webkit-details-marker]:hidden">
            Volumes (opcional na retirada)
          </summary>
          <div id="ops-volumes" className="border-t border-fal-line">
            <OrderPackingPanel
              order={order}
              busy={effectiveBusy}
              onBusy={setBusyBoth}
              onReload={reload}
              onOk={pushOk}
              onError={pushError}
            />
          </div>
        </details>
      ) : null}

      {['confirmado', 'em_separacao'].includes(order.status) &&
      !storePickup &&
      shipKind === 'melhorenvio' ? (
        <>
          <ContractedFreightSnapshotPanel order={order} />
          <div id="ops-volumes" className="scroll-mt-20">
            <OrderPackingPanel
              order={order}
              busy={effectiveBusy}
              onBusy={setBusyBoth}
              onReload={reload}
              onOk={pushOk}
              onError={pushError}
            />
          </div>
        </>
      ) : null}

      <details className="rounded-[14px] border border-fal-line bg-fal-surface">
        <summary className="cursor-pointer list-none px-4 py-3 font-extrabold text-fal-fg [&::-webkit-details-marker]:hidden">
          Financeiro do frete · ocorrências
        </summary>
        <div className="space-y-4 border-t border-fal-line p-4">
          <FreightFinancePanel
            order={order}
            busy={effectiveBusy}
            onBusy={setBusyBoth}
            onReload={reload}
            onOk={pushOk}
            onError={pushError}
          />
          <OrderOccurrencesPanel
            order={order}
            busy={effectiveBusy}
            onBusy={setBusyBoth}
            onReload={reload}
            onOk={pushOk}
            onError={pushError}
          />
        </div>
      </details>

      {!storePickup &&
      orderUsesMelhorEnvio(order) &&
      (order.status === 'enviado' || order.status === 'entregue') ? (
        <section className="rounded-[14px] border border-fal-navy/30 bg-fal-surface p-4 ring-1 ring-fal-navy/10">
          <h2 className="m-0 text-lg font-extrabold text-fal-fg">Entrega ao cliente</h2>
          <p className="mt-1 text-sm text-fal-muted">
            Etiqueta: {meLabelStateLabel(meLabelState(order.shipment?.metadata ?? null))}
            {order.shipment?.trackingCode ? ` · Rastreio: ${order.shipment.trackingCode}` : ''}
          </p>
          {order.status === 'enviado' ? (
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              <Input
                label="Comprovante (ref. opcional)"
                value={proofRef}
                onChange={(e) => setProofRef(e.target.value)}
              />
              <div className="flex items-end">
                <Button
                  type="button"
                  disabled={effectiveBusy}
                  onClick={() => void runDeliver()}
                >
                  Confirmar entrega ao cliente
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-2 mb-0 text-sm font-semibold text-green-800">Entregue ao cliente.</p>
          )}
        </section>
      ) : null}
    </div>
  )
}
