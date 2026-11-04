import { Container } from '@/components/layout/Container'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Loading } from '@/components/common/Loading'
import { CompatibilityAppsBlock } from '@/components/product/CompatibilityAppsBlock'
import { ProductCard } from '@/components/product/ProductCard'
import { ProductGallery } from '@/components/product/ProductGallery'
import { ProductShippingQuoteBlock } from '@/components/product/ProductShippingQuoteBlock'
import {
  getProductById,
  listRelatedProductsForPdp,
} from '@/services/products/productService'
import {
  STORE_BACKEND_UNAVAILABLE_MESSAGE,
  STORE_BACKEND_UNAVAILABLE_TITLE,
  isStoreBackendUnavailableError,
} from '@/lib/storeBackend'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Product } from '@/types'
import { Button } from '@/components/common/Button'
import { useCart } from '@/contexts/CartContext'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/common/Toast'
import { isFavorite, toggleFavorite } from '@/services/customers/favoriteService'
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
  FABRICANTE_LABEL,
  FILTRAR_NO_CATALOGO_LABEL,
  RELACIONADOS_SECTION_LABEL,
  VER_DESCRICAO_COMPLETA_LABEL,
  VER_MAIS_CATALOGO_LABEL,
  VER_MENOS_DESCRICAO_LABEL,
  formatReferenciaFromProduct,
  formatStorePriceLabel,
} from '@/lib/productLabels'
import {
  buildCatalogMakerFilterHref,
  joinProductDescription,
  needsDescriptionCollapse,
  truncateDescription,
} from '@/lib/productDescription'
import { buildProductSpecRows } from '@/lib/productSpecs'
import { displayPrice } from '@/services/pricing/priceResolutionService'
import { formatMoney } from '@/lib/money'

