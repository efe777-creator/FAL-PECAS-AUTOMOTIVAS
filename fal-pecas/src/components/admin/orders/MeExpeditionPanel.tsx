import { Button } from '@/components/common/Button'
import { confirmDialog } from '@/components/common/ConfirmDialog'
import { Input } from '@/components/common/Input'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  alreadyGenerated,
  alreadyPurchased,
  canPurchaseLabel,
  meLabelState,
  meLabelStateLabel,
  meLastErrorLabel,
  parseMeMeta,
} from '@/lib/melhorEnvioLabelState'
import { evaluateMePurchaseGates } from '@/lib/meLabelPurchaseGates'
import { evaluateShipOrderGates } from '@/lib/meLabelShipGates'
import { packingCompleteFromMeta } from '@/lib/orderPacking'
import { openRomaneio } from '@/lib/adminOrderPrint'
import { formatMoney } from '@/lib/money'
import {
  adminSetShipmentTracking,
  type AdminOrderDetail,
} from '@/services/admin/adminOrderService'
import {
  meGenerateLabel,
  mePrepareLabel,
  mePrintLabel,
  mePurchaseLabel,
  meQuoteLabel,
} from '@/services/admin/melhorEnvioAdminService'
import { resolveShippingMeEnvMode } from '@/services/shipping/carrierRegistry'
import { useMemo, useState } from 'react'

type Props = {
  order: AdminOrderDetail
  busy: boolean
  pendingShip: boolean
  carrier: string
  service: string
  tracking: string
  onCarrier: (v: string) => void
  onService: (v: string) => void
  onTracking: (v: string) => void
  onRequestShip: () => void
  onReload: () => Promise<void>
  onMessage: (msg: string | null) => void
  onError: (msg: string | null) => void
}

