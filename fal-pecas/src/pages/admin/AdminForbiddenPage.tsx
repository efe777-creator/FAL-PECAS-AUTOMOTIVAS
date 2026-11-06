import { ButtonLink } from '@/components/common/ButtonLink'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

/** Acesso negado por papel (menu esconde; URL direta ainda chega). */
export function AdminForbiddenPage() {
  useDocumentTitle('Acesso restrito | Admin FAL')
  return (
    <div className="mx-auto max-w-lg rounded-fal border border-fal-line bg-white p-8 text-center">
      <p className="m-0 text-sm font-extrabold uppercase tracking-wide text-fal-muted">
        Sem permissão
      </p>
      <h1 className="mt-2 text-[28px] font-black text-fal-navy sm:text-[32px]">
        Acesso restrito
      </h1>
      <p className="text-fal-muted">
        Seu perfil não inclui esta área do painel. Volte ao dashboard ou peça acesso a um
        administrador.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <ButtonLink to="/admin" variant="primary">
          Ir ao painel
        </ButtonLink>
        <ButtonLink to="/" variant="light">
          Voltar à loja
        </ButtonLink>
      </div>
    </div>
  )
}
