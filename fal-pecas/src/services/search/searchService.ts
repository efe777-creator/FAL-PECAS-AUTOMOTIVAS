import { mockProducts } from '@/data/mocks/products'
import { assertStoreBackendConfigured, allowCatalogMocks } from '@/lib/storeBackend'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { attachCategoryMeta } from '@/services/categories/categoryService'
import {
  attachResolvedPrices,
  displayPrice,
} from '@/services/pricing/priceResolutionService'
import { attachCompatibilitySummaries } from '@/services/products/compatibilitySummary'
import { attachPrimaryProductImages } from '@/services/products/productImages'
import { buildCatalogSearchParams } from '@/services/search/buildCatalogSearchParams'
import { interpretNaturalLanguage } from '@/services/search/interpretNaturalLanguage'
import { prepareSearchQuery } from '@/services/search/searchPrepService'
import { listVehicleCatalogEntries } from '@/services/vehicles/vehicleService'
import type { Product, ProductSearchParams, ProductSearchResult, ProductSearchSort } from '@/types'

const DEFAULT_PAGE_SIZE = 24

/** Fire-and-forget: monitor de zero-result (não bloqueia a listagem). */
async function logSearchZeroResult(params: ProductSearchParams): Promise<void> {
  if (!supabase) return
  try {
    await supabase.from('search_zero_results').insert({
      q: params.q?.trim() || null,
      maker: params.maker?.trim() || null,
      model: params.model?.trim() || null,
      year: params.year?.trim() || null,
      engine: params.engine?.trim() || null,
      version: params.version?.trim() || null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 240) : null,
    })
  } catch {
    /* tabela ausente / RLS — busca segue */
  }
}

function mapRpcRow(row: Record<string, unknown>): Product {
  const sku = String(row.sku)
  const resolved =
    row.resolved_amount == null || row.resolved_amount === ''
      ? undefined
      : Number(row.resolved_amount)
  return {
    id: String(row.id),
    sku,
    commercialRef: (row.commercial_ref as string | null) ?? sku,
    name: String(row.name),
    slug: String(row.slug),
    description: (row.description as string | null) ?? undefined,
    shortDescription: (row.short_description as string | null) ?? undefined,
    brand: (row.brand_name as string | null) ?? undefined,
    brandId: (row.brand_id as string | null) ?? null,
    supplierId: (row.supplier_id as string | null) ?? null,
    categoryId: (row.category_id as string | null) ?? undefined,
    categoryName: (row.category_name as string | null) ?? undefined,
    price: Number(row.price),
    promoPrice: row.promo_price == null ? null : Number(row.promo_price),
    ...(resolved != null && Number.isFinite(resolved)
      ? { resolvedPrice: resolved, listPrice: Number(row.price) }
      : {}),
    status: row.status as Product['status'],
    manufacturerCode: (row.manufacturer_code as string | null) ?? undefined,
    available: Boolean(row.is_available),
    isIncomplete: Boolean(row.is_incomplete),
    posicao: (row.posicao as Product['posicao']) ?? null,
    lado: (row.lado as Product['lado']) ?? null,
    attrs: (row.attrs as Record<string, unknown> | null) ?? {},
    stock: undefined,
  }
}

/** Completa posicao/lado da página atual (RPC search ainda não devolve esses campos). */
async function enrichPageProductMeta(products: Product[]): Promise<Product[]> {
  if (!products.length || !isSupabaseConfigured || !supabase) return products
  const ids = products.map((p) => p.id)
  const { data, error } = await supabase
    .from('products')
    .select('id, posicao, lado, manufacturer_code, commercial_ref, sku')
    .in('id', ids)
  if (error) throw error
  const meta = new Map(
    (data ?? []).map((r) => [
      String(r.id),
      {
        posicao: (r.posicao as Product['posicao']) ?? null,
        lado: (r.lado as Product['lado']) ?? null,
        manufacturerCode: (r.manufacturer_code as string | null) ?? undefined,
        commercialRef: String(r.commercial_ref ?? r.sku ?? ''),
        sku: String(r.sku ?? ''),
      },
    ]),
  )
  return products.map((p) => {
    const m = meta.get(p.id)
    if (!m) return p
    return {
      ...p,
      posicao: p.posicao ?? m.posicao,
      lado: p.lado ?? m.lado,
      manufacturerCode: p.manufacturerCode ?? m.manufacturerCode,
      commercialRef: p.commercialRef ?? m.commercialRef,
      sku: p.sku || m.sku,
    }
  })
}

