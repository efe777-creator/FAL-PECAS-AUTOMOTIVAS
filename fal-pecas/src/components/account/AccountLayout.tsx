import { Button } from '@/components/common/Button'
import { Container } from '@/components/layout/Container'
import { useAuth } from '@/contexts/AuthContext'
import { isStaffRole } from '@/services/admin/staffService'
import { Link, NavLink, Outlet } from 'react-router-dom'

const links = [
  { to: '/conta', label: 'Início', end: true },
  { to: '/conta/perfil', label: 'Perfil' },
  { to: '/conta/enderecos', label: 'Endereços' },
  { to: '/conta/veiculos', label: 'Meus veículos' },
  { to: '/conta/favoritos', label: 'Favoritos' },
  { to: '/conta/pedidos', label: 'Meus pedidos' },
]

function navClass({ isActive }: { isActive: boolean }) {
  return [
    'block border-b border-fal-line px-3 py-3 text-sm hover:bg-[#f7f8f9]',
    isActive ? 'font-extrabold text-fal-navy bg-[#f7f8f9]' : '',
  ].join(' ')
}

export function AccountLayout() {
  const { user, signOut } = useAuth()
  const isStaff = isStaffRole(user?.role)
  const firstName = (user?.fullName ?? user?.email ?? 'cliente').split(' ')[0]

  return (
    <Container className="py-8">
      <h1 className="mt-0 mb-2 text-[28px] font-extrabold sm:text-[34px]">Minha conta</h1>
      <p className="mb-6 text-fal-muted">Olá, {firstName}.</p>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-fal border border-fal-line bg-white">
          <nav className="grid grid-cols-2 lg:block">
            {links.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
                {item.label}
              </NavLink>
            ))}
            {isStaff ? (
              <Link
                to="/admin"
                className="col-span-2 block border-b border-fal-line px-3 py-3 text-sm font-extrabold text-fal-navy hover:bg-[#f7f8f9] lg:col-span-1"
              >
                Painel Administrativo
              </Link>
            ) : null}
          </nav>
          <Button variant="danger" fullWidth className="mt-3" onClick={() => void signOut()}>
            Sair
          </Button>
        </aside>
        <section className="min-w-0">
          <Outlet />
        </section>
      </div>
    </Container>
  )
}
