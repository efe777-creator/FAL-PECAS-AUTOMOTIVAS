import { buildOrderOpsWizard, wizardHint } from '@/lib/orderOpsWizard'
import type { AdminOrderDetail } from '@/services/admin/adminOrderService'
import { useMemo } from 'react'

type Props = {
  order: AdminOrderDetail
  compact?: boolean
  /** Quando definido, steps navegam via callback (tabs compact) em vez de só hash. */
  onNavigate?: (anchor: string) => void
}

function stateClass(state: string): string {
  switch (state) {
    case 'done':
      return 'border-fal-success/60 bg-fal-success/15 text-fal-fg'
    case 'current':
      return 'border-fal-navy bg-fal-navy text-white'
    case 'skipped':
      return 'border-transparent bg-transparent text-fal-muted line-through opacity-60'
    default:
      return 'border-fal-line bg-fal-surface text-fal-fg'
  }
}

export function OrderOpsWizardNav({ order, compact, onNavigate }: Props) {
  const steps = useMemo(() => buildOrderOpsWizard(order), [order])
  const hint = wizardHint(steps, order)

  if (
    !['confirmado', 'em_separacao', 'pronto_para_envio', 'preparando_envio', 'enviado', 'entregue'].includes(
      order.status,
    )
  ) {
    return null
  }

  const stepClass = (state: string) =>
    [
      'inline-flex items-center rounded-[8px] border font-bold no-underline',
      compact ? 'px-2 py-1 text-[11px]' : 'rounded-[10px] px-3 py-1.5 text-xs',
      stateClass(state),
    ].join(' ')

  return (
    <nav
      className={
        compact
          ? 'rounded-[10px] border border-fal-line bg-fal-bg/60 px-2 py-2'
          : 'rounded-[14px] border border-fal-line bg-fal-surface px-4 py-3'
      }
      aria-label="Wizard operacional"
    >
      {!compact ? (
        <p className="m-0 text-xs font-bold uppercase tracking-wide text-fal-muted">
          Fluxo operacional
        </p>
      ) : (
        <p className="m-0 text-[11px] font-bold uppercase tracking-wide text-fal-muted">
          Etapas
        </p>
      )}
      <ol
        className={[
          'mb-0 flex list-none flex-wrap gap-1.5 p-0',
          compact ? 'mt-1.5' : 'mt-3 gap-2',
        ].join(' ')}
      >
        {steps.map((s) => (
          <li key={s.id}>
            {onNavigate ? (
              <button
                type="button"
                className={stepClass(s.state)}
                onClick={() => onNavigate(s.anchor)}
              >
                {s.label}
              </button>
            ) : (
              <a href={`#${s.anchor}`} className={stepClass(s.state)}>
                {s.label}
              </a>
            )}
          </li>
        ))}
      </ol>
      {hint ? (
        <p className={['mb-0 text-fal-muted', compact ? 'mt-1.5 text-xs' : 'mt-3 text-sm'].join(' ')}>
          {hint}
        </p>
      ) : null}
    </nav>
  )
}
