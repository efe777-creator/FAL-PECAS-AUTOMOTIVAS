import { useAuth } from '@/contexts/AuthContext'
import { localCartStorage } from '@/services/cart/cartStorage'
import { applyResolvedPricesToCartItems } from '@/services/cart/cartPricing'
import {
  clearRemoteCart,
  loadRemoteCart,
  mergeCartItems,
  saveRemoteCart,
} from '@/services/cart/supabaseCartService'
import { isSupabaseConfigured } from '@/lib/supabase'
import { displayPrice } from '@/services/pricing/priceResolutionService'
import type { CartItem, CartStorageKind, Product } from '@/types'
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
  /** Onde o carrinho está persistido agora. */
  storageKind: CartStorageKind
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [items, setItems] = useState<CartItem[]>([])
  const [ready, setReady] = useState(false)
  const [syncPending, setSyncPending] = useState(false)
  const skipNextRemoteSave = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Serializa saves remotos (evita corrida delete/insert → 23505). */
  const saveChain = useRef(Promise.resolve())
  const prevUserId = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    setItems(localCartStorage.load())
    setReady(true)
  }, [])

  // Visitante: localStorage. Autenticado: não espelha (merge limpa local após sync).
  useEffect(() => {
    if (!ready || user) return
    localCartStorage.save(items)
  }, [items, ready, user])

  // Logout → grava snapshot atual no local para continuar como visitante
  useEffect(() => {
    const prev = prevUserId.current
    const next = user?.id ?? null
    if (prev !== undefined && prev && !next && ready) {
      localCartStorage.save(items)
    }
    prevUserId.current = next
  }, [user?.id, ready, items])

  // Login: merge local → remoto + preços canônicos (FIND-006)
  useEffect(() => {
    if (!ready || !user || !isSupabaseConfigured) return
    let cancelled = false
    setSyncPending(true)
    void (async () => {
      try {
        const local = localCartStorage.load()
        const remote = await loadRemoteCart()
        const merged = mergeCartItems(local, remote)
        const priced = await applyResolvedPricesToCartItems(merged)
        if (cancelled) return
        skipNextRemoteSave.current = true
        setItems(priced)
        await saveRemoteCart(priced)
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

  // Visitante / local: revalida preços canônicos após hydrate
  useEffect(() => {
    if (!ready || user || !isSupabaseConfigured) return
    let cancelled = false
    void (async () => {
      try {
        const local = localCartStorage.load()
        if (!local.length) return
        const priced = await applyResolvedPricesToCartItems(local, null)
        if (cancelled) return
        setItems(priced)
      } catch (err) {
        console.error('[FAL] Falha ao resolver preços do carrinho local', err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [ready, user])

  // Auth: debounce save remoto
  useEffect(() => {
    if (!ready || !user || !isSupabaseConfigured) return
    if (skipNextRemoteSave.current) {
      skipNextRemoteSave.current = false
      return
    }
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      const snapshot = items
      saveChain.current = saveChain.current
        .then(() => saveRemoteCart(snapshot))
        .catch((err) => console.error('[FAL] Falha ao salvar carrinho remoto', err))
    }, 400)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [items, ready, user?.id])

  const addItem = useCallback((product: Product, quantity = 1) => {
    const price = displayPrice(product)
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id)
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id
            ? {
                ...i,
                quantity: i.quantity + quantity,
                price,
                slug: product.slug || i.slug,
                commercialRef: product.commercialRef ?? i.commercialRef,
                imageUrl: product.imageUrl ?? i.imageUrl,
              }
            : i,
        )
      }
      return [
        ...prev,
        {
          productId: product.id,
          sku: product.sku,
          commercialRef: product.commercialRef ?? product.sku,
          slug: product.slug,
          name: product.name,
          price,
          quantity,
          imageUrl: product.imageUrl,
        },
      ]
    })
    if (isSupabaseConfigured) {
      void applyResolvedPricesToCartItems(
        [
          {
            productId: product.id,
            sku: product.sku,
            name: product.name,
            price,
            quantity,
          },
        ],
      ).then((priced) => {
        const next = priced[0]
        if (!next) return
        setItems((prev) =>
          prev.map((i) => (i.productId === product.id ? { ...i, price: next.price } : i)),
        )
      })
    }
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

  const storageKind: CartStorageKind =
    user && isSupabaseConfigured ? 'supabase' : 'local'

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
      storageKind,
    }),
    [items, itemCount, subtotal, addItem, removeItem, updateQty, clear, syncPending, storageKind],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart deve ser usado dentro de CartProvider')
  return ctx
}
