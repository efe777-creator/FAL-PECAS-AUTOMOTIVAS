import { getSupabase, isSupabaseConfigured, supabase } from '@/lib/supabase'
import { attachResolvedPrices } from '@/services/pricing/priceResolutionService'
import { attachCompatibilitySummaries } from '@/services/products/compatibilitySummary'
import { attachPrimaryProductImages } from '@/services/products/productImages'
import type { Product } from '@/types'

const PRODUCT_SELECT = `
  id, sku, commercial_ref, name, slug, price, promo_price, status, brand_id, category_id,
  is_available, product_kind,
  product_brands ( name ),
  product_categories ( id, name, slug )
`

export type FavoriteUnavailableItem = {
  productId: string
  name: string | null
  sku: string | null
  status: string | null
}

export type FavoriteListResult = {
  /** Published — grade com ProductCard. */
  products: Product[]
  /** Fora do catálogo (arquivado / sem join) — lista com ação remover. */
  unavailable: FavoriteUnavailableItem[]
}

function mapJoinedProduct(row: Record<string, unknown>): Product {
  const brandRaw = row.product_brands as { name?: string } | { name?: string }[] | null
  const brand = Array.isArray(brandRaw) ? brandRaw[0]?.name : brandRaw?.name
  const catRaw = row.product_categories as
    | { id?: string; name?: string; slug?: string }
    | { id?: string; name?: string; slug?: string }[]
    | null
  const cat = Array.isArray(catRaw) ? catRaw[0] : catRaw
  const sku = String(row.sku ?? '')
  return {
    id: String(row.id),
    sku,
    commercialRef: String(row.commercial_ref ?? sku),
    name: String(row.name),
    slug: String(row.slug),
    price: Number(row.price),
    promoPrice: row.promo_price == null ? null : Number(row.promo_price),
    status: row.status as Product['status'],
    brand,
    brandId: (row.brand_id as string | null) ?? null,
    categoryId: cat?.id ?? (row.category_id as string | null) ?? undefined,
    categoryName: cat?.name,
    categorySlug: cat?.slug,
    productKind: row.product_kind === 'kit' ? 'kit' : 'item',
    available: Boolean(row.is_available),
  }
}

function mapRpcRow(row: Record<string, unknown>): Product | FavoriteUnavailableItem {
  const productId = String(row.product_id ?? '')
  const status = row.status == null ? null : String(row.status)
  const name = row.name == null ? null : String(row.name)
  const sku = row.sku == null ? null : String(row.sku)

  if (!name || !sku || !status || status !== 'published') {
    return {
      productId,
      name,
      sku,
      status,
    }
  }

  return {
    id: productId,
    sku,
    commercialRef: String(row.commercial_ref ?? sku),
    name,
    slug: String(row.slug ?? ''),
    price: Number(row.price ?? 0),
    promoPrice: row.promo_price == null ? null : Number(row.promo_price),
    status: 'published',
    brand: row.brand_name == null ? undefined : String(row.brand_name),
    brandId: (row.brand_id as string | null) ?? null,
    categoryId: (row.category_id as string | null) ?? undefined,
    productKind: row.product_kind === 'kit' ? 'kit' : 'item',
    available: Boolean(row.is_available),
  }
}

function isProduct(x: Product | FavoriteUnavailableItem): x is Product {
  return 'id' in x && 'slug' in x
}

async function hydrateFavoriteProducts(products: Product[]): Promise<Product[]> {
  if (!products.length) return products
  const withPrices = await attachResolvedPrices(products)
  const withApps = await attachCompatibilitySummaries(withPrices, {
    compact: true,
    maxEntries: 4,
    withGroups: false,
  })
  return attachPrimaryProductImages(withApps)
}

async function listFavoriteProductsViaRpc(): Promise<FavoriteListResult | null> {
  if (!isSupabaseConfigured || !supabase) return null
  const { data, error } = await supabase.rpc('store_list_my_favorites')
  if (error) return null
  const products: Product[] = []
  const unavailable: FavoriteUnavailableItem[] = []
  for (const raw of data ?? []) {
    const mapped = mapRpcRow(raw as Record<string, unknown>)
    if (isProduct(mapped)) products.push(mapped)
    else unavailable.push(mapped)
  }
  return {
    products: await hydrateFavoriteProducts(products),
    unavailable,
  }
}

