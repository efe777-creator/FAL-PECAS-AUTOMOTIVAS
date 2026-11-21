import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Loading } from '@/components/common/Loading'
import { useToast } from '@/components/common/Toast'
import { ProductCard } from '@/components/product/ProductCard'
import { useFavorites } from '@/contexts/FavoritesContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  listFavoriteProducts,
  removeFavorite,
  type FavoriteUnavailableItem,
} from '@/services/customers/favoriteService'
import type { Product } from '@/types'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

export function AccountFavoritesPage() {
  useDocumentTitle('Favoritos | FAL Peças Automotivas')
  const toast = useToast()
  const { favoriteIds, refresh } = useFavorites()
  const [items, setItems] = useState<Product[]>([])
  const [unavailable, setUnavailable] = useState<FavoriteUnavailableItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await listFavoriteProducts()
      setItems(result.products)
      setUnavailable(result.unavailable)
      setError(null)
      await refresh()
    } catch (e) {
      const message = toUserMessage(e, 'Erro ao carregar favoritos')
      setError(message)
      toast.push(message, 'error')
    } finally {
      setLoading(false)
    }
  }, [refresh, toast])

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount / retry via load
  }, [])

  // Desfavoritar no card some da grade na hora (contexto é fonte da verdade).
  useEffect(() => {
    setItems((prev) => prev.filter((p) => favoriteIds.has(p.id)))
    setUnavailable((prev) => prev.filter((u) => favoriteIds.has(u.productId)))
  }, [favoriteIds])

  async function onRemoveUnavailable(productId: string) {
    setRemovingId(productId)
    try {
      await removeFavorite(productId)
      setUnavailable((prev) => prev.filter((u) => u.productId !== productId))
      await refresh()
      toast.push('Removido dos favoritos', 'success')
    } catch (e) {
      toast.push(toUserMessage(e, 'Erro ao remover favorito'), 'error')
    } finally {
      setRemovingId(null)
    }
  }

  if (loading) return <Loading label="Carregando favoritos…" />
  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={() => {
          void load()
        }}
      />
    )
  }

  const hasAny = items.length > 0 || unavailable.length > 0

  return (
    <div className="space-y-4">
      <div className="rounded-fal border border-fal-line bg-fal-surface p-5">
        <h2 className="mt-0 text-xl font-extrabold">Favoritos</h2>
        <p className="text-sm text-fal-muted">
          Peças que você salvou na loja
          {hasAny
            ? ` · ${items.length + unavailable.length} item(ns)`
            : ''}
          .
        </p>
      </div>

      {!hasAny ? (
        <EmptyState
          title="Nenhum favorito ainda"
          description="No catálogo ou na página do produto, toque no coração para salvar peças e achar depois com facilidade."
          actionLabel="Ver catálogo"
          actionTo="/catalogo"
        />
      ) : null}

      {items.length > 0 ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} quietFavoriteToast />
          ))}
        </div>
      ) : null}

      {items.length === 0 && unavailable.length > 0 ? (
        <EmptyState
          title="Nenhum favorito disponível no catálogo"
          description="Você ainda tem itens salvos que saíram da loja. Remova-os abaixo ou explore o catálogo."
          actionLabel="Ver catálogo"
          actionTo="/catalogo"
        />
      ) : null}

      {unavailable.length > 0 ? (
        <div className="rounded-fal border border-fal-line bg-fal-surface p-4">
          <p className="m-0 text-sm font-semibold text-fal-fg">
            Fora do catálogo ({unavailable.length})
          </p>
          <p className="mt-1 mb-3 text-sm text-fal-muted">
            Estes favoritos foram arquivados ou não estão mais à venda. Você pode removê-los da
            lista.
          </p>
          <ul className="m-0 list-none space-y-2 p-0">
            {unavailable.map((u) => (
              <li
                key={u.productId}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-fal-line py-2 last:border-0"
              >
                <div className="min-w-0">
                  <p className="m-0 text-sm font-semibold text-fal-fg">
                    {u.name ?? 'Produto indisponível'}
                  </p>
                  <p className="m-0 text-xs text-fal-muted">
                    {u.sku ? `Código ${u.sku}` : `ID ${u.productId.slice(0, 8)}…`}
                    {u.status ? ` · ${u.status}` : ''}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="light"
                  size="sm"
                  disabled={removingId === u.productId}
                  onClick={() => void onRemoveUnavailable(u.productId)}
                >
                  {removingId === u.productId ? 'Removendo…' : 'Remover'}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {hasAny ? (
        <p className="m-0 text-center text-sm text-fal-muted">
          <Link to="/catalogo" className="font-semibold underline">
            Continuar no catálogo
          </Link>
        </p>
      ) : null}
    </div>
  )
}
