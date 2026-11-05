import { ButtonLink } from '@/components/common/ButtonLink'
import { Container } from '@/components/layout/Container'

export function NotFoundPage() {
  return (
    <Container className="py-12">
      <div className="mx-auto max-w-lg rounded-fal border border-fal-line bg-white p-8 text-center">
        <p className="m-0 text-sm font-extrabold uppercase tracking-wide text-fal-muted">Erro 404</p>
        <h1 className="mt-2 text-[32px] font-black text-fal-navy">Página não encontrada</h1>
        <p className="text-fal-muted">
          O endereço pode ter mudado ou o link está incompleto. Busque a peça no catálogo ou volte ao
          início.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <ButtonLink to="/" variant="primary">
            Ir para o início
          </ButtonLink>
          <ButtonLink to="/catalogo" variant="light">
            Ver catálogo
          </ButtonLink>
        </div>
      </div>
    </Container>
  )
}
