import { Button } from '@/components/common/Button'
import { GarageShell } from '@/components/garage/GarageShell'
import { Container } from '@/components/layout/Container'
import { useAuth } from '@/contexts/AuthContext'
import { isStaffRole } from '@/services/admin/staffService'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'

const links = [
  { to: '/conta', label: 'Início', end: true },
  { to: '/conta/perfil', label: 'Perfil' },
  { to: '/conta/enderecos', label: 'Endereços' },
  { to: '/conta/veiculos', label: 'Minha Garagem' },
  { to: '/conta/favoritos', label: 'Favoritos' },
  { to: '/conta/pedidos', label: 'Meus pedidos' },
  { to: '/conta/avisos', label: 'Notificações' },
]

function navClass({ isActive }: { isActive: boolean }) {
  return [
    'inline-flex min-h-11 items-center whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold transition',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fal-accent focus-visible:ring-offset-2',
    'lg:flex lg:w-full lg:border-b-0 lg:border-l-2 lg:px-3 lg:py-3',
    isActive
      ? 'border-fal-accent font-extrabold text-fal-accent'
      : 'border-transparent text-fal-fg hover:bg-fal-surface-2 hover:text-fal-accent',
  ].join(' ')
}

export function AccountLayout() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const isStaff = isStaffRole(user?.role)
  const firstName = (user?.fullName ?? user?.email ?? 'cliente').split(' ')[0]
  const isGarage = location.pathname.startsWith('/conta/veiculos')

  if (isGarage) {
    // Shell próprio da Garagem — sem sidebar/título da Conta (chrome G14).
    return (
      <Container className="py-2 sm:py-3">
        <GarageShell />
      </Container>
    )
  }

  return (
    <Container className="py-6 sm:py-8">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 sm:mb-6">
        <div>
          <h1 className="mt-0 mb-1 text-[24px] font-extrabold text-fal-fg sm:mb-2 sm:text-[34px]">
            Minha conta
          </h1>
          <p className="mb-0 text-fal-muted">Olá, {firstName}.</p>
        </div>
      </div>

      <nav
        className="-mx-1 mb-4 flex gap-1 overflow-x-auto overscroll-x-contain px-1 pb-1 [-webkit-overflow-scrolling:touch] lg:hidden"
        aria-label="Menu da conta"
      >
        {links.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
            {item.label}
          </NavLink>
        ))}
        {isStaff ? (
          <Link
            to="/admin"
            className="inline-flex min-h-11 items-center whitespace-nowrap rounded-[10px] border border-fal-yellow bg-fal-yellow px-3 py-2 text-sm font-extrabold text-fal-navy-dark"
          >
            Admin
          </Link>
        ) : null}
      </nav>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="hidden rounded-fal border border-fal-line bg-fal-surface lg:block">
          <nav className="py-2" aria-label="Menu da conta">
            {links.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
                {item.label}
              </NavLink>
            ))}
            {isStaff ? (
              <Link
                to="/admin"
                className="mt-1 block border-l-2 border-transparent px-3 py-3 text-sm font-extrabold text-fal-fg hover:bg-fal-surface-2"
              >
                Painel Administrativo
              </Link>
            ) : null}
          </nav>
          <div className="border-t border-fal-line p-3">
            <Button variant="outline" fullWidth onClick={() => void signOut()}>
              Sair
            </Button>
          </div>
        </aside>

        <section className="min-w-0">
          <Outlet />
          <div className="mt-6 lg:hidden">
            <Button variant="outline" fullWidth onClick={() => void signOut()}>
              Sair
            </Button>
          </div>
        </section>
      </div>
    </Container>
  )
}
