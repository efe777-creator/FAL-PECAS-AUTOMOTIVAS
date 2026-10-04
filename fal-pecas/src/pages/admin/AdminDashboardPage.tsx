import { Link } from 'react-router-dom'

type DashCard = { to: string; title: string; desc: string }

const sections: { title: string; cards: DashCard[] }[] = [
  {
    title: 'Catálogo',
    cards: [
      { to: '/admin/produtos', title: 'Produtos', desc: 'Cadastrar, publicar e arquivar' },
      { to: '/admin/precos', title: 'Preços', desc: 'Listas comerciais e importação' },
      { to: '/admin/categorias', title: 'Categorias', desc: 'Árvore comercial' },
      { to: '/admin/montadoras', title: 'Montadoras', desc: 'Cadastro de montadoras' },
      { to: '/admin/veiculos', title: 'Veículos', desc: 'Modelos e configurações' },
      { to: '/admin/fabricantes', title: 'Fabricantes', desc: 'Marcas de peça' },
      { to: '/admin/fornecedores', title: 'Fornecedores', desc: 'Fornecedores atuais' },
    ],
  },
  {
    title: 'Vendas',
    cards: [
      { to: '/admin/pedidos', title: 'Pedidos', desc: 'Operação de pedidos (em evolução)' },
      { to: '/admin/clientes', title: 'Clientes', desc: 'Cadastro e consulta (em breve)' },
    ],
  },
  {
    title: 'Operação',
    cards: [
      { to: '/admin/estoque', title: 'Estoque', desc: 'Saldos e movimentações (em breve)' },
      { to: '/admin/frete', title: 'Frete / origem', desc: 'CEP e endereço de origem da loja' },
      { to: '/admin/relatorios', title: 'Relatórios', desc: 'Indicadores operacionais (em breve)' },
    ],
  },
]

export function AdminDashboardPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <h1 className="text-2xl font-extrabold text-fal-navy md:text-3xl">Dashboard</h1>
        <p className="mt-1 max-w-2xl text-sm text-fal-muted md:text-base">
          Atalhos do painel FAL — catálogo, vendas e operação. Use o menu lateral para navegar.
        </p>
      </header>

      {sections.map((section) => (
        <section key={section.title} className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-fal-muted">
            {section.title}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {section.cards.map((c) => (
              <Link
                key={c.to}
                to={c.to}
                className="rounded-[14px] border border-fal-line bg-white p-4 shadow-sm transition hover:border-fal-yellow hover:shadow-md"
              >
                <h3 className="m-0 font-extrabold text-fal-navy">{c.title}</h3>
                <p className="mb-0 mt-1 text-sm text-fal-muted">{c.desc}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
