import type { ReactNode } from 'react'
import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

function drawerMountNode(): HTMLElement {
  return (
    document.querySelector<HTMLElement>('[data-fal-theme-root]') ?? document.body
  )
}

/**
 * Primário reutilizável para painéis laterais (ex.: filtros do catálogo).
 * Portal no root da loja para z-index e tema; scrim com pointer-events
 * explícitos (botão full-screen no iOS engolia toques do painel).
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
    const id = window.requestAnimationFrame(() => {
      panelRef.current
        ?.querySelector<HTMLElement>('button[aria-label="Fechar"], a, button, [href]')
        ?.focus()
    })
    return () => {
      window.cancelAnimationFrame(id)
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[260] flex justify-end lg:hidden"
      role="presentation"
    >
      {/* Scrim: div (não button) + pointer-events isolados do painel */}
      <div
        className="absolute inset-0 bg-black/40"
        aria-hidden
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose()
        }}
      />
      <aside
        ref={panelRef}
        className="relative z-10 flex h-full w-[min(390px,92vw)] flex-col overflow-auto overscroll-contain bg-fal-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-fal-fg shadow-[-15px_0_40px_rgba(0,0,0,0.18)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id={titleId} className="m-0 text-lg font-extrabold text-fal-navy dark:text-fal-fg">
            {title}
          </h2>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full border-0 bg-fal-surface-2 text-2xl text-fal-navy dark:text-fal-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fal-accent"
            onClick={onClose}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
        {children}
      </aside>
    </div>,
    drawerMountNode(),
  )
}
