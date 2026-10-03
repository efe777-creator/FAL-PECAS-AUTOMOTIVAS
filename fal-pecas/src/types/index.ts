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
  sortOrder?: number
  status?: 'draft' | 'published' | 'archived'
}

export interface ProductReference {
  id?: string
  code: string
  type: string
  brandId?: string | null
  brandLabel?: string
  status?: 'active' | 'inactive'
}

export interface Product {
  id: string
  sku: string
  name: string
  slug: string
  description?: string
  shortDescription?: string
  brand?: string
  brandId?: string | null
  supplierId?: string | null
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
  attrs?: Record<string, unknown>
}

export type EntityStatus = 'active' | 'inactive'

export interface Manufacturer {
  id: string
  name: string
  slug: string
  status: EntityStatus
}

export interface VehicleModel {
  id: string
  manufacturerId: string
  name: string
  slug: string
  status: EntityStatus
}

export interface VehicleVersion {
  id: string
  manufacturerId: string
  modelId: string
  year: number | null
  engine: string | null
  versionName: string | null
  status: EntityStatus
}

export interface ProductBrand {
  id: string
  name: string
  slug: string
  status: EntityStatus
}

export interface Supplier {
  id: string
  name: string
  code?: string | null
  status: EntityStatus
}

export interface ProductImage {
  id: string
  productId: string
  storagePath: string
  alt?: string | null
  sortOrder: number
  isPrimary: boolean
  publicUrl?: string
}

export interface VehicleFilter {
  /** Sempre "Montadora" na UI — nunca "marca do carro". */
  maker?: string
  model?: string
  year?: string
  engine?: string
  version?: string
}

/** Ordenação do motor de busca (Fase 4). */
export type ProductSearchSort =
  | 'relevance'
  | 'price_asc'
  | 'price_desc'
  | 'name_asc'
  | 'name_desc'

/** Parâmetros do contrato searchCatalog / RPC search_products. */
export interface ProductSearchParams {
  q?: string | null
  /** Slug, id ou nome da categoria (inclui filhas no backend). */
  category?: string | null
  /** Nome ou id do fabricante (product_brands). */
  brand?: string | null
  maker?: string | null
  model?: string | null
  year?: string | null
  engine?: string | null
  version?: string | null
  sort?: ProductSearchSort | null
  /** 1-based. */
  page?: number | null
  /** Padrão 24. */
  pageSize?: number | null
}

export interface ProductSearchResult {
  items: Product[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface VehicleOptionTree {
  makers: string[]
  modelsByMaker: Record<string, string[]>
  yearsByModel: Record<string, string[]>
  enginesByModelYear: Record<string, string[]>
  /** Motores por modelo (inclui configs com year NULL). */
  enginesByModel: Record<string, string[]>
  versionsByModel: Record<string, string[]>
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
