import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { Link } from 'react-router-dom'

const cards = [
  {
    to: '/admin/logistica/origem',
    title: 'Origem e expedição',
    desc: 'Remetente e endereço da loja (CEP). Base para frete próprio e Melhor Envio.',
    ready: true,
  },
  {
    to: '/admin/logistica/frete-proprio',
    title: 'Frete próprio',
    desc: 'Veículos (capacidade), tarifas por km e produtos elegíveis — cotação do conjunto via capacidade, não caixa.',
    ready: true,
  },
  {
    to: '/admin/logistica/prazos',
    title: 'Prazos de entrega',
    desc: 'Prazos e buffers dos meios (ME, próprio, mock e retirada). Pedidos usam o snapshot.',
    ready: true,
  },
  {
    to: '/admin/logistica/melhor-envio',
    title: 'Melhor Envio',
    desc: 'Status da integração e quais transportadoras aparecem na loja.',
    ready: true,
  },
  {
    to: '/admin/logistica/caixas',
    title: 'Caixas e embalagens',
    desc: 'Modelos padrão: a cotação do carrinho usa a menor caixa que comporta o conjunto (1 volume ME).',
    ready: true,
  },
  {
    to: '/admin/categorias#medidas-padrao',
    title: 'Medidas por classificação',
    desc: 'Peso/dims médios → apply nos produtos (não inventa na cotação). Spec cotação agrupada 13/11.',
    ready: true,
  },
  {
    to: '/admin/logistica/configuracoes',
    title: 'Configurações de envio',
    desc: 'Regras: ME = caixa; FAL = capacidade + km; packing ops re-cota custo sem mudar frete do cliente.',
    ready: true,
  },
] as const

export function AdminLogisticsHubPage() {
  useDocumentTitle('Logística | Admin FAL')
  return (
    <div className="space-y-6">
      <div>
        <h1 className="mt-0 text-[28px] font-extrabold text-fal-navy">Logística</h1>
        <p className="m-0 text-sm text-fal-muted">
          Configure origem, prazos, frete próprio (capacidade + km), Melhor Envio e caixas padrão do
          carrinho. Pedidos e expedição (packing / re-cotação interna) ficam em Pedidos.
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
