import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

export const SUPPORT_NAV_ITEMS = [
  { id: 'suporte-politicas', label: 'Políticas' },
  { id: 'suporte-compromisso', label: 'Compromisso' },
  { id: 'suporte-atendimento', label: 'Atendimento' },
] as const

export type SupportTabId = (typeof SUPPORT_NAV_ITEMS)[number]['id']

function isSupportTabId(value: string): value is SupportTabId {
  return SUPPORT_NAV_ITEMS.some((i) => i.id === value)
}

function chipClass(active: boolean) {
  return [
    'inline-flex min-h-11 flex-1 items-center justify-center whitespace-nowrap rounded-fal px-3 py-2 text-sm transition',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fal-accent focus-visible:ring-offset-2',
    active
      ? 'bg-fal-navy font-extrabold text-fal-yellow shadow-sm'
      : 'bg-transparent font-semibold text-fal-navy hover:bg-fal-surface-2 dark:text-fal-fg',
  ].join(' ')
}

function asideClass(active: boolean) {
  return [
    'flex w-full items-center border-l-4 px-3 py-3 text-left text-sm transition',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fal-accent focus-visible:ring-offset-2',
    active
      ? 'border-fal-yellow bg-fal-navy font-extrabold text-fal-yellow'
      : 'border-transparent font-semibold text-fal-fg hover:border-fal-line hover:bg-fal-surface-2',
  ].join(' ')
}

function readHashTab(): SupportTabId {
  const raw = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : ''
  return isSupportTabId(raw) ? raw : 'suporte-politicas'
}

export function SupportCenterShell({
  panels,
}: {
  panels: Record<SupportTabId, ReactNode>
}) {
  const [activeId, setActiveId] = useState<SupportTabId>(readHashTab)

  const selectTab = useCallback((id: SupportTabId) => {
    setActiveId(id)
    const next = `${window.location.pathname}${window.location.search}#${id}`
    window.history.replaceState(null, '', next)
  }, [])

  useEffect(() => {
    const fromHash = () => setActiveId(readHashTab())
    window.addEventListener('hashchange', fromHash)
    return () => window.removeEventListener('hashchange', fromHash)
  }, [])

  return (
    <>
      <p className="mb-3 text-sm text-fal-muted">
        <Link to="/" className="hover:underline">
          Início
        </Link>
        {' / '}
        <span className="text-fal-ink">Suporte</span>
      </p>

      <header className="rounded-fal border border-fal-line bg-fal-navy px-4 py-5 text-fal-yellow sm:px-6 sm:py-6">
        <p className="m-0 text-[11px] font-extrabold tracking-[0.14em] text-fal-yellow/80 uppercase">
          Hub da loja
        </p>
        <h1 className="mt-1 mb-0 text-[26px] font-black leading-tight sm:text-[32px]">
          Central de Suporte
        </h1>
        <p className="mt-2 mb-0 max-w-2xl text-sm text-white/85 sm:text-base">
          Três telas no menu: políticas, compromisso e atendimento — toque para trocar.
        </p>
      </header>

      <nav
        className="sticky top-[52px] z-20 mt-4 rounded-fal border border-fal-line bg-fal-surface p-1 shadow-sm md:hidden"
        aria-label="Telas da Central"
      >
        <ul className="m-0 flex list-none gap-1 p-0" role="tablist">
          {SUPPORT_NAV_ITEMS.map((item) => (
            <li key={item.id} className="min-w-0 flex-1" role="presentation">
              <button
                type="button"
                role="tab"
                id={`tab-${item.id}`}
                aria-controls={`panel-${item.id}`}
                aria-selected={activeId === item.id}
                className={chipClass(activeId === item.id)}
                onClick={() => selectTab(item.id)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-5 grid grid-cols-1 gap-6 md:mt-8 md:grid-cols-[240px_1fr] md:gap-8">
        <aside className="hidden self-start md:sticky md:top-[96px] md:block">
          <p className="mb-2 text-[11px] font-extrabold tracking-[0.12em] text-fal-muted uppercase">
            Menu
          </p>
          <nav
            className="overflow-hidden rounded-fal border border-fal-line bg-fal-surface"
            aria-label="Menu da Central"
          >
            <ul className="m-0 list-none p-0" role="tablist" aria-orientation="vertical">
              {SUPPORT_NAV_ITEMS.map((item) => (
                <li key={item.id} role="presentation">
                  <button
                    type="button"
                    role="tab"
                    id={`tab-desk-${item.id}`}
                    aria-controls={`panel-${item.id}`}
                    aria-selected={activeId === item.id}
                    className={asideClass(activeId === item.id)}
                    onClick={() => selectTab(item.id)}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div
          className="min-w-0"
          role="tabpanel"
          id={`panel-${activeId}`}
          aria-labelledby={`tab-${activeId}`}
        >
          {panels[activeId]}
        </div>
      </div>
    </>
  )
}
