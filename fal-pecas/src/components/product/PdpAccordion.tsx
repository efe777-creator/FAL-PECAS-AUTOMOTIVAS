import { useId, useState, type ReactNode } from 'react'

export type PdpAccordionItem = {
  id: string
  title: string
  children: ReactNode
  defaultOpen?: boolean
}

/**
 * Acordeões técnicos da PDP (referência): um painel aberto por vez opcional —
 * aqui cada seção é independente (details nativo) para a11y simples.
 */
export function PdpAccordion({ items }: { items: PdpAccordionItem[] }) {
  return (
    <div className="mt-4 space-y-2">
      {items.map((item) => (
        <PdpAccordionSection key={item.id} item={item} />
      ))}
    </div>
  )
}

function PdpAccordionSection({ item }: { item: PdpAccordionItem }) {
  const panelId = useId()
  const [open, setOpen] = useState(Boolean(item.defaultOpen))

  return (
    <div className="overflow-hidden rounded-fal border border-fal-line bg-fal-surface dark:bg-fal-surface">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left text-sm font-extrabold text-fal-navy hover:bg-fal-bg dark:text-fal-fg dark:hover:bg-fal-surface-2"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{item.title}</span>
        <span className="shrink-0 text-xs font-bold text-fal-muted" aria-hidden="true">
          {open ? '▴' : '▾'}
        </span>
      </button>
      {open ? (
        <div
          id={panelId}
          className="border-t border-fal-line px-3.5 py-3 text-sm text-fal-ink"
        >
          {item.children}
        </div>
      ) : null}
    </div>
  )
}
