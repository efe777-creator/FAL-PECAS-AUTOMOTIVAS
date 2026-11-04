import { ADMIN_ORDER_COUNTER_KEYS, orderStatusAdminLabel } from '@/lib/orderLifecycle'
import { adminOrderStatusCounts } from '@/services/admin/adminOrderService'
import { useEffect, useState } from 'react'
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
      { to: '/admin/fabricantes', title: 'Fabricantes', desc: 'Fabricante de peça' },
      { to: '/admin/fornecedores', title: 'Fornecedores', desc: 'Fornecedores atuais' },
    ],
  },
  {
    title: 'Vendas',
    cards: [
      { to: '/admin/pedidos', title: 'Pedidos', desc: 'Recepção, confirmação e operação' },
      { to: '/admin/clientes', title: 'Clientes', desc: 'Consulta e detalhe' },
    ],
  },
  {
    title: 'Operação',
    cards: [
      { to: '/admin/estoque', title: 'Estoque', desc: 'Saldos, movimentos e modo da loja' },
      { to: '/admin/logistica', title: 'Logística', desc: 'Origem, frete próprio, Melhor Envio, configs' },
      { to: '/admin/relatorios', title: 'Relatórios', desc: 'Indicadores operacionais mínimos' },
      {
        to: '/admin/operadores',
        title: 'Operadores',
        desc: 'Liberar ou revogar acesso ao painel por e-mail',
      },
    ],
  },
]

export function AdminDashboardPage() {
  const [counts, setCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    void adminOrderStatusCounts()
      .then(setCounts)
      .catch(() => setCounts({}))
  }, [])

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <h1 className="text-2xl font-extrabold text-fal-navy md:text-3xl">Dashboard</h1>
        <p className="mt-1 max-w-2xl text-sm text-fal-muted md:text-base">
          Atalhos do painel FAL — catálogo, vendas e operação. Use o menu lateral para navegar.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wide text-fal-muted">Pedidos (real)</h2>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {ADMIN_ORDER_COUNTER_KEYS.map((k) => (
            <Link
              key={k}
              to={`/admin/pedidos?status=${k}`}
              className="rounded-[12px] border border-fal-line bg-white px-3 py-2 shadow-sm"
            >
              <div className="text-xs text-fal-muted">{orderStatusAdminLabel[k] ?? k}</div>
              <div className="text-xl font-extrabold text-fal-navy">{counts[k] ?? 0}</div>
            </Link>
          ))}
        </div>
      </section>

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
