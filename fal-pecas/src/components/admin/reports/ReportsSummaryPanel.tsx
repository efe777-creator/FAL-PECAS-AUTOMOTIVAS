import { formatMoney } from '@/lib/money'
import { orderStatusAdminLabel } from '@/lib/orderLifecycle'
import { Link } from 'react-router-dom'

type Totals = {
  ordersTotal: number
  ordersOpen: number
  ordersDelivered: number
  ordersCancelled?: number
  revenueDelivered: number
}

type Props = {
  totals: Totals
  counts?: Record<string, number>
  focus?: 'open' | 'delivered' | 'gmv' | 'series-gmv' | 'series-cash' | null
  /** Série já formatada (opcional — Painel). */
  seriesHint?: string | null
}

/** Totais F8 — compartilhado Relatórios + split do Painel. */
export function ReportsSummaryPanel({
  totals,
  counts,
  focus,
  seriesHint,
}: Props) {
  const statusKeys = counts ? Object.keys(counts).sort() : []

  return (
    <div className="space-y-4">
      <p className="m-0 text-sm text-fal-muted">
        Totais operacionais (F8). A série diária detalhada também aparece nos widgets do
        Painel.
        {seriesHint ? ` ${seriesHint}` : null}
      </p>

      <section className="grid gap-2 sm:grid-cols-2">
        <Stat
          title="Pedidos"
          value={String(totals.ordersTotal)}
          highlight={false}
        />
        <Stat
          title="Em aberto"
          value={String(totals.ordersOpen)}
          highlight={focus === 'open'}
        />
        <Stat
          title="Entregues"
          value={String(totals.ordersDelivered)}
          highlight={focus === 'delivered'}
        />
        <Stat
          title="Receita entregue"
          value={formatMoney(totals.revenueDelivered)}
          highlight={focus === 'gmv' || focus === 'series-gmv'}
        />
      </section>

      {statusKeys.length > 0 ? (
        <section className="rounded-[14px] border border-fal-line bg-fal-surface p-3">
          <h2 className="mt-0 text-sm font-bold uppercase text-fal-muted">
            Pedidos por status
          </h2>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {statusKeys.slice(0, 12).map((k) => (
              <Link
                key={k}
                to={`/admin/pedidos/lista?status=${k}`}
                className="rounded-[12px] border border-fal-line bg-fal-bg px-3 py-2 hover:border-fal-accent"
              >
                <div className="text-xs text-fal-muted">
                  {orderStatusAdminLabel[k] ?? k}
                </div>
                <div className="text-lg font-extrabold text-fal-fg">
                  {counts?.[k] ?? 0}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

function Stat({
  title,
  value,
  highlight,
}: {
  title: string
  value: string
  highlight: boolean
}) {
  return (
    <div
      className={[
        'rounded-[12px] border px-3 py-2',
        highlight
          ? 'border-fal-accent bg-fal-accent/10'
          : 'border-fal-line bg-fal-surface',
      ].join(' ')}
    >
      <p className="m-0 text-[11px] font-semibold uppercase text-fal-muted">{title}</p>
      <p className="m-0 mt-1 text-lg font-extrabold tabular-nums text-fal-fg">{value}</p>
    </div>
  )
}
