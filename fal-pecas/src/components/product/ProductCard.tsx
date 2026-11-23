import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import {
  CompatibilityAppsBlock,
  prioritizeCompatibilityGroupsForVehicle,
} from '@/components/product/CompatibilityAppsBlock'
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
  compatPurchaseConfirmCopy,
  needsCompatPurchaseConfirm,
} from '@/services/compatibility/compatCopy'
import {
  classifyCardCompatibility,
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
  KIT_APPS_EMPTY_LABEL,
  formatReferenciaFromProduct,
  formatStorePriceLabel,
} from '@/lib/productLabels'
import { formatMoney } from '@/lib/money'
import { formatLadoLabel, formatPosicaoLabel } from '@/lib/productPosicaoLado'
import {
  formatDiscountPercentLabel,
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
  /**
   * `equiv`: incompatíveis com selo cinza e sem CTA de compra (spec PDP #12).
   */
  surface?: 'default' | 'equiv'
  /** Conta/favoritos: some da grade sem toast a cada ♡. */
  quietFavoriteToast?: boolean
}

export function ProductCard({
  product,
  pvcRows,
  fitFilter,
  surface = 'default',
  quietFavoriteToast = false,
}: Props) {
  const { user } = useAuth()
  const { items, addItem } = useCart()
  const { isFavorite, toggle, loading: favoritesLoading } = useFavorites()
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
  const prioritizedApps = useMemo(
    () =>
      prioritizeCompatibilityGroupsForVehicle(
        product.compatibilityGroups ?? [],
        effectiveFit
          ? { maker: effectiveFit.maker, model: effectiveFit.model }
          : null,
      ),
    [product.compatibilityGroups, effectiveFit],
  )
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
    // Pai ainda carregando PVC: sem selo (evita flash). Self-load: null até resolver.
    if (resolvedPvc == null) return null
    return classifyCardCompatibility(input, resolvedPvc)
  }, [effectiveFit, resolvedPvc])

  const cardSeal = compatVerdict ? resolveCardSeal(compatVerdict) : null
  // Inclui Incompatível (hide com label) — antes o hide sumia e o aviso não aparecia no card.
  const showSeal = Boolean(cardSeal && (cardSeal.kind !== 'hide' || cardSeal.label))
  const hasFitContext = Boolean(vehicleFilterToCompatInput(effectiveFit))
  // Selo (Compatível/…) NÃO substitui aplicação — cliente precisa ver para quais carros serve.
  const sealPending = hasFitContext && resolvedPvc == null
  const showApps = !sealPending
  const equivIncompatible =
    surface === 'equiv' && Boolean(cardSeal?.kind === 'hide' && cardSeal.label)
  const showPurchaseCtas = available && !equivIncompatible

  async function onFavoriteClick(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!user) {
      navigate('/login', { state: { from: productHref } })
      return
    }
    try {
      const next = await toggle(product.id)
      if (!quietFavoriteToast) {
        push(next ? 'Adicionado aos favoritos' : 'Removido dos favoritos', 'success')
      }
    } catch (err) {
      push(toUserMessage(err, 'Erro ao favoritar'), 'error')
    }
  }

  async function confirmCompatIfNeeded(intent: 'add' | 'buy'): Promise<boolean> {
    if (!needsCompatPurchaseConfirm(compatVerdict) || !compatVerdict) return true
    const copy = compatPurchaseConfirmCopy(compatVerdict, intent)
    const { confirmed } = await confirmDialog(copy)
    return confirmed
  }

  async function onAddToCart(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!available) return
    if (!(await confirmCompatIfNeeded('add'))) return
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

  async function onBuyNow(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!available) return
    if (!(await confirmCompatIfNeeded('buy'))) return
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

  const showMediaPct =
    offer.isOffer &&
    presentation.showOfertaBadge &&
    presentation.showDiscountPercent !== false &&
    offer.discountPercent != null

  return (
    <article className="relative flex h-full min-w-0 flex-col overflow-hidden rounded-fal border border-fal-line bg-fal-surface p-2 text-fal-fg transition hover:-translate-y-0.5 hover:border-fal-yellow/35 hover:shadow-fal sm:p-3">
      <button
        type="button"
        className={[
          'absolute top-2 right-2 z-[2] grid h-9 w-9 place-items-center rounded-full border bg-fal-surface/95 text-sm shadow-sm sm:top-2.5 sm:right-2.5 sm:h-11 sm:w-11 sm:text-base',
          favoritesLoading && user ? 'opacity-60' : '',
          liked
            ? 'border-fal-favorite/40 text-fal-favorite hover:border-fal-favorite/60'
            : 'border-fal-line text-fal-muted hover:border-fal-navy',
        ].join(' ')}
        aria-label={liked ? 'Remover dos favoritos' : 'Favoritar'}
        aria-busy={favoritesLoading && Boolean(user)}
        onClick={(e) => void onFavoriteClick(e)}
      >
        {liked ? '♥' : '♡'}
      </button>

      <div className="relative mb-0.5 shrink-0">
        {showMediaPct && offer.discountPercent != null ? (
          <div className="absolute top-2 left-2 z-[1] max-w-[calc(100%-2.75rem)] sm:top-2.5 sm:left-2.5">
            <Badge variant="promo">{formatDiscountPercentLabel(offer.discountPercent)}</Badge>
          </div>
        ) : null}
        <ProductMediaFrame variant="card">
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
      </div>

      <Link to={productHref} state={pdpLinkState} className="flex min-h-0 min-w-0 flex-1 flex-col">
        {product.productKind === 'kit' ? (
          <div className="mt-1 mb-0.5 sm:mt-1.5">
            <Badge variant="kit">Kit</Badge>
          </div>
        ) : null}
        <h3
          className={[
            'mb-0.5 line-clamp-2 break-words text-xs font-bold leading-snug sm:text-[15px]',
            product.productKind === 'kit' ? 'mt-0' : 'mt-1 sm:mt-1.5',
          ].join(' ')}
          title={displayName}
        >
          {displayName}
        </h3>
        {showSeal && compatVerdict ? (
          <div className="mb-0.5">
            <CompatibilityStateBadge
              verdict={compatVerdict}
              variant="card"
              tone={equivIncompatible ? 'neutral' : 'default'}
              className="max-w-full shadow-none"
            />
          </div>
        ) : null}
        <p className="m-0 truncate text-[11px] text-fal-muted">
          {formatReferenciaFromProduct(product)}
        </p>
        {/* Meta extra só a partir de sm — no mobile polui e estica o card (Notes #7). */}
        {product.categoryName ? (
          <p className="m-0 hidden truncate text-[11px] text-fal-muted sm:block">
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
          <p className="m-0 hidden truncate text-[11px] text-fal-muted sm:block">
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
          <p className="m-0 hidden truncate text-[11px] text-fal-ink sm:block">
            {[
              product.posicao ? formatPosicaoLabel(product.posicao) : null,
              product.lado ? formatLadoLabel(product.lado) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        ) : null}
        {showApps ? (
          <CompatibilityAppsBlock
            className="my-1 sm:my-1.5"
            variant="card"
            groups={prioritizedApps.length ? prioritizedApps : product.compatibilityGroups}
            summary={product.compatibilitySummary}
            emptyLabel={product.productKind === 'kit' ? KIT_APPS_EMPTY_LABEL : undefined}
          />
        ) : null}
      </Link>

      <div className="mt-auto flex shrink-0 flex-col gap-1 pt-1 sm:gap-1.5 sm:pt-1.5">
        {!available ? (
          <p className="m-0 text-sm font-bold text-fal-danger">Indisponível</p>
        ) : (
          <>
            <p className="m-0 truncate text-base font-black sm:text-[22px]">
              {formatStorePriceLabel(storefrontPrice, listPrice)}
            </p>
            {offer.isOffer ? (
              <p className="m-0 -mt-1 truncate text-xs text-fal-muted line-through">
                {formatMoney(offer.listPrice)}
              </p>
            ) : null}
            <div className="hidden sm:block">
              <PaymentConditionHint amount={price} surface="card" />
            </div>
          </>
        )}

        {available && inCart ? (
          <p
            className="m-0 w-fit max-w-full truncate rounded-full bg-fal-yellow/30 px-2 py-0.5 text-[11px] font-bold text-fal-navy-dark sm:px-2.5 sm:py-1 sm:text-xs dark:bg-fal-yellow/25 dark:text-fal-yellow"
            aria-live="polite"
          >
            No carrinho: {cartQty}
          </p>
        ) : null}

        {showPurchaseCtas ? (
          <>
            {/* Mobile: 1 CTA + link; sm+: dois botões (Notes #7). Display no wrapper —
                Button força inline-flex e vaza se hidden for no className do Button. */}
            <div className="flex flex-col gap-1.5 sm:hidden">
              <Button
                variant="primary"
                size="sm"
                fullWidth
                onClick={(e) => void onAddToCart(e)}
              >
                {ADICIONAR_AO_CARRINHO_LABEL}
              </Button>
              <button
                type="button"
                className="m-0 border-0 bg-transparent p-0 text-center text-[11px] font-semibold text-fal-navy underline dark:text-fal-fg"
                onClick={(e) => void onBuyNow(e)}
              >
                {COMPRAR_AGORA_LABEL}
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-col sm:gap-2">
              <Button variant="primary" size="sm" fullWidth onClick={onBuyNow}>
                {COMPRAR_AGORA_LABEL}
              </Button>
              <Button
                variant="light"
                size="sm"
                fullWidth
                onClick={(e) => void onAddToCart(e)}
              >
                {ADICIONAR_AO_CARRINHO_LABEL}
              </Button>
            </div>
          </>
        ) : null}
        {equivIncompatible ? (
          <p className="m-0 text-xs font-semibold text-fal-muted">Não recomendado para o veículo</p>
        ) : null}
      </div>
    </article>
  )
}
