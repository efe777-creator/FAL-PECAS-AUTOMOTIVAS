import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { ProductCard } from '@/components/product/ProductCard'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { toUserMessage } from '@/lib/toUserMessage'
import { listFavoriteProducts } from '@/services/customers/favoriteService'
import type { Product } from '@/types'
import { useEffect, useState } from 'react'

export function AccountFavoritesPage() {
  useDocumentTitle('Favoritos | FAL Peças Automotivas')
  const toast = useToast()
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        setItems(await listFavoriteProducts())
        setError(null)
      } catch (e) {
        const message = toUserMessage(e, 'Erro ao carregar favoritos')
        setError(message)
        toast.push(message, 'error')
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, [])

  if (loading) return <Loading label="Carregando favoritos…" />
  if (error) return <ErrorState message={error} />

  const available = items.filter((p) => p.status === 'published')
  const archived = items.filter((p) => p.status !== 'published')

  return (
    <div className="space-y-4">
      <div className="rounded-fal border border-fal-line bg-white p-5">
        <h2 className="mt-0 text-xl font-extrabold">Favoritos</h2>
        <p className="text-sm text-fal-muted">Produtos que você marcou na loja.</p>
      </div>

      {available.length === 0 ? (
        <EmptyState
          title="Você ainda não possui produtos favoritos."
          description="No catálogo, use o coração para salvar peças."
          actionLabel="Ir ao catálogo"
          actionTo="/catalogo"
        />
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {available.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {archived.length ? (
        <div className="rounded-fal border border-fal-line bg-white p-4">
          <p className="m-0 text-sm font-semibold text-fal-muted">
            {archived.length} favorito(s) não estão mais disponíveis no catálogo (arquivados).
          </p>
          <ul className="mt-2 mb-0 list-disc pl-5 text-sm text-fal-muted">
            {archived.map((p) => (
              <li key={p.id}>
                {p.name} · Código {p.sku}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
