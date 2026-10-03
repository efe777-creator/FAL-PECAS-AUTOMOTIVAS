import { Link } from 'react-router-dom'

const cards = [
  { to: '/admin/produtos', title: 'Produtos', desc: 'Cadastrar, publicar e arquivar' },
  { to: '/admin/categorias', title: 'Categorias', desc: 'Árvore comercial' },
  { to: '/admin/montadoras', title: 'Montadoras', desc: 'Cadastro de montadoras' },
  { to: '/admin/veiculos', title: 'Veículos', desc: 'Modelos e configurações' },
  { to: '/admin/fabricantes', title: 'Fabricantes', desc: 'Marcas de peça' },
  { to: '/admin/fornecedores', title: 'Fornecedores', desc: 'Fornecedores atuais' },
]

export function AdminDashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-fal-navy">Dashboard</h1>
      <p className="mt-1 text-fal-muted">Administração do catálogo FAL — Fase 3.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="rounded-[14px] border border-fal-line bg-white p-4 shadow-sm transition hover:border-fal-yellow"
          >
            <h2 className="font-extrabold text-fal-navy">{c.title}</h2>
            <p className="mt-1 text-sm text-fal-muted">{c.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
