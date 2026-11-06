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
    desc: 'Gerais, veículos, tarifas e produtos elegíveis ao frete da FAL.',
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
    desc: 'Modelos de caixa para cotação de frete (peso e volume do pedido).',
    ready: true,
  },
  {
    to: '/admin/categorias#medidas-padrao',
    title: 'Medidas por classificação',
    desc: 'Peso e dimensões padrão por categoria/grupo/subgrupo; apply respeitando Manual.',
    ready: true,
  },
  {
    to: '/admin/logistica/configuracoes',
    title: 'Configurações de envio',
    desc: 'Regras gerais e validação de medidas.',
    ready: false,
  },
] as const

export function AdminLogisticsHubPage() {
  useDocumentTitle('Logística | Admin FAL')
  return (
    <div className="space-y-6">
      <div>
        <h1 className="mt-0 text-[28px] font-extrabold text-fal-navy">Logística</h1>
        <p className="m-0 text-sm text-fal-muted">
          Configure origem, frete próprio, Melhor Envio e embalagens. Pedidos e expedição ficam na
          área de Pedidos.
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
