import type { ReactNode } from 'react'
import { useEffect, useId, useRef } from 'react'

/**
 * Primário reutilizável para painéis laterais (ex.: filtros do catálogo).
 * A navegação mobile principal é o MobileNav (bottom bar).
 */
export function MobileDrawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const titleId = useId()
  const panelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    requestAnimationFrame(() => {
      panelRef.current
        ?.querySelector<HTMLElement>('button, [href], input, select, textarea')
        ?.focus()
    })
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[260] lg:hidden" role="presentation">
      <button
        type="button"
        className="absolute inset-0 border-0 bg-black/40"
        aria-label="Fechar painel"
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        className="absolute top-0 right-0 flex h-full w-[min(390px,92vw)] flex-col overflow-auto bg-white p-4 shadow-[-15px_0_40px_rgba(0,0,0,0.18)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id={titleId} className="m-0 text-lg font-extrabold">
            {title}
          </h2>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border-0 bg-[#eef1f3] text-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fal-navy"
            onClick={onClose}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
        {children}
      </aside>
    </div>
  )
}
