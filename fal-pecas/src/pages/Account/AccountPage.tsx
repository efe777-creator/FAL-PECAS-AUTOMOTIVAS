import { Button } from '@/components/common/Button'
import { Container } from '@/components/layout/Container'
import { useAuth } from '@/contexts/AuthContext'
import { isStaffRole } from '@/services/admin/staffService'
import { Link } from 'react-router-dom'

const menu = [
  { label: 'Dados pessoais', to: '/conta' },
  { label: 'Endereços', to: '/conta' },
  { label: 'Pedidos', to: '/pedidos' },
  { label: 'Favoritos', to: '/conta' },
  { label: 'Segurança', to: '/conta' },
]

export function AccountPage() {
  const { user, signOut } = useAuth()
  const isStaff = isStaffRole(user?.role)

  return (
    <Container className="py-8">
      <h1 className="mt-0 mb-6 text-[28px] font-extrabold sm:text-[34px]">Minha conta</h1>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-fal border border-fal-line bg-white">
          <nav className="grid grid-cols-2 lg:block">
            {menu.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className="block border-b border-fal-line px-3 py-3 text-sm hover:bg-[#f7f8f9]"
              >
                {item.label}
              </Link>
            ))}
            {isStaff ? (
              <Link
                to="/admin"
                className="block border-b border-fal-line px-3 py-3 text-sm font-extrabold text-fal-navy hover:bg-[#f7f8f9]"
              >
                Painel Administrativo
              </Link>
            ) : null}
          </nav>
          <Button variant="danger" fullWidth className="mt-3" onClick={() => void signOut()}>
            Sair
          </Button>
        </aside>
        <section className="rounded-fal border border-fal-line bg-white p-5">
          <h2 className="mt-0 text-xl font-extrabold">Dados pessoais</h2>
          <p className="text-fal-muted">Área estrutural — formulários completos nas próximas fases.</p>
          {isStaff ? (
            <p className="mt-3">
              <Link
                to="/admin"
                className="inline-flex rounded-[10px] bg-fal-navy px-4 py-2.5 text-sm font-extrabold text-white hover:opacity-95"
              >
                Abrir Painel Administrativo
              </Link>
            </p>
          ) : null}
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="font-extrabold text-fal-muted">Nome</dt>
              <dd className="m-0">{user?.fullName ?? '—'}</dd>
            </div>
            <div>
              <dt className="font-extrabold text-fal-muted">E-mail</dt>
              <dd className="m-0">{user?.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="font-extrabold text-fal-muted">Usuário</dt>
              <dd className="m-0">{user?.username ?? '—'}</dd>
            </div>
            <div>
              <dt className="font-extrabold text-fal-muted">Telefone</dt>
              <dd className="m-0">{user?.phone ?? '—'}</dd>
            </div>
            {isStaff ? (
              <div>
                <dt className="font-extrabold text-fal-muted">Perfil</dt>
                <dd className="m-0 capitalize">{user?.role ?? '—'}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      </div>
    </Container>
  )
}
