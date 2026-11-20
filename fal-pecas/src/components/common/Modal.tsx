import type { ReactNode } from 'react'
import { useEffect, useId, useRef } from 'react'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  /** Ações fixas abaixo do body (não rolam no sheet). */
  footer?: ReactNode
}

/**
 * Dialog responsivo E.7: bottom sheet em &lt;md, modal central em md+.
 */
export function Modal({ open, title, onClose, children, footer }: ModalProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previousFocus.current = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKey)
    requestAnimationFrame(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      ;(first ?? panelRef.current)?.focus()
    })

    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      previousFocus.current?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-[rgba(20,25,31,0.55)] p-0 md:items-center md:p-[18px]"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className={[
          'flex w-full max-w-[620px] flex-col overflow-hidden bg-fal-surface text-fal-fg shadow-fal outline-none',
          'max-h-[92dvh] rounded-t-2xl pb-[env(safe-area-inset-bottom)]',
          'md:max-h-[90vh] md:rounded-2xl md:pb-0',
        ].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-3 pt-5 md:px-6 md:pt-6">
          <h2 id={titleId} className="m-0 text-xl font-extrabold text-fal-fg">
            {title}
          </h2>
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-0 bg-fal-surface-2 text-lg text-fal-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fal-yellow md:h-[34px] md:w-[34px]"
            onClick={onClose}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 md:px-6">
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-fal-line px-5 py-4 md:px-6">{footer}</div>
        ) : null}
      </div>
    </div>
  )
}
