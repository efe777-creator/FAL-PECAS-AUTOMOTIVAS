import type { ReactNode } from 'react'

export type OrderSplitStackItem = {
  id: string
  label: string
  statusLabel?: string
}

/**
 * Guias empilhadas: cada pedido aberto fica expandido, um abaixo do outro.
 * Não minimiza — todos ficam visíveis; scroll no painel lateral.
 */
export function OrderSplitTabPanels({
  orderIds,
  meta,
  onCloseTab,
  render,
}: {
  orderIds: string[]
  meta?: OrderSplitStackItem[]
  onCloseTab: (orderId: string) => void
  render: (orderId: string) => ReactNode
}) {
  const byId = new Map((meta ?? []).map((m) => [m.id, m]))

  if (orderIds.length === 0) return null

  return (
    <div className="flex flex-col gap-3" aria-label={`Guias abertas (${orderIds.length})`}>
      <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-fal-muted">
        Guias abertas ({orderIds.length})
      </p>
      {orderIds.map((id, index) => {
        const info = byId.get(id)
        const label = info?.label ?? `#${id.slice(0, 8)}`
        return (
          <section
            key={id}
            className="overflow-hidden rounded-[12px] border border-fal-line bg-fal-bg/40"
            aria-label={`Guia ${index + 1}: ${label}`}
          >
            <header className="flex items-center gap-2 border-b border-fal-line bg-fal-surface px-2.5 py-1.5">
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate text-xs font-extrabold text-fal-fg">{label}</p>
                {info?.statusLabel ? (
                  <p className="mb-0 mt-0.5 truncate text-[10px] text-fal-muted">
                    {info.statusLabel}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-base font-bold text-fal-muted hover:bg-red-50 hover:text-red-700"
                aria-label={`Fechar guia ${label}`}
                title="Fechar esta guia"
                onClick={() => onCloseTab(id)}
              >
                ×
              </button>
            </header>
            <div className="p-2">{render(id)}</div>
          </section>
        )
      })}
    </div>
  )
}
