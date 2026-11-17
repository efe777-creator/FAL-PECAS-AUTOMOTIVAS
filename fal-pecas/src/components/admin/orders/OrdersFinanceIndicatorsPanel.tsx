import { formatMoney } from '@/lib/money'
import type { AdminCentralIndicators } from '@/services/admin/adminOrderService'
import { Link } from 'react-router-dom'

type Props = {
  indicators: AdminCentralIndicators
  /** Link opcional para lista avançada (Hub). */
  showListaLink?: boolean
}

/** Indicadores financeiros da Central — compartilhado Hub + split do Painel. */
export function OrdersFinanceIndicatorsPanel({
  indicators,
  showListaLink = true,
}: Props) {
  const cells = [
    ['Capturado', indicators.financial.captured],
    ['Devolvido', indicators.financial.refunded],
    ['Recebido líquido', indicators.financial.netReceived],
    ['Bruto vendido', indicators.financial.grossSold],
    ['Valor cancelados', indicators.financial.cancelledAmount],
    ['Pag. pendente', indicators.financial.pendingPayment],
  ] as const

  return (
    <section className="space-y-3" aria-label="Financeiro">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {cells.map(([label, value]) => (
          <div
            key={label}
            className="rounded-[12px] border border-fal-line bg-fal-surface px-3 py-2"
          >
            <p className="m-0 text-[11px] font-semibold uppercase text-fal-muted">{label}</p>
            <p className="m-0 mt-1 text-base font-extrabold tabular-nums">
              {formatMoney(value)}
            </p>
          </div>
        ))}
      </div>
      {showListaLink ? (
        <Link to="/admin/pedidos/lista" className="text-sm font-semibold text-fal-accent">
          Ver pedidos na lista avançada →
        </Link>
      ) : null}
    </section>
  )
}
