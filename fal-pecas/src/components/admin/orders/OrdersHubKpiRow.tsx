import type { OrderTone } from '@/components/admin/orders/orderStatusTone'

export type OrdersHubKpi = {
  id: string
  label: string
  value: number | string
  tone: OrderTone
}

type Props = {
  items: OrdersHubKpi[]
  onSelect?: (id: string) => void
}

function borderForTone(tone: OrderTone): string {
  switch (tone) {
    case 'warning':
      return 'border-fal-yellow-dark/40'
    case 'success':
      return 'border-green-300/80'
    case 'danger':
      return 'border-red-300/80'
    case 'info':
      return 'border-sky-300/80'
    case 'navy':
      return 'border-fal-navy/35'
    default:
      return 'border-fal-line'
  }
}

export function OrdersHubKpiRow({ items, onSelect }: Props) {
  return (
    <section
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      aria-label="Indicadores operacionais"
    >
      {items.map((item) => {
        const interactive = Boolean(onSelect)
        const className = [
          'rounded-[14px] border bg-fal-surface px-4 py-3 text-left shadow-sm',
          borderForTone(item.tone),
          interactive ? 'transition hover:border-fal-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fal-navy' : '',
        ].join(' ')

        if (interactive) {
          return (
            <button
              key={item.id}
              type="button"
              className={className}
              onClick={() => onSelect?.(item.id)}
            >
              <p className="m-0 text-[11px] font-bold uppercase tracking-wide text-fal-muted">
                {item.label}
              </p>
              <p className="mb-0 mt-2 text-3xl font-extrabold tabular-nums tracking-tight text-fal-fg">
                {item.value}
              </p>
            </button>
          )
        }

        return (
          <div key={item.id} className={className}>
            <p className="m-0 text-[11px] font-bold uppercase tracking-wide text-fal-muted">
              {item.label}
            </p>
            <p className="mb-0 mt-2 text-3xl font-extrabold tabular-nums tracking-tight text-fal-fg">
              {item.value}
            </p>
          </div>
        )
      })}
    </section>
  )
}
