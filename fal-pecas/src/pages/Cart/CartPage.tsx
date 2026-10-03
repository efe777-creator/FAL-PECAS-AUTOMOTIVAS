import { Button } from '@/components/common/Button'
import { Container } from '@/components/layout/Container'
import { EmptyState } from '@/components/common/EmptyState'
import { useCart } from '@/contexts/CartContext'
import { Link } from 'react-router-dom'

export function CartPage() {
  const { items, itemCount, subtotal, updateQty, removeItem } = useCart()

  if (!items.length) {
    return (
      <Container className="py-8">
        <h1 className="mt-0 text-[28px] font-extrabold sm:text-[34px]">Carrinho</h1>
        <EmptyState
          title="Seu carrinho está vazio"
          description="Adicione peças pela Home ou pelo catálogo. Persistência atual: localStorage (visitante)."
          actionLabel="Explorar catálogo"
          actionTo="/catalogo"
        />
      </Container>
    )
  }

  return (
    <Container className="py-8">
      <h1 className="mt-0 mb-6 text-[28px] font-extrabold sm:text-[34px]">
        Carrinho ({itemCount})
      </h1>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_350px]">
        <div className="rounded-fal border border-fal-line bg-white p-5">
          {items.map((item) => (
            <div
              key={item.productId}
              className="grid grid-cols-[86px_1fr_auto] gap-4 border-b border-fal-line py-4 last:border-0"
            >
              <div className="grid h-[75px] place-items-center rounded-[9px] bg-[#e9edef] text-3xl">
                🧩
              </div>
              <div>
                <h3 className="m-0 text-base font-bold">{item.name}</h3>
                <p className="m-0 text-xs text-fal-muted">SKU {item.sku}</p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    className="h-9 w-9 rounded-[7px] border border-fal-line bg-white"
                    onClick={() => updateQty(item.productId, item.quantity - 1)}
                  >
                    −
                  </button>
                  <span className="min-w-[30px] text-center font-extrabold">{item.quantity}</span>
                  <button
                    type="button"
                    className="h-9 w-9 rounded-[7px] border border-fal-line bg-white"
                    onClick={() => updateQty(item.productId, item.quantity + 1)}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="ml-2 text-sm font-bold text-fal-danger"
                    onClick={() => removeItem(item.productId)}
                  >
                    Remover
                  </button>
                </div>
              </div>
              <div className="text-right font-black">
                {(item.price * item.quantity).toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </div>
            </div>
          ))}
        </div>
        <aside className="h-max rounded-fal border border-fal-line bg-white p-5">
          <div className="mb-3 flex justify-between">
            <span>Subtotal</span>
            <strong>
              {subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </strong>
          </div>
          <div className="mb-3 flex justify-between text-fal-muted">
            <span>Frete</span>
            <span>A calcular</span>
          </div>
          <div className="flex justify-between border-t border-fal-line pt-3 text-2xl font-black">
            <span>Total</span>
            <span>
              {subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          <Link to="/checkout" className="mt-4 block">
            <Button variant="primary" fullWidth>
              Ir para checkout
            </Button>
          </Link>
          <p className="mt-3 text-xs text-fal-muted">
            Checkout real (pagamento/frete) fora da Fase 1.
          </p>
        </aside>
      </div>
    </Container>
  )
}
