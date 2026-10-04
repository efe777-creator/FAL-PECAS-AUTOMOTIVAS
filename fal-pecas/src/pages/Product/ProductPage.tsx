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

export function ProductPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(false)
  const { addItem } = useCart()
  const { user } = useAuth()
  const { push } = useToast()

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
  const price = current.promoPrice ?? current.price
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
          <p className="text-sm text-fal-muted">{current.brand}</p>
          <h1 className="mt-1 pr-12 text-[28px] font-extrabold sm:text-[34px]">{current.name}</h1>
          <p className="text-sm text-fal-muted">SKU {current.sku}</p>
          <p className="mt-4 text-3xl font-black">
            {price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <p className="mt-2 text-sm">
            {current.available === false ? (
              <span className="text-fal-danger">Indisponível</span>
            ) : (
              <span className="text-fal-success">Disponível</span>
            )}
          </p>
          {current.compatibilitySummary ? (
            <p className="mt-3 text-fal-success">Aplicação: {current.compatibilitySummary}</p>
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
          <div className="mt-5">
            <Button
              variant="primary"
              fullWidth
              disabled={current.available === false}
              onClick={() => {
                addItem(current, 1)
                push('Produto adicionado ao carrinho', 'success')
              }}
            >
              Adicionar ao carrinho
            </Button>
          </div>
          <p className="mt-4 text-xs text-fal-muted">
            Dados via Supabase (Fase 2). Galeria e abas técnicas avançam nas próximas fases.
          </p>
        </div>
      </div>
    </Container>
  )
}
