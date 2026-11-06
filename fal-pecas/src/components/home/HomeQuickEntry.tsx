import { ButtonLink } from '@/components/common/ButtonLink'
import { Container } from '@/components/layout/Container'

/**
 * Faixa clara de entrada após o hero de campanhas.
 * Sem segundo “hero” navy — só marca + ações (não compete com o banner).
 */
export function HomeQuickEntry() {
  return (
    <section className="border-b border-fal-line bg-fal-bg">
      <Container className="py-5 sm:py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <div className="min-w-0 max-w-xl">
            <h1 className="m-0 text-[22px] font-black leading-tight tracking-tight text-fal-navy sm:text-[26px]">
              FAL Peças Automotivas
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-fal-muted sm:text-[15px]">
              Encontre a peça no catálogo ou filtre pelo seu veículo.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <ButtonLink to="/catalogo" variant="primary">
              Buscar peça
            </ButtonLink>
            <a
              href="#veiculo"
              className="inline-flex min-h-11 items-center justify-center rounded-fal border border-fal-navy/25 bg-white px-4 text-sm font-bold text-fal-navy no-underline transition hover:border-fal-navy/50 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fal-navy"
            >
              Buscar pelo carro
            </a>
            <a
              href="#categorias"
              className="inline-flex min-h-11 items-center justify-center px-2 text-sm font-semibold text-fal-navy/80 underline-offset-4 hover:text-fal-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fal-navy"
            >
              Categorias
            </a>
          </div>
        </div>
      </Container>
    </section>
  )
}
