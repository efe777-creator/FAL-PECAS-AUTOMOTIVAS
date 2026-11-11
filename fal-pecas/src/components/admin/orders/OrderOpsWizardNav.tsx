import { buildOrderOpsWizard, wizardHint } from '@/lib/orderOpsWizard'
import type { AdminOrderDetail } from '@/services/admin/adminOrderService'
import { useMemo } from 'react'

type Props = { order: AdminOrderDetail }

function stateClass(state: string): string {
  switch (state) {
    case 'done':
      return 'border-green-600 bg-green-50 text-green-900'
    case 'current':
      return 'border-fal-navy bg-fal-navy text-white'
    case 'skipped':
      return 'border-fal-line bg-fal-bg text-fal-muted line-through'
    default:
      return 'border-fal-line bg-white text-fal-navy'
  }
}

export function OrderOpsWizardNav({ order }: Props) {
  const steps = useMemo(() => buildOrderOpsWizard(order), [order])
  const hint = wizardHint(steps)

  if (
    !['confirmado', 'em_separacao', 'pronto_para_envio', 'preparando_envio', 'enviado', 'entregue'].includes(
      order.status,
    )
  ) {
    return null
  }

  return (
    <nav
      className="rounded-[14px] border border-fal-line bg-white px-4 py-3"
      aria-label="Wizard operacional"
    >
      <p className="m-0 text-xs font-bold uppercase tracking-wide text-fal-muted">
        Fluxo de expedição
      </p>
      <ol className="mb-0 mt-3 flex list-none flex-wrap gap-2 p-0">
        {steps.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.anchor}`}
              className={[
                'inline-flex items-center rounded-[10px] border px-3 py-1.5 text-xs font-bold no-underline',
                stateClass(s.state),
              ].join(' ')}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ol>
      <p className="mb-0 mt-3 text-sm text-fal-muted">{hint}</p>
    </nav>
  )
}
