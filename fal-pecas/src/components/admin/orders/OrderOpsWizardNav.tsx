import { buildOrderOpsWizard, wizardHint } from '@/lib/orderOpsWizard'
import type { AdminOrderDetail } from '@/services/admin/adminOrderService'
import { useMemo } from 'react'

type Props = { order: AdminOrderDetail; compact?: boolean }

function stateClass(state: string): string {
  switch (state) {
    case 'done':
      return 'border-green-600/70 bg-green-50 text-green-900'
    case 'current':
      return 'border-fal-navy bg-fal-navy text-white'
    case 'skipped':
      return 'border-transparent bg-transparent text-fal-muted line-through opacity-60'
    default:
      return 'border-fal-line bg-white text-fal-navy'
  }
}

export function OrderOpsWizardNav({ order, compact }: Props) {
  const steps = useMemo(() => buildOrderOpsWizard(order), [order])
  const hint = wizardHint(steps, order)

  if (
    !['confirmado', 'em_separacao', 'pronto_para_envio', 'preparando_envio', 'enviado', 'entregue'].includes(
      order.status,
    )
  ) {
    return null
  }

  return (
    <nav
      className={compact ? 'px-3 py-2.5' : 'rounded-[14px] border border-fal-line bg-white px-4 py-3'}
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
          compact ? 'mt-2' : 'mt-3 gap-2',
        ].join(' ')}
      >
        {steps.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.anchor}`}
              className={[
                'inline-flex items-center rounded-[8px] border font-bold no-underline',
                compact ? 'px-2 py-1 text-[11px]' : 'rounded-[10px] px-3 py-1.5 text-xs',
                stateClass(s.state),
              ].join(' ')}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ol>
      {hint ? (
        <p className={['mb-0 text-fal-muted', compact ? 'mt-2 text-xs' : 'mt-3 text-sm'].join(' ')}>
          {hint}
        </p>
      ) : null}
    </nav>
  )
}
