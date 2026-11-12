import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import {
  FREIGHT_COST_SOURCE_LABEL,
  isG8FreightFinanceComplete,
  parseFreightFinance,
} from '@/lib/freightFinance'
import { formatMoney } from '@/lib/money'
import { orderShippingKind } from '@/lib/orderShippingKind'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  adminSetShipmentFreightCost,
  type AdminOrderDetail,
} from '@/services/admin/adminOrderService'
import { useMemo, useState } from 'react'

type Props = {
  order: AdminOrderDetail
  busy: boolean
  onBusy: (v: boolean) => void
  onReload: () => Promise<void>
  onOk: (msg: string) => void
  onError: (msg: string) => void
}

/** Marcha 8 / G8 — frete cobrado vs custo efetivo. */
export function FreightFinancePanel({
  order,
  busy,
  onBusy,
  onReload,
  onOk,
  onError,
}: Props) {
  const kind = orderShippingKind(order)
  const finance = useMemo(
    () => parseFreightFinance(order.shipment?.metadata ?? null),
    [order.shipment?.metadata],
  )
  const g8 = isG8FreightFinanceComplete(finance)
  const [cost, setCost] = useState(
    finance?.effectiveCost != null ? String(finance.effectiveCost) : '',
  )
  const [note, setNote] = useState('')

  async function save() {
    const n = Number(cost)
    if (!Number.isFinite(n) || n < 0) {
      onError('Informe o custo efetivo (≥ 0).')
      return
    }
    onBusy(true)
    try {
      await adminSetShipmentFreightCost({
        orderId: order.id,
        effectiveCost: n,
        costSource: kind === 'own' ? 'own_ops' : kind === 'melhorenvio' ? 'me_label' : 'manual',
        note: note.trim() || null,
      })
      onOk('Custo de frete registrado (G8)')
      await onReload()
    } catch (e) {
      onError(toUserMessage(e, 'Falha ao salvar custo de frete'))
    } finally {
      onBusy(false)
    }
  }

  return (
    <section className="space-y-3 rounded-[14px] border border-fal-line bg-white p-4">
      <div>
        <h2 className="m-0 text-lg font-extrabold text-fal-navy">Frete — cobrado vs custo (G8)</h2>
        <p className="mt-1 mb-0 text-sm text-fal-muted">
          Cobrado do cliente vs custo efetivo do caminho (etiqueta ME ou entrega própria).
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3 text-sm">
        <div>
          <span className="text-fal-muted">Cobrado</span>
          <p className="m-0 font-bold text-fal-navy">{formatMoney(order.shippingAmount)}</p>
        </div>
        <div>
          <span className="text-fal-muted">Custo efetivo</span>
          <p className="m-0 font-bold text-fal-navy">
            {finance?.effectiveCost != null ? formatMoney(finance.effectiveCost) : '—'}
          </p>
        </div>
        <div>
          <span className="text-fal-muted">Delta (cobrado − custo)</span>
          <p className="m-0 font-bold text-fal-navy">
            {finance?.delta != null ? formatMoney(finance.delta) : '—'}
          </p>
        </div>
      </div>

      <p
        className={`m-0 text-sm font-semibold ${g8 ? 'text-emerald-700' : 'text-amber-800'}`}
      >
        G8: {g8 ? 'completo' : 'incompleto'}
        {finance?.costSource
          ? ` · ${FREIGHT_COST_SOURCE_LABEL[finance.costSource]}`
          : ''}
      </p>

      {kind !== 'mock' ? (
        <div className="grid gap-2 sm:grid-cols-3">
          <Input
            label="Custo efetivo (R$)"
            type="number"
            min={0}
            step={0.01}
            value={cost}
            disabled={busy}
            onChange={(e) => setCost(e.target.value)}
          />
          <Input
            label="Nota"
            value={note}
            disabled={busy}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex items-end">
            <Button type="button" disabled={busy} onClick={() => void save()}>
              Salvar custo
            </Button>
          </div>
        </div>
      ) : (
        <p className="mb-0 text-sm text-amber-800">Mock não entra no G8 de produção.</p>
      )}
    </section>
  )
}
