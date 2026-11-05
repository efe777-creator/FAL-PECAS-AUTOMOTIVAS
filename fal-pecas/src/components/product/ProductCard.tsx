import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { CompatibilityAppsBlock } from '@/components/product/CompatibilityAppsBlock'
import { PaymentConditionHint } from '@/components/product/PaymentConditionHint'
import { ProductImagePlaceholder } from '@/components/product/ProductImagePlaceholder'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import { useFavorites } from '@/contexts/FavoritesContext'
import { useToast } from '@/components/common/Toast'
import { toCommercialTitleCase } from '@/lib/entityNormalize'
import { productHref as productPath } from '@/lib/productHref'
import {
  ADICIONAR_AO_CARRINHO_LABEL,
  COMPRAR_AGORA_LABEL,
  FABRICANTE_LABEL,
  formatReferenciaFromProduct,
  formatStorePriceLabel,
} from '@/lib/productLabels'
import { formatLadoLabel, formatPosicaoLabel } from '@/lib/productPosicaoLado'
import { displayPrice } from '@/services/pricing/priceResolutionService'
import type { Product } from '@/types'
import { type MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export function ProductCard({ product }: { product: Product }) {
  const { user } = useAuth()
  const { items, addItem } = useCart()
  const { isFavorite, toggle } = useFavorites()
  const { push } = useToast()
  const navigate = useNavigate()
  const liked = isFavorite(product.id)
  const price = displayPrice(product)
  const listPrice = product.listPrice ?? product.price
  const showStrike = listPrice > price + 0.001
  const displayName = toCommercialTitleCase(product.name)
  const brandName = product.brand ? toCommercialTitleCase(product.brand) : null
  const productHref = productPath(product)
  const available = product.available !== false
  const cartQty = items.find((i) => i.productId === product.id)?.quantity ?? 0
  const inCart = cartQty > 0

  async function onFavoriteClick(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!user) {
      navigate('/login', { state: { from: productHref } })
      return
    }
    try {
      const next = await toggle(product.id)
      push(next ? 'Adicionado aos favoritos' : 'Removido dos favoritos', 'success')
    } catch (err) {
      push(err instanceof Error ? err.message : 'Erro ao favoritar', 'error')
    }
  }

  function onAddToCart(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!available) return
    addItem(product, 1)
    const next = cartQty + 1
    push(
      next === 1
        ? 'Produto adicionado ao carrinho'
        : `${next} unidades no carrinho`,
      'success',
      { action: { label: 'Ver carrinho', to: '/carrinho' } },
    )
  }

  /** Garante item no carrinho (sem incrementar se já está) e vai ao carrinho. */
  function onBuyNow(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!available) return
    if (!inCart) addItem(product, 1)
    navigate('/carrinho')
  }

  return (
    <article className="relative flex h-full min-w-0 flex-col overflow-hidden rounded-fal border border-fal-line bg-white p-2.5 transition hover:-translate-y-0.5 hover:shadow-fal sm:p-3.5">
      {showStrike ? (
        <div className="absolute top-3.5 left-3.5 z-[1]">
          <Badge>Oferta</Badge>
        </div>
      ) : null}

      <button
        type="button"
        className="absolute top-3.5 right-3.5 z-[2] grid h-11 w-11 place-items-center rounded-full border border-fal-line bg-white/95 text-base shadow-sm hover:border-fal-navy"
        aria-label={liked ? 'Remover dos favoritos' : 'Favoritar'}
        onClick={(e) => void onFavoriteClick(e)}
      >
        {liked ? '♥' : '♡'}
      </button>

      <div className="mb-1 grid h-[120px] shrink-0 place-items-center overflow-hidden rounded-[10px] bg-gradient-to-br from-[#edf0f2] to-[#dfe4e8] sm:h-[168px]">
        {product.imageUrl ? (
          <Link
            to={productHref}
            className="group relative grid h-full w-full place-items-center"
            aria-label={`Ver ${displayName}`}
          >
            <img
              src={product.imageUrl}
              alt={displayName}
              className="h-full w-full object-contain transition group-hover:scale-[1.03]"
              loading="lazy"
            />
          </Link>
        ) : (
          <ProductImagePlaceholder className="scale-75" />
        )}
      </div>

      <Link to={productHref} className="flex min-h-0 min-w-0 flex-1 flex-col">
        <h3
          className="mt-2 mb-1 line-clamp-2 min-h-9 break-words text-xs font-bold leading-snug sm:min-h-[2.7rem] sm:text-[15px]"
          title={displayName}
        >
          {displayName}
        </h3>
        <p className="m-0 truncate text-[11px] text-fal-muted">
          {formatReferenciaFromProduct(product)}
        </p>
        {product.categoryName ? (
          <p className="m-0 truncate text-[11px] text-fal-muted">
            {product.categorySlug ? (
              <Link
                to={`/catalogo?cat=${encodeURIComponent(product.categorySlug)}`}
                className="hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {product.categoryName}
              </Link>
            ) : (
              product.categoryName
            )}
          </p>
        ) : null}
        {brandName || product.manufacturerCode ? (
          <p className="m-0 truncate text-[11px] text-fal-muted">
            {brandName ? (
              <span>
                {FABRICANTE_LABEL}: {brandName}
              </span>
            ) : null}
            {brandName && product.manufacturerCode ? ' · ' : null}
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
        <CompatibilityAppsBlock
          className="my-2 text-xs"
          variant="card"
          groups={product.compatibilityGroups}
          summary={product.compatibilitySummary}
        />
      </Link>

      <div className="mt-auto flex shrink-0 flex-col gap-2 pt-2">
        {!available ? (
          <p className="m-0 text-sm font-bold text-fal-danger">Indisponível</p>
        ) : (
          <>
            <p className="m-0 truncate text-lg font-black sm:text-[22px]">
              {formatStorePriceLabel(price, listPrice)}
            </p>
            {showStrike ? (
              <p className="m-0 -mt-1 truncate text-xs text-fal-muted line-through">
                {formatMoneyStrike(listPrice)}
              </p>
            ) : null}
            <PaymentConditionHint amount={price} surface="card" />
          </>
        )}

        {available && inCart ? (
          <p
            className="m-0 w-fit max-w-full truncate rounded-full bg-[#fff8db] px-2.5 py-1 text-xs font-bold text-fal-navy"
            aria-live="polite"
          >
            No carrinho: {cartQty}
          </p>
        ) : null}

        {available ? (
          <>
            <Button variant="primary" size="sm" fullWidth onClick={onBuyNow}>
              {COMPRAR_AGORA_LABEL}
            </Button>
            <Button variant="light" size="sm" fullWidth onClick={onAddToCart}>
              {ADICIONAR_AO_CARRINHO_LABEL}
            </Button>
          </>
        ) : null}
      </div>
    </article>
  )
}

function formatMoneyStrike(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}
