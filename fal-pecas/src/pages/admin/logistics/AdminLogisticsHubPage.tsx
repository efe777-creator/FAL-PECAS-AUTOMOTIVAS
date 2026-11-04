import { Link } from 'react-router-dom'

const cards = [
  {
    to: '/admin/logistica/origem',
    title: 'Origem e expedição',
    desc: 'Origem da loja: remetente + endereço (CEP/ViaCEP). Base para frete próprio e Melhor Envio.',
    ready: true,
  },
  {
    to: '/admin/logistica/frete-proprio',
    title: 'Frete próprio',
    desc: 'Ativação, faixas CEP (SP capital) e tabela editável — cotação sob D-FRETE B.',
    ready: true,
  },
  {
    to: '/admin/logistica/melhor-envio',
    title: 'Melhor Envio',
    desc: 'Cotação nacional via intermediador — exige secrets + MARCHA; live ≠ B.',
    ready: false,
  },
  {
    to: '/admin/logistica/configuracoes',
    title: 'Configurações de envio',
    desc: 'Regras gerais, validação de medidas, comportamento de cotação.',
    ready: false,
  },
] as const

export function AdminLogisticsHubPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="mt-0 text-[28px] font-extrabold text-fal-navy">Logística</h1>
        <p className="m-0 text-sm text-fal-muted">
          Hub de configuração. Medidas de produto ficam em Produtos; Pedidos só opera.
          Política vigente: D-FRETE <strong>B</strong> (sandbox/mock).
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
      <p className="text-xs text-fal-muted">
        Plano:{' '}
        <code className="text-[11px]">FAL_PLANO_FUNCIONAL_LOGISTICA_MEDIDAS_2026-11-04.md</code>
      </p>
    </div>
  )
}
