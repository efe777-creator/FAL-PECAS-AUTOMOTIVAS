import { ButtonLink } from './ButtonLink'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  actionLabel?: string
  actionTo?: string
  /** Ação local (ex.: abrir painel) — preferir sobre actionTo quando ambos existirem. */
  onAction?: () => void
  children?: ReactNode
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
  children,
}: EmptyStateProps) {
  return (
    <div className="rounded-fal border border-fal-line bg-white px-5 py-14 text-center text-fal-muted">
      <h2 className="m-0 text-xl font-extrabold text-fal-navy-dark">{title}</h2>
      {description ? <p className="mt-2">{description}</p> : null}
      {children}
      {actionLabel && onAction ? (
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center rounded-[10px] border border-fal-navy bg-fal-navy px-4 text-sm font-extrabold text-white hover:bg-fal-navy-dark"
            onClick={onAction}
          >
            {actionLabel}
          </button>
        </div>
      ) : actionLabel && actionTo ? (
        <div className="mt-5 flex justify-center">
          <ButtonLink to={actionTo} variant="primary">
            {actionLabel}
          </ButtonLink>
        </div>
      ) : null}
    </div>
  )
}
