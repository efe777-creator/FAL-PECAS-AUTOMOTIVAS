import { Container } from '@/components/layout/Container'
import { EmptyState } from '@/components/common/EmptyState'
import { Loading } from '@/components/common/Loading'
import { getProductById } from '@/services/products/productService'
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

export function ProductPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
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
      const data = id ? await getProductById(id) : null
      if (active) {
        setProduct(data)
        setLoading(false)
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
  const price = current.resolvedPrice ?? current.promoPrice ?? current.price
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
        <span className="text-fal-ink">{current.name}</span>
      </p>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="grid h-[280px] place-items-center rounded-2xl bg-gradient-to-br from-[#e8ecef] to-[#d7dde1] text-7xl lg:h-[420px]">
          🧩
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
            {current.name}
          </h1>
          <p className="mt-1 text-sm text-fal-muted">Código FAL: {current.sku}</p>
          {current.posicao || current.lado ? (
            <p className="mt-2 text-sm text-fal-ink">
              {current.posicao ? (
                <span>
                  <span className="font-semibold text-fal-navy">Posição:</span>{' '}
                  {current.posicao === 'DIANTEIRA'
                    ? 'Dianteira'
                    : current.posicao === 'TRASEIRA'
                      ? 'Traseira'
                      : current.posicao}
                </span>
              ) : null}
              {current.posicao && current.lado ? ' · ' : null}
              {current.lado ? (
                <span>
                  <span className="font-semibold text-fal-navy">Lado:</span>{' '}
                  {current.lado === 'ESQUERDO'
                    ? 'Esquerdo'
                    : current.lado === 'DIREITO'
                      ? 'Direito'
                      : current.lado === 'AMBOS'
                        ? 'Ambos'
                        : current.lado}
                </span>
              ) : null}
            </p>
          ) : null}
          <p className="mt-4 text-3xl font-black">
            {current.available === false
              ? '—'
              : price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          {current.available !== false && showStrike ? (
            <p className="mt-1 text-sm text-fal-muted line-through">
              {listPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          ) : null}
          <p className="mt-2 text-sm">
            {current.available === false ? (
              <span className="font-semibold text-fal-danger">Indisponível</span>
            ) : (
              <span className="font-semibold text-fal-success">Disponível</span>
            )}
          </p>
          {current.compatibilitySummary ? (
            <div className="mt-4 rounded-[10px] border border-fal-line bg-fal-bg p-3 text-sm">
              <p className="m-0 font-semibold text-fal-navy">Aplicações</p>
              <p className="mb-0 mt-1 whitespace-pre-line text-fal-ink">{current.compatibilitySummary}</p>
            </div>
          ) : null}
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
                  name: current.name,
                  sku: current.sku,
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
