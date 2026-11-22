import { Badge } from '@/components/common/Badge'
import { Container } from '@/components/layout/Container'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Loading } from '@/components/common/Loading'
import { CompatibilityAppsBlock } from '@/components/product/CompatibilityAppsBlock'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { CompatVerdictSummary } from '@/components/product/CompatVerdictSummary'
import {
  PaymentConditionHint,
  useStorefrontDisplayAmount,
} from '@/components/product/PaymentConditionHint'
import { VehiclePlateSearch } from '@/components/vehicle/VehiclePlateSearch'
import { ProductCard } from '@/components/product/ProductCard'
import { PdpAccordion } from '@/components/product/PdpAccordion'
import { PdpKitCompositionBlock } from '@/components/product/PdpKitCompositionBlock'
import { PdpPaymentIcons } from '@/components/product/PdpPaymentIcons'
import { PdpPurchaseBar } from '@/components/product/PdpPurchaseBar'
import { ProductGallery } from '@/components/product/ProductGallery'
import { ProductShippingQuoteBlock } from '@/components/product/ProductShippingQuoteBlock'
import { productHref, safeInternalReturnTo } from '@/lib/productHref'
import {
  getProductBySlugOrId,
  listEquivalentProductsForPdp,
} from '@/services/products/productService'
import {
  listPublishedKitsIncludingComponent,
  loadStoreKitComposition,
  type StoreKitComposition,
  type StoreKitContainingComponent,
} from '@/services/products/kitCompositionStoreService'
import { mergeKitGalleryWithComponentImages } from '@/services/products/productImages'
import { listIntelligentRelatedForPdp } from '@/services/products/relatedProductsIntelligence'
import type { PvcCompatRow } from '@/services/compatibility/compatibilityEngine'
import {
  categoryChainById,
  categoryChainBySlug,
  listAllCategories,
  type CategoryPathCrumb,
} from '@/services/categories/categoryService'
import {
  STORE_BACKEND_UNAVAILABLE_MESSAGE,
  STORE_BACKEND_UNAVAILABLE_TITLE,
  isStoreBackendUnavailableError,
} from '@/lib/storeBackend'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useHomePresentation } from '@/hooks/useHomePresentation'
import { useOpenGraph } from '@/hooks/useOpenGraph'
import { trackAddToCart, trackViewItem } from '@/lib/analytics'
import { toUserMessage } from '@/lib/toUserMessage'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import type { Product, VehicleFilter } from '@/types'
import { confirmDialog } from '@/components/common/ConfirmDialog'
import { useCart } from '@/contexts/CartContext'
import { useAuth } from '@/contexts/AuthContext'
import { useFavorites } from '@/contexts/FavoritesContext'
import { useGarageOptional } from '@/contexts/GarageContext'
import { useToast } from '@/components/common/Toast'
import {
  compatPurchaseConfirmCopy,
  needsCompatPurchaseConfirm,
} from '@/services/compatibility/compatCopy'
import {
  classifyCardCompatibility,
  resolveCardSeal,
  type CompatibilityVerdict,
  vehicleFilterToCompatInput,
} from '@/services/compatibility/compatibilityEngine'
import { loadPvcEvidenceByProductIds } from '@/services/compatibility/loadPvcEvidence'
import { filterDisplayLabel } from '@/services/garage/activeGarageStorage'
import {
  buildProductWhatsAppMessage,
  storeWhatsAppPhone,
  whatsAppHref,
} from '@/lib/whatsapp'
import { toCommercialTitleCase } from '@/lib/entityNormalize'
import {
  AJUDA_APLICACAO_TEXT,
  DESCRICAO_SECTION_LABEL,
  ESPECIFICACOES_SECTION_LABEL,
  FILTRAR_NO_CATALOGO_LABEL,
  EQUIVALENTES_SECTION_LABEL,
  KITS_COM_ESTA_PECA_SECTION_LABEL,
  RELACIONADOS_SECTION_LABEL,
  VER_DESCRICAO_COMPLETA_LABEL,
  VER_MAIS_CATALOGO_LABEL,
  VER_MENOS_DESCRICAO_LABEL,
  ADICIONAR_AO_CARRINHO_LABEL,
  COMPRAR_AGORA_LABEL,
  formatReferenciaFromProduct,
  formatStorePriceLabel,
} from '@/lib/productLabels'
import { saveBuyNowIntent } from '@/services/checkout/buyNowSession'
import { saveCheckoutReturnTo } from '@/services/checkout/checkoutReturnTo'
import { buildVehicleSnapshotFromActive } from '@/services/garage/vehicleSnapshot'
import {
  buildCatalogBrowseHref,
  buildPdpCatalogFilterLink,
  joinProductDescription,
  needsDescriptionCollapse,
  truncateDescription,
} from '@/lib/productDescription'
import { buildProductSpecRows } from '@/lib/productSpecs'
import { displayPrice } from '@/services/pricing/priceResolutionService'
import { formatMoney } from '@/lib/money'
import {
  formatOfertaBadgeLabel,
  resolvePromoOffer,
} from '@/lib/promoPresentation'

/** Teto da quantidade local na PDP (antes de adicionar ao carrinho). */
const MAX_QTY = 99