function normalizeSort(sort?: ProductSearchSort | null): ProductSearchSort {
  const allowed: ProductSearchSort[] = [
    'relevance',
    'price_asc',
    'price_desc',
    'name_asc',
    'name_desc',
  ]
  if (sort && allowed.includes(sort)) return sort
  return 'relevance'
}

function mockSearch(params: ProductSearchParams): ProductSearchResult {
  const q = (params.q ?? '').trim()
  const terms = q
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)

  let list = mockProducts.filter((p) => p.status === 'published')

  if (terms.length) {
    list = list.filter((p) => {
      const hay = [p.name, p.brand, p.sku, p.manufacturerCode, p.categoryName, p.compatibilitySummary]
        .filter(Boolean)
        .join(' ')
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .toLowerCase()
      return terms.every((t) => hay.includes(t))
    })
  }

  if (params.brand?.trim()) {
    const b = params.brand.trim().toLowerCase()
    list = list.filter((p) => (p.brand ?? '').toLowerCase() === b)
  }
  if (params.category?.trim()) {
    const c = params.category.trim().toLowerCase()
    list = list.filter(
      (p) =>
        (p.categoryName ?? '').toLowerCase() === c ||
        (p.categoryId ?? '').toLowerCase() === c,
    )
  }

  const sort = normalizeSort(params.sort)
  list = [...list].sort((a, b) => {
    if (sort === 'price_asc') return displayPrice(a) - displayPrice(b)
    if (sort === 'price_desc') return displayPrice(b) - displayPrice(a)
    if (sort === 'name_desc') return b.name.localeCompare(a.name, 'pt-BR')
    return a.name.localeCompare(b.name, 'pt-BR')
  })

  const pageSize = Math.min(Math.max(params.pageSize ?? DEFAULT_PAGE_SIZE, 1), 100)
  const page = Math.max(params.page ?? 1, 1)
  const total = list.length
  const start = (page - 1) * pageSize
  const items = list.slice(start, start + pageSize)

  return {
    items,
    total,
    page,
    pageSize,
    hasMore: start + items.length < total,
  }
}

/**
 * Contrato único do motor de busca (Fase 4).
 * Catálogo público deve chamar somente este service — ranking/filtros/total via RPC.
 *
 * Elegibilidade (IMP-11 / PRD):
 * - Listagem: `status = published` (RPC). Produto indisponível pode aparecer com badge.
 * - Compra: `is_available` + preço resolvido (card/PDP / Liberar) — regras independentes.
 */
