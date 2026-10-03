import { Container } from '@/components/layout/Container'
import { EmptyState } from '@/components/common/EmptyState'
import { Loading } from '@/components/common/Loading'
import { getProductById } from '@/services/products/productService'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { Product } from '@/types'
import { Button } from '@/components/common/Button'
import { useCart } from '@/contexts/CartContext'
import { useToast } from '@/components/common/Toast'

export function ProductPage() {
  const { id } = useParams()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const { addItem } = useCart()
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

  const price = product.promoPrice ?? product.price

  return (
    <Container className="py-8">
      <p className="mb-2 text-[13px] text-fal-muted">
        Início / {product.categoryName} / {product.name}
      </p>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="grid h-[280px] place-items-center rounded-2xl bg-gradient-to-br from-[#e8ecef] to-[#d7dde1] text-7xl lg:h-[420px]">
          🧩
        </div>
        <div className="rounded-fal border border-fal-line bg-white p-5">
          <p className="text-sm text-fal-muted">{product.brand}</p>
          <h1 className="mt-1 text-[28px] font-extrabold sm:text-[34px]">{product.name}</h1>
          <p className="text-sm text-fal-muted">SKU {product.sku}</p>
          <p className="mt-4 text-3xl font-black">
            {price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <p className="mt-2 text-sm">
            {product.available === false ? (
              <span className="text-fal-danger">Indisponível</span>
            ) : (
              <span className="text-fal-success">Disponível</span>
            )}
          </p>
          {product.compatibilitySummary ? (
            <p className="mt-3 text-fal-success">Aplicação: {product.compatibilitySummary}</p>
          ) : null}
          {product.references?.length ? (
            <div className="mt-3 text-sm text-fal-muted">
              <p className="m-0 font-semibold text-fal-ink">Códigos / referências</p>
              <ul className="mt-1 list-disc pl-5">
                {product.references.map((ref) => (
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
              disabled={product.available === false}
              onClick={() => {
                addItem(product, 1)
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
