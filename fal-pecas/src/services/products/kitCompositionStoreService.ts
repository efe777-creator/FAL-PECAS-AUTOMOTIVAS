import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { productHref } from '@/lib/productHref'
import { resolveProductPrices } from '@/services/pricing/priceResolutionService'
import { listPublishedProductsByIds } from '@/services/products/productService'
import type { Product } from '@/types'

export type StoreKitComponentLine = {
  productId: string
  sku: string
  commercialRef: string
  name: string
  quantity: number
  unitPrice: number | null
  href: string
  available: boolean
}

export type StoreKitComposition = {
  lines: StoreKitComponentLine[]
  /** Soma dos preços unitários × qty (quando todos resolvidos). */
  componentsSum: number | null
}

/**
 * Composição pública do kit (RLS: só kits published).
 * Preços dos componentes via resolve_product_prices (mesmo motor 6B).
 */
export async function loadStoreKitComposition(
  kitProductId: string,
): Promise<StoreKitComposition | null> {
  if (!isSupabaseConfigured || !supabase) return null

  const { data, error } = await supabase
    .from('product_kit_components')
    .select(
      `
      quantity, sort_order,
      products!product_kit_components_component_product_id_fkey (
        id, sku, commercial_ref, name, slug, status, is_available
      )
    `,
    )
    .eq('kit_product_id', kitProductId)
    .order('sort_order', { ascending: true })

  if (error) throw error
  if (!data?.length) return { lines: [], componentsSum: null }

  type CompProd = {
    id: string
    sku: string
    commercial_ref: string | null
    name: string
    slug: string
    status: string
    is_available: boolean
  }

  const rawLines = data
    .map((row) => {
      const p = row.products as CompProd | CompProd[] | null
      const prod = Array.isArray(p) ? p[0] : p
      if (!prod) return null
      return {
        productId: prod.id,
        sku: prod.sku,
        commercialRef: prod.commercial_ref ?? prod.sku,
        name: prod.name,
        slug: prod.slug,
        quantity: Number(row.quantity),
        available: prod.status === 'published' && prod.is_available === true,
      }
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x))

  if (!rawLines.length) return { lines: [], componentsSum: null }

  const priceMap = await resolveProductPrices(rawLines.map((l) => l.productId))
  let sum = 0
  let allPriced = true
  const lines: StoreKitComponentLine[] = rawLines.map((l) => {
    const unit = priceMap.get(l.productId)?.amount ?? null
    if (unit == null || !Number.isFinite(unit)) allPriced = false
    else sum += unit * l.quantity
    return {
      productId: l.productId,
      sku: l.sku,
      commercialRef: l.commercialRef,
      name: l.name,
      quantity: l.quantity,
      unitPrice: unit,
      href: productHref({ id: l.productId, slug: l.slug, sku: l.sku }),
      available: l.available,
    }
  })

  return {
    lines,
    componentsSum: allPriced ? Math.round(sum * 100) / 100 : null,
  }
}

export type StoreKitContainingComponent = {
  product: Product
  /** Quantidade deste componente no BOM do kit. */
  quantityInKit: number
}

/**
 * K12 — kits publicados que incluem este item (query invertida da composição).
 * RLS já restringe leitura de BOM a kits published.
 */
export async function listPublishedKitsIncludingComponent(
  componentProductId: string,
  limit = 8,
): Promise<StoreKitContainingComponent[]> {
  if (!componentProductId) return []
  if (!isSupabaseConfigured || !supabase) return []

  const { data, error } = await supabase
    .from('product_kit_components')
    .select('kit_product_id, quantity')
    .eq('component_product_id', componentProductId)
    .limit(Math.max(limit * 2, 16))

  if (error) throw error
  if (!data?.length) return []

  const qtyByKit = new Map<string, number>()
  const kitIds: string[] = []
  for (const row of data) {
    const id = String(row.kit_product_id)
    if (qtyByKit.has(id)) continue
    qtyByKit.set(id, Number(row.quantity))
    kitIds.push(id)
  }

  const products = await listPublishedProductsByIds(kitIds.slice(0, limit))
  return products
    .filter((p) => p.productKind === 'kit')
    .map((product) => ({
      product,
      quantityInKit: qtyByKit.get(product.id) ?? 1,
    }))
}
