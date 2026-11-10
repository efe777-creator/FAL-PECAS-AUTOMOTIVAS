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
    to: '/termos' as const,
    label: 'Termos de uso',
  },
  {
    title: 'Trocas e garantia',
    body: 'Política clara de trocas, devoluções e atendimento.',
    to: '/trocas-devolucoes' as const,
    label: 'Trocas e devoluções',
  },
  {
    title: 'Privacidade',
    body: 'Seus dados são tratados conforme a política da loja.',
    to: '/privacidade' as const,
    label: 'Privacidade',
  },
]

/** Bloco curto de confiança — sem selos excessivos. */
export function HomeTrustSection() {
  return (
    <section className="border-t border-fal-line bg-white py-8 sm:py-10" aria-labelledby="home-trust-heading">
      <Container>
        <div className="mb-5 max-w-2xl">
          <h2 id="home-trust-heading" className="m-0 text-[22px] font-extrabold sm:text-[26px]">
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
              className="rounded-[12px] border border-fal-line bg-fal-bg px-4 py-3"
            >
              <p className="m-0 text-sm font-extrabold text-fal-navy">{item.title}</p>
              <p className="mt-1 text-[13px] leading-snug text-fal-muted">{item.body}</p>
              <Link
                to={item.to}
                className="mt-2 inline-block text-xs font-semibold text-fal-navy underline-offset-2 hover:underline"
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
