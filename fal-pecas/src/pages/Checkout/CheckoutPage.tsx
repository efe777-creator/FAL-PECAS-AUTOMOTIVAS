import { Container } from '@/components/layout/Container'
import { EmptyState } from '@/components/common/EmptyState'

export function CheckoutPage() {
  return (
    <Container className="py-8">
      <h1 className="mt-0 text-[28px] font-extrabold sm:text-[34px]">Checkout</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        {['Identificação', 'Endereço', 'Entrega', 'Pagamento'].map((step, i) => (
          <span
            key={step}
            className={[
              'rounded-full px-3 py-2 text-xs font-extrabold',
              i === 0 ? 'bg-fal-yellow text-fal-navy-dark' : 'bg-[#e9edef] text-fal-navy',
            ].join(' ')}
          >
            {i + 1}. {step}
          </span>
        ))}
      </div>
      <div className="mt-6">
        <EmptyState
          title="Checkout estrutural"
          description="Fluxo real de pagamento, frete e criação de pedido será implementado em fase posterior (PRD §8)."
          actionLabel="Voltar ao carrinho"
          actionTo="/carrinho"
        />
      </div>
    </Container>
  )
}
