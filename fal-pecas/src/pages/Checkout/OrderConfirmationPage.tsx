import { ButtonLink } from '@/components/common/ButtonLink'
import { Container } from '@/components/layout/Container'
import { useParams } from 'react-router-dom'

export function OrderConfirmationPage() {
  const { id } = useParams<{ id: string }>()
  const short = id ? id.slice(0, 8) : '—'

  return (
    <Container className="py-10">
      <div className="mx-auto max-w-lg rounded-fal border border-fal-line bg-white p-8 text-center">
        <p className="m-0 text-4xl" aria-hidden>
          ✓
        </p>
        <h1 className="mt-3 text-[28px] font-black text-fal-navy">Pedido recebido</h1>
        <p className="text-fal-muted">
          Obrigado! Seu pedido <strong>#{short}</strong> foi registrado. Acompanhe o status e o
          pagamento na área da conta.
        </p>
        <ul className="mx-auto mt-4 max-w-sm list-disc space-y-1 pl-5 text-left text-sm text-fal-ink">
          <li>Confira o pagamento (Pix ou cartão), se ainda estiver pendente.</li>
          <li>Acompanhe a separação e o envio em Meus pedidos.</li>
          <li>Guarde o número do pedido para atendimento.</li>
        </ul>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {id ? (
            <ButtonLink to={`/conta/pedidos/${id}`} variant="primary">
              Acompanhar pedido
            </ButtonLink>
          ) : null}
          <ButtonLink to="/catalogo" variant="light">
            Continuar comprando
          </ButtonLink>
        </div>
      </div>
    </Container>
  )
}
