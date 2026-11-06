import { ButtonLink } from '@/components/common/ButtonLink'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

/** 404 dentro do shell admin (`/admin/*` desconhecido). */
export function AdminNotFoundPage() {
  useDocumentTitle('Página não encontrada | Admin FAL')
  return (
    <div className="mx-auto max-w-lg rounded-fal border border-fal-line bg-white p-8 text-center">
      <p className="m-0 text-sm font-extrabold uppercase tracking-wide text-fal-muted">Erro 404</p>
      <h1 className="mt-2 text-[28px] font-black text-fal-navy sm:text-[32px]">
        Página não encontrada
      </h1>
      <p className="text-fal-muted">
        Este endereço não existe no painel. Volte ao dashboard ou escolha um item do menu.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <ButtonLink to="/admin" variant="primary">
          Ir ao painel
        </ButtonLink>
        <ButtonLink to="/admin/pedidos" variant="light">
          Pedidos
        </ButtonLink>
      </div>
    </div>
  )
}
