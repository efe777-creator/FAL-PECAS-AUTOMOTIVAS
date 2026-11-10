import { AdminBreadcrumbs } from '@/components/admin/AdminBreadcrumbs'
import { Loading } from '@/components/common/Loading'
import { ScrollToTop } from '@/components/navigation/ScrollToTop'
import { useAuth } from '@/contexts/AuthContext'
import { buildAdminBreadcrumbs } from '@/lib/adminBreadcrumbs'
import { canAccessAdminPath, filterAdminNavLinks } from '@/lib/adminNavAccess'
import { AdminForbiddenPage } from '@/pages/admin/AdminForbiddenPage'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

const catalogLinks = [
  { to: '/admin/produtos', label: 'Produtos' },
  { to: '/admin/aplicacoes', label: 'Aplicações' },
  { to: '/admin/precos', label: 'Preços' },
  { to: '/admin/importacoes', label: 'Importações' },
  { to: '/admin/categorias', label: 'Categorias' },
  { to: '/admin/home', label: 'Home da loja' },
  { to: '/admin/montadoras', label: 'Montadoras' },
  { to: '/admin/veiculos', label: 'Veículos' },
  { to: '/admin/fabricantes', label: 'Fabricantes' },
  { to: '/admin/fornecedores', label: 'Fornecedores' },
]

const salesLinks = [
  { to: '/admin/pedidos', label: 'Pedidos' },
  { to: '/admin/clientes', label: 'Clientes' },
]

const opsLinks = [
  { to: '/admin/estoque', label: 'Estoque' },
  { to: '/admin/logistica', label: 'Logística' },
  { to: '/admin/pagamentos', label: 'Pagamentos' },
  { to: '/admin/relatorios', label: 'Relatórios' },
  { to: '/admin/operadores', label: 'Operadores' },
]

function linkClass({ isActive }: { isActive: boolean }) {
  return [
    'flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-semibold transition',
    isActive ? 'bg-fal-yellow text-fal-navy-dark' : 'text-white/85 hover:bg-white/10',
  ].join(' ')
}

function NavSection({
  title,
  links,
  onNavigate,
}: {
  title: string
  links: { to: string; label: string }[]
  onNavigate: () => void
}) {
  if (!links.length) return null
  return (
    <div>
      <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-wide text-white/45">
        {title}
      </p>
      <div className="space-y-0.5">
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} className={linkClass} onClick={onNavigate}>
            {l.label}
          </NavLink>
        ))}
      </div>
    </div>
  )
}

function pageTitleFromDocument(): string {
  const raw = document.title.trim()
  const stripped = raw.replace(/\s*\|\s*Admin FAL\s*$/i, '').trim()
  if (!stripped || /fal peças/i.test(stripped)) return 'Painel'
  return stripped
}

export function AdminLayout() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const [navOpen, setNavOpen] = useState(false)
  const [pageTitle, setPageTitle] = useState('Painel')
  const asideRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setNavOpen(false)
  }, [location.pathname])

  /** Título da página no header mobile (após o filho setar document.title). */
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

  /** Escape fecha o menu mobile. */
  useEffect(() => {
    if (!navOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setNavOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navOpen])

  /** inert: conteúdo atrás do drawer; aside fechado no mobile. */
  useEffect(() => {
    const aside = asideRef.current
    const content = contentRef.current
    const mq = window.matchMedia('(max-width: 1023px)')
    function apply() {
      const mobile = mq.matches
      if (aside) {
        if (mobile && !navOpen) aside.setAttribute('inert', '')
        else aside.removeAttribute('inert')
      }
      if (content) {
        if (mobile && navOpen) content.setAttribute('inert', '')
        else content.removeAttribute('inert')
      }
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [navOpen])

  const closeNav = () => setNavOpen(false)
  const userLabel = user?.email ?? user?.fullName ?? 'staff'
  const role = user?.role

  const catalogNav = useMemo(() => filterAdminNavLinks(catalogLinks, role), [role])
  const salesNav = useMemo(() => filterAdminNavLinks(salesLinks, role), [role])
  const opsNav = useMemo(() => filterAdminNavLinks(opsLinks, role), [role])
  const pathAllowed = canAccessAdminPath(location.pathname, role)
  const crumbs = useMemo(
    () => buildAdminBreadcrumbs(location.pathname),
    [location.pathname],
  )

  const aside = (
    <aside
      ref={asideRef}
      id="admin-sidebar"
      className={[
        'flex w-[min(288px,88vw)] flex-col bg-fal-navy text-white lg:w-[260px] lg:shrink-0',
        'fixed inset-y-0 left-0 z-40 h-screen transition-transform duration-200 ease-out',
        'lg:sticky lg:top-0 lg:z-0 lg:translate-x-0 lg:transition-none',
        navOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      ].join(' ')}
    >
      <div className="shrink-0 border-b border-white/10 px-4 py-4 lg:py-5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-fal-yellow">FAL ADMIN</p>
            <p className="mt-1 truncate text-sm text-white/65">Painel operacional</p>
          </div>
          <button
            type="button"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-white/80 hover:bg-white/10 lg:hidden"
            aria-label="Fechar menu"
            onClick={closeNav}
          >
            <span className="text-xl leading-none" aria-hidden>
              ×
            </span>
          </button>
        </div>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col" aria-label="Menu admin">
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-3">
          <div>
            <NavLink to="/admin" end className={linkClass} onClick={closeNav}>
              Dashboard
            </NavLink>
          </div>
          <NavSection title="Catálogo" links={catalogNav} onNavigate={closeNav} />
          <NavSection title="Vendas" links={salesNav} onNavigate={closeNav} />
          <NavSection title="Operação" links={opsNav} onNavigate={closeNav} />
        </div>

        <div className="shrink-0 space-y-0.5 border-t border-white/10 p-3">
          <NavLink to="/" className={linkClass} onClick={closeNav}>
            Voltar à loja
          </NavLink>
          <button
            type="button"
            onClick={() => void signOut()}
            title={userLabel}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-white/70 hover:bg-white/10"
          >
            <span className="shrink-0">Sair</span>
            <span className="min-w-0 truncate text-white/45">({userLabel})</span>
          </button>
        </div>
      </nav>
    </aside>
  )

  return (
    <div className="min-h-screen bg-fal-bg lg:flex">
      <ScrollToTop />
      {navOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/45 lg:hidden"
          aria-label="Fechar menu"
          onClick={closeNav}
        />
      ) : null}

      {aside}

      <div ref={contentRef} className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-fal-line bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            className="grid h-11 w-11 min-h-11 min-w-11 place-items-center rounded-lg border border-fal-line bg-fal-bg text-fal-navy"
            aria-label="Abrir menu"
            aria-expanded={navOpen}
            aria-controls="admin-sidebar"
            onClick={() => setNavOpen(true)}
          >
            <span className="flex flex-col gap-1" aria-hidden>
              <span className="block h-0.5 w-4 rounded bg-fal-navy" />
              <span className="block h-0.5 w-4 rounded bg-fal-navy" />
              <span className="block h-0.5 w-4 rounded bg-fal-navy" />
            </span>
          </button>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-fal-navy">FAL ADMIN</p>
            <p className="truncate text-sm font-semibold text-fal-ink">{pageTitle}</p>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 md:p-6">
          {pathAllowed && crumbs.length > 0 ? <AdminBreadcrumbs items={crumbs} /> : null}
          <Suspense fallback={<Loading label="Carregando admin…" />}>
            {pathAllowed ? <Outlet /> : <AdminForbiddenPage />}
          </Suspense>
        </main>
      </div>
    </div>
  )
}