export function MeExpeditionPanel({
  order,
  busy,
  pendingShip,
  carrier,
  service,
  tracking,
  onCarrier,
  onService,
  onTracking,
  onRequestShip,
  onReload,
  onMessage,
  onError,
}: Props) {
  const [meBusy, setMeBusy] = useState(false)
  const [weightKg, setWeightKg] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [widthCm, setWidthCm] = useState('')
  const [lengthCm, setLengthCm] = useState('')
  const [lastQuote, setLastQuote] = useState<number | null>(null)
  const [divergenceMsg, setDivergenceMsg] = useState<string | null>(null)
  const [overrideReason, setOverrideReason] = useState('')
  const [opsNote, setOpsNote] = useState('')
  const [trackBusy, setTrackBusy] = useState(false)

  const labelState = useMemo(
    () => meLabelState(order.shipment?.metadata ?? null),
    [order.shipment?.metadata],
  )
  const me = useMemo(() => parseMeMeta(order.shipment?.metadata ?? null), [order.shipment?.metadata])
  const packingOk = useMemo(
    () => packingCompleteFromMeta(order.shipment?.metadata ?? null),
    [order.shipment?.metadata],
  )
  const purchaseGates = useMemo(
    () =>
      evaluateMePurchaseGates({
        orderStatus: order.status,
        labelState,
        paymentStatus: order.payment?.status ?? null,
        packingComplete: packingOk,
        orderCancelledOrRefunded:
          order.status === 'cancelado' || order.payment?.status === 'refunded',
      }),
    [order.status, order.payment?.status, labelState, packingOk],
  )
  const canBuy =
    canPurchaseLabel(order.status, labelState) &&
    (purchaseGates.ok || purchaseGates.alreadyPurchased)
  const shipGates = useMemo(
    () =>
      evaluateShipOrderGates({
        orderStatus: order.status,
        paymentStatus: order.payment?.status ?? null,
        packingComplete: packingOk,
        provider: order.shipment?.provider ?? 'melhorenvio',
        labelState,
        orderCancelledOrRefunded:
          order.status === 'cancelado' || order.payment?.status === 'refunded',
      }),
    [order.status, order.payment?.status, order.shipment?.provider, packingOk, labelState],
  )

  async function runMe(fn: () => Promise<{ ok: boolean; message?: string; error?: string; divergence?: { blocked: boolean; reason?: string; labelAmount?: number } | null; printUrl?: string | null }>) {
    setMeBusy(true)
    onError(null)
    onMessage(null)
    setDivergenceMsg(null)
    try {
      const r = await fn()
      if (r.divergence?.blocked) {
        setDivergenceMsg(r.divergence.reason ?? 'Divergência de frete — compra bloqueada.')
        if (r.divergence.labelAmount != null) setLastQuote(r.divergence.labelAmount)
      }
      if (!r.ok) {
        onError(r.error ?? r.message ?? 'Operação Melhor Envio falhou')
      } else {
        onMessage(r.message ?? 'Melhor Envio: operação concluída')
        if (r.printUrl) window.open(r.printUrl, '_blank', 'noopener,noreferrer')
      }
      await onReload()
    } catch (e) {
      onError(toUserMessage(e, 'Falha no Melhor Envio'))
    } finally {
      setMeBusy(false)
    }
  }

  const packageOverride =
    weightKg || heightCm || widthCm || lengthCm
      ? {
          weightKg: weightKg ? Number(weightKg) : undefined,
          heightCm: heightCm ? Number(heightCm) : undefined,
          widthCm: widthCm ? Number(widthCm) : undefined,
          lengthCm: lengthCm ? Number(lengthCm) : undefined,
        }
      : undefined

  return (
    <section className="space-y-4 rounded-[14px] border border-fal-line bg-white p-4">
      <div>
        <h2 className="m-0 text-lg font-extrabold text-fal-navy">Expedição Melhor Envio</h2>
        <p className="mt-1 mb-0 text-sm text-fal-muted">
          Após a separação: confirme medidas (pré-preenchidas da cotação) → etiqueta → despacho
          (agora ou depois) → obs/rastreio. Frete cobrado do cliente:{' '}
          <strong>{formatMoney(order.shippingAmount)}</strong>.
        </p>
        <p className="mt-2 mb-0 text-sm font-semibold text-fal-navy">
          Situação da etiqueta: {meLabelStateLabel(labelState)}
          {me.label_amount != null ? ` · etiqueta ${formatMoney(me.label_amount)}` : ''}
          {lastQuote != null && me.label_amount == null ? ` · cotado ${formatMoney(lastQuote)}` : ''}
        </p>
        {me.protocol ? (
          <p className="mt-1 mb-0 text-xs text-fal-muted">
            Protocolo: {me.protocol}
            {me.tracking ? ` · Rastreio Melhor Envio: ${me.tracking}` : ''}
          </p>
        ) : null}
        {me.last_error ? (
          <p className="mt-1 mb-0 text-xs text-red-600">
            Último erro Melhor Envio: {meLastErrorLabel(me.last_error)}
          </p>
        ) : null}
        {divergenceMsg ? (
          <p className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {divergenceMsg}
          </p>
        ) : null}
        {!purchaseGates.ok && !purchaseGates.alreadyPurchased ? (
          <p className="mt-2 rounded-md border border-fal-line bg-fal-bg/50 px-3 py-2 text-sm text-fal-navy">
            Compra bloqueada: {purchaseGates.message}
          </p>
        ) : null}
        {order.payment?.status && order.payment.status !== 'approved' ? (
          <p className="mt-1 mb-0 text-xs text-amber-800">
            Pagamento canônico: {order.payment.status} (exige approved).
          </p>
        ) : null}
      </div>

      <div>
        <h3 className="m-0 text-sm font-bold text-fal-navy">Conferência do pacote</h3>
        <p className="mt-1 text-xs text-fal-muted">
          Se o pacote real divergir da cotação, informe medidas e recote antes de comprar. Sem
          inventar dimensões vazias.
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-4">
          <Input label="Peso (kg)" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
          <Input label="Altura (cm)" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
          <Input label="Largura (cm)" value={widthCm} onChange={(e) => setWidthCm(e.target.value)} />
          <Input
            label="Comprimento (cm)"
            value={lengthCm}
            onChange={(e) => setLengthCm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="light"
          disabled={busy || meBusy}
          onClick={() => void runMe(() => meQuoteLabel(order.id, packageOverride))}
        >
          Cotar etiqueta
        </Button>
        <Button
          type="button"
          variant="light"
          disabled={busy || meBusy || alreadyPurchased(labelState)}
          onClick={() => void runMe(() => mePrepareLabel(order.id))}
        >
          Preparar carrinho Melhor Envio
        </Button>
        {divergenceMsg ? (
          <div className="w-full max-w-xl">
            <Input
              label="Justificativa de override (divergência frete)"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              disabled={busy || meBusy}
            />
          </div>
        ) : null}
        <Button
          type="button"
          disabled={busy || meBusy || !canBuy}
          onClick={() => {
            void confirmDialog({
              title: 'Comprar etiqueta?',
              message:
                resolveShippingMeEnvMode() === 'live'
                  ? 'Confirmar compra da etiqueta no Melhor Envio (produção)?\n\nIsto NÃO marca o pedido como enviado.'
                  : 'Confirmar compra da etiqueta no Melhor Envio (ambiente de testes)?\n\nIsto NÃO marca o pedido como enviado.',
              confirmLabel: 'Comprar etiqueta',
            })
              .then(({ confirmed }) => {
                if (!confirmed) return
                const ov =
                  divergenceMsg && overrideReason.trim()
                    ? ({ confirm: true as const, reason: overrideReason.trim() })
                    : null
                return runMe(() => mePurchaseLabel(order.id, true, ov))
              })
              .catch((e) => onError(toUserMessage(e, 'Falha ao comprar etiqueta')))
          }}
        >
          Comprar etiqueta
        </Button>
        <Button
          type="button"
          variant="light"
          disabled={busy || meBusy || !alreadyPurchased(labelState) || alreadyGenerated(labelState)}
          onClick={() => {
            void (async () => {
              await runMe(() => meGenerateLabel(order.id))
              if (!shipGates.ok) return
              const { confirmed } = await confirmDialog({
                title: 'Marcar pedido como despachado?',
                message:
                  'Etiqueta gerada. Deseja registrar a entrega à transportadora agora? (pode fazer depois e informar o rastreio)',
                confirmLabel: 'Sim, despachar',
                cancelLabel: 'Agora não',
              })
              if (confirmed) onRequestShip()
            })()
          }}
        >
          Gerar etiqueta
        </Button>
        <Button
          type="button"
          variant="light"
          disabled={busy || meBusy || !alreadyGenerated(labelState)}
          onClick={() => void runMe(() => mePrintLabel(order.id))}
        >
          Imprimir etiqueta
        </Button>
        <Button type="button" variant="light" disabled={busy || meBusy} onClick={() => {
            if (!openRomaneio(order)) {
              onError('Não foi possível abrir o romaneio. Libere pop-ups para este site.')
            }
          }}>
          Romaneio interno
        </Button>
      </div>

      {['pronto_para_envio', 'preparando_envio'].includes(order.status) ? (
        <div className="border-t border-fal-line pt-4">
          <h3 className="m-0 text-sm font-bold text-fal-navy">
            Despacho (pode ser agora ou depois)
          </h3>
          <p className="mt-1 text-xs text-fal-muted">
            Etiqueta comprada/impressa <strong>não</strong> marca o pedido como enviado. Só o
            despacho muda o status — o cliente então vê “Enviado”.
          </p>
          {!shipGates.ok ? (
            <p className="mt-2 mb-0 text-sm text-amber-800">
              Despacho bloqueado: {shipGates.message}
            </p>
          ) : null}
          <div className="mt-3 grid gap-2 md:grid-cols-4">
            <Input
              label="Transportadora"
              value={carrier}
              onChange={(e) => onCarrier(e.target.value)}
            />
            <Input label="Serviço" value={service} onChange={(e) => onService(e.target.value)} />
            <Input label="Rastreio" value={tracking} onChange={(e) => onTracking(e.target.value)} />
            <div className="flex items-end">
              <Button
                type="button"
                disabled={busy || pendingShip || meBusy || !shipGates.ok}
                onClick={onRequestShip}
              >
                Confirmar despacho
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {order.status === 'enviado' || order.status === 'entregue' ? (
        <div className="border-t border-fal-line pt-4">
          <h3 className="m-0 text-sm font-bold text-fal-navy">Obs. e rastreio (pós-despacho)</h3>
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
                disabled={busy || trackBusy || order.status === 'entregue'}
                onClick={() => {
                  void (async () => {
                    setTrackBusy(true)
                    onError(null)
                    try {
                      await adminSetShipmentTracking({
                        orderId: order.id,
                        trackingCode: tracking.trim() || null,
                        note: opsNote.trim() || null,
                      })
                      onMessage('Rastreio/obs. atualizados')
                      await onReload()
                    } catch (e) {
                      onError(toUserMessage(e, 'Falha ao salvar rastreio'))
                    } finally {
                      setTrackBusy(false)
                    }
                  })()
                }}
              >
                Salvar rastreio
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
