import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { Link } from 'react-router-dom'

const LINKS = [
  {
    to: '/admin/logistica/origem',
    title: 'Origem e expedição',
    desc: 'CEP e remetente usados em toda cotação e etiqueta.',
  },
  {
    to: '/admin/logistica/caixas',
    title: 'Caixas e embalagens',
    desc: 'Menor caixa que comporta peso e volume do pedido (1 caixa por cotação).',
  },
  {
    to: '/admin/categorias#medidas-padrao',
    title: 'Medidas por classificação',
    desc: 'Padrões de peso/dimensão por categoria; apply respeita origem Manual.',
  },
  {
    to: '/admin/logistica/melhor-envio',
    title: 'Melhor Envio',
    desc: 'Serviços visíveis na loja. Etiqueta só na Expedição do pedido.',
  },
  {
    to: '/admin/logistica/frete-proprio',
    title: 'Frete próprio',
    desc: 'Tarifas e cobertura da FAL (ativado só com aceite comercial).',
  },
] as const

/** ME-C7 leve: regras atuais documentadas + atalhos (toggles persistidos = fatia futura). */
export function AdminShippingSettingsPage() {
  useDocumentTitle('Configurações de envio | Admin FAL')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="mt-0 text-[28px] font-extrabold text-fal-navy">
          Configurações de envio
        </h1>
        <p className="m-0 text-sm text-fal-muted">
          Visão das regras já ativas na cotação. Ajustes avançados (flags) entram depois — por
          enquanto use os módulos abaixo.
        </p>
      </div>

      <section className="rounded-[14px] border border-fal-line bg-white p-4 sm:p-5">
        <h2 className="m-0 text-base font-extrabold text-fal-navy">Como a cotação se comporta hoje</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-fal-ink">
          <li>
            Produto sem peso/medidas úteis não entra bem na cotação — preencha medidas ou aplique o
            padrão da classificação.
          </li>
          <li>
            Com caixas ativas, o sistema escolhe a <strong>menor caixa</strong> que comporta volume e
            peso do conjunto (uma caixa por cotação).
          </li>
          <li>
            Sem caixa adequada, a cotação Melhor Envio pode ser recusada (não inventa envelope).
          </li>
          <li>
            Origem da loja (CEP/remetente) é obrigatória para frete próprio e Melhor Envio.
          </li>
          <li>
            Compra/impressão de etiqueta Melhor Envio só na <strong>Expedição</strong> do pedido —
            nunca no pagamento automático.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="m-0 text-base font-extrabold text-fal-navy">Módulos relacionados</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="block rounded-[14px] border border-fal-line bg-white p-4 no-underline transition hover:border-fal-navy/40"
            >
              <h3 className="m-0 text-sm font-extrabold text-fal-navy">{l.title}</h3>
              <p className="mb-0 mt-1 text-sm text-fal-muted">{l.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
