import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { useCart } from '@/contexts/CartContext'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/common/Toast'
import { isFavorite, toggleFavorite } from '@/services/customers/favoriteService'
import { displayPrice } from '@/services/pricing/priceResolutionService'
import type { Product } from '@/types'
import { useEffect, useState, type MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function ProductCard({ product }: { product: Product }) {
  const { addItem, items, updateQty } = useCart()
  const { user } = useAuth()
  const { push } = useToast()
  const navigate = useNavigate()
  const [liked, setLiked] = useState(false)
  const price = displayPrice(product)
  const listPrice = product.listPrice ?? product.price
  const showStrike = listPrice > price + 0.001
  const cartQty = items.find((i) => i.productId === product.id)?.quantity ?? 0
  const inCart = cartQty > 0

  useEffect(() => {
    if (!user) {
      setLiked(false)
      return
    }
    void isFavorite(product.id)
      .then(setLiked)
      .catch(() => setLiked(false))
  }, [user, product.id])

  async function onFavoriteClick(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!user) {
      navigate('/login', { state: { from: `/produto/${product.id}` } })
      return
    }
    try {
      const next = await toggleFavorite(product.id)
      setLiked(next)
      push(next ? 'Adicionado aos favoritos' : 'Removido dos favoritos', 'success')
    } catch (err) {
      push(err instanceof Error ? err.message : 'Erro ao favoritar', 'error')
    }
  }

  return (
    <article
      className={[
        'relative rounded-fal border bg-white p-2.5 transition hover:-translate-y-0.5 hover:shadow-fal sm:p-3.5',
        inCart ? 'border-fal-yellow-dark' : 'border-fal-line',
      ].join(' ')}
    >
      {showStrike ? (
        <div className="absolute top-3.5 left-3.5 z-[1]">
          <Badge>Oferta</Badge>
        </div>
      ) : null}

      <button
        type="button"
        className="absolute top-3.5 right-3.5 z-[2] grid h-8 w-8 place-items-center rounded-full border border-fal-line bg-white/95 text-sm shadow-sm hover:border-fal-navy"
        aria-label={liked ? 'Remover dos favoritos' : 'Favoritar'}
        onClick={(e) => void onFavoriteClick(e)}
      >
        {liked ? '♥' : '♡'}
      </button>

      <Link to={`/produto/${product.id}`} className="block">
        <div className="grid h-[100px] place-items-center rounded-[10px] bg-gradient-to-br from-[#edf0f2] to-[#dfe4e8] text-4xl sm:h-[150px] sm:text-[62px]">
          🧩
        </div>
        <p className="mt-3 mb-0 text-xs text-fal-muted">{product.brand}</p>
        <h3 className="my-1 h-9 overflow-hidden text-xs font-bold sm:h-[43px] sm:text-[15px]">
          {product.name}
        </h3>
        <p className="m-0 text-[11px] text-fal-muted">SKU {product.sku}</p>
        {product.compatibilitySummary ? (
          <p className="my-2 text-xs text-fal-success">{product.compatibilitySummary}</p>
        ) : null}
        <p className="m-0 text-lg font-black sm:text-[22px]">{formatPrice(price)}</p>
        {showStrike ? (
          <p className="m-0 text-xs text-fal-muted line-through">{formatPrice(listPrice)}</p>
        ) : null}
      </Link>

      <div className="mt-3 flex gap-2">
        <Link to={`/produto/${product.id}`} className="hidden flex-1 sm:block">
          <Button variant="light" size="sm" fullWidth>
            Ver
          </Button>
        </Link>

        {inCart ? (
          <div className="flex flex-1 items-center gap-1">
            <button
              type="button"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-fal-line bg-white text-base font-bold text-fal-navy hover:bg-fal-bg"
              aria-label="Diminuir quantidade"
              onClick={() => updateQty(product.id, cartQty - 1)}
            >
              −
            </button>
            <div className="flex min-w-0 flex-1 flex-col items-center justify-center rounded-[10px] bg-[#fff8db] px-1 py-1 text-center">
              <span className="text-[10px] leading-none text-fal-muted">No carrinho</span>
              <span className="text-sm font-black text-fal-navy">{cartQty}</span>
            </div>
            <button
              type="button"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-transparent bg-fal-yellow text-base font-bold text-fal-navy-dark hover:bg-fal-yellow-hover"
              aria-label="Aumentar quantidade"
              onClick={() => {
                addItem(product, 1)
                push('Quantidade atualizada', 'success')
              }}
            >
              +
            </button>
          </div>
        ) : (
          <div className="flex-1">
            <Button
              variant="primary"
              size="sm"
              fullWidth
              onClick={() => {
                addItem(product, 1)
                push('Produto adicionado ao carrinho', 'success')
              }}
            >
              Adicionar
            </Button>
          </div>
        )}
      </div>
    </article>
  )
}
