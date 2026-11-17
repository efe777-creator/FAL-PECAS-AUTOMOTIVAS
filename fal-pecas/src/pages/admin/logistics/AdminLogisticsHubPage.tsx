import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { Link } from 'react-router-dom'

const cards = [
  {
    to: '/admin/logistica/origem',
    title: 'Origem e expedição',
    desc: 'Informe de onde saem os envios e o CEP da loja. Assim o cliente vê fretes e prazos corretos no checkout.',
    ready: true,
  },
  {
    to: '/admin/logistica/frete-proprio',
    title: 'Frete próprio',
    desc: 'Cadastre veículos, valores por km e quais produtos você entrega na região. O site calcula o frete conforme o pedido.',
    ready: true,
  },
  {
    to: '/admin/logistica/prazos',
    title: 'Prazos de entrega',
    desc: 'Defina quantos dias cada forma de envio leva. A loja usa esses prazos e cada pedido guarda o que valia na compra.',
    ready: true,
  },
  {
    to: '/admin/logistica/melhor-envio',
    title: 'Melhor Envio',
    desc: 'Veja se a integração está ativa e quais transportadoras aparecem para o cliente na hora de escolher o frete.',
    ready: true,
  },
  {
    to: '/admin/logistica/caixas',
    title: 'Caixas e embalagens',
    desc: 'Padronize tamanhos de embalagem para o carrinho estimar o frete com mais precisão em um único volume.',
    ready: true,
  },
  {
    to: '/admin/categorias#medidas-padrao',
    title: 'Medidas por classificação',
    desc: 'Peso e dimensões médias por tipo de peça ajudam a cotar o frete quando o produto ainda não tem medida própria.',
    ready: true,
  },
  {
    to: '/admin/logistica/configuracoes',
    title: 'Configurações de envio',
    desc: 'Regras gerais de como cada modalidade de envio se comporta na loja, para você e para o cliente.',
    ready: true,
  },
] as const

export function AdminLogisticsHubPage() {
  useDocumentTitle('Logística | Admin FAL')
  return (
    <div className="space-y-6">
      <div>
        <h1 className="mt-0 text-[28px] font-extrabold text-fal-fg">Logística</h1>
        <p className="m-0 text-sm text-fal-muted">
          Centralize origem, prazos, entrega própria, Melhor Envio e embalagens. O que o cliente vê no
          checkout começa aqui. Expedição e detalhes por pedido ficam em Pedidos.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="block rounded-[14px] border border-fal-line bg-fal-surface p-5 no-underline transition hover:border-fal-navy/40"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="m-0 text-lg font-extrabold text-fal-fg">{c.title}</h2>
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