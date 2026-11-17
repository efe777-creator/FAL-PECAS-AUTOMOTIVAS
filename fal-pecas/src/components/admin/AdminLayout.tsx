import { AdminBackButton } from '@/components/admin/AdminBackButton'
import { AdminBreadcrumbs } from '@/components/admin/AdminBreadcrumbs'
import { adminNavIcon } from '@/components/admin/AdminNavIcons'
import { AdminThemeToggle } from '@/components/admin/AdminThemeToggle'
import { Loading } from '@/components/common/Loading'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { ScrollToTop } from '@/components/navigation/ScrollToTop'
import { useAuth } from '@/contexts/AuthContext'
import { buildAdminBreadcrumbs } from '@/lib/adminBreadcrumbs'
import { canAccessAdminPath, filterAdminNavLinks } from '@/lib/adminNavAccess'
import {
  ADMIN_NAV_HOME,
  ADMIN_NAV_SECTIONS,
  type AdminNavLink,
} from '@/lib/adminNavConfig'
import {
  readAdminSidebarCollapsed,
  writeAdminSidebarCollapsed,
} from '@/lib/adminSidebar'
import {
  readAdminTheme,
  toggleAdminTheme,
  writeAdminTheme,
  type AdminTheme,
} from '@/lib/adminTheme'
import { AdminForbiddenPage } from '@/pages/admin/AdminForbiddenPage'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

type SidebarTone = 'navy' | 'panel'

/**
 * Flyout estável: conteúdo interno sempre PANEL_PX; o aside só revela o trilho.
 * Ícones ficam numa coluna fixa (= RAIL_PX) para não saltarem de lugar no hover.
 * Títulos de seção só no menu fixado — no hover não entram (evita “mudar a ordem”).
 */
const RAIL_PX = 44
const PANEL_PX = 220

function linkClass(tone: SidebarTone) {
  return ({ isActive }: { isActive: boolean }) => {
    const focus =
      tone === 'navy'
        ? 'focus-visible:ring-white/80 focus-visible:ring-offset-fal-navy'
        : 'focus-visible:ring-fal-accent focus-visible:ring-offset-fal-surface'
    const idle =
      tone === 'navy'
        ? 'text-white/90 hover:bg-white/10'
        : 'text-fal-fg/90 hover:bg-fal-surface-2'
    return [
      'group relative flex h-7 w-full items-center rounded-md text-xs font-semibold transition',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
      focus,
      isActive ? 'bg-fal-accent font-extrabold text-white shadow-sm' : idle,
    ].join(' ')
  }
}

function NavItem({
  to,
  label,
  end,
  onNavigate,
  tone,
  showLabel,
}: {
  to: string
  label: string
  end?: boolean
  onNavigate: () => void
  tone: SidebarTone
  showLabel: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={linkClass(tone)}
      onClick={onNavigate}
      title={label}
      aria-label={label}
    >
      <span
        className="grid h-7 shrink-0 place-items-center"
        style={{ width: RAIL_PX }}
      >
        <span className="grid h-4 w-4 place-items-center">{adminNavIcon(to)}</span>
      </span>
      <span
        className={[
          'min-w-0 flex-1 truncate pr-2 transition-opacity duration-150',
          showLabel ? 'opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
        aria-hidden={!showLabel}
      >
        {label}
      </span>
    </NavLink>
  )
}

function NavSection({
  title,
  links,
  onNavigate,
  tone,
  showLabel,
  showSectionTitle,
}: {
  title: string
  links: AdminNavLink[]
  onNavigate: () => void
  tone: SidebarTone
  showLabel: boolean
  showSectionTitle: boolean
}) {
  if (!links.length) return null
  const sectionCls = tone === 'navy' ? 'text-white/45' : 'text-fal-muted'
  return (
    <div className="space-y-0.5">
      {showSectionTitle ? (
        <p
          className={`pb-0.5 pt-1.5 text-[10px] font-bold uppercase tracking-wide ${sectionCls}`}
          style={{ paddingLeft: RAIL_PX }}
        >
          {title}
        </p>
      ) : null}
      {links.map((l) => (
        <NavItem
          key={l.to}
          to={l.to}
          label={l.label}
          end={l.end}
          onNavigate={onNavigate}
          tone={tone}
          showLabel={showLabel}
        />
      ))}
    </div>
  )
}

function pageTitleFromDocument(): string {
  const raw = document.title.trim()
  const stripped = raw.replace(/\s*\|\s*Admin FAL\s*$/i, '').trim()
  if (!stripped || /fal peças/i.test(stripped)) return 'Painel'
  return stripped
}

function MenuGlyph({ open }: { open: boolean }) {
  if (open) {
    return (
      <span className="text-lg leading-none" aria-hidden>
        ×
      </span>
    )
  }
  return (
    <span className="flex flex-col gap-1" aria-hidden>
      <span className="block h-0.5 w-4 rounded bg-current" />
      <span className="block h-0.5 w-4 rounded bg-current" />
      <span className="block h-0.5 w-4 rounded bg-current" />
    </span>
  )
}

/** Ícone discreto: painel expandido ↔ trilho. */
function PinGlyph({ pinned }: { pinned: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5 shrink-0 opacity-80"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {pinned ? (
        <>
          <rect x="4" y="4" width="6" height="16" rx="1" />
          <path d="M14 12h7" />
          <path d="m18 9 3 3-3 3" />
        </>
      ) : (
        <>
          <rect x="4" y="4" width="6" height="16" rx="1" />
          <path d="M21 12h-7" />
          <path d="m17 9-3 3 3 3" />
        </>
      )}
    </svg>
  )
}

