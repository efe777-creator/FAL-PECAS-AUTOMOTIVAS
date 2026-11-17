import { Link } from 'react-router-dom'

export type AdminTabItem = {
  id: string
  label: string
  /** Contagem opcional exibida no label. */
  count?: number | string
  subtitle?: string
  to?: string
  onSelect?: () => void
}

type Variant = 'bar' | 'card'

type Props = {
  items: AdminTabItem[]
  activeId: string
  'aria-label': string
  variant?: Variant
  className?: string
}

function itemLabel(item: AdminTabItem): string {
  if (item.count == null || item.count === '') return item.label
  return `${item.label} (${item.count})`
}

function barClass(active: boolean): string {
  return [
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border px-[19px] py-[13px] text-sm font-extrabold transition',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fal-accent focus-visible:ring-offset-2 focus-visible:ring-offset-fal-bg',
    active
      ? 'border-fal-accent bg-fal-accent text-white shadow-[inset_0_-3px_0_0_rgba(255,255,255,0.55)]'
      : 'border-fal-line bg-fal-surface text-fal-fg hover:bg-fal-surface-2',
  ].join(' ')
}

function cardClass(active: boolean): string {
  return [
    'flex min-h-11 w-full flex-col items-start rounded-[12px] border px-3 py-2.5 text-left transition',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fal-accent focus-visible:ring-offset-2 focus-visible:ring-offset-fal-bg',
    active
      ? 'border-fal-accent bg-fal-accent text-white ring-2 ring-fal-accent/40 ring-offset-1 ring-offset-fal-bg'
      : 'border-fal-line bg-fal-surface text-fal-fg hover:border-fal-accent/40 hover:bg-fal-surface-2',
  ].join(' ')
}

export function AdminTabs({
  items,
  activeId,
  'aria-label': ariaLabel,
  variant = 'bar',
  className = '',
}: Props) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={[
        variant === 'card' ? 'grid gap-2 sm:grid-cols-2 lg:grid-cols-3' : 'flex flex-wrap gap-2',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {items.map((item) => {
        const active = item.id === activeId
        const cls = variant === 'card' ? cardClass(active) : barClass(active)
        const body =
          variant === 'card' ? (
            <>
              <span className="text-sm font-extrabold">{itemLabel(item)}</span>
              {item.subtitle ? (
                <span className={`mt-0.5 text-xs ${active ? 'text-white/80' : 'text-fal-muted'}`}>
                  {item.subtitle}
                </span>
              ) : null}
            </>
          ) : (
            itemLabel(item)
          )

        if (item.to) {
          return (
            <Link
              key={item.id}
              to={item.to}
              role="tab"
              aria-selected={active}
              className={`${cls} no-underline`}
            >
              {body}
            </Link>
          )
        }

        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={cls}
            onClick={() => item.onSelect?.()}
          >
            {body}
          </button>
        )
      })}
    </div>
  )
}
