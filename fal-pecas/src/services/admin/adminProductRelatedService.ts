import { getSupabase } from '@/lib/supabase'
import {
  RELATED_PRODUCTS_CURATED_MAX,
} from '@/services/products/relatedProducts'

export type AdminRelatedRow = {
  relatedProductId: string
  sortOrder: number
  active: boolean
  name: string
  sku: string
  commercialRef: string
  status: string
}

type RelatedJoinRow = {
  related_product_id: string
  sort_order: number
  active: boolean
  products:
    | {
        id: string
        name: string
        sku: string
        commercial_ref: string | null
        status: string
      }
    | {
        id: string
        name: string
        sku: string
        commercial_ref: string | null
        status: string
      }[]
    | null
}

function mapRow(r: RelatedJoinRow): AdminRelatedRow {
  const p = Array.isArray(r.products) ? r.products[0]! : r.products!
  return {
    relatedProductId: r.related_product_id,
    sortOrder: r.sort_order,
    active: r.active,
    name: p.name,
    sku: p.sku,
    commercialRef: p.commercial_ref ?? p.sku,
    status: p.status,
  }
}

export async function adminListProductRelated(productId: string): Promise<AdminRelatedRow[]> {
  const { data, error } = await getSupabase()
    .from('product_related_links')
    .select(
      `
      related_product_id,
      sort_order,
      active,
      products!related_product_id (
        id, name, sku, commercial_ref, status
      )
    `,
    )
    .eq('product_id', productId)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return ((data ?? []) as RelatedJoinRow[]).filter((r) => r.products).map(mapRow)
}

export async function adminAddProductRelated(
  productId: string,
  relatedProductId: string,
): Promise<void> {
  if (!productId || !relatedProductId) throw new Error('Produto inválido')
  if (productId === relatedProductId) throw new Error('Não é possível relacionar o produto a si mesmo')

  const existing = await adminListProductRelated(productId)
  if (existing.some((r) => r.relatedProductId === relatedProductId)) {
    throw new Error('Este produto já está na lista de relacionados')
  }
  if (existing.length >= RELATED_PRODUCTS_CURATED_MAX) {
    throw new Error(`Máximo de ${RELATED_PRODUCTS_CURATED_MAX} relacionados curados`)
  }
  const nextOrder =
    existing.length === 0 ? 0 : Math.max(...existing.map((r) => r.sortOrder)) + 1

  const { error } = await getSupabase().from('product_related_links').upsert(
    {
      product_id: productId,
      related_product_id: relatedProductId,
      sort_order: nextOrder,
      active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'product_id,related_product_id' },
  )
  if (error) throw error
}

export async function adminRemoveProductRelated(
  productId: string,
  relatedProductId: string,
): Promise<void> {
  const { error } = await getSupabase()
    .from('product_related_links')
    .delete()
    .eq('product_id', productId)
    .eq('related_product_id', relatedProductId)
  if (error) throw error
}

export async function adminSwapProductRelatedOrder(
  productId: string,
  a: AdminRelatedRow,
  b: AdminRelatedRow,
): Promise<void> {
  const db = getSupabase()
  const now = new Date().toISOString()
  const { error: e1 } = await db
    .from('product_related_links')
    .update({ sort_order: b.sortOrder, updated_at: now })
    .eq('product_id', productId)
    .eq('related_product_id', a.relatedProductId)
  if (e1) throw e1
  const { error: e2 } = await db
    .from('product_related_links')
    .update({ sort_order: a.sortOrder, updated_at: now })
    .eq('product_id', productId)
    .eq('related_product_id', b.relatedProductId)
  if (e2) throw e2
}
