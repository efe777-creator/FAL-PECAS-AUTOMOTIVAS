import { useAuth } from '@/contexts/AuthContext'
import { localCartStorage } from '@/services/cart/cartStorage'
import {
  clearRemoteCart,
  loadRemoteCart,
  mergeCartItems,
  saveRemoteCart,
} from '@/services/cart/supabaseCartService'
import { isSupabaseConfigured } from '@/lib/supabase'
import type { CartItem, Product } from '@/types'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

interface CartContextValue {
  items: CartItem[]
  itemCount: number
  subtotal: number
  addItem: (product: Product, quantity?: number) => void
  removeItem: (productId: string) => void
  updateQty: (productId: string, quantity: number) => void
  clear: () => void
  /** true enquanto merge/sync remoto em andamento */
  syncPending: boolean
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [items, setItems] = useState<CartItem[]>([])
  const [ready, setReady] = useState(false)
  const [syncPending, setSyncPending] = useState(false)
  const skipNextRemoteSave = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setItems(localCartStorage.load())
    setReady(true)
  }, [])

  // Visitante: sempre localStorage
  useEffect(() => {
    if (!ready) return
    localCartStorage.save(items)
  }, [items, ready])

  // Login: merge local → remoto
  useEffect(() => {
    if (!ready || !user || !isSupabaseConfigured) return
    let cancelled = false
    setSyncPending(true)
    void (async () => {
      try {
        const local = localCartStorage.load()
        const remote = await loadRemoteCart()
        const merged = mergeCartItems(local, remote)
        if (cancelled) return
        skipNextRemoteSave.current = true
        setItems(merged)
        await saveRemoteCart(merged)
        localCartStorage.clear()
      } catch (err) {
        console.error('[FAL] Falha ao sincronizar carrinho', err)
      } finally {
        if (!cancelled) setSyncPending(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [ready, user?.id])

  // Auth: debounce save remoto
  useEffect(() => {
    if (!ready || !user || !isSupabaseConfigured) return
    if (skipNextRemoteSave.current) {
      skipNextRemoteSave.current = false
      return
    }
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      void saveRemoteCart(items).catch((err) =>
        console.error('[FAL] Falha ao salvar carrinho remoto', err),
      )
    }, 400)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [items, ready, user?.id])

  const addItem = useCallback((product: Product, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id)
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + quantity }
            : i,
        )
      }
      const price = product.promoPrice ?? product.price
      return [
        ...prev,
        {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          price,
          quantity,
          imageUrl: product.imageUrl,
        },
      ]
    })
  }, [])

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId))
  }, [])

  const updateQty = useCallback((productId: string, quantity: number) => {
    setItems((prev) =>
      prev
        .map((i) => (i.productId === productId ? { ...i, quantity } : i))
        .filter((i) => i.quantity > 0),
    )
  }, [])

  const clear = useCallback(() => {
    setItems([])
    localCartStorage.clear()
    if (user && isSupabaseConfigured) {
      void clearRemoteCart().catch(() => undefined)
    }
  }, [user])

  const itemCount = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items],
  )
  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items],
  )

  const value = useMemo(
    () => ({
      items,
      itemCount,
      subtotal,
      addItem,
      removeItem,
      updateQty,
      clear,
      syncPending,
    }),
    [items, itemCount, subtotal, addItem, removeItem, updateQty, clear, syncPending],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart deve ser usado dentro de CartProvider')
  return ctx
}
