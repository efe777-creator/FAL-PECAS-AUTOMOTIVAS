import { mockProducts } from '@/data/mocks/products'
import { assertStoreBackendConfigured, allowCatalogMocks } from '@/lib/storeBackend'
import { yearMatchesVehicleApp } from '@/lib/vehicleAppYear'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { attachResolvedPrices } from '@/services/pricing/priceResolutionService'
import { attachCompatibilitySummaries } from '@/services/products/compatibilitySummary'
import {
  attachPrimaryProductImages,
  attachProductImageGallery,
} from '@/services/products/productImages'
import {
  RELATED_PRODUCTS_LIMIT,
  pickRelatedProducts,
} from '@/services/products/relatedProducts'
import type { Product } from '@/types'

type Named = { name: string; id?: string; slug?: string }

function asNamed(value: unknown): Named | null {
  if (!value) return null
  if (Array.isArray(value)) {
    const first = value[0] as Named | undefined
    return first?.name ? first : null
  }
  const obj = value as Named
  return obj.name ? obj : null
}

function mapProduct(row: Record<string, unknown>): Product {
  const brand = asNamed(row.product_brands)
  const category = asNamed(row.product_categories)

  return {
    id: String(row.id),
    sku: String(row.sku),
    commercialRef: String(row.commercial_ref ?? row.sku),
    name: String(row.name),
    slug: String(row.slug),
    description: (row.description as string | null) ?? undefined,
    shortDescription: (row.short_description as string | null) ?? undefined,
    brand: brand?.name,
    brandId: (row.brand_id as string | null) ?? null,
    supplierId: (row.supplier_id as string | null) ?? null,
    categoryId: category?.id ?? (row.category_id as string | undefined),
    categoryName: category?.name,
    categorySlug: category?.slug,
    price: Number(row.price),
    promoPrice: row.promo_price == null ? null : Number(row.promo_price),
    status: row.status as Product['status'],
    manufacturerCode: (row.manufacturer_code as string | null) ?? undefined,
    available: Boolean(row.is_available),
    isIncomplete: Boolean(row.is_incomplete),
    posicao: (row.posicao as Product['posicao']) ?? null,
    lado: (row.lado as Product['lado']) ?? null,
    attrs: (row.attrs as Record<string, unknown> | null) ?? {},
    stock: undefined,
    weightKg: row.weight_kg == null ? null : Number(row.weight_kg),
    heightCm: row.height_cm == null ? null : Number(row.height_cm),
    widthCm: row.width_cm == null ? null : Number(row.width_cm),
    lengthCm: row.length_cm == null ? null : Number(row.length_cm),
  }
}

const PRODUCT_SELECT = `
  id, sku, commercial_ref, name, slug, description, short_description, price, promo_price, status,
  manufacturer_code, is_available, is_incomplete, category_id, brand_id, supplier_id,
  posicao, lado, attrs,
  weight_kg, height_cm, width_cm, length_cm,
  product_brands ( name ),
  product_categories ( id, name, slug )
`

/**
 * Destaques da home (IMP-12): published, preferindo disponíveis; sem flag `is_featured`.
 * Fallback mock só sem configuração Supabase.
 */
export async function listFeaturedProducts(limit = 8): Promise<Product[]> {
  const pool = await listPublishedProducts(Math.max(limit * 2, limit))
  const available = pool.filter((p) => p.available !== false)
  const rest = pool.filter((p) => p.available === false)
  return [...available, ...rest].slice(0, limit)
}

/**
 * Ofertas da home: published com preço resolvido abaixo do preço de lista (promo/lista).
 */
export async function listPromoHighlightProducts(limit = 8): Promise<Product[]> {
  const pool = await listPublishedProducts(Math.max(limit * 4, 24))
  const offers = pool.filter((p) => {
    const list = p.listPrice ?? p.price
    const pay = p.resolvedPrice ?? p.promoPrice ?? p.price
    return list > pay + 0.001 && p.available !== false
  })
  return offers.slice(0, limit)
}

/** Grade por categoria raiz (RPC search_products — inclui filhos). */
export async function listProductsByCategorySlug(
  categorySlug: string,
  limit = 8,
): Promise<Product[]> {
  const slug = categorySlug.trim()
  if (!slug) return []
  const { searchCatalog } = await import('@/services/search/searchService')
  const result = await searchCatalog({
    category: slug,
    page: 1,
    pageSize: Math.min(Math.max(limit, 1), 40),
    sort: 'relevance',
  })
  return result.items
}

/**
 * Relacionados na PDP: mesma categoria (slug), excluindo o atual.
 * Sem categoria → []. Sem aleatório / sem “quem viu”.
 */
export async function listRelatedProductsForPdp(
  product: Pick<Product, 'id' | 'categorySlug'>,
  limit = RELATED_PRODUCTS_LIMIT,
): Promise<Product[]> {
  const slug = product.categorySlug?.trim()
  if (!slug || !product.id) return []
  const poolSize = Math.min(Math.max(limit + 8, limit), 40)
  const pool = await listProductsByCategorySlug(slug, poolSize)
  return pickRelatedProducts(pool, { excludeId: product.id, limit })
}

