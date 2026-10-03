/**
 * Tipos centrais da FAL Peças Automotivas 3.0
 * Preparados para entidades futuras do PRD — sem inventar schema definitivo.
 */

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error' | 'empty'

export interface UserProfile {
  id: string
  email: string | null
  /** Preparado para login por username (resolução segura no backend — não no frontend). */
  username?: string | null
  fullName?: string | null
  phone?: string | null
  role?: UserRole
}

/** Papéis futuros (admin) — Fase 1 só tipa. */
export type UserRole =
  | 'customer'
  | 'administrador'
  | 'gerente'
  | 'operador'
  | 'estoque'
  | 'atendimento'

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  emoji?: string
  parentId?: string | null
}

export interface ProductReference {
  code: string
  type: string
  brandLabel?: string
}

export interface Product {
  id: string
  sku: string
  name: string
  slug: string
  description?: string
  brand?: string
  categoryId?: string
  categoryName?: string
  price: number
  promoPrice?: number | null
  /** Quantidade: só mocks/admin. Loja pública usa `available`. */
  stock?: number
  /** Disponibilidade pública (sem quantidade). */
  available?: boolean
  isIncomplete?: boolean
  status?: 'draft' | 'published' | 'archived'
  imageUrl?: string | null
  manufacturerCode?: string
  compatibilitySummary?: string
  references?: ProductReference[]
}

export interface VehicleFilter {
  /** Sempre "Montadora" na UI — nunca "marca do carro". */
  maker?: string
  model?: string
  year?: string
  engine?: string
  version?: string
}

export interface VehicleOptionTree {
  makers: string[]
  modelsByMaker: Record<string, string[]>
  yearsByModel: Record<string, string[]>
  enginesByModelYear: Record<string, string[]>
}

export interface CartItem {
  productId: string
  sku: string
  name: string
  price: number
  quantity: number
  imageUrl?: string | null
}

export type CartStorageKind = 'local' | 'supabase'

/**
 * Contrato de persistência do carrinho.
 * Visitante → localStorage (temporário)
 * Autenticado → sync Supabase (futuro)
 * Pedido → persistência definitiva no banco (futuro)
 */
export interface CartStorage {
  kind: CartStorageKind
  load(): CartItem[]
  save(items: CartItem[]): void
  clear(): void
}