/** Fallback sem RPC: join RLS — arquivados viram unavailable só com productId. */
async function listFavoriteProductsViaJoin(): Promise<FavoriteListResult> {
  const sb = getSupabase()
  const { data: auth } = await sb.auth.getUser()
  const uid = auth.user?.id
  if (!uid) return { products: [], unavailable: [] }

  const { data, error } = await sb
    .from('favorites')
    .select(`product_id, products ( ${PRODUCT_SELECT} )`)
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
  if (error) throw error

  const products: Product[] = []
  const unavailable: FavoriteUnavailableItem[] = []

  for (const row of data ?? []) {
    const productId = String((row as { product_id: string }).product_id)
    const raw = (row as { products: unknown }).products
    const p = (Array.isArray(raw) ? raw[0] : raw) as Record<string, unknown> | null
    if (!p) {
      unavailable.push({ productId, name: null, sku: null, status: null })
      continue
    }
    const mapped = mapJoinedProduct(p)
    if (mapped.status === 'published') products.push(mapped)
    else {
      unavailable.push({
        productId: mapped.id,
        name: mapped.name,
        sku: mapped.sku,
        status: mapped.status,
      })
    }
  }

  return {
    products: await hydrateFavoriteProducts(products),
    unavailable,
  }
}

export async function listFavoriteProducts(): Promise<FavoriteListResult> {
  const viaRpc = await listFavoriteProductsViaRpc()
  if (viaRpc) return viaRpc
  return listFavoriteProductsViaJoin()
}

export async function isFavorite(productId: string): Promise<boolean> {
  const sb = getSupabase()
  const { data: auth } = await sb.auth.getUser()
  const uid = auth.user?.id
  if (!uid) return false
  const { data, error } = await sb
    .from('favorites')
    .select('product_id')
    .eq('user_id', uid)
    .eq('product_id', productId)
    .maybeSingle()
  if (error) throw error
  return Boolean(data)
}

/** Uma query: todos os product_id favoritos do usuário logado (Onda 2 — evita N+1 no grid). */
export async function listFavoriteProductIds(): Promise<string[]> {
  const sb = getSupabase()
  const { data: auth } = await sb.auth.getUser()
  const uid = auth.user?.id
  if (!uid) return []
  const { data, error } = await sb.from('favorites').select('product_id').eq('user_id', uid)
  if (error) throw error
  return (data ?? []).map((r) => String((r as { product_id: string }).product_id))
}

export async function addFavorite(productId: string): Promise<void> {
  const sb = getSupabase()
  const { data: auth } = await sb.auth.getUser()
  const uid = auth.user?.id
  if (!uid) throw new Error('Faça login para favoritar')
  const { error } = await sb.from('favorites').upsert({ user_id: uid, product_id: productId })
  if (error) throw error
}

export async function removeFavorite(productId: string): Promise<void> {
  const sb = getSupabase()
  const { data: auth } = await sb.auth.getUser()
  const uid = auth.user?.id
  if (!uid) return
  const { error } = await sb.from('favorites').delete().eq('user_id', uid).eq('product_id', productId)
  if (error) throw error
}

/**
 * Alterna favorito.
 * Passe `currentlyLiked` quando o UI já sabe o estado (batch) — evita SELECT extra.
 */
export async function toggleFavorite(
  productId: string,
  currentlyLiked?: boolean,
): Promise<boolean> {
  const liked = currentlyLiked ?? (await isFavorite(productId))
  if (liked) {
    await removeFavorite(productId)
    return false
  }
  await addFavorite(productId)
  return true
}

/** Pure — testes: particiona published vs fora do catálogo. */
export function partitionFavoriteRows(
  rows: Array<Product | FavoriteUnavailableItem>,
): FavoriteListResult {
  const products: Product[] = []
  const unavailable: FavoriteUnavailableItem[] = []
  for (const row of rows) {
    if (isProduct(row) && row.status === 'published') products.push(row)
    else if (isProduct(row)) {
      unavailable.push({
        productId: row.id,
        name: row.name,
        sku: row.sku,
        status: row.status,
      })
    } else unavailable.push(row)
  }
  return { products, unavailable }
}
