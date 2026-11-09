import {
  ADMIN_ORDER_GROUPS,
  adminActorBadgeLabel,
  adminActorKind,
  adminNextActionLabel,
  attentionSortKey,
  isAttentionOrder,
  orderStatusOperatorLabel,
  sumGroupCount,
  visibleStatusesInGroup,
} from '@/lib/adminOrderOps'
import { useAuth } from '@/contexts/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { canAccessAdminPath } from '@/lib/adminNavAccess'
import { formatDateTime } from '@/lib/datetime'
import {
  adminListOrders,
  adminOrderStatusCounts,
  type AdminOrderListRow,
} from '@/services/admin/adminOrderService'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

type DashCard = { to: string; title: string; desc: string }

const sections: { title: string; cards: DashCard[] }[] = [
  {
    title: 'Catálogo',
    cards: [
      { to: '/admin/produtos', title: 'Produtos', desc: 'Cadastrar, publicar e arquivar' },
      { to: '/admin/precos', title: 'Preços', desc: 'Listas comerciais e importação' },
      { to: '/admin/categorias', title: 'Categorias', desc: 'Árvore comercial' },
      { to: '/admin/home', title: 'Home da loja', desc: 'Campanhas e destaques' },
      { to: '/admin/busca', title: 'Busca e sinônimos', desc: 'Documento unificado e sinônimos' },
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

function actorClass(kind: ReturnType<typeof adminActorKind>): string {
  switch (kind) {
    case 'team':
      return 'bg-amber-100 text-amber-950'
    case 'customer':
      return 'bg-sky-100 text-sky-950'
    case 'wait_payment':
      return 'bg-fal-bg text-fal-muted'
    case 'done':
      return 'bg-green-100 text-green-900'
  }
}

export function AdminDashboardPage() {
  useDocumentTitle('Dashboard | Admin FAL')
  const { user } = useAuth()
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [orders, setOrders] = useState<AdminOrderListRow[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const visibleSections = useMemo(
    () =>
      sections
        .map((section) => ({
          ...section,
          cards: section.cards.filter((c) => canAccessAdminPath(c.to, user?.role)),
        }))
        .filter((s) => s.cards.length > 0),
    [user?.role],
  )

  useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        const [c, list] = await Promise.all([adminOrderStatusCounts(), adminListOrders(null)])
        setCounts(c)
        setOrders(list)
        setLoadError(null)
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Falha ao carregar pedidos')
        setCounts({})
        setOrders([])
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const attention = useMemo(() => {
    return orders
      .filter((o) => isAttentionOrder(o.status, o.customerDecision))
      .sort((a, b) => {
        const ka = attentionSortKey(a.status, a.customerDecision)
        const kb = attentionSortKey(b.status, b.customerDecision)
        if (ka !== kb) return ka - kb
        return b.createdAt.localeCompare(a.createdAt)
      })
      .slice(0, 12)
  }, [orders])

  const teamCount = attention.filter(
    (o) => adminActorKind(o.status, o.customerDecision) === 'team',
  ).length
  const customerCount = attention.filter(
    (o) => adminActorKind(o.status, o.customerDecision) === 'customer',
  ).length

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <h1 className="text-2xl font-extrabold text-fal-navy md:text-3xl">Dashboard</h1>
        <p className="mt-1 max-w-2xl text-sm text-fal-muted md:text-base">
          Painel de trabalho dos pedidos: veja a etapa, o que exige ação e abra a fila filtrada.
        </p>
      </header>

      {loadError ? <p className="text-sm text-red-600">{loadError}</p> : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="m-0 text-xs font-bold uppercase tracking-wide text-fal-muted">
            Pedidos que precisam de atenção
          </h2>
          <p className="m-0 text-xs text-fal-muted" aria-live="polite">
            {loading
              ? 'Carregando contagens…'
              : `${teamCount} ação da equipe · ${customerCount} ação do cliente`}
          </p>
        </div>
        {loading ? (
          <p className="rounded-[12px] border border-fal-line bg-white px-4 py-3 text-sm text-fal-muted">
            Carregando pendências…
          </p>
        ) : attention.length === 0 ? (
          <p className="rounded-[12px] border border-fal-line bg-white px-4 py-3 text-sm text-fal-muted">
            Nenhuma pendência operacional na amostra recente. Pedidos só aguardando pagamento ficam
            no bloco Pagamento.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-[14px] border border-fal-line bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-fal-bg text-fal-muted">
                <tr>
                  <th className="px-3 py-2">Pedido</th>
                  <th className="px-3 py-2">Cliente</th>
                  <th className="px-3 py-2">Quando</th>
                  <th className="px-3 py-2">Situação</th>
                  <th className="px-3 py-2">Próxima ação</th>
                </tr>
              </thead>
              <tbody>
                {attention.map((o) => {
                  const kind = adminActorKind(o.status, o.customerDecision)
                  return (
                    <tr key={o.id} className="border-t border-fal-line">
                      <td className="px-3 py-2 font-mono text-xs">
                        <Link
                          to={`/admin/pedidos/${o.id}`}
                          className="font-semibold text-fal-navy underline-offset-2 hover:underline"
                        >
                          {o.id.slice(0, 8)}…
                        </Link>
                      </td>
                      <td className="px-3 py-2">{o.customerName ?? '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-fal-muted">
                        {formatDateTime(o.createdAt)}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${actorClass(kind)}`}
                        >
                          {adminActorBadgeLabel(kind)}
                        </span>
                        <span className="mt-1 block text-xs">
                          {orderStatusOperatorLabel[o.status] ?? o.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs font-semibold text-fal-navy">
                        {adminNextActionLabel(o.status, o.customerDecision)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="m-0 text-xs text-fal-muted">
          <Link to="/admin/pedidos" className="font-semibold text-fal-navy underline">
            Abrir Central de Pedidos →
          </Link>
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wide text-fal-muted">
          Fluxo operacional
        </h2>
        {loading ? (
          <p className="rounded-[14px] border border-fal-line bg-white px-4 py-6 text-sm text-fal-muted">
            Carregando fluxo operacional…
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {ADMIN_ORDER_GROUPS.map((group) => {
              const total = sumGroupCount(counts, group)
              const statuses = visibleStatusesInGroup(group, counts)
              return (
                <div
                  key={group.id}
                  className="rounded-[14px] border border-fal-line bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="m-0 text-base font-extrabold text-fal-navy">{group.title}</h3>
                      <p className="mb-0 mt-1 text-xs text-fal-muted">{group.description}</p>
                    </div>
                    <Link
                      to={`/admin/pedidos/lista?grupo=${group.id}`}
                      className="shrink-0 text-2xl font-black text-fal-navy tabular-nums"
                      title="Abrir listagem do grupo"
                    >
                      {total}
                    </Link>
                  </div>
                  <ul className="mt-3 m-0 list-none space-y-1.5 p-0">
                    {statuses.map((s) => (
                      <li key={s}>
                        <Link
                          to={`/admin/pedidos/lista?status=${s}`}
                          className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-fal-bg"
                        >
                          <span className="text-fal-navy">
                            {orderStatusOperatorLabel[s] ?? s}
                          </span>
                          <span className="font-extrabold tabular-nums text-fal-navy">
                            {counts[s] ?? 0}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {visibleSections.map((section) => (
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
