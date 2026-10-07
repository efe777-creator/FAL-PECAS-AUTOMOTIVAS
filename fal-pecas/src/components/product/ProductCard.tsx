import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { useCart } from '@/contexts/CartContext'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/common/Toast'
import { isFavorite, toggleFavorite } from '@/services/customers/favoriteService'
import { formatMoney } from '@/lib/money'
import { formatLadoLabel, formatPosicaoLabel } from '@/lib/productPosicaoLado'
import { displayPrice } from '@/services/pricing/priceResolutionService'
import type { Product } from '@/types'
import { useEffect, useState, type MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

function formatPrice(value: number) {
  return formatMoney(value)
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
        'relative min-w-0 overflow-hidden rounded-fal border bg-white p-2.5 transition hover:-translate-y-0.5 hover:shadow-fal sm:p-3.5',
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

      <Link to={`/produto/${product.id}`} className="block min-w-0">
        <div className="grid h-[100px] place-items-center rounded-[10px] bg-gradient-to-br from-[#edf0f2] to-[#dfe4e8] text-4xl sm:h-[150px] sm:text-[62px]">
          🧩
        </div>
        <h3
          className="mt-3 mb-1 line-clamp-2 min-h-9 break-words text-xs font-bold leading-snug sm:min-h-[2.7rem] sm:text-[15px]"
          title={product.name}
        >
          {product.name}
        </h3>
        <p className="m-0 truncate text-[11px] text-fal-muted">Código FAL: {product.sku}</p>
        {product.brand || product.manufacturerCode ? (
          <p className="m-0 truncate text-[11px] text-fal-muted">
            {product.brand ? <span>{product.brand}</span> : null}
            {product.brand && product.manufacturerCode ? ' · ' : null}
            {product.manufacturerCode ? (
              <span className="font-mono">{product.manufacturerCode}</span>
            ) : null}
          </p>
        ) : null}
        {product.posicao || product.lado ? (
          <p className="m-0 truncate text-[11px] text-fal-ink">
            {[
              product.posicao ? formatPosicaoLabel(product.posicao) : null,
              product.lado ? formatLadoLabel(product.lado) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        ) : null}
        {product.compatibilitySummary ? (
          <p
            className="my-2 line-clamp-3 break-words text-xs text-fal-success"
            title={product.compatibilitySummary}
          >
            {product.compatibilitySummary}
          </p>
        ) : (
          <p className="my-2 text-xs text-fal-muted">Aplicações sob consulta</p>
        )}
        {product.available === false ? (
          <p className="m-0 text-sm font-bold text-fal-danger">Indisponível</p>
        ) : (
          <p className="m-0 truncate text-lg font-black sm:text-[22px]">{formatPrice(price)}</p>
        )}
        {product.available !== false && showStrike ? (
          <p className="m-0 truncate text-xs text-fal-muted line-through">{formatPrice(listPrice)}</p>
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
        ) : product.available === false ? (
          <div className="flex-1">
            <Button variant="light" size="sm" fullWidth disabled>
              Indisponível
            </Button>
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