export function ProductPage() {
  const { slugOrId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [backendDown, setBackendDown] = useState(false)
  const [descExpanded, setDescExpanded] = useState(false)
  const [kitComposition, setKitComposition] = useState<StoreKitComposition | null>(null)
  const [kitsContaining, setKitsContaining] = useState<StoreKitContainingComponent[]>([])
  const [related, setRelated] = useState<Product[]>([])
  const [relatedPvcById, setRelatedPvcById] = useState<Map<string, PvcCompatRow[]>>(
    () => new Map(),
  )
  const [equivalents, setEquivalents] = useState<Product[]>([])
  const [categoryPath, setCategoryPath] = useState<CategoryPathCrumb[]>([])
  const [qty, setQty] = useState(1)
  const { addItem, items } = useCart()
  const { user } = useAuth()
  const { isFavorite, toggle } = useFavorites()
  const garage = useGarageOptional()
  const { push } = useToast()
  const presentation = useHomePresentation()
  const cartQty = product ? (items.find((i) => i.productId === product.id)?.quantity ?? 0) : 0
  const inCart = cartQty > 0
  const liked = product ? isFavorite(product.id) : false
  /** Hooks antes de qualquer early-return (React #310). */
  const resolvedForHooks = product ? displayPrice(product) : 0
  const storefrontPrice = useStorefrontDisplayAmount(resolvedForHooks)
  const [compatVerdict, setCompatVerdict] = useState<CompatibilityVerdict | null>(null)
  const pdpSealKind = useMemo(
    () => (compatVerdict ? resolveCardSeal(compatVerdict).kind : null),
    [compatVerdict],
  )
  /** Fit só desta PDP — nunca grava em garage.activeFilter. */
  const [localVehicleFilter, setLocalVehicleFilter] = useState<VehicleFilter | null>(null)
  /** E.2: rascunho local ano/motor/versão — não altera o chip da garagem. */
  const [verifyYear, setVerifyYear] = useState('')
  const [verifyEngine, setVerifyEngine] = useState('')
  const [verifyVersion, setVerifyVersion] = useState('')
  const [verifyApplied, setVerifyApplied] = useState<{
    year: string
    engine: string
    version: string
  } | null>(null)
  const [verifySheetOpen, setVerifySheetOpen] = useState(false)
  /** Mini-menu: placa ou seleção manual (só PDP; não altera garagem). */
  const [verifyCompatOpen, setVerifyCompatOpen] = useState(false)

  const effectiveVehicleFilter = garage?.activeFilter ?? localVehicleFilter

  const activeCompatInput = useMemo(() => {
    const base = vehicleFilterToCompatInput(effectiveVehicleFilter)
    if (!base) return null
    if (!verifyApplied) return base
    return {
      ...base,
      year: verifyApplied.year.trim() || base.year,
      engine: verifyApplied.engine.trim() || base.engine,
      version: verifyApplied.version.trim() || base.version,
    }
  }, [effectiveVehicleFilter, verifyApplied])

  useEffect(() => {
    // Chip da garagem vence o rascunho local da PDP.
    if (garage?.activeFilter) setLocalVehicleFilter(null)
  }, [garage?.activeFilter])

  useEffect(() => {
    // Reset rascunho ao trocar veículo efetivo.
    setVerifyYear(effectiveVehicleFilter?.year ?? '')
    setVerifyEngine(effectiveVehicleFilter?.engine ?? '')
    setVerifyVersion(effectiveVehicleFilter?.version ?? '')
    setVerifyApplied(null)
    setVerifySheetOpen(false)
  }, [
    effectiveVehicleFilter?.maker,
    effectiveVehicleFilter?.model,
    effectiveVehicleFilter?.year,
    effectiveVehicleFilter?.engine,
    effectiveVehicleFilter?.version,
  ])

  function applyVerifyDraft() {
    setVerifyApplied({
      year: verifyYear,
      engine: verifyEngine,
      version: verifyVersion,
    })
    setVerifySheetOpen(false)
  }

  useEffect(() => {
    if (!product?.id || !activeCompatInput) {
      setCompatVerdict(null)
      return
    }
    let cancelled = false
    void loadPvcEvidenceByProductIds([product.id])
      .then((map) => {
        if (cancelled) return
        setCompatVerdict(
          classifyCardCompatibility(activeCompatInput, map.get(product.id) ?? []),
        )
      })
      .catch(() => {
        if (cancelled) return
        setCompatVerdict(classifyCardCompatibility(activeCompatInput, []))
      })
    return () => {
      cancelled = true
    }
  }, [product?.id, activeCompatInput])

  useDocumentTitle(
    product
      ? `${toCommercialTitleCase(product.name)} | FAL Peças Automotivas`
      : loading
        ? 'Carregando… | FAL Peças Automotivas'
        : 'Produto | FAL Peças Automotivas',
  )

  useOpenGraph(
    product
      ? {
          title: `${toCommercialTitleCase(product.name)} | FAL Peças Automotivas`,
          description:
            product.shortDescription ||
            product.description ||
            'Peça automotiva na FAL Peças Automotivas.',
          image: product.imageUrl || product.images?.[0] || null,
          type: 'product',
        }
      : null,
  )

  useEffect(() => {
    if (!product) return
    trackViewItem({
      itemId: product.id,
      itemName: toCommercialTitleCase(product.name),
      price: displayPrice(product),
      quantity: 1,
    })
    // Uma vez por produto visualizado (id estável).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intencional: só reagir a troca de produto
  }, [product?.id])

  useEffect(() => {
    if (!product) return
    const price = displayPrice(product)
    const payload = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: toCommercialTitleCase(product.name),
      sku: product.commercialRef || product.sku,
      description: product.shortDescription || product.description || undefined,
      image: product.imageUrl ? [product.imageUrl] : product.images?.length ? product.images : undefined,
      brand: product.brand
        ? { '@type': 'Brand', name: toCommercialTitleCase(product.brand) }
        : undefined,
      offers: {
        '@type': 'Offer',
        priceCurrency: 'BRL',
        price: Number(price.toFixed(2)),
        availability:
          product.available === false
            ? 'https://schema.org/OutOfStock'
            : 'https://schema.org/InStock',
        url: typeof window !== 'undefined' ? window.location.href : undefined,
      },
    }
    const el = document.createElement('script')
    el.type = 'application/ld+json'
    el.id = 'fal-product-jsonld'
    el.text = JSON.stringify(payload)
    document.getElementById('fal-product-jsonld')?.remove()
    document.head.appendChild(el)
    return () => {
      el.remove()
    }
  }, [product])

  /** Canônico: se entrou por UUID e há slug, replace para /produto/:slug */
  useEffect(() => {
    if (!product?.slug?.trim()) return
    const current = decodeURIComponent(slugOrId.trim())
    if (current === product.slug) return
    if (current === product.id) {
      navigate(productHref(product), { replace: true })
    }
  }, [product, slugOrId, navigate])

  useEffect(() => {
    let active = true
    void (async () => {
      setLoading(true)
      setLoadError(null)
      setBackendDown(false)
      setProduct(null)
      setKitComposition(null)
      setDescExpanded(false)
      setQty(1)
      try {
        const key = decodeURIComponent(slugOrId.trim())
        const data = key ? await getProductBySlugOrId(key) : null
        if (active) setProduct(data)
      } catch (err) {
        if (!active) return
        if (isStoreBackendUnavailableError(err)) {
          setBackendDown(true)
          setLoadError(err.message)
        } else {
          setLoadError(toUserMessage(err, 'Erro ao carregar o produto'))
        }
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [slugOrId])

  useEffect(() => {
    if (!product?.id || product.productKind !== 'kit') {
      setKitComposition(null)
      return
    }
    let active = true
    void loadStoreKitComposition(product.id)
      .then((comp) => {
        if (active) setKitComposition(comp)
      })
      .catch(() => {
        if (active) setKitComposition({ lines: [], componentsSum: null })
      })
    return () => {
      active = false
    }
  }, [product?.id, product?.productKind])

  /** K12: kits publicados que incluem este item. */
  useEffect(() => {
    if (!product?.id || product.productKind === 'kit') {
      setKitsContaining([])
      return
    }
    let active = true
    void listPublishedKitsIncludingComponent(product.id, 8)
      .then((rows) => {
        if (active) setKitsContaining(rows)
      })
      .catch(() => {
        if (active) setKitsContaining([])
      })
    return () => {
      active = false
    }
  }, [product?.id, product?.productKind])

  useEffect(() => {
    const currentProduct = product
    if (!currentProduct?.id) {
      setRelated([])
      setRelatedPvcById(new Map())
      return
    }
    let active = true
    void listIntelligentRelatedForPdp({
      product: currentProduct,
      vehicleFilter: effectiveVehicleFilter,
    })
      .then((result) => {
        if (!active) return
        setRelated(result.products)
        setRelatedPvcById(result.pvcByProductId)
      })
      .catch(() => {
        if (!active) return
        setRelated([])
        setRelatedPvcById(new Map())
      })
    return () => {
      active = false
    }
  }, [
    product?.id,
    product?.categorySlug,
    product?.lado,
    product?.posicao,
    effectiveVehicleFilter?.maker,
    effectiveVehicleFilter?.model,
    effectiveVehicleFilter?.year,
    effectiveVehicleFilter?.engine,
    effectiveVehicleFilter?.version,
  ])

  useEffect(() => {
    const id = product?.id
    if (!id) {
      setEquivalents([])
      return
    }
    let active = true
    void listEquivalentProductsForPdp(id)
      .then((items) => {
        if (active) setEquivalents(items)
      })
      .catch(() => {
        if (active) setEquivalents([])
      })
    return () => {
      active = false
    }
  }, [product?.id])

  /** Path completo Categoria → Grupo → Subgrupo (cache listAllCategories). */
  useEffect(() => {
    const currentProduct = product
    if (!currentProduct?.categoryId && !currentProduct?.categorySlug) {
      setCategoryPath([])
      return
    }
    let active = true
    void listAllCategories()
      .then((all) => {
        if (!active) return
        const chain = currentProduct.categoryId
          ? categoryChainById(all, currentProduct.categoryId)
          : categoryChainBySlug(all, currentProduct.categorySlug!.trim())
        setCategoryPath(chain)
      })
      .catch(() => {
        if (active) setCategoryPath([])
      })
    return () => {
      active = false
    }
  }, [product?.id, product?.categoryId, product?.categorySlug])

  /** JSON-LD BreadcrumbList (Início → níveis → produto). */
  useEffect(() => {
    if (!product) return
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const itemListElement: Array<Record<string, unknown>> = [
      { '@type': 'ListItem', position: 1, name: 'Início', item: `${origin}/` },
      { '@type': 'ListItem', position: 2, name: 'Catálogo', item: `${origin}/catalogo` },
    ]
    categoryPath.forEach((crumb, i) => {
      itemListElement.push({
        '@type': 'ListItem',
        position: i + 3,
        name: crumb.name,
        item: `${origin}/catalogo?cat=${encodeURIComponent(crumb.slug)}`,
      })
    })
    itemListElement.push({
      '@type': 'ListItem',
      position: categoryPath.length + 3,
      name: toCommercialTitleCase(product.name),
      item: typeof window !== 'undefined' ? window.location.href : undefined,
    })
    const payload = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement,
    }
    const el = document.createElement('script')
    el.type = 'application/ld+json'
    el.id = 'fal-breadcrumb-jsonld'
    el.text = JSON.stringify(payload)
    document.getElementById('fal-breadcrumb-jsonld')?.remove()
    document.head.appendChild(el)
    return () => {
      el.remove()
    }
  }, [product, categoryPath])

  if (loading) {
    return (
      <Container maxWidth="pdp" className="py-8">
        <Loading />
      </Container>
    )
  }

  if (backendDown) {
    return (
      <Container maxWidth="pdp" className="py-8">
        <EmptyState
          title={STORE_BACKEND_UNAVAILABLE_TITLE}
          description={loadError ?? STORE_BACKEND_UNAVAILABLE_MESSAGE}
          actionLabel="Ir para início"
          actionTo="/"
        />
      </Container>
    )
  }

  if (loadError) {
    return (
      <Container maxWidth="pdp" className="py-8">
        <ErrorState
          message={loadError}
          onRetry={() => {
            setLoading(true)
            setLoadError(null)
            void (async () => {
              try {
                const key = decodeURIComponent(slugOrId.trim())
                const data = key ? await getProductBySlugOrId(key) : null
                setProduct(data)
              } catch (err) {
                if (isStoreBackendUnavailableError(err)) {
                  setBackendDown(true)
                  setLoadError(err.message)
                } else {
                  setLoadError(toUserMessage(err, 'Erro ao carregar o produto'))
                }
              } finally {
                setLoading(false)
              }
            })()
          }}
        />
      </Container>
    )
  }

  if (!product) {
    return (
      <Container maxWidth="pdp" className="py-8">
        <EmptyState
          title="Peça não encontrada"
          description="A peça solicitada não está disponível no catálogo."
          actionLabel="Ver catálogo"
          actionTo="/catalogo"
        />
      </Container>
    )
  }

  const current = product
  const displayName = toCommercialTitleCase(current.name)
  const brandName = current.brand ? toCommercialTitleCase(current.brand) : null
  const price = displayPrice(current)
  const listPrice = current.listPrice ?? current.price
  const offer = resolvePromoOffer(listPrice, price)
  const shortDesc = current.shortDescription?.trim() || ''
  const longDesc = current.description?.trim() || ''
  const fullDescription = joinProductDescription(shortDesc, longDesc)
  const descriptionCollapses = needsDescriptionCollapse(fullDescription)
  const descriptionShown =
    descriptionCollapses && !descExpanded
      ? truncateDescription(fullDescription)
      : fullDescription
  const specRows = buildProductSpecRows(current)
  const waPhone = storeWhatsAppPhone()
  const catalogFilter = buildPdpCatalogFilterLink(
    (current.compatibilityGroups ?? []).map((g) => g.maker),
  )
  const categorySlugForMore =
    categoryPath[categoryPath.length - 1]?.slug || current.categorySlug || null
  const categoryHref = categorySlugForMore
    ? buildCatalogBrowseHref({
        categorySlug: categorySlugForMore,
        filter: effectiveVehicleFilter,
      })
    : effectiveVehicleFilter
      ? buildCatalogBrowseHref({ filter: effectiveVehicleFilter })
      : null
  const kitOwnGallery =
    current.images?.length
      ? current.images
      : current.imageUrl
        ? [current.imageUrl]
        : []
  const galleryImages =
    current.productKind === 'kit' && kitComposition?.lines.length
      ? mergeKitGalleryWithComponentImages(
          kitOwnGallery,
          kitComposition.lines.map((l) => l.imageUrl),
        )
      : kitOwnGallery

  async function onFavoriteClick() {
    if (!user) {
      navigate('/login', { state: { from: productHref(current) } })
      return
    }
    try {
      const next = await toggle(current.id)
      push(next ? 'Adicionado aos favoritos' : 'Removido dos favoritos', 'success')
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

  async function onAddToCart() {
    if (current.available === false) return
    if (!(await confirmCompatIfNeeded('add'))) return
    addItem(current, qty)
    trackAddToCart({
      itemId: current.id,
      itemName: toCommercialTitleCase(current.name),
      price: displayPrice(current),
      quantity: qty,
    })
    const next = cartQty + qty
    push(
      next === 1 ? 'Produto adicionado ao carrinho' : `${next} unidades no carrinho`,
      'success',
      { action: { label: 'Ver carrinho', to: '/carrinho' } },
    )
  }

  /**
   * AJUSTE-035 C5 — compra direta isolada do carrinho.
   * Frete escolhido na PDP segue via handoff de sessão.
   */
  async function onBuyNow() {
    if (current.available === false) return
    if (!(await confirmCompatIfNeeded('buy'))) return
    const active = garage?.activeVehicle
    const snap = active
      ? buildVehicleSnapshotFromActive({ vehicle: active, contextSource: 'active' })
      : null
    saveBuyNowIntent({ ...current, price: displayPrice(current) }, qty, {
      customerVehicleId: snap?.customerVehicleId ?? null,
      vehicleSnapshot: snap,
    })
    const here = `${location.pathname}${location.search}`
    saveCheckoutReturnTo(here)
    push('Seguindo para o checkout com a entrega selecionada (se houver)', 'success')
    navigate('/checkout', { state: { from: here } })
  }

  function goBack() {
    const fromState = safeInternalReturnTo(
      (location.state as { from?: unknown } | null)?.from,
    )
    const fromQuery = safeInternalReturnTo(
      new URLSearchParams(location.search).get('returnTo'),
    )
    const target = fromState ?? fromQuery
    if (target) {
      navigate(target)
      return
    }
    if (window.history.length > 1) navigate(-1)
    else navigate('/catalogo')
  }

  return (
    <Container maxWidth="pdp" className="overflow-x-hidden py-2 sm:py-3">
      <button
        type="button"
        onClick={goBack}
        className="mb-0.5 inline-flex items-center gap-1 text-sm font-semibold text-fal-navy dark:text-fal-fg hover:underline"
        aria-label="Voltar"
      >
        ← Voltar
      </button>
      <nav className="mb-2 text-[12px] text-fal-muted" aria-label="Caminho do produto">
        <ol className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
          <li className="inline-flex items-center gap-x-1">
            <Link to="/" className="hover:underline">
              Início
            </Link>
            <span aria-hidden="true">/</span>
          </li>
          <li className="inline-flex items-center gap-x-1">
            <Link to="/catalogo" className="hover:underline">
              Catálogo
            </Link>
            {categoryPath.length || current.categoryName ? (
              <span aria-hidden="true">/</span>
            ) : null}
          </li>
          {categoryPath.length
            ? categoryPath.map((crumb) => (
                <li key={crumb.id} className="inline-flex items-center gap-x-1">
                  <Link
                    to={`/catalogo?cat=${encodeURIComponent(crumb.slug)}`}
                    className="hover:underline"
                  >
                    {crumb.name}
                  </Link>
                  <span aria-hidden="true">/</span>
                </li>
              ))
            : current.categoryName
              ? (
                  <li className="inline-flex items-center gap-x-1">
                    {current.categorySlug ? (
                      <Link
                        to={`/catalogo?cat=${encodeURIComponent(current.categorySlug)}`}
                        className="hover:underline"
                      >
                        {current.categoryName}
                      </Link>
                    ) : (
                      <span>{current.categoryName}</span>
                    )}
                    <span aria-hidden="true">/</span>
                  </li>
                )
              : null}
          <li className="text-fal-ink" aria-current="page">
            {displayName}
          </li>
        </ol>
      </nav>

      {/* Referência: galeria ~55% | buy-box ~45%. Mobile: galeria → buy-box → acordeões */}
      <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,55fr)_minmax(0,45fr)] lg:gap-6">
        <div className="order-1 min-w-0 lg:col-start-1 lg:row-start-1">
          <ProductGallery images={galleryImages} alt={displayName} />
        </div>

        <div className="relative order-2 min-w-0 bg-transparent p-0 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-20 lg:self-start lg:pb-1">
          <div className="flex flex-wrap items-center gap-2">
            {current.productKind === 'kit' ? (
              <span className="inline-flex rounded-fal border border-fal-navy/20 bg-fal-navy px-2.5 py-1 text-xs font-bold text-white">
                Kit
              </span>
            ) : null}
            {brandName ? (
              <span className="inline-flex rounded-fal border border-fal-navy/15 bg-fal-navy/5 px-2.5 py-1 text-xs font-bold text-fal-navy dark:border-fal-line dark:bg-fal-surface-2 dark:text-fal-fg">
                Marca: {brandName}
              </span>
            ) : null}
          </div>
          <h1
            className={[
              'text-[22px] font-extrabold leading-snug tracking-tight text-fal-navy dark:text-fal-fg sm:text-[26px]',
              brandName || current.productKind === 'kit' ? 'mt-1.5' : 'mt-0',
            ].join(' ')}
          >
            {displayName}
          </h1>
          <p className="mt-1 text-sm text-fal-muted">
            {formatReferenciaFromProduct(current)}
          </p>
          {current.available !== false && offer.isOffer && presentation.showOfertaBadge ? (
            <div className="mt-2">
              <Badge>
                {formatOfertaBadgeLabel(offer, {
                  showDiscountPercent: presentation.showDiscountPercent,
                })}
              </Badge>
            </div>
          ) : null}

          {current.productKind === 'kit' && kitComposition ? (
            <div className="mt-3 rounded-fal border border-fal-line bg-fal-bg/50 px-3 py-2">
              <p className="m-0 text-xs font-bold uppercase tracking-wide text-fal-muted">
                Este kit inclui
              </p>
              <div className="mt-1.5">
                <PdpKitCompositionBlock composition={kitComposition} kitPrice={storefrontPrice} />
              </div>
            </div>
          ) : null}

          <CompatVerdictSummary
            className="mt-3"
            framed
            incompatEmphasis
            showMotivo={pdpSealKind === 'hide'}
            showFaltante={pdpSealKind === 'check' || pdpSealKind === 'similar'}
            verdict={compatVerdict}
            vehicleLabel={
              effectiveVehicleFilter ? filterDisplayLabel(effectiveVehicleFilter) : null
            }
            vehicleAction={
              garage?.activeFilter ? (
                <Link
                  to="/conta/veiculos"
                  className="text-fal-navy hover:underline dark:text-fal-fg"
                >
                  Alterar veículo
                </Link>
              ) : localVehicleFilter ? (
                <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <button
                    type="button"
                    className="text-fal-navy hover:underline dark:text-fal-fg"
                    onClick={() => setVerifyCompatOpen(true)}
                  >
                    Trocar
                  </button>
                  <button
                    type="button"
                    className="text-fal-navy hover:underline dark:text-fal-fg"
                    onClick={() => setLocalVehicleFilter(null)}
                  >
                    Limpar
                  </button>
                </span>
              ) : null
            }
            loading={Boolean(effectiveVehicleFilter && !compatVerdict)}
            emptyHint="Verifique a compatibilidade pela placa ou seleção manual."
          />

          {!effectiveVehicleFilter ? (
            <div className="mt-3">
              <Button
                type="button"
                variant="light"
                className="w-full sm:w-auto"
                onClick={() => setVerifyCompatOpen(true)}
              >
                Verificar compatibilidade
              </Button>
            </div>
          ) : null}

          {pdpSealKind === 'check' || pdpSealKind === 'similar' ? (
            <div className="mt-3">
              <button
                type="button"
                className="w-full rounded-fal border border-fal-line bg-fal-bg px-3 py-2.5 text-left text-sm font-semibold text-fal-navy dark:text-fal-fg hover:border-fal-navy/40 md:hidden"
                onClick={() => setVerifySheetOpen(true)}
              >
                Completar ano, motor ou versão
              </button>
              <div className="mb-0 hidden grid-cols-1 gap-2 sm:grid-cols-3 md:grid">
                <label className="block text-[11px] font-semibold text-fal-muted">
                  Ano
                  <input
                    className="mt-0.5 w-full rounded-fal border border-fal-line bg-fal-surface px-2 py-1.5 text-sm text-fal-fg"
                    value={verifyYear}
                    onChange={(e) => setVerifyYear(e.target.value)}
                    inputMode="numeric"
                    placeholder="Ex.: 2015"
                    aria-label="Ano do veículo para verificar"
                  />
                </label>
                <label className="block text-[11px] font-semibold text-fal-muted">
                  Motor
                  <input
                    className="mt-0.5 w-full rounded-fal border border-fal-line bg-fal-surface px-2 py-1.5 text-sm text-fal-fg"
                    value={verifyEngine}
                    onChange={(e) => setVerifyEngine(e.target.value)}
                    placeholder="Ex.: 1.0"
                    aria-label="Motor do veículo para verificar"
                  />
                </label>
                <label className="block text-[11px] font-semibold text-fal-muted">
                  Versão
                  <input
                    className="mt-0.5 w-full rounded-fal border border-fal-line bg-fal-surface px-2 py-1.5 text-sm text-fal-fg"
                    value={verifyVersion}
                    onChange={(e) => setVerifyVersion(e.target.value)}
                    placeholder="Ex.: Unique"
                    aria-label="Versão do veículo para verificar"
                  />
                </label>
                <div className="sm:col-span-3">
                  <Button variant="light" type="button" onClick={applyVerifyDraft}>
                    Verificar
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <p className="mt-2 text-[1.625rem] font-black leading-none tracking-tight text-fal-navy dark:text-fal-fg sm:text-[1.875rem]">
            {current.available === false
              ? '—'
              : formatStorePriceLabel(storefrontPrice, listPrice)}
          </p>
          {current.available !== false && offer.isOffer ? (
            <p className="mt-0.5 text-sm text-fal-muted line-through">
              {formatMoney(offer.listPrice)}
            </p>
          ) : null}
          {current.available !== false ? (
            <div className="mt-1 flex flex-col gap-1">
              <PaymentConditionHint amount={price} surface="pdp" />
              <PdpPaymentIcons />
            </div>
          ) : null}

          <div className="mt-1 space-y-1 pb-20 lg:pb-0">
            {current.available === false ? (
              <>
                <p className="m-0 text-sm font-semibold text-fal-danger">Indisponível</p>
                <Button variant="primary" fullWidth disabled>
                  Indisponível
                </Button>
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="m-0 inline-flex items-center gap-1.5 text-sm font-semibold text-fal-success">
                    <span aria-hidden="true">✓</span> Disponível
                  </p>
                  <div
                    className="inline-flex items-center gap-1"
                    role="group"
                    aria-label="Quantidade"
                  >
                    <button
                      type="button"
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-fal border border-fal-line bg-fal-surface text-base font-bold text-fal-navy hover:bg-fal-bg disabled:opacity-50 dark:text-fal-fg"
                      aria-label="Diminuir quantidade"
                      disabled={qty <= 1}
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                    >
                      −
                    </button>
                    <span
                      className="grid h-8 min-w-[2.25rem] place-items-center rounded-fal bg-fal-bg px-2 text-sm font-black text-fal-navy dark:text-fal-fg"
                      aria-live="polite"
                    >
                      {qty}
                    </span>
                    <button
                      type="button"
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-fal border border-fal-line bg-fal-surface text-base font-bold text-fal-navy hover:bg-fal-bg disabled:opacity-50 dark:text-fal-fg"
                      aria-label="Aumentar quantidade"
                      disabled={qty >= MAX_QTY}
                      onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))}
                    >
                      +
                    </button>
                  </div>
                </div>

                <ProductShippingQuoteBlock product={current} quantity={qty} />

                <Button variant="primary" fullWidth className="h-10 text-[15px]" onClick={onAddToCart}>
                  {ADICIONAR_AO_CARRINHO_LABEL}
                </Button>
                <Button variant="dark" fullWidth className="h-10 text-[15px]" onClick={onBuyNow}>
                  {COMPRAR_AGORA_LABEL}
                </Button>

                {inCart ? (
                  <p className="m-0 text-sm text-fal-muted" aria-live="polite">
                    Já há {cartQty} no carrinho —{' '}
                    <Link to="/carrinho" className="font-semibold text-fal-navy dark:text-fal-fg hover:underline">
                      Ver carrinho
                    </Link>
                  </p>
                ) : null}
              </>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                fullWidth
                type="button"
                onClick={() => void onFavoriteClick()}
              >
                {liked ? '♥ Favoritado' : '♡ Favoritar'}
              </Button>
              {(() => {
                if (!waPhone || current.available === false) {
                  return (
                    <span
                      className="flex items-center justify-center rounded-fal border border-fal-line px-3 text-sm text-fal-muted"
                      aria-hidden="true"
                    >
                      —
                    </span>
                  )
                }
                const href = whatsAppHref(
                  waPhone,
                  buildProductWhatsAppMessage({
                    name: displayName,
                    sku: current.commercialRef ?? current.sku,
                    quantity: qty,
                    productUrl: typeof window !== 'undefined' ? window.location.href : undefined,
                  }),
                )
                return (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-full items-center justify-center rounded-fal border border-fal-navy/25 bg-fal-surface px-3 py-2 text-sm font-bold text-[#128C7E] hover:bg-[#25D366]/10 dark:border-fal-line"
                  >
                    WhatsApp
                  </a>
                )
              })()}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
              <button
                type="button"
                className="text-sm font-semibold text-fal-navy hover:underline dark:text-fal-fg"
                onClick={() => {
                  const url =
                    typeof window !== 'undefined' ? window.location.href : ''
                  if (!url) return
                  void navigator.clipboard?.writeText(url).then(
                    () => push('Link copiado', 'success'),
                    () => push('Não foi possível copiar o link', 'error'),
                  )
                }}
              >
                Copiar link
              </button>
              <a
                href="#pdp-detalhes"
                className="text-sm font-semibold text-fal-navy hover:underline dark:text-fal-fg"
              >
                Ver detalhes ↓
              </a>
            </div>
          </div>
        </div>

        <div
          id="pdp-detalhes"
          className="order-3 min-w-0 scroll-mt-24 lg:col-start-1 lg:row-start-2"
        >
          <PdpAccordion
            items={[
              // Composição do kit fica só no buy-box (“Este kit inclui”) — evita duplicar.
              {
                id: 'apps',
                title: 'Aplicação e compatibilidade',
                icon: 'A',
                defaultOpen: true,
                children: (
                  <>
                    <CompatibilityAppsBlock
                      variant="pdp"
                      groups={current.compatibilityGroups}
                      summary={current.compatibilitySummary}
                    />
                    {current.compatibilityGroups?.length || current.compatibilitySummary ? (
                      <p className="mb-0 mt-3 text-sm">
                        <Link
                          to={catalogFilter.href}
                          className="font-semibold text-fal-navy hover:underline dark:text-fal-fg"
                        >
                          {FILTRAR_NO_CATALOGO_LABEL}
                        </Link>
                        <span className="text-fal-muted">{catalogFilter.hint}</span>
                      </p>
                    ) : null}
                    <p className="mb-0 mt-3 text-xs text-fal-muted">{AJUDA_APLICACAO_TEXT}</p>
                  </>
                ),
              },
              {
                id: 'desc',
                title: DESCRICAO_SECTION_LABEL,
                icon: 'D',
                children: fullDescription ? (
                  <>
                    <p className="mb-0 whitespace-pre-wrap text-fal-muted">{descriptionShown}</p>
                    {descriptionCollapses ? (
                      <button
                        type="button"
                        className="mt-2 text-sm font-semibold text-fal-navy hover:underline dark:text-fal-fg"
                        aria-expanded={descExpanded}
                        onClick={() => setDescExpanded((v) => !v)}
                      >
                        {descExpanded ? VER_MENOS_DESCRICAO_LABEL : VER_DESCRICAO_COMPLETA_LABEL}
                      </button>
                    ) : null}
                  </>
                ) : (
                  <p className="mb-0 text-fal-muted">Sem descrição cadastrada.</p>
                ),
              },
              {
                id: 'specs',
                title: ESPECIFICACOES_SECTION_LABEL,
                icon: 'E',
                children: specRows.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-0 border-collapse">
                      <tbody>
                        {specRows.map((row, i) => (
                          <tr
                            key={`${row.label}-${row.value}`}
                            className={i % 2 === 0 ? 'bg-fal-bg/80' : 'bg-fal-surface'}
                          >
                            <th
                              scope="row"
                              className="w-[38%] px-2 py-2 text-left align-top font-semibold text-fal-navy dark:text-fal-fg"
                            >
                              {row.label}
                            </th>
                            <td className="min-w-0 break-words px-2 py-2 text-fal-muted">
                              {row.value}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mb-0 text-fal-muted">Sem especificações cadastradas.</p>
                ),
              },
              {
                id: 'pack',
                title: 'Conteúdo da embalagem',
                icon: 'C',
                children: (
                  <ul className="mb-0 mt-0 list-disc space-y-1 pl-4 text-fal-muted">
                    <li>1 unidade do produto conforme título e referência.</li>
                    {current.weightKg != null && current.weightKg > 0 ? (
                      <li>Peso aproximado: {current.weightKg} kg</li>
                    ) : null}
                    {current.lengthCm != null &&
                    current.widthCm != null &&
                    current.heightCm != null &&
                    current.lengthCm > 0 &&
                    current.widthCm > 0 &&
                    current.heightCm > 0 ? (
                      <li>
                        Dimensões aprox.: {current.lengthCm}×{current.widthCm}×{current.heightCm}{' '}
                        cm
                      </li>
                    ) : null}
                  </ul>
                ),
              },
            ]}
          />
        </div>
      </div>

      <PdpPurchaseBar
        available={current.available !== false}
        priceLabel={formatStorePriceLabel(storefrontPrice, listPrice)}
        onBuyNow={onBuyNow}
      />

      <Modal
        open={verifyCompatOpen}
        title="Verificar compatibilidade"
        onClose={() => setVerifyCompatOpen(false)}
      >
        <p className="m-0 mb-3 text-sm text-fal-muted">
          Placa ou montadora/modelo. Só nesta página — não altera a Minha Garagem.
        </p>
        <VehiclePlateSearch
          compact
          localOnly
          onApplyFilters={(filter) => {
            setLocalVehicleFilter(filter)
            setVerifyCompatOpen(false)
          }}
        />
      </Modal>

      <Modal
        open={verifySheetOpen}
        title="Completar dados do veículo"
        onClose={() => setVerifySheetOpen(false)}
        footer={
          <Button variant="primary" fullWidth type="button" onClick={applyVerifyDraft}>
            Verificar
          </Button>
        }
      >
        <p className="m-0 mb-3 text-sm text-fal-muted">
          Só reavalia esta página — não altera o veículo ativo no header.
        </p>
        <div className="grid grid-cols-1 gap-3">
          <label className="block text-[11px] font-semibold text-fal-muted">
            Ano
            <input
              className="mt-0.5 w-full rounded-fal border border-fal-line bg-fal-surface px-2 py-1.5 text-sm text-fal-fg"
              value={verifyYear}
              onChange={(e) => setVerifyYear(e.target.value)}
              inputMode="numeric"
              placeholder="Ex.: 2015"
              aria-label="Ano do veículo para verificar"
            />
          </label>
          <label className="block text-[11px] font-semibold text-fal-muted">
            Motor
            <input
              className="mt-0.5 w-full rounded-fal border border-fal-line bg-fal-surface px-2 py-1.5 text-sm text-fal-fg"
              value={verifyEngine}
              onChange={(e) => setVerifyEngine(e.target.value)}
              placeholder="Ex.: 1.0"
              aria-label="Motor do veículo para verificar"
            />
          </label>
          <label className="block text-[11px] font-semibold text-fal-muted">
            Versão
            <input
              className="mt-0.5 w-full rounded-fal border border-fal-line bg-fal-surface px-2 py-1.5 text-sm text-fal-fg"
              value={verifyVersion}
              onChange={(e) => setVerifyVersion(e.target.value)}
              placeholder="Ex.: Unique"
              aria-label="Versão do veículo para verificar"
            />
          </label>
        </div>
      </Modal>

      {kitsContaining.length ? (
        <section className="mt-10 min-w-0" aria-labelledby="pdp-kits-heading">
          <h2
            id="pdp-kits-heading"
            className="m-0 mb-1 text-lg font-extrabold text-fal-navy dark:text-fal-fg sm:text-xl"
          >
            {KITS_COM_ESTA_PECA_SECTION_LABEL}
          </h2>
          <p className="mb-3 mt-0 text-sm text-fal-muted">
            Leve o conjunto completo — esta peça entra nestes kits.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {kitsContaining.map(({ product: kit, quantityInKit }) => (
              <div key={kit.id} className="min-w-0">
                <ProductCard product={kit} fitFilter={effectiveVehicleFilter} />
                {quantityInKit > 1 ? (
                  <p className="mb-0 mt-1 text-center text-[11px] text-fal-muted">
                    Inclui {quantityInKit}× desta peça
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {equivalents.length ? (
        <section className="mt-10 min-w-0" aria-labelledby="pdp-equiv-heading">
          <h2
            id="pdp-equiv-heading"
            className="m-0 mb-3 text-lg font-extrabold text-fal-navy dark:text-fal-fg sm:text-xl"
          >
            {EQUIVALENTES_SECTION_LABEL}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {equivalents.map((item) => (
              <ProductCard
                key={item.id}
                product={item}
                surface="equiv"
                fitFilter={effectiveVehicleFilter}
              />
            ))}
          </div>
        </section>
      ) : null}

      {related.length ? (
        <section className="mt-10 min-w-0" aria-labelledby="pdp-related-heading">
          <div className="mb-3 flex min-w-0 flex-wrap items-baseline justify-between gap-2">
            <h2
              id="pdp-related-heading"
              className="m-0 text-lg font-extrabold text-fal-navy dark:text-fal-fg sm:text-xl"
            >
              {RELACIONADOS_SECTION_LABEL}
            </h2>
            {categoryHref ? (
              <Link
                to={categoryHref}
                className="text-sm font-semibold text-fal-navy dark:text-fal-fg hover:underline"
              >
                {VER_MAIS_CATALOGO_LABEL}
              </Link>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard
                key={item.id}
                product={item}
                fitFilter={effectiveVehicleFilter}
                pvcRows={
                  effectiveVehicleFilter
                    ? (relatedPvcById.get(item.id) ?? [])
                    : null
                }
              />
            ))}
          </div>
        </section>
      ) : null}
    </Container>
  )
}
