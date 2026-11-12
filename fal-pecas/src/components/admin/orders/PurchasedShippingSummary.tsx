import { formatMoney } from '@/lib/money'
import {
  readContractedShipping,
  type ContractedShippingInfo,
} from '@/lib/contractedShipping'
import type { AdminOrderDetail } from '@/services/admin/adminOrderService'
import { useMemo } from 'react'

type Props = {
  order: AdminOrderDetail
  /** compact = faixa no topo; card = bloco completo */
  variant?: 'banner' | 'card'
}

function Body({ info, shippingAmount }: { info: ContractedShippingInfo; shippingAmount: number }) {
  const amount = info.chargedAmount ?? shippingAmount
  return (
    <dl className="m-0 grid gap-2 sm:grid-cols-3">
      <div>
        <dt className="m-0 text-[11px] font-bold uppercase tracking-wide text-fal-navy/60">
          Modalidade / serviço
        </dt>
        <dd className="mb-0 mt-0.5 text-base font-extrabold text-fal-navy">{info.label}</dd>
        {info.modality !== info.label ? (
          <p className="mb-0 mt-0.5 text-xs text-fal-muted">{info.modality}</p>
        ) : null}
      </div>
      <div>
        <dt className="m-0 text-[11px] font-bold uppercase tracking-wide text-fal-navy/60">
          Prazo comprado
        </dt>
        <dd className="mb-0 mt-0.5 text-base font-extrabold text-fal-navy">
          {info.etaLabel ?? 'Prazo não gravado no snapshot'}
        </dd>
        <p className="mb-0 mt-0.5 text-xs text-fal-muted">
          {info.pickup
            ? 'Cliente escolheu retirar na loja'
            : 'Promessa de entrega no checkout (dias úteis)'}
        </p>
      </div>
      <div>
        <dt className="m-0 text-[11px] font-bold uppercase tracking-wide text-fal-navy/60">
          Frete cobrado
        </dt>
        <dd className="mb-0 mt-0.5 text-base font-extrabold text-fal-navy">
          {formatMoney(amount)}
        </dd>
        <p className="mb-0 mt-0.5 text-xs text-fal-muted">Valor pago — não altera na operação</p>
      </div>
    </dl>
  )
}

/** Destaque do frete/prazo que o cliente efetivamente comprou no checkout. */
export function PurchasedShippingSummary({ order, variant = 'banner' }: Props) {
  const info = useMemo(
    () => readContractedShipping(order.shipment, order.shippingAmount),
    [order.shipment, order.shippingAmount],
  )
  if (!info) return null

  if (variant === 'card') {
    return (
      <section className="rounded-[14px] border border-fal-navy/20 bg-white p-4 shadow-sm">
        <h2 className="m-0 text-lg font-extrabold text-fal-navy">Frete e prazo da compra</h2>
        <p className="mt-1 mb-3 text-sm text-fal-muted">
          Escolha congelada no checkout. Use isto como referência operacional — não a cotação
          interna posterior.
        </p>
        <Body info={info} shippingAmount={order.shippingAmount} />
      </section>
    )
  }

  return (
    <section
      className="rounded-[14px] border-2 border-fal-navy/15 bg-[#f4f7fb] px-4 py-3"
      aria-label="Frete e prazo comprados pelo cliente"
    >
      <p className="m-0 text-[11px] font-bold uppercase tracking-wide text-fal-navy/70">
        Frete e prazo que o cliente comprou
      </p>
      <div className="mt-2">
        <Body info={info} shippingAmount={order.shippingAmount} />
      </div>
    </section>
  )
}
