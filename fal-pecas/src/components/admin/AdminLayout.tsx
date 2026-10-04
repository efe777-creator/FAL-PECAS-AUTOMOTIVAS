import { Loading } from '@/components/common/Loading'
import { useAuth } from '@/contexts/AuthContext'
import { Suspense } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

const catalogLinks = [
  { to: '/admin/produtos', label: 'Produtos' },
  { to: '/admin/precos', label: 'Preços' },
  { to: '/admin/categorias', label: 'Categorias' },
  { to: '/admin/montadoras', label: 'Montadoras' },
  { to: '/admin/veiculos', label: 'Veículos' },
  { to: '/admin/fabricantes', label: 'Fabricantes' },
  { to: '/admin/fornecedores', label: 'Fornecedores' },
]

const placeholderLinks = [
  { to: '/admin/pedidos', label: 'Pedidos' },
  { to: '/admin/clientes', label: 'Clientes' },
  { to: '/admin/estoque', label: 'Estoque' },
  { to: '/admin/frete', label: 'Frete / origem' },
  { to: '/admin/relatorios', label: 'Relatórios' },
]

function linkClass({ isActive }: { isActive: boolean }) {
  return [
    'block rounded-lg px-3 py-2 text-sm font-semibold transition',
    isActive ? 'bg-fal-yellow text-fal-navy-dark' : 'text-white/85 hover:bg-white/10',
  ].join(' ')
}

export function AdminLayout() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-fal-bg lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="bg-fal-navy text-white">
        <div className="border-b border-white/10 px-4 py-5">
          <p className="text-xs font-bold uppercase tracking-wider text-fal-yellow">FAL ADMIN</p>
          <p className="mt-1 text-sm text-white/70">Catálogo comercial</p>
        </div>
        <nav className="space-y-4 p-3">
          <div>
            <NavLink to="/admin" end className={linkClass}>
              Dashboard
            </NavLink>
          </div>
          <div>
            <p className="mb-1 px-3 text-[11px] font-bold uppercase tracking-wide text-white/50">
              Catálogo
            </p>
            <div className="space-y-1">
              {catalogLinks.map((l) => (
                <NavLink key={l.to} to={l.to} className={linkClass}>
                  {l.label}
                </NavLink>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 px-3 text-[11px] font-bold uppercase tracking-wide text-white/50">
              Vendas
            </p>
            <div className="space-y-1">
              {placeholderLinks.slice(0, 2).map((l) => (
                <NavLink key={l.to} to={l.to} className={linkClass}>
                  {l.label}
                </NavLink>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 px-3 text-[11px] font-bold uppercase tracking-wide text-white/50">
              Operação
            </p>
            <div className="space-y-1">
              {placeholderLinks.slice(2).map((l) => (
                <NavLink key={l.to} to={l.to} className={linkClass}>
                  {l.label}
                </NavLink>
              ))}
            </div>
          </div>
          <div className="border-t border-white/10 pt-3">
            <NavLink to="/" className={linkClass}>
              Voltar à loja
            </NavLink>
            <button
              type="button"
              onClick={() => void signOut()}
              className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-white/70 hover:bg-white/10"
            >
              Sair ({user?.email ?? user?.fullName ?? 'staff'})
            </button>
          </div>
        </nav>
      </aside>
      <main className="min-w-0 p-4 md:p-6">
        <Suspense fallback={<Loading label="Carregando admin…" />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}