export async function listPublishedProducts(limit = 40): Promise<Product[]> {
  assertStoreBackendConfigured()
  if (!isSupabaseConfigured || !supabase) {
    if (!allowCatalogMocks()) return []
    return mockProducts.filter((p) => p.status === 'published').slice(0, limit)
  }

  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  const products = (data ?? []).map((row) => mapProduct(row as Record<string, unknown>))
  const withApps = await attachCompatibilitySummaries(products, {
    compact: true,
    maxEntries: 4,
    maxMakers: null,
    maxLinesPerMaker: null,
  })
  const withImages = await attachPrimaryProductImages(withApps)
  return attachResolvedPrices(withImages)
}

/** IDs de produtos compatíveis com filtros parciais de veículo. */
export async function filterProductIdsByVehicle(filter: {
  maker?: string | null
  model?: string | null
  year?: string | null
  engine?: string | null
  version?: string | null
}): Promise<string[] | null> {
  const maker = filter.maker?.trim()
  const model = filter.model?.trim()
  const year = filter.year?.trim()
  const engine = filter.engine?.trim()
  const version = filter.version?.trim()
  if (!maker && !model && !year && !engine && !version) return null

  assertStoreBackendConfigured()
  if (!isSupabaseConfigured || !supabase) {
    if (!allowCatalogMocks()) return []
    return mockProducts
      .filter((p) => {
        const hay = (p.compatibilitySummary ?? '').toLowerCase()
        return (
          (!maker || hay.includes(maker.toLowerCase())) &&
          (!model || hay.includes(model.toLowerCase())) &&
          (!year || hay.includes(year)) &&
          (!engine || hay.includes(engine.toLowerCase())) &&
          (!version || hay.includes(version.toLowerCase()))
        )
      })
      .map((p) => p.id)
  }

  // Espelha search_products: período PVC (year_start/year_end) é a fonte de verdade.
  let appsQuery = supabase
    .from('product_vehicle_compatibility')
    .select(
      `
      product_id,
      year_start,
      year_end,
      vehicle_versions!inner (
        year, engine, version_name, status,
        manufacturers!inner ( name ),
        models!inner ( name )
      )
    `,
    )

  if (engine) appsQuery = appsQuery.eq('vehicle_versions.engine', engine)
  if (version) appsQuery = appsQuery.eq('vehicle_versions.version_name', version)

  const { data: apps, error: aErr } = await appsQuery
  if (aErr) throw aErr

  const yearNum = year ? Number(year) : null
  const ids = new Set<string>()
  for (const row of apps ?? []) {
    const raw = row.vehicle_versions as unknown
    const v = (Array.isArray(raw) ? raw[0] : raw) as
      | {
          year: number | null
          engine: string | null
          version_name: string | null
          status: string | null
          manufacturers: unknown
          models: unknown
        }
      | null
    if (!v || v.status !== 'active') continue
    const makerName = asNamed(v.manufacturers)?.name
    const modelName = asNamed(v.models)?.name
    if (maker && makerName?.toLowerCase() !== maker.toLowerCase()) continue
    if (model && modelName?.toLowerCase() !== model.toLowerCase()) continue
    if (
      yearNum != null &&
      !yearMatchesVehicleApp(
        yearNum,
        row.year_start == null ? null : Number(row.year_start),
        row.year_end == null ? null : Number(row.year_end),
        v.year,
      )
    ) {
      continue
    }
    ids.add(String(row.product_id))
  }
  return [...ids]
}

export async function getProductById(id: string): Promise<Product | null> {
  assertStoreBackendConfigured()
  if (!isSupabaseConfigured || !supabase) {
    if (!allowCatalogMocks()) return null
    return mockProducts.find((p) => p.id === id) ?? null
  }

  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const product = mapProduct(data as Record<string, unknown>)

  const { data: refs } = await supabase
    .from('product_references')
    .select('code, ref_type, brand_label, brand_id, status')
    .eq('product_id', id)
    .eq('status', 'active')

  if (refs?.length) {
    product.references = refs.map((r) => ({
      code: String(r.code),
      type: String(r.ref_type),
      brandId: (r.brand_id as string | null) ?? null,
      brandLabel: (r.brand_label as string | null) ?? undefined,
      status: (r.status as 'active' | 'inactive' | null) ?? 'active',
    }))
  }

  const [withApps] = await attachCompatibilitySummaries([product], {
    compact: false,
    maxEntries: 40,
    maxMakers: null,
    maxLinesPerMaker: null,
  })
  const withGallery = await attachProductImageGallery(withApps ?? product)
  const [resolved] = await attachResolvedPrices([withGallery])
  return resolved ?? withGallery
}

/** @deprecated Preferir `searchCatalog` (Fase 4). Mantido como fachada. */
export async function searchProducts(query: string): Promise<Product[]> {
  const { searchCatalog } = await import('@/services/search/searchService')
  const result = await searchCatalog({ q: query, page: 1, pageSize: 40, sort: 'relevance' })
  return result.items
}
