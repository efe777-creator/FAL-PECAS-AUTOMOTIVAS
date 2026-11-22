import { Container } from '@/components/layout/Container'
import { Link } from 'react-router-dom'

const ITEMS = [
  {
    title: 'Compra digital',
    body: 'Peça certa com aplicação cadastrada na base técnica da FAL.',
    to: '/catalogo' as const,
    label: 'Ver catálogo',
  },
  {
    title: 'Pagamento seguro',
    body: 'Pix e cartão via Mercado Pago, com resumo antes de confirmar.',
    to: '/termos-comerciais' as const,
    label: 'Termos comerciais',
  },
  {
    title: 'Trocas e garantia',
    body: 'Política clara de trocas, devoluções e atendimento.',
    to: '/trocas-devolucoes' as const,
    label: 'Trocas e devoluções',
  },
  {
    title: 'Central de Suporte',
    body: 'Políticas, compromisso da loja e atendimento em um só lugar.',
    to: '/suporte' as const,
    label: 'Ir à Central',
  },
]

/** Bloco curto de confiança — destaque dourado sutil, sem selos excessivos. */
export function HomeTrustSection() {
  return (
    <section
      className="border-t border-fal-line bg-fal-bg py-8 sm:py-10"
      aria-labelledby="home-trust-heading"
    >
      <Container>
        <div className="mb-5 max-w-2xl">
          <p className="m-0 text-[11px] font-bold uppercase tracking-[0.14em] text-fal-yellow-dark dark:text-fal-yellow">
            Confiança
          </p>
          <h2
            id="home-trust-heading"
            className="m-0 mt-1 text-[22px] font-black tracking-tight text-fal-navy dark:text-fal-fg sm:text-[26px]"
          >
            Comprar com segurança
          </h2>
          <p className="mt-1 text-sm text-fal-muted">
            Identificação da loja, condições transparentes e canais oficiais — sem promessas vazias.
          </p>
        </div>
        <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((item) => (
            <li
              key={item.title}
              className="rounded-[12px] border border-fal-line border-l-4 border-l-fal-yellow bg-fal-surface px-4 py-3"
            >
              <p className="m-0 text-sm font-extrabold text-fal-navy dark:text-fal-fg">{item.title}</p>
              <p className="mt-1 text-[13px] leading-snug text-fal-muted">{item.body}</p>
              <Link
                to={item.to}
                className="mt-2 inline-block text-xs font-semibold text-fal-accent underline-offset-2 hover:underline"
              >
                {item.label} →
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
