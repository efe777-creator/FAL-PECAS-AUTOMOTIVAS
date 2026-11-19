import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { CompatibilityAppsBlock } from '@/components/product/CompatibilityAppsBlock'
import { CompatibilityStateBadge } from '@/components/product/CompatibilityStateBadge'
import {
  PaymentConditionHint,
  useStorefrontDisplayAmount,
} from '@/components/product/PaymentConditionHint'
import { ProductImagePlaceholder } from '@/components/product/ProductImagePlaceholder'
import {
  ProductMediaFrame,
  productMediaImgClassCard,
} from '@/components/product/ProductMediaFrame'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import { useFavorites } from '@/contexts/FavoritesContext'
import { useGarageOptional } from '@/contexts/GarageContext'
import {
  classifyCompatibility,
  resolveCardSeal,
  vehicleFilterToCompatInput,
  type CompatibilityVerdict,
  type PvcCompatRow,
} from '@/services/compatibility/compatibilityEngine'
import { loadPvcEvidenceByProductIds } from '@/services/compatibility/loadPvcEvidence'
import { buildVehicleSnapshotFromActive } from '@/services/garage/vehicleSnapshot'
import { confirmDialog } from '@/components/common/ConfirmDialog'
import { useToast } from '@/components/common/Toast'
import { useHomePresentation } from '@/hooks/useHomePresentation'
import { trackAddToCart } from '@/lib/analytics'
import { toCommercialTitleCase } from '@/lib/entityNormalize'
import { toUserMessage } from '@/lib/toUserMessage'
import { productHref as productPath } from '@/lib/productHref'
import {
  ADICIONAR_AO_CARRINHO_LABEL,
  COMPRAR_AGORA_LABEL,
  FABRICANTE_LABEL,
  formatReferenciaFromProduct,
  formatStorePriceLabel,
} from '@/lib/productLabels'
import { formatMoney } from '@/lib/money'
import { formatLadoLabel, formatPosicaoLabel } from '@/lib/productPosicaoLado'
import {
  formatOfertaBadgeLabel,
  resolvePromoOffer,
} from '@/lib/promoPresentation'
import { saveBuyNowIntent } from '@/services/checkout/buyNowSession'
import { saveCheckoutReturnTo } from '@/services/checkout/checkoutReturnTo'
import { displayPrice } from '@/services/pricing/priceResolutionService'
import type { Product, VehicleFilter } from '@/types'
import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

type Props = {
  product: Product
  /**
   * Evidência PVC (E.1).
   * - omitido (`undefined`): o card carrega PVC sozinho
   * - `null`: pai ainda carregando (sem selo)
   * - array: evidência pronta
   */
  pvcRows?: PvcCompatRow[] | null
  /** Fit M25 já resolvido (chip ou URL). Se omitido, usa só garage.activeFilter. */
  fitFilter?: VehicleFilter | null
}

