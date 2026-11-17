import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'

export type DropdownMenuItem = {
  id: string
  label: string
  onSelect: () => void
  disabled?: boolean
  danger?: boolean
}

type DropdownMenuProps = {
  trigger: ReactNode
  items: DropdownMenuItem[]
  align?: 'start' | 'end'
  'aria-label': string
}

export function DropdownMenu({
  trigger,
  items,
  align = 'end',
  'aria-label': ariaLabel,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  const enabledItems = items.filter((i) => !i.disabled)
  const close = useCallback(() => {
    setOpen(false)
    triggerRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) close()
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open, close])

  useEffect(() => {
    if (!open) return
    setActiveIndex(0)
  }, [open])

  function onTriggerKey(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setOpen(true)
    }
  }

  function onMenuKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, Math.max(0, enabledItems.length - 1)))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
      return
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const item = enabledItems[activeIndex]
      if (item) {
        item.onSelect()
        close()
      }
    }
  }

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[10px] border border-fal-line bg-fal-surface px-2 text-sm font-bold text-fal-fg hover:bg-fal-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fal-accent"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onTriggerKey}
      >
        {trigger}
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          tabIndex={-1}
          aria-label={ariaLabel}
          className={[
            'absolute z-40 mt-1 min-w-[12rem] rounded-[12px] border border-fal-line bg-fal-surface py-1 shadow-lg',
            align === 'end' ? 'right-0' : 'left-0',
          ].join(' ')}
          onKeyDown={onMenuKey}
        >
          {items.map((item) => {
            const enabledIdx = enabledItems.findIndex((e) => e.id === item.id)
            const active = !item.disabled && enabledIdx === activeIndex
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                className={[
                  'flex w-full items-center px-3 py-2.5 text-left text-sm font-semibold',
                  item.disabled
                    ? 'cursor-not-allowed text-fal-muted opacity-60'
                    : item.danger
                      ? 'text-fal-danger hover:bg-red-50'
                      : 'text-fal-fg hover:bg-fal-bg',
                  active ? 'bg-fal-bg' : '',
                ].join(' ')}
                onMouseEnter={() => {
                  if (!item.disabled && enabledIdx >= 0) setActiveIndex(enabledIdx)
                }}
                onClick={() => {
                  if (item.disabled) return
                  item.onSelect()
                  close()
                }}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
