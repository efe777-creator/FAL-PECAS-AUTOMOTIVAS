import { orderToneClass, type OrderTone } from '@/components/admin/orders/orderStatusTone'
import type { OrdersHubArea, OrdersHubTab } from '@/lib/adminOrdersUrl'

export type OrdersHubAreaCard = {
  id: string
  title: string
  description: string
  count: number
  tone: OrderTone
  /** Navegação canônica via setHubParams — sem Link paralelo. */
  hub: { tab: OrdersHubTab; area?: OrdersHubArea; fila?: string | null }
}

type Props = {
  cards: OrdersHubAreaCard[]
  onNavigate: (hub: OrdersHubAreaCard['hub']) => void
}

export function OrdersHubAreaCards({ cards, onNavigate }: Props) {
  return (
    <section aria-label="Áreas de trabalho">
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-fal-muted">
        Áreas de trabalho
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            className={[
              'rounded-[14px] border bg-fal-surface p-4 text-left shadow-sm transition hover:border-fal-navy',
              card.tone === 'warning'
                ? 'border-fal-yellow-dark/45'
                : card.tone === 'info'
                  ? 'border-sky-300/80'
                  : card.tone === 'navy'
                    ? 'border-fal-navy/35'
                    : card.tone === 'success'
                      ? 'border-green-300/80'
                      : 'border-fal-line',
            ].join(' ')}
            onClick={() => onNavigate(card.hub)}
          >
            <p className="m-0 text-sm font-extrabold text-fal-fg">{card.title}</p>
            <p className="mb-0 mt-2 text-3xl font-extrabold tabular-nums text-fal-fg">
              {card.count}
            </p>
            <p className="mb-0 mt-2 text-xs text-fal-muted">{card.description}</p>
            <p
              className={[
                'mb-0 mt-3 inline-flex rounded-md border px-2 py-0.5 text-[11px] font-bold',
                orderToneClass(card.tone),
              ].join(' ')}
            >
              Visualizar pedidos →
            </p>
          </button>
        ))}
      </div>
    </section>
  )
}