export function AdminLayout() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const [navOpen, setNavOpen] = useState(false)
  const [pageTitle, setPageTitle] = useState('Painel')
  const [theme, setTheme] = useState<AdminTheme>(() => readAdminTheme())
  const [sidebarRail, setSidebarRail] = useState(() => readAdminSidebarCollapsed())
  const [railHovered, setRailHovered] = useState(false)
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 900px)').matches : false,
  )
  const hoverTimer = useRef<number | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const tone: SidebarTone = theme === 'dark' ? 'panel' : 'navy'
  const isPanel = tone === 'panel'
  const pinnedExpanded = !sidebarRail
  const showLabel = !isDesktop || pinnedExpanded || railHovered
  /** Títulos de seção só com menu fixado — no hover não deslocam os ícones. */
  const showSectionTitle = !isDesktop || pinnedExpanded
  const desktopWidth = !isDesktop
    ? undefined
    : pinnedExpanded || railHovered
      ? PANEL_PX
      : RAIL_PX

  useEffect(() => {
    setNavOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const sync = () => setPageTitle(pageTitleFromDocument())
    sync()
    const t0 = window.setTimeout(sync, 0)
    const t1 = window.setTimeout(sync, 120)
    return () => {
      window.clearTimeout(t0)
      window.clearTimeout(t1)
    }
  }, [location.pathname])

  useEffect(() => {
    if (!navOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [navOpen])

  useEffect(() => {
    function onCloseNav() {
      setNavOpen(false)
    }
    window.addEventListener('fal:close-mobile-nav', onCloseNav)
    return () => window.removeEventListener('fal:close-mobile-nav', onCloseNav)
  }, [])

  useEffect(() => {
    if (!navOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setNavOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navOpen])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)')
    const content = contentRef.current
    function apply() {
      setIsDesktop(mq.matches)
      if (content) {
        if (!mq.matches && navOpen) content.setAttribute('inert', '')
        else content.removeAttribute('inert')
      }
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [navOpen])

  useEffect(() => {
    return () => {
      if (hoverTimer.current != null) window.clearTimeout(hoverTimer.current)
    }
  }, [])

  const closeNav = () => setNavOpen(false)
  const onThemeToggle = () => {
    setTheme((t) => {
      const next = toggleAdminTheme(t)
      writeAdminTheme(next)
      return next
    })
  }

  const setRailMode = (rail: boolean) => {
    setSidebarRail(rail)
    writeAdminSidebarCollapsed(rail)
    if (!rail) setRailHovered(false)
  }

  const toggleDesktopMode = () => setRailMode(!sidebarRail)

  const onRailEnter = () => {
    if (!sidebarRail || !isDesktop) return
    if (hoverTimer.current != null) window.clearTimeout(hoverTimer.current)
    setRailHovered(true)
  }

  const onRailLeave = () => {
    if (!sidebarRail || !isDesktop) return
    if (hoverTimer.current != null) window.clearTimeout(hoverTimer.current)
    hoverTimer.current = window.setTimeout(() => setRailHovered(false), 320)
  }

  const userLabel = user?.email ?? user?.fullName ?? 'staff'
  const role = user?.role

  const navSections = useMemo(() => {
    return ADMIN_NAV_SECTIONS.map((section) => ({
      ...section,
      links: filterAdminNavLinks([...section.links], role),
    })).filter((s) => s.links.length > 0)
  }, [role])

  const pathAllowed = canAccessAdminPath(location.pathname, role)
  const crumbs = useMemo(
    () => buildAdminBreadcrumbs(location.pathname),
    [location.pathname],
  )

  const borderCls = isPanel ? 'border-fal-line' : 'border-white/15'
  const mutedBtn = isPanel
    ? 'text-fal-fg/85 hover:bg-fal-surface-2'
    : 'text-white/85 hover:bg-white/10'
  const signOutCls = isPanel
    ? 'text-fal-fg/80 hover:bg-fal-surface-2 focus-visible:ring-fal-accent focus-visible:ring-offset-fal-surface'
    : 'text-white/75 hover:bg-white/10 focus-visible:ring-white/80 focus-visible:ring-offset-fal-navy'

  const menuToggleLabel = isDesktop
    ? pinnedExpanded
      ? 'Encolher menu (só ícones)'
      : 'Fixar menu expandido'
    : navOpen
      ? 'Fechar menu'
      : 'Abrir menu'

  const shellWidth = isDesktop ? (sidebarRail ? RAIL_PX : PANEL_PX) : 0

  return (
    <div
      className={`min-h-[100dvh] overflow-x-hidden bg-fal-bg lg:flex ${theme === 'dark' ? 'dark' : ''}`}
    >
      <ScrollToTop />

      {navOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/45 backdrop-blur-[1px] lg:hidden"
          aria-label="Fechar menu"
          onClick={closeNav}
        />
      ) : null}

      <div
        className="relative hidden shrink-0 lg:block"
        style={{ width: shellWidth }}
        aria-hidden
      />

      <aside
        id="admin-sidebar"
        onMouseEnter={onRailEnter}
        onMouseLeave={onRailLeave}
        onFocusCapture={onRailEnter}
        className={[
          'flex flex-col overflow-hidden',
          isPanel
            ? 'border-fal-line bg-fal-surface text-fal-fg'
            : 'bg-fal-navy text-white',
          'fixed inset-y-0 left-0 z-40 max-h-[100dvh] w-[min(15.5rem,92vw)]',
          'transition-[transform,width,box-shadow] duration-200 ease-out',
          navOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:fixed lg:translate-x-0 lg:border-r',
          sidebarRail && railHovered ? 'lg:shadow-2xl' : '',
        ].join(' ')}
        style={
          isDesktop
            ? {
                width: desktopWidth,
                top: 0,
                bottom: 0,
                height: '100dvh',
              }
            : undefined
        }
        aria-label="Menu admin"
        data-sidebar-mode={sidebarRail ? 'rail' : 'expanded'}
      >
        <div
          className="flex h-full min-h-0 flex-col"
          style={{ width: isDesktop ? PANEL_PX : '100%' }}
        >
          <div className={`shrink-0 border-b ${borderCls}`}>
            <div className="flex h-11 items-center">
              <div
                className="grid h-11 shrink-0 place-items-center"
                style={{ width: RAIL_PX }}
              >
                <span className="grid h-7 w-7 place-items-center overflow-hidden rounded-full bg-[#535c6b]">
                  <img
                    src="/brand-fal-tipografia-circle.png"
                    alt="FAL Peças Automotivas"
                    width={28}
                    height={28}
                    className="h-full w-full scale-[1.7] object-cover object-center"
                    draggable={false}
                  />
                </span>
              </div>
              <div
                className={[
                  'min-w-0 flex-1 transition-opacity duration-150',
                  showLabel ? 'opacity-100' : 'pointer-events-none opacity-0',
                ].join(' ')}
              >
                <p className="truncate text-[10px] font-extrabold uppercase tracking-wider text-fal-yellow">
                  Admin
                </p>
              </div>
              {isDesktop ? (
                <button
                  type="button"
                  className={[
                    'mr-1.5 grid h-7 w-7 shrink-0 place-items-center rounded-md transition',
                    showLabel ? 'opacity-70 hover:opacity-100' : 'pointer-events-none opacity-0',
                    isPanel
                      ? 'text-fal-muted hover:bg-fal-surface-2 hover:text-fal-fg'
                      : 'text-white/55 hover:bg-white/10 hover:text-white',
                  ].join(' ')}
                  onClick={toggleDesktopMode}
                  title={menuToggleLabel}
                  aria-label={menuToggleLabel}
                  aria-pressed={pinnedExpanded}
                  tabIndex={showLabel ? 0 : -1}
                >
                  <PinGlyph pinned={pinnedExpanded} />
                </button>
              ) : (
                <button
                  type="button"
                  className={`mr-1.5 grid h-7 w-7 shrink-0 place-items-center rounded-md ${mutedBtn}`}
                  aria-label="Fechar menu"
                  onClick={closeNav}
                >
                  <span className="text-base leading-none" aria-hidden>
                    ×
                  </span>
                </button>
              )}
            </div>
          </div>

          <nav className="flex min-h-0 flex-1 flex-col" aria-label="Navegação">
            <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain py-1">
              <NavItem
                to={ADMIN_NAV_HOME.to}
                label={ADMIN_NAV_HOME.label}
                end={ADMIN_NAV_HOME.end}
                onNavigate={closeNav}
                tone={tone}
                showLabel={showLabel}
              />
              {navSections.map((section) => (
                <NavSection
                  key={section.id}
                  title={section.title}
                  links={section.links}
                  onNavigate={closeNav}
                  tone={tone}
                  showLabel={showLabel}
                  showSectionTitle={showSectionTitle}
                />
              ))}
            </div>

            <div
              className={`shrink-0 space-y-0.5 border-t py-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] ${borderCls}`}
            >
              <NavItem
                to="/"
                label="Voltar à loja"
                onNavigate={closeNav}
                tone={tone}
                showLabel={showLabel}
              />
              <button
                type="button"
                onClick={() => void signOut()}
                title={`Sair (${userLabel})`}
                aria-label={`Sair (${userLabel})`}
                className={`flex h-7 w-full items-center rounded-md text-left text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${signOutCls}`}
              >
                <span
                  className="grid h-7 shrink-0 place-items-center"
                  style={{ width: RAIL_PX }}
                  aria-hidden
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <path d="M16 17l5-5-5-5" />
                    <path d="M21 12H9" />
                  </svg>
                </span>
                <span
                  className={[
                    'min-w-0 flex-1 truncate pr-2 transition-opacity duration-150',
                    showLabel ? 'opacity-100' : 'opacity-0',
                  ].join(' ')}
                >
                  Sair
                </span>
              </button>
            </div>
          </nav>
        </div>
      </aside>

      <div ref={contentRef} className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex min-h-14 items-center gap-1.5 border-b border-fal-line bg-fal-surface px-2 py-2 sm:gap-2 sm:px-4 sm:py-3">
          <button
            type="button"
            className="grid h-11 w-11 min-h-11 min-w-11 shrink-0 place-items-center rounded-lg border border-fal-line bg-fal-bg text-fal-fg hover:bg-fal-surface-2 lg:hidden"
            aria-label={navOpen ? 'Fechar menu' : 'Abrir menu'}
            title={navOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={navOpen}
            aria-controls="admin-sidebar"
            onClick={() => setNavOpen((o) => !o)}
          >
            <MenuGlyph open={navOpen} />
          </button>
          <AdminBackButton
            crumbs={crumbs}
            hidden={location.pathname === '/admin' || location.pathname === '/admin/'}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-fal-muted sm:text-xs lg:hidden">
              FAL ADMIN
            </p>
            <p className="truncate text-sm font-semibold text-fal-fg sm:text-base">{pageTitle}</p>
          </div>
          <div className="hidden sm:block">
            <AdminThemeToggle
              theme={theme}
              onToggle={onThemeToggle}
              variant="light"
              showLabel
            />
          </div>
          <div className="sm:hidden">
            <AdminThemeToggle
              theme={theme}
              onToggle={onThemeToggle}
              variant="light"
              showLabel={false}
            />
          </div>
          <div className="shrink-0">
            <NotificationBell allHref="/admin/avisos" audience="staff" variant="light" />
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-x-auto p-3 sm:p-4 md:p-6">
          {pathAllowed && crumbs.length > 0 ? <AdminBreadcrumbs items={crumbs} /> : null}
          <Suspense fallback={<Loading label="Carregando admin…" />}>
            {pathAllowed ? <Outlet /> : <AdminForbiddenPage />}
          </Suspense>
        </main>
      </div>
    </div>
  )
}
