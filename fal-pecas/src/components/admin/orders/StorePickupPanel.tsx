import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { formatDateTime } from '@/lib/datetime'
import {
  actionAuthorizeStorePickup,
  actionConfirmStorePickup,
  type OrderOpsActionRunner,
} from '@/lib/orderOpsActions'
import { isOrderStorePickup } from '@/lib/orderShippingKind'
import { isStorePickupAuthorized, parseStorePickupMeta } from '@/lib/storePickupOps'
import { toUserMessage } from '@/lib/toUserMessage'
import type { AdminOrderDetail } from '@/services/admin/adminOrderService'
import { useMemo, useState } from 'react'

type Props = {
  order: AdminOrderDetail
  busy: boolean
  onBusy: (v: boolean) => void
  onReload: () => Promise<void>
  onOk: (msg: string) => void
  onError: (msg: string) => void
  /** Runner do surface — anti-duplo (I3) e único caminho de mutate. */
  actionRunner: OrderOpsActionRunner
}

/** Pós-separação — autorizar retirada e confirmar que o cliente retirou. */
export function StorePickupPanel({
  order,
  busy,
  onBusy,
  onReload,
  onOk,
  onError,
  actionRunner,
}: Props) {
  const [proof, setProof] = useState('')
  const pickup = isOrderStorePickup(order)
  const meta = useMemo(
    () => parseStorePickupMeta(order.shipment?.metadata ?? null),
    [order.shipment?.metadata],
  )
  const authorized = isStorePickupAuthorized(order.shipment?.metadata ?? null)
  const ready = ['pronto_para_envio', 'preparando_envio'].includes(order.status)
  const canConfirm =
    authorized &&
    (ready || order.status === 'enviado') &&
    order.status !== 'entregue' &&
    order.status !== 'cancelado'

  if (!pickup) return null
  if (!['pronto_para_envio', 'preparando_envio', 'enviado', 'entregue'].includes(order.status)) {
    return null
  }

  const fb = { ok: onOk, error: onError }

  async function authorize() {
    if (busy || actionRunner.isBusy()) return
    onBusy(true)
    try {
      const ok = await actionAuthorizeStorePickup(actionRunner, order.id, fb)
      if (ok) await onReload()
    } catch (e) {
      onError(toUserMessage(e, 'Falha ao autorizar retirada'))
    } finally {
      onBusy(false)
    }
  }

  async function confirmPickup() {
    if (busy || actionRunner.isBusy()) return
    onBusy(true)
    try {
      const ok = await actionConfirmStorePickup(
        actionRunner,
        order.id,
        proof.trim() || undefined,
        fb,
      )
      if (ok) await onReload()
    } catch (e) {
      onError(toUserMessage(e, 'Falha ao confirmar retirada'))
    } finally {
      onBusy(false)
    }
  }

  return (
    <section className="space-y-3 rounded-[14px] border border-fal-line bg-fal-surface p-4">
      <div>
        <h2 className="m-0 text-lg font-extrabold text-fal-fg">Retirada na loja</h2>
        <p className="mt-1 mb-0 text-sm text-fal-muted">
          Após a separação, autorize a retirada para o cliente ver no app. Quando ele buscar,
          confirme a retirada.
        </p>
        <p
          className={`mt-2 mb-0 text-sm font-semibold ${
            order.status === 'entregue'
              ? 'text-emerald-700'
              : authorized
                ? 'text-emerald-700'
                : 'text-amber-800'
          }`}
        >
          {order.status === 'entregue'
            ? meta.pickedUpAt
              ? `Retirada feita em ${formatDateTime(meta.pickedUpAt)}.`
              : 'Retirada feita — pedido concluído.'
            : authorized
              ? `Pronto para retirar${meta.authorizedAt ? ` (autorizado em ${formatDateTime(meta.authorizedAt)})` : ''}. Use “Cliente retirou” quando buscar.`
              : 'Aguardando autorização — o cliente ainda não vê “Pronto para retirar”.'}
        </p>
      </div>

      {ready && !authorized ? (
        <Button type="button" disabled={busy} onClick={() => void authorize()}>
          Autorizar retirada
        </Button>
      ) : null}

      {authorized && order.status !== 'entregue' ? (
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Input
            label="Obs. / documento (opcional)"
            value={proof}
            disabled={busy}
            onChange={(e) => setProof(e.target.value)}
          />
          <div className="flex items-end">
            <Button type="button" disabled={busy || !canConfirm} onClick={() => void confirmPickup()}>
              Cliente retirou
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
