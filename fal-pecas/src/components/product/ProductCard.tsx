import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { CompatibilityAppsBlock } from '@/components/product/CompatibilityAppsBlock'
import { ProductImageLightbox } from '@/components/product/ProductImageLightbox'
import { ProductImagePlaceholder } from '@/components/product/ProductImagePlaceholder'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import { useToast } from '@/components/common/Toast'
import { isFavorite, toggleFavorite } from '@/services/customers/favoriteService'
import { toCommercialTitleCase } from '@/lib/entityNormalize'
import {
  ADICIONAR_AO_CARRINHO_LABEL,
  FABRICANTE_LABEL,
  VER_PRODUTO_LABEL,
  formatReferenciaFromProduct,
  formatStorePriceLabel,
} from '@/lib/productLabels'
import { formatLadoLabel, formatPosicaoLabel } from '@/lib/productPosicaoLado'
import { displayPrice } from '@/services/pricing/priceResolutionService'
import type { Product } from '@/types'
import { useEffect, useState, type MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export function ProductCard({ product }: { product: Product }) {
  const { user } = useAuth()
  const { items, addItem, updateQty } = useCart()
  const { push } = useToast()
  const navigate = useNavigate()
  const [liked, setLiked] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const price = displayPrice(product)
  const listPrice = product.listPrice ?? product.price
  const showStrike = listPrice > price + 0.001
  const displayName = toCommercialTitleCase(product.name)
  const brandName = product.brand ? toCommercialTitleCase(product.brand) : null
  const productHref = `/produto/${product.id}`
  const available = product.available !== false
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
      navigate('/login', { state: { from: productHref } })
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
    )
  }

  function onDecreaseQty(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!inCart) return
    updateQty(product.id, cartQty - 1)
  }

  function onIncreaseQty(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!available) return
    addItem(product, 1)
    push(`${cartQty + 1} unidades no carrinho`, 'success')
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
        className="absolute top-3.5 right-3.5 z-[2] grid h-8 w-8 place-items-center rounded-full border border-fal-line bg-white/95 text-sm shadow-sm hover:border-fal-navy"
        aria-label={liked ? 'Remover dos favoritos' : 'Favoritar'}
        onClick={(e) => void onFavoriteClick(e)}
      >
        {liked ? '♥' : '♡'}
      </button>

      <div className="mb-1 grid h-[120px] shrink-0 place-items-center overflow-hidden rounded-[10px] bg-gradient-to-br from-[#edf0f2] to-[#dfe4e8] sm:h-[168px]">
        {product.imageUrl ? (
          <button
            type="button"
            className="group relative grid h-full w-full place-items-center"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setLightboxOpen(true)
            }}
            aria-label={`Ampliar imagem de ${displayName}`}
          >
            <img
              src={product.imageUrl}
              alt={displayName}
              className="h-full w-full object-contain transition group-hover:scale-[1.03]"
              loading="lazy"
            />
            <span className="pointer-events-none absolute bottom-1.5 right-1.5 rounded bg-fal-navy/75 px-1.5 py-0.5 text-[10px] font-bold text-white">
              Zoom
            </span>
          </button>
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
          </>
        )}

        {!available ? null : inCart ? (
          <div className="flex w-full min-w-0 items-center gap-1.5">
            <button
              type="button"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-fal-line bg-white text-base font-bold text-fal-navy hover:bg-fal-bg"
              aria-label="Diminuir quantidade"
              onClick={onDecreaseQty}
            >
              −
            </button>
            <div
              className="flex min-w-0 flex-1 flex-col items-center justify-center rounded-[10px] bg-[#fff8db] px-1.5 py-1 text-center"
              aria-live="polite"
            >
              <span className="text-[10px] leading-none text-fal-muted">No carrinho</span>
              <span className="text-sm font-black text-fal-navy">{cartQty}</span>
            </div>
            <button
              type="button"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-transparent bg-fal-yellow text-base font-bold text-fal-navy-dark hover:bg-fal-yellow-hover"
              aria-label="Aumentar quantidade"
              onClick={onIncreaseQty}
            >
              +
            </button>
          </div>
        ) : (
          <Button
            variant="primary"
            size="sm"
            fullWidth
            onClick={onAddToCart}
          >
            {ADICIONAR_AO_CARRINHO_LABEL}
          </Button>
        )}

        <Link to={productHref} className="block">
          <Button variant="light" size="sm" fullWidth>
            {VER_PRODUTO_LABEL}
          </Button>
        </Link>
      </div>

      {product.imageUrl ? (
        <ProductImageLightbox
          images={product.images?.length ? product.images : [product.imageUrl]}
          alt={displayName}
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      ) : null}
    </article>
  )
}

function formatMoneyStrike(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}
