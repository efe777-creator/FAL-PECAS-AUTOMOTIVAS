import type { CartItem, CartStorage } from '@/types'

const STORAGE_KEY = 'fal_cart'

/**
 * Persistência temporária do carrinho do visitante.
 * NÃO é banco definitivo. Futuro: sync Supabase quando autenticado.
 */
export const localCartStorage: CartStorage = {
  kind: 'local',
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw) as CartItem[]
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  },
  save(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  },
  clear() {
    localStorage.removeItem(STORAGE_KEY)
  },
}

/**
 * @deprecated Prefer `supabaseCartService` (async). Mantido só por compatibilidade de tipo.
 */
export const supabaseCartStorageStub: CartStorage = {
  kind: 'supabase',
  load() {
    return []
  },
  save() {
    /* use saveRemoteCart */
  },
  clear() {
    /* use clearRemoteCart */
  },
}
