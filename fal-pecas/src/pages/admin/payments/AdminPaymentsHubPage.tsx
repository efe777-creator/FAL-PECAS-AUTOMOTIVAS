import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { Link } from 'react-router-dom'

const cards = [
  {
    to: '/admin/pagamentos/provedores',
    title: 'Provedores e integrações',
    desc: 'Mercado Pago (atual) e slots para futuros gateways.',
    ready: true,
  },
  {
    to: '/admin/pagamentos/metodos',
    title: 'Métodos de pagamento',
    desc: 'Pix, cartão e entrada Mercado Pago (API e opções).',
    ready: true,
  },
  {
    to: '/admin/pagamentos/metodos/mercado-pago',
    title: 'Mercado Pago',
    desc: 'Ambiente, status da integração, métodos e opções do adaptador.',
    ready: true,
  },
  {
    to: '/admin/home',
    title: 'Parcelas na vitrine',
    desc: 'Condições exibidas na loja (store_payment_display) — Home da loja.',
    ready: true,
  },
  {
    to: '/admin/pedidos/aguardando-pagamento',
    title: 'Transações / pedidos',
    desc: 'Acompanhe pagamentos pelos pedidos (ledger em payments).',
    ready: true,
  },
  {
    to: '/admin/pagamentos/webhooks',
    title: 'Webhooks e eventos',
    desc: 'Painel de reprocessamento — em evolução (payment_events).',
    ready: false,
  },
] as const

export function AdminPaymentsHubPage() {
  useDocumentTitle('Pagamentos | Admin FAL')
  return (
    <div className="space-y-6">
      <div>
        <h1 className="mt-0 text-[28px] font-extrabold text-fal-navy">Pagamentos</h1>
        <p className="m-0 text-sm text-fal-muted">
          A FAL controla a integração. Mercado Pago é o primeiro provedor — o checkout fala com o
          motor FAL, não com detalhes internos do gateway.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="block rounded-[14px] border border-fal-line bg-white p-5 no-underline transition hover:border-fal-navy/40"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="m-0 text-lg font-extrabold text-fal-navy">{c.title}</h2>
              {!c.ready ? (
                <span className="shrink-0 rounded-md bg-fal-line/60 px-2 py-0.5 text-xs font-semibold text-fal-muted">
                  Em breve
                </span>
              ) : null}
            </div>
            <p className="mb-0 mt-2 text-sm text-fal-muted">{c.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
