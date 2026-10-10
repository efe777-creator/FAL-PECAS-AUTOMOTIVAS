import { Button } from '@/components/common/Button'
import { Container } from '@/components/layout/Container'
import { EmptyState } from '@/components/common/EmptyState'
import { CartShippingQuoteBlock } from '@/components/cart/CartShippingQuoteBlock'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import { formatMoney } from '@/lib/money'
import { formatReferenciaFromProduct } from '@/lib/productLabels'
import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'

export function CartPage() {
  const { user } = useAuth()
  const { items, itemCount, subtotal, updateQty, removeItem } = useCart()
  const [shippingAmount, setShippingAmount] = useState<number | null>(null)
  const onShippingAmountChange = useCallback((amount: number | null) => {
    setShippingAmount(amount)
  }, [])

  if (!items.length) {
    return (
      <Container className="py-8">
        <h1 className="mt-0 text-[28px] font-extrabold sm:text-[34px]">Carrinho</h1>
        <EmptyState
          title="Seu carrinho está vazio"
          description="Adicione peças pelo início ou pelo catálogo."
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
          {items.map((item) => {
            const productHref = `/produto/${item.productId}`
            return (
              <div
                key={item.productId}
                className="grid grid-cols-[86px_1fr_auto] gap-4 border-b border-fal-line py-4 last:border-0"
              >
                <Link
                  to={productHref}
                  className="grid h-[75px] place-items-center overflow-hidden rounded-[9px] bg-[#e9edef] text-3xl no-underline"
                  aria-label={`Abrir produto ${item.name}`}
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="h-full w-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    '🧩'
                  )}
                </Link>
                <div className="min-w-0">
                  <h3 className="m-0 text-base font-bold">
                    <Link
                      to={productHref}
                      className="text-fal-navy no-underline hover:underline"
                    >
                      {item.name}
                    </Link>
                  </h3>
                  <p className="m-0 text-xs text-fal-muted">
                    <Link to={productHref} className="text-inherit no-underline hover:underline">
                      {formatReferenciaFromProduct({
                        commercialRef: item.commercialRef,
                        sku: item.sku,
                      })}
                    </Link>
                  </p>
                  <p className="mb-0 mt-1">
                    <Link
                      to={productHref}
                      className="text-xs font-extrabold text-fal-navy underline"
                    >
                      Ver produto
                    </Link>
                  </p>
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
                <Link
                  to={productHref}
                  className="text-right font-black text-fal-ink no-underline hover:text-fal-navy"
                  aria-label={`Abrir produto ${item.name} — total`}
                >
                  {formatMoney(item.price * item.quantity)}
                </Link>
              </div>
            )
          })}
        </div>
        <aside className="h-max rounded-fal border border-fal-line bg-white p-5">
          <div className="mb-3 flex justify-between">
            <span>Subtotal</span>
            <strong>
              {formatMoney(subtotal)}
            </strong>
          </div>
          <CartShippingQuoteBlock
            items={items}
            subtotal={subtotal}
            onShippingAmountChange={onShippingAmountChange}
          />
          <div className="mb-3 flex justify-between text-fal-muted">
            <span>Frete</span>
            <span>{shippingAmount != null ? formatMoney(shippingAmount) : 'A calcular'}</span>
          </div>
          <div className="flex justify-between border-t border-fal-line pt-3 text-2xl font-black">
            <span>Total</span>
            <span>{formatMoney(subtotal + (shippingAmount ?? 0))}</span>
          </div>
          <Link
            to={user ? '/checkout' : '/login'}
            state={user ? undefined : { from: '/checkout' }}
            className="mt-4 block"
          >
            <Button variant="primary" fullWidth>
              {user ? 'Finalizar compra' : 'Entrar para finalizar'}
            </Button>
          </Link>
          <p className="mt-3 text-xs text-fal-muted">
            Cotação do conjunto no carrinho; o checkout revalida frete e pagamento.
          </p>
        </aside>
      </div>
    </Container>
  )
}
