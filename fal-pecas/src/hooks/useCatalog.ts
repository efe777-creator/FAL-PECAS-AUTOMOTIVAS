import { toUserMessage } from '@/lib/toUserMessage'
import { listCategories } from '@/services/categories/categoryService'
import { subscribeCategoriesChanged } from '@/services/categories/categoryEvents'
import {
  listFeaturedProducts,
  listProductsByCategorySlug,
  listPromoHighlightProducts,
} from '@/services/products/productService'
import { searchProductSuggestions } from '@/services/search/searchService'
import { getVehicleOptions } from '@/services/vehicles/vehicleService'
import type { Category, Product, VehicleOptionTree } from '@/types'
import { useEffect, useState } from 'react'

interface AsyncState<T> {
  data: T
  loading: boolean
  error: string | null
}

export function useCategories() {
  const [state, setState] = useState<AsyncState<Category[]>>({
    data: [],
    loading: true,
    error: null,
  })
  const [rev, setRev] = useState(0)

  useEffect(() => subscribeCategoriesChanged(() => setRev((n) => n + 1)), [])

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const data = await listCategories()
        if (active) setState({ data, loading: false, error: null })
      } catch (e) {
        if (active)
          setState({
            data: [],
            loading: false,
            error: toUserMessage(e, 'Erro ao carregar categorias'),
          })
      }
    })()
    return () => {
      active = false
    }
  }, [rev])

  return state
}

export function useFeaturedProducts(limit = 8) {
  const [state, setState] = useState<AsyncState<Product[]>>({
    data: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const data = await listFeaturedProducts(limit)
        if (active) setState({ data, loading: false, error: null })
      } catch (e) {
        if (active)
          setState({
            data: [],
            loading: false,
            error: toUserMessage(e, 'Erro ao carregar produtos'),
          })
      }
    })()
    return () => {
      active = false
    }
  }, [limit])

  return state
}

export function usePromoHighlightProducts(limit = 8) {
  const [state, setState] = useState<AsyncState<Product[]>>({
    data: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const data = await listPromoHighlightProducts(limit)
        if (active) setState({ data, loading: false, error: null })
      } catch (e) {
        if (active)
          setState({
            data: [],
            loading: false,
            error: toUserMessage(e, 'Erro ao carregar ofertas'),
          })
      }
    })()
    return () => {
      active = false
    }
  }, [limit])

  return state
}

/** Produtos de uma ou mais categorias raiz (RPC inclui subcategorias). */
export function useCategoryProducts(slugs: string[], limit = 8) {
  const key = slugs.map((s) => s.trim()).filter(Boolean).join('|')
  const [state, setState] = useState<AsyncState<Product[]>>({
    data: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    let active = true
    const list = key ? key.split('|') : []
    if (!list.length) {
      setState({ data: [], loading: false, error: null })
      return
    }
    void (async () => {
      try {
        const chunks = await Promise.all(
          list.map((slug) => listProductsByCategorySlug(slug, limit)),
        )
        const seen = new Set<string>()
        const merged: Product[] = []
        for (const chunk of chunks) {
          for (const p of chunk) {
            if (seen.has(p.id)) continue
            seen.add(p.id)
            merged.push(p)
            if (merged.length >= limit) break
          }
          if (merged.length >= limit) break
        }
        if (active) setState({ data: merged, loading: false, error: null })
      } catch (e) {
        if (active)
          setState({
            data: [],
            loading: false,
            error: toUserMessage(e, 'Erro ao carregar produtos da categoria'),
          })
      }
    })()
    return () => {
      active = false
    }
  }, [key, limit])

  return state
}

export function useVehicleOptions() {
  const [state, setState] = useState<AsyncState<VehicleOptionTree | null>>({
    data: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const data = await getVehicleOptions()
        if (active) setState({ data, loading: false, error: null })
      } catch (e) {
        if (active)
          setState({
            data: null,
            loading: false,
            error: toUserMessage(e, 'Erro ao carregar veículos'),
          })
      }
    })()
    return () => {
      active = false
    }
  }, [])

  return state
}

export function useProductSearch(query: string) {
  const [state, setState] = useState<AsyncState<Product[]>>({
    data: [],
    loading: false,
    error: null,
  })

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setState({ data: [], loading: false, error: null })
      return
    }
    let active = true
    const timer = window.setTimeout(() => {
      void (async () => {
        setState((s) => ({ ...s, loading: true }))
        try {
          const items = await searchProductSuggestions(q, 6)
          if (active) setState({ data: items, loading: false, error: null })
        } catch (e) {
          if (active)
            setState({
              data: [],
              loading: false,
              error: toUserMessage(e, 'Erro na busca'),
            })
        }
      })()
    }, 220)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [query])

  return state
}
