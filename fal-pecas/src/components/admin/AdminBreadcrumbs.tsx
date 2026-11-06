import type { AdminCrumb } from '@/lib/adminBreadcrumbs'
import { Link } from 'react-router-dom'

export function AdminBreadcrumbs({ items }: { items: AdminCrumb[] }) {
  if (!items.length) return null
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="m-0 flex flex-wrap items-center gap-x-1.5 gap-y-1 p-0 text-sm text-fal-muted list-none">
        {items.map((c, i) => {
          const last = i === items.length - 1
          return (
            <li key={`${c.label}-${i}`} className="flex items-center gap-1.5">
              {i > 0 ? (
                <span className="text-fal-line select-none" aria-hidden>
                  /
                </span>
              ) : null}
              {c.to && !last ? (
                <Link
                  to={c.to}
                  className="font-semibold text-fal-navy no-underline hover:underline"
                >
                  {c.label}
                </Link>
              ) : (
                <span
                  className={last ? 'font-semibold text-fal-ink' : undefined}
                  aria-current={last ? 'page' : undefined}
                >
                  {c.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
