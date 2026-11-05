import { useAuth } from '@/contexts/AuthContext'
import {
  listFavoriteProductIds,
  toggleFavorite as toggleFavoriteRemote,
} from '@/services/customers/favoriteService'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type FavoritesContextValue = {
  /** IDs favoritos do usuário; vazio se anônimo. */
  favoriteIds: ReadonlySet<string>
  loading: boolean
  isFavorite: (productId: string) => boolean
  toggle: (productId: string) => Promise<boolean>
  refresh: () => Promise<void>
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null)

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [ids, setIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!user) {
      setIds(new Set())
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const list = await listFavoriteProductIds()
      setIds(new Set(list))
    } catch {
      setIds(new Set())
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const isFavorite = useCallback((productId: string) => ids.has(productId), [ids])

  const toggle = useCallback(
    async (productId: string) => {
      const currently = ids.has(productId)
      const next = await toggleFavoriteRemote(productId, currently)
      setIds((prev) => {
        const copy = new Set(prev)
        if (next) copy.add(productId)
        else copy.delete(productId)
        return copy
      })
      return next
    },
    [ids],
  )

  const value = useMemo(
    () => ({
      favoriteIds: ids,
      loading,
      isFavorite,
      toggle,
      refresh,
    }),
    [ids, loading, isFavorite, toggle, refresh],
  )

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error('useFavorites deve ser usado dentro de FavoritesProvider')
  return ctx
}
