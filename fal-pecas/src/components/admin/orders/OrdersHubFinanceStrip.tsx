import { formatMoney } from '@/lib/money'
import { useState } from 'react'

type Props = {
  captured: number
  refunded: number
  netReceived: number
}

export function OrdersHubFinanceStrip({ captured, refunded, netReceived }: Props) {
  const [open, setOpen] = useState(true)

  return (
    <section
      className="rounded-[14px] border border-fal-line bg-fal-surface shadow-sm"
      aria-label="Resumo financeiro"
    >
      <button
        type="button"
        className="flex w-full min-h-11 items-center justify-between gap-3 px-4 py-2.5 text-left"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-xs font-bold uppercase tracking-wide text-fal-muted">
          Financeiro
        </span>
        <span className="text-xs font-semibold text-fal-fg">{open ? 'Recolher' : 'Expandir'}</span>
      </button>
      {open ? (
        <div className="grid gap-2 border-t border-fal-line px-4 py-3 sm:grid-cols-3">
          <div>
            <p className="m-0 text-[11px] font-semibold uppercase text-fal-muted">Capturado</p>
            <p className="mb-0 mt-1 text-base font-extrabold tabular-nums text-fal-fg">
              {formatMoney(captured)}
            </p>
          </div>
          <div>
            <p className="m-0 text-[11px] font-semibold uppercase text-fal-muted">Devolvido</p>
            <p className="mb-0 mt-1 text-base font-extrabold tabular-nums text-fal-fg">
              {formatMoney(refunded)}
            </p>
          </div>
          <div>
            <p className="m-0 text-[11px] font-semibold uppercase text-fal-muted">Líquido</p>
            <p className="mb-0 mt-1 text-base font-extrabold tabular-nums text-fal-fg">
              {formatMoney(netReceived)}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  )
}