export async function searchCatalog(params: ProductSearchParams = {}): Promise<ProductSearchResult> {
  const pageSize = Math.min(Math.max(params.pageSize ?? DEFAULT_PAGE_SIZE, 1), 100)
  const page = Math.max(params.page ?? 1, 1)
  const sort = normalizeSort(params.sort)

  assertStoreBackendConfigured()
  if (!isSupabaseConfigured || !supabase) {
    // Só alcançável com VITE_ALLOW_CATALOG_MOCKS=true em DEV
    if (!allowCatalogMocks()) throw new Error('Catálogo indisponível')
    return mockSearch({ ...params, page, pageSize, sort })
  }

  let effective: ProductSearchParams = { ...params }
  const hasVehicle =
    Boolean(params.maker?.trim()) ||
    Boolean(params.model?.trim()) ||
    Boolean(params.year?.trim()) ||
    Boolean(params.engine?.trim()) ||
    Boolean(params.version?.trim())
  if (params.q?.trim() && !hasVehicle) {
    try {
      const catalog = await listVehicleCatalogEntries()
      const intent = await interpretNaturalLanguage(params.q, { catalog })
      const { catalogParams } = buildCatalogSearchParams(intent)
      // Não manter o q bruto quando a frase inteira virou filtro de veículo
      // (ex.: "HB20 2015" → model+year sem texto de produto).
      effective = {
        ...params,
        ...catalogParams,
        q: catalogParams.q,
      }
    } catch {
      // Mantém params originais se o catálogo de veículos falhar
    }
  }

  const qPrepared = await prepareSearchQuery(effective.q)
  const { data, error } = await supabase.rpc('search_products', {
    p_q: qPrepared || null,
    p_category: effective.category?.trim() || null,
    p_brand: effective.brand?.trim() || null,
    p_maker: effective.maker?.trim() || null,
    p_model: effective.model?.trim() || null,
    p_year: effective.year?.trim() || null,
    p_engine: effective.engine?.trim() || null,
    p_version: effective.version?.trim() || null,
    p_sort: sort,
    p_page: page,
    p_page_size: pageSize,
  })

  if (error) throw error

  const rows = (data ?? []) as Record<string, unknown>[]
  const total = rows.length ? Number(rows[0].total_count ?? 0) : 0
  if (total === 0 && page === 1) {
    void logSearchZeroResult(effective)
  }
  const mapped = rows.map(mapRpcRow)
  const withMeta = await enrichPageProductMeta(mapped)
  const withApps = await attachCompatibilitySummaries(withMeta, {
    compact: true,
    maxEntries: 4,
    maxMakers: null,
    maxLinesPerMaker: null,
  })
  const withImages = await attachPrimaryProductImages(withApps)
  let items = await attachResolvedPrices(withImages)
  await attachCategoryMeta(items)

  // FIND-012: RPC já ordena por resolve; reordenação da página = rede de segurança
  if (sort === 'price_asc' || sort === 'price_desc') {
    items = [...items].sort((a, b) =>
      sort === 'price_asc'
        ? displayPrice(a) - displayPrice(b)
        : displayPrice(b) - displayPrice(a),
    )
  }

  return {
    items,
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  }
}

/** @deprecated Preferir searchCatalog — mantido para compatibilidade pontual. */
export async function searchProductsLegacy(query: string): Promise<Product[]> {
  const result = await searchCatalog({ q: query, page: 1, pageSize: 40, sort: 'relevance' })
  return result.items
}

const SUGGEST_BUCKET = 'product-images'

function suggestImageUrl(storagePath: string | null | undefined): string | undefined {
  if (!storagePath || !supabase) return undefined
  const { data } = supabase.storage.from(SUGGEST_BUCKET).getPublicUrl(storagePath)
  return data.publicUrl || undefined
}

function mapSuggestionRow(row: Record<string, unknown>): Product {
  const sku = String(row.sku ?? '')
  const resolved =
    row.resolved_amount == null || row.resolved_amount === ''
      ? undefined
      : Number(row.resolved_amount)
  const price = Number(row.price ?? 0)
  const imageUrl = suggestImageUrl((row.image_path as string | null) ?? null)
  return {
    id: String(row.id),
    sku,
    commercialRef: (row.commercial_ref as string | null) ?? sku,
    name: String(row.name),
    slug: String(row.slug),
    brand: (row.brand_name as string | null) ?? undefined,
    price,
    promoPrice: row.promo_price == null ? null : Number(row.promo_price),
    ...(resolved != null && Number.isFinite(resolved)
      ? { resolvedPrice: resolved, listPrice: price }
      : {}),
    status: 'published',
    available: true,
    imageUrl,
  }
}

function mockSuggestions(query: string, limit: number): Product[] {
  const result = mockSearch({ q: query, page: 1, pageSize: limit, sort: 'relevance' })
  return result.items.slice(0, limit)
}

/**
 * Sugestões leves do SearchBar (RPC `search_product_suggestions`).
 * Sem enrich de compatibilidade/categoria — só campos do combobox.
 */
export async function searchProductSuggestions(
  query: string,
  limit = 6,
): Promise<Product[]> {
  const q = query.trim()
  if (q.length < 2) return []

  const capped = Math.min(Math.max(limit, 1), 12)
  assertStoreBackendConfigured()
  if (!isSupabaseConfigured || !supabase) {
    if (!allowCatalogMocks()) throw new Error('Catálogo indisponível')
    return mockSuggestions(q, capped)
  }

  const qPrepared = await prepareSearchQuery(q)
  const { data, error } = await supabase.rpc('search_product_suggestions', {
    p_q: qPrepared || q,
    p_limit: capped,
  })
  if (error) throw error
  return ((data ?? []) as Record<string, unknown>[]).map(mapSuggestionRow)
}
