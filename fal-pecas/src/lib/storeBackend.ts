import { isSupabaseConfigured } from '@/lib/supabase'

/** Copy loja quando VITE_SUPABASE_* ausente (FIND-019 / IMP-19 U1). */
export const STORE_BACKEND_UNAVAILABLE_TITLE = 'Catálogo indisponível'
export const STORE_BACKEND_UNAVAILABLE_MESSAGE =
  'O backend da loja não está configurado. Verifique as variáveis de ambiente e tente novamente.'

/**
 * Mocks de catálogo só com flag explícita em DEV.
 * Produção / misconfig nunca caem em dados fictícios silenciosos.
 */
export function allowCatalogMocks(): boolean {
  return (
    import.meta.env.DEV === true &&
    String(import.meta.env.VITE_ALLOW_CATALOG_MOCKS ?? '') === 'true'
  )
}

export function isStoreBackendReady(): boolean {
  return isSupabaseConfigured || allowCatalogMocks()
}

export class StoreBackendUnavailableError extends Error {
  readonly code = 'STORE_BACKEND_UNAVAILABLE' as const

  constructor(message = STORE_BACKEND_UNAVAILABLE_MESSAGE) {
    super(message)
    this.name = 'StoreBackendUnavailableError'
  }
}

export function assertStoreBackendConfigured(): void {
  if (isSupabaseConfigured) return
  if (allowCatalogMocks()) return
  throw new StoreBackendUnavailableError()
}

export function isStoreBackendUnavailableError(err: unknown): err is StoreBackendUnavailableError {
  return err instanceof StoreBackendUnavailableError
}
