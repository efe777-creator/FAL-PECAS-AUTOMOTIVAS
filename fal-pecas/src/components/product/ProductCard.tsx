import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { CompatibilityAppsBlock } from '@/components/product/CompatibilityAppsBlock'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/common/Toast'
import { isFavorite, toggleFavorite } from '@/services/customers/favoriteService'
import { toCommercialTitleCase } from '@/lib/entityNormalize'
import {
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
  const { push } = useToast()
  const navigate = useNavigate()
  const [liked, setLiked] = useState(false)
  const price = displayPrice(product)
  const listPrice = product.listPrice ?? product.price
  const showStrike = listPrice > price + 0.001
  const displayName = toCommercialTitleCase(product.name)
  const brandName = product.brand ? toCommercialTitleCase(product.brand) : null
  const productHref = `/produto/${product.id}`

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

  return (
    <article className="relative min-w-0 overflow-hidden rounded-fal border border-fal-line bg-white p-2.5 transition hover:-translate-y-0.5 hover:shadow-fal sm:p-3.5">
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

      <Link to={productHref} className="block min-w-0">
        <div className="grid h-[100px] place-items-center overflow-hidden rounded-[10px] bg-gradient-to-br from-[#edf0f2] to-[#dfe4e8] text-4xl sm:h-[150px] sm:text-[62px]">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={displayName}
              className="h-full w-full object-contain"
              loading="lazy"
            />
          ) : (
            '🧩'
          )}
        </div>
        <h3
          className="mt-3 mb-1 line-clamp-2 min-h-9 break-words text-xs font-bold leading-snug sm:min-h-[2.7rem] sm:text-[15px]"
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
        {product.available === false ? (
          <p className="m-0 text-sm font-bold text-fal-danger">Indisponível</p>
        ) : (
          <p className="m-0 truncate text-lg font-black sm:text-[22px]">
            {formatStorePriceLabel(price, listPrice)}
          </p>
        )}
        {product.available !== false && showStrike ? (
          <p className="m-0 truncate text-xs text-fal-muted line-through">
            {formatMoneyStrike(listPrice)}
          </p>
        ) : null}
      </Link>

      <div className="mt-3">
        <Link to={productHref} className="block">
          <Button variant="primary" size="sm" fullWidth>
            {VER_PRODUTO_LABEL}
          </Button>
        </Link>
      </div>
    </article>
  )
}

function formatMoneyStrike(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}