export function ProductPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [backendDown, setBackendDown] = useState(false)
  const [liked, setLiked] = useState(false)
  const [descExpanded, setDescExpanded] = useState(false)
  const [related, setRelated] = useState<Product[]>([])
  const { addItem, items, updateQty } = useCart()
  const { user } = useAuth()
  const { push } = useToast()
  const cartQty = product ? (items.find((i) => i.productId === product.id)?.quantity ?? 0) : 0
  const inCart = cartQty > 0

  useEffect(() => {
    let active = true
    void (async () => {
      setLoading(true)
      setLoadError(null)
      setBackendDown(false)
      setProduct(null)
      setDescExpanded(false)
      try {
        const data = id ? await getProductById(id) : null
        if (active) setProduct(data)
      } catch (err) {
        if (!active) return
        if (isStoreBackendUnavailableError(err)) {
          setBackendDown(true)
          setLoadError(err.message)
        } else {
          setLoadError(err instanceof Error ? err.message : 'Erro ao carregar o produto')
        }
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [id])

  useEffect(() => {
    if (!user || !product) {
      setLiked(false)
      return
    }
    void isFavorite(product.id)
      .then(setLiked)
      .catch(() => setLiked(false))
  }, [user, product?.id])

  useEffect(() => {
    const currentProduct = product
    if (!currentProduct?.id || !currentProduct.categorySlug?.trim()) {
      setRelated([])
      return
    }
    let active = true
    void listRelatedProductsForPdp(currentProduct)
      .then((items) => {
        if (active) setRelated(items)
      })
      .catch(() => {
        if (active) setRelated([])
      })
    return () => {
      active = false
    }
  }, [product?.id, product?.categorySlug])

  if (loading) {
    return (
      <Container className="py-8">
        <Loading />
      </Container>
    )
  }

  if (backendDown) {
    return (
      <Container className="py-8">
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
      <Container className="py-8">
        <ErrorState
          message={loadError}
          onRetry={() => {
            setLoading(true)
            setLoadError(null)
            void (async () => {
              try {
                const data = id ? await getProductById(id) : null
                setProduct(data)
              } catch (err) {
                if (isStoreBackendUnavailableError(err)) {
                  setBackendDown(true)
                  setLoadError(err.message)
                } else {
                  setLoadError(err instanceof Error ? err.message : 'Erro ao carregar o produto')
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
      <Container className="py-8">
        <EmptyState
          title="Produto não encontrado"
          description="O item solicitado não está disponível no catálogo."
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
  const showStrike = listPrice > price + 0.001
  const categoryHref = current.categorySlug
    ? `/catalogo?cat=${encodeURIComponent(current.categorySlug)}`
    : null
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
  const catalogFilterHref = buildCatalogMakerFilterHref(
    current.compatibilityGroups?.[0]?.maker ?? null,
  )
  const galleryImages =
    current.images?.length
      ? current.images
      : current.imageUrl
        ? [current.imageUrl]
        : []

  async function onFavoriteClick() {
    if (!user) {
      navigate('/login', { state: { from: `/produto/${current.id}` } })
      return
    }
    try {
      const next = await toggleFavorite(current.id)
      setLiked(next)
      push(next ? 'Adicionado aos favoritos' : 'Removido dos favoritos', 'success')
    } catch (err) {
      push(err instanceof Error ? err.message : 'Erro ao favoritar', 'error')
    }
  }

  function goBack() {
    if (window.history.length > 1) navigate(-1)
    else navigate('/catalogo')
  }

  return (
    <Container className="overflow-x-hidden py-8">
      <button
        type="button"
        onClick={goBack}
        className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-fal-navy hover:underline md:hidden"
        aria-label="Voltar"
      >
        ← Voltar
      </button>
      <p className="mb-2 text-[13px] text-fal-muted">
        <Link to="/" className="hover:underline">
          Início
        </Link>
        {' / '}
        {current.categoryName ? (
          categoryHref ? (
            <Link to={categoryHref} className="hover:underline">
              {current.categoryName}
            </Link>
          ) : (
            <span>{current.categoryName}</span>
          )
        ) : (
          <Link to="/catalogo" className="hover:underline">
            Catálogo
          </Link>
        )}
        {' / '}
        <span className="text-fal-ink">{displayName}</span>
      </p>

      {/* Desktop: galeria | buy-box · Mobile: galeria → compra (CTA alto) */}
      <div className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-2">
        <ProductGallery images={galleryImages} alt={displayName} />

        <div className="relative min-w-0 rounded-fal border border-fal-line bg-white p-5">
          <button
            type="button"
            className="absolute top-4 right-4 grid h-10 w-10 place-items-center rounded-full border border-fal-line bg-white text-base shadow-sm hover:border-fal-navy"
            aria-label={liked ? 'Remover dos favoritos' : 'Favoritar'}
            onClick={() => void onFavoriteClick()}
          >
            {liked ? '♥' : '♡'}
          </button>
          <h1 className="mt-0 pr-12 text-[26px] font-extrabold leading-tight sm:text-[32px]">
            {displayName}
          </h1>
          <p className="mt-1 text-sm text-fal-muted">{formatReferenciaFromProduct(current)}</p>
          {brandName ? (
            <p className="mt-1 text-sm text-fal-ink">
              <span className="font-semibold text-fal-navy">{FABRICANTE_LABEL}:</span> {brandName}
            </p>
          ) : null}
          <p className="mt-4 text-3xl font-black">
            {current.available === false ? '—' : formatStorePriceLabel(price, listPrice)}
          </p>
          {current.available !== false && showStrike ? (
            <p className="mt-1 text-sm text-fal-muted line-through">{formatMoney(listPrice)}</p>
          ) : null}
          <p className="mt-2 text-sm">
            {current.available === false ? (
              <span className="font-semibold text-fal-danger">Indisponível</span>
            ) : (
              <span className="font-semibold text-fal-success">Disponível</span>
            )}
          </p>

          <div className="mt-5 space-y-2">
            {current.available === false ? (
              <Button variant="primary" fullWidth disabled>
                Indisponível
              </Button>
            ) : inCart ? (
              <div className="flex w-full min-w-0 items-center gap-2">
                <button
                  type="button"
                  className="grid h-[51px] w-12 shrink-0 place-items-center rounded-[10px] border border-fal-line bg-white text-lg font-bold text-fal-navy hover:bg-fal-bg"
                  aria-label="Diminuir quantidade"
                  onClick={() => updateQty(current.id, cartQty - 1)}
                >
                  −
                </button>
                <div className="flex min-w-0 flex-1 flex-col items-center justify-center rounded-[10px] bg-[#fff8db] px-2 py-2 text-center">
                  <span className="text-xs leading-none text-fal-muted">No carrinho</span>
                  <span className="text-base font-black text-fal-navy">{cartQty}</span>
                </div>
                <button
                  type="button"
                  className="grid h-[51px] w-12 shrink-0 place-items-center rounded-[10px] border border-transparent bg-fal-yellow text-lg font-bold text-fal-navy-dark hover:bg-fal-yellow-hover"
                  aria-label="Aumentar quantidade"
                  onClick={() => {
                    addItem(current, 1)
                    push('Quantidade atualizada', 'success', {
                      action: { label: 'Ver carrinho', to: '/carrinho' },
                    })
                  }}
                >
                  +
                </button>
              </div>
            ) : (
              <Button
                variant="primary"
                fullWidth
                onClick={() => {
                  addItem(current, 1)
                  push('Produto adicionado ao carrinho', 'success', {
                    action: { label: 'Ver carrinho', to: '/carrinho' },
                  })
                }}
              >
                Adicionar ao carrinho
              </Button>
            )}
            {(() => {
              if (!waPhone || current.available === false) return null
              const href = whatsAppHref(
                waPhone,
                buildProductWhatsAppMessage({
                  name: displayName,
                  sku: current.commercialRef ?? current.sku,
                  quantity: 1,
                  productUrl: typeof window !== 'undefined' ? window.location.href : undefined,
                }),
              )
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center justify-center rounded-[10px] border border-[#25D366] bg-[#25D366]/10 px-4 py-3 text-sm font-extrabold text-[#128C7E] hover:bg-[#25D366]/20"
                >
                  Comprar pelo WhatsApp
                </a>
              )
            })()}
          </div>

          <ProductShippingQuoteBlock product={current} />
        </div>
      </div>

      {/* Abaixo do buy-box: apps → desc → specs → ajuda */}
      <div className="mt-8 min-w-0 space-y-4">
        <div className="rounded-[10px] border border-fal-line bg-fal-bg p-3 sm:p-4">
          <CompatibilityAppsBlock
            variant="pdp"
            groups={current.compatibilityGroups}
            summary={current.compatibilitySummary}
          />
          {current.compatibilityGroups?.length || current.compatibilitySummary ? (
            <p className="mb-0 mt-3 text-sm">
              <Link to={catalogFilterHref} className="font-semibold text-fal-navy hover:underline">
                {FILTRAR_NO_CATALOGO_LABEL}
              </Link>
              <span className="text-fal-muted"> — outras peças pelo veículo no catálogo</span>
            </p>
          ) : null}
        </div>
        {fullDescription ? (
          <div className="rounded-[10px] border border-fal-line bg-white p-4 text-sm text-fal-ink">
            <p className="m-0 font-semibold text-fal-navy">{DESCRICAO_SECTION_LABEL}</p>
            <p className="mb-0 mt-1 whitespace-pre-wrap text-fal-muted">{descriptionShown}</p>
            {descriptionCollapses ? (
              <button
                type="button"
                className="mt-2 text-sm font-semibold text-fal-navy hover:underline"
                aria-expanded={descExpanded}
                onClick={() => setDescExpanded((v) => !v)}
              >
                {descExpanded ? VER_MENOS_DESCRICAO_LABEL : VER_DESCRICAO_COMPLETA_LABEL}
              </button>
            ) : null}
          </div>
        ) : null}
        {specRows.length ? (
          <div className="overflow-x-auto rounded-[10px] border border-fal-line bg-white p-4 text-sm text-fal-ink">
            <p className="m-0 font-semibold text-fal-navy">{ESPECIFICACOES_SECTION_LABEL}</p>
            <table className="mt-2 w-full min-w-0 border-collapse">
              <tbody>
                {specRows.map((row, i) => (
                  <tr
                    key={`${row.label}-${row.value}`}
                    className={i % 2 === 0 ? 'bg-fal-bg/80' : 'bg-white'}
                  >
                    <th
                      scope="row"
                      className="w-[38%] px-3 py-2.5 text-left align-top font-semibold text-fal-navy"
                    >
                      {row.label}
                    </th>
                    <td className="min-w-0 break-words px-3 py-2.5 text-fal-muted">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <p className="text-xs text-fal-muted">{AJUDA_APLICACAO_TEXT}</p>
      </div>

      {related.length ? (
        <section className="mt-10 min-w-0" aria-labelledby="pdp-related-heading">
          <div className="mb-3 flex min-w-0 flex-wrap items-baseline justify-between gap-2">
            <h2
              id="pdp-related-heading"
              className="m-0 text-lg font-extrabold text-fal-navy sm:text-xl"
            >
              {RELACIONADOS_SECTION_LABEL}
            </h2>
            {categoryHref ? (
              <Link
                to={categoryHref}
                className="text-sm font-semibold text-fal-navy hover:underline"
              >
                {VER_MAIS_CATALOGO_LABEL}
              </Link>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}
    </Container>
  )
}