export function ProductCard({ product, pvcRows, fitFilter }: Props) {
  const { user } = useAuth()
  const { items, addItem } = useCart()
  const { isFavorite, toggle } = useFavorites()
  const garage = useGarageOptional()
  const { push } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const presentation = useHomePresentation()
  const liked = isFavorite(product.id)
  const price = displayPrice(product)
  const storefrontPrice = useStorefrontDisplayAmount(price)
  const listPrice = product.listPrice ?? product.price
  const offer = resolvePromoOffer(listPrice, price)
  const displayName = toCommercialTitleCase(product.name)
  const brandName = product.brand ? toCommercialTitleCase(product.brand) : null
  const productHref = productPath(product)
  const returnFrom = `${location.pathname}${location.search}`
  const pdpLinkState = { from: returnFrom }
  const available = product.available !== false
  const cartQty = items.find((i) => i.productId === product.id)?.quantity ?? 0
  const inCart = cartQty > 0

  const effectiveFit = fitFilter !== undefined ? fitFilter : garage?.activeFilter ?? null
  const [selfPvc, setSelfPvc] = useState<PvcCompatRow[] | null>(null)
  const parentOwnsPvc = pvcRows !== undefined

  useEffect(() => {
    if (parentOwnsPvc) return
    const input = vehicleFilterToCompatInput(effectiveFit)
    if (!input) {
      setSelfPvc(null)
      return
    }
    let cancelled = false
    void loadPvcEvidenceByProductIds([product.id])
      .then((map) => {
        if (!cancelled) setSelfPvc(map.get(product.id) ?? [])
      })
      .catch(() => {
        if (!cancelled) setSelfPvc([])
      })
    return () => {
      cancelled = true
    }
  }, [parentOwnsPvc, effectiveFit, product.id])

  const resolvedPvc = parentOwnsPvc ? pvcRows : selfPvc

  const compatVerdict: CompatibilityVerdict | null = useMemo(() => {
    const input = vehicleFilterToCompatInput(effectiveFit)
    if (!input) return null
    // Sem PVC ainda: não inventar selo com apps fraca.
    if (resolvedPvc == null) return null
    return classifyCompatibility(input, resolvedPvc)
  }, [effectiveFit, resolvedPvc])

  const showSeal = Boolean(compatVerdict && resolveCardSeal(compatVerdict).kind !== 'hide')
  const hasFitContext = Boolean(vehicleFilterToCompatInput(effectiveFit))

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
      push(toUserMessage(err, 'Erro ao favoritar'), 'error')
    }
  }

  async function onAddToCart(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!available) return
    if (compatVerdict?.state === 'probable') {
      const { confirmed } = await confirmDialog({
        title: 'Compatibilidade similar',
        message:
          'Esta peça parece compatível, mas faltam dados para confirmar. Deseja adicionar mesmo assim?',
        confirmLabel: 'Adicionar mesmo assim',
      })
      if (!confirmed) return
    }
    addItem(product, 1)
    trackAddToCart({
      itemId: product.id,
      itemName: toCommercialTitleCase(product.name),
      price,
      quantity: 1,
    })
    const next = cartQty + 1
    push(
      next === 1
        ? 'Produto adicionado ao carrinho'
        : `${next} unidades no carrinho`,
      'success',
      { action: { label: 'Ver carrinho', to: '/carrinho' } },
    )
  }

  function onBuyNow(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!available) return
    const active = garage?.activeVehicle
    const snap = active
      ? buildVehicleSnapshotFromActive({ vehicle: active, contextSource: 'active' })
      : null
    saveBuyNowIntent({ ...product, price }, 1, {
      customerVehicleId: snap?.customerVehicleId ?? null,
      vehicleSnapshot: snap,
    })
    saveCheckoutReturnTo(returnFrom)
    navigate('/checkout', { state: { from: returnFrom } })
  }

  return (
    <article className="relative flex h-full min-w-0 flex-col overflow-hidden rounded-fal border border-fal-line bg-fal-surface p-2.5 text-fal-fg transition hover:-translate-y-0.5 hover:border-fal-yellow/35 hover:shadow-fal sm:p-3.5">
      {offer.isOffer && presentation.showOfertaBadge ? (
        <div className="absolute top-3.5 left-3.5 z-[1]">
          <Badge>
            {formatOfertaBadgeLabel(offer, {
              showDiscountPercent: presentation.showDiscountPercent,
            })}
          </Badge>
        </div>
      ) : null}

      <button
        type="button"
        className={[
          'absolute top-3.5 right-3.5 z-[2] grid h-11 w-11 place-items-center rounded-full border bg-fal-surface/95 text-base shadow-sm',
          liked
            ? 'border-fal-favorite/40 text-fal-favorite hover:border-fal-favorite/60'
            : 'border-fal-line text-fal-muted hover:border-fal-navy',
        ].join(' ')}
        aria-label={liked ? 'Remover dos favoritos' : 'Favoritar'}
        onClick={(e) => void onFavoriteClick(e)}
      >
        {liked ? '♥' : '♡'}
      </button>

      <ProductMediaFrame variant="card" className="relative mb-1 shrink-0">
        {showSeal && compatVerdict ? (
          <div className="pointer-events-none absolute bottom-2 left-2 z-[1]">
            <CompatibilityStateBadge verdict={compatVerdict} variant="card" compact />
          </div>
        ) : null}
        {product.imageUrl ? (
          <Link
            to={productHref}
            state={pdpLinkState}
            className="group relative flex h-full w-full items-center justify-center"
            aria-label={`Ver ${displayName}`}
          >
            <img
              src={product.imageUrl}
              alt={displayName}
              className={`${productMediaImgClassCard} transition group-hover:scale-[1.22]`}
              loading="lazy"
            />
          </Link>
        ) : (
          <ProductImagePlaceholder className="scale-75" />
        )}
      </ProductMediaFrame>

      <Link to={productHref} state={pdpLinkState} className="flex min-h-0 min-w-0 flex-1 flex-col">
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
              <button
                type="button"
                className="hover:underline"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  navigate(`/catalogo?cat=${encodeURIComponent(product.categorySlug!)}`)
                }}
              >
                {product.categoryName}
              </button>
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
        {!hasFitContext ? (
          <CompatibilityAppsBlock
            className="my-2 text-xs"
            variant="card"
            groups={product.compatibilityGroups}
            summary={product.compatibilitySummary}
          />
        ) : null}
      </Link>

      <div className="mt-auto flex shrink-0 flex-col gap-2 pt-2">
        {!available ? (
          <p className="m-0 text-sm font-bold text-fal-danger">Indisponível</p>
        ) : (
          <>
            <p className="m-0 truncate text-lg font-black sm:text-[22px]">
              {formatStorePriceLabel(storefrontPrice, listPrice)}
            </p>
            {offer.isOffer ? (
              <p className="m-0 -mt-1 truncate text-xs text-fal-muted line-through">
                {formatMoney(offer.listPrice)}
              </p>
            ) : null}
            <PaymentConditionHint amount={price} surface="card" />
          </>
        )}

        {available && inCart ? (
          <p
            className="m-0 w-fit max-w-full truncate rounded-full bg-fal-yellow/30 px-2.5 py-1 text-xs font-bold text-fal-navy"
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
            <Button variant="light" size="sm" fullWidth onClick={(e) => void onAddToCart(e)}>
              {ADICIONAR_AO_CARRINHO_LABEL}
            </Button>
          </>
        ) : null}
      </div>
    </article>
  )
}
