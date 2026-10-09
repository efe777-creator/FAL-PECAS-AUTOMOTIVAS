import { Container } from '@/components/layout/Container'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Loading } from '@/components/common/Loading'
import { CompatibilityAppsBlock } from '@/components/product/CompatibilityAppsBlock'
import { getProductById } from '@/services/products/productService'
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
  FABRICANTE_LABEL,
  formatReferenciaFromProduct,
  formatStorePriceLabel,
} from '@/lib/productLabels'
import { formatLadoLabel, formatPosicaoLabel } from '@/lib/productPosicaoLado'
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
    <Container className="py-8">
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
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="grid h-[280px] place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#e8ecef] to-[#d7dde1] text-7xl lg:h-[420px]">
          {current.imageUrl ? (
            <img
              src={current.imageUrl}
              alt={displayName}
              className="h-full w-full object-contain"
              loading="lazy"
            />
          ) : (
            '🧩'
          )}
        </div>
        <div className="relative rounded-fal border border-fal-line bg-white p-5">
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
          <div className="mt-2 space-y-1 text-sm text-fal-ink">
            {brandName ? (
              <p className="m-0">
                <span className="font-semibold text-fal-navy">{FABRICANTE_LABEL}:</span> {brandName}
              </p>
            ) : null}
            {current.manufacturerCode ? (
              <p className="m-0">
                <span className="font-semibold text-fal-navy">Cód. fabricante:</span>{' '}
                <span className="font-mono">{current.manufacturerCode}</span>
              </p>
            ) : null}
            {current.categoryName ? (
              <p className="m-0">
                <span className="font-semibold text-fal-navy">Categoria:</span> {current.categoryName}
              </p>
            ) : null}
            {current.posicao || current.lado ? (
              <p className="m-0">
                {current.posicao ? (
                  <span>
                    <span className="font-semibold text-fal-navy">Posição:</span>{' '}
                    {formatPosicaoLabel(current.posicao)}
                  </span>
                ) : null}
                {current.posicao && current.lado ? ' · ' : null}
                {current.lado ? (
                  <span>
                    <span className="font-semibold text-fal-navy">Lado:</span>{' '}
                    {formatLadoLabel(current.lado)}
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>
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
          <div className="mt-4 rounded-[10px] border border-fal-line bg-fal-bg p-3">
            <CompatibilityAppsBlock
              variant="pdp"
              groups={current.compatibilityGroups}
              summary={current.compatibilitySummary}
            />
          </div>
          {current.references?.length ? (
            <div className="mt-3 text-sm text-fal-muted">
              <p className="m-0 font-semibold text-fal-ink">Códigos / referências</p>
              <ul className="mt-1 list-disc pl-5">
                {current.references.map((ref) => (
                  <li key={`${ref.type}-${ref.code}`}>
                    {ref.code}
                    {ref.brandLabel ? ` (${ref.brandLabel})` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="mt-5 space-y-2">
            {current.available === false ? (
              <Button variant="primary" fullWidth disabled>
                Indisponível
              </Button>
            ) : inCart ? (
              <div className="flex w-full items-center gap-2">
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
                    push('Quantidade atualizada', 'success')
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
                  push('Produto adicionado ao carrinho', 'success')
                }}
              >
                Adicionar ao carrinho
              </Button>
            )}
            {(() => {
              const phone = storeWhatsAppPhone()
              if (!phone || current.available === false) return null
              const href = whatsAppHref(
                phone,
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
          <p className="mt-4 text-xs text-fal-muted">
            Imagens e fichas técnicas detalhadas serão ampliadas em atualizações futuras.
          </p>
        </div>
      </div>
    </Container>
  )
}
