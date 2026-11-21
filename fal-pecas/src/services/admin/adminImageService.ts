import { getSupabase } from '@/lib/supabase'
import { refreshIncompleteFlag } from '@/services/admin/adminProductService'
import type { ProductImage } from '@/types'

const BUCKET = 'product-images'

type Row = {
  id: string
  product_id: string
  storage_path: string
  alt: string | null
  sort_order: number
  is_primary: boolean
}

function publicUrl(path: string): string {
  const { data } = getSupabase().storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

function map(row: Row): ProductImage {
  return {
    id: row.id,
    productId: row.product_id,
    storagePath: row.storage_path,
    alt: row.alt,
    sortOrder: row.sort_order,
    isPrimary: row.is_primary,
    publicUrl: publicUrl(row.storage_path),
  }
}

export async function adminListImages(productId: string): Promise<ProductImage[]> {
  const { data, error } = await getSupabase()
    .from('product_images')
    .select('id, product_id, storage_path, alt, sort_order, is_primary')
    .eq('product_id', productId)
    .order('sort_order')
  if (error) throw error
  return (data as Row[]).map(map)
}

export async function adminUploadImage(productId: string, file: File, alt?: string) {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${productId}/${crypto.randomUUID()}.${ext}`
  const { error: upErr } = await getSupabase().storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  })
  if (upErr) throw upErr

  const existing = await adminListImages(productId)
  const { data, error } = await getSupabase()
    .from('product_images')
    .insert({
      product_id: productId,
      storage_path: path,
      alt: alt?.trim() || null,
      sort_order: existing.length,
      is_primary: existing.length === 0,
    })
    .select('id, product_id, storage_path, alt, sort_order, is_primary')
    .single()
  if (error) throw error
  await refreshIncompleteFlag(productId)
  return map(data as Row)
}

export async function adminSetPrimaryImage(productId: string, imageId: string) {
  const sb = getSupabase()
  const { error: clearErr } = await sb
    .from('product_images')
    .update({ is_primary: false })
    .eq('product_id', productId)
  if (clearErr) throw clearErr
  const { error } = await sb.from('product_images').update({ is_primary: true }).eq('id', imageId)
  if (error) throw error
}

export async function adminDeleteImage(image: ProductImage) {
  const sb = getSupabase()
  await sb.storage.from(BUCKET).remove([image.storagePath])
  const { error } = await sb.from('product_images').delete().eq('id', image.id)
  if (error) throw error
  await refreshIncompleteFlag(image.productId)
}

/** Mapa productId → URL pública da imagem principal (ou null). */
export async function adminPrimaryImageUrlMap(
  productIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const ids = [...new Set(productIds.filter(Boolean))]
  if (!ids.length) return map
  const { data, error } = await getSupabase()
    .from('product_images')
    .select('product_id, storage_path, sort_order, is_primary')
    .in('product_id', ids)
  if (error) throw error
  const byProduct = new Map<string, Row[]>()
  for (const row of (data ?? []) as Row[]) {
    const list = byProduct.get(row.product_id) ?? []
    list.push(row)
    byProduct.set(row.product_id, list)
  }
  for (const id of ids) {
    const rows = byProduct.get(id) ?? []
    const sorted = [...rows].sort((a, b) => {
      if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1
      return a.sort_order - b.sort_order
    })
    const path = sorted[0]?.storage_path
    if (path) map.set(id, publicUrl(path))
  }
  return map
}

/**
 * Copia a imagem principal de um produto para outro (reusa storage_path).
 * @returns true se copiou; false se origem sem imagem.
 */
export async function adminCopyPrimaryImageToProduct(input: {
  sourceProductId: string
  targetProductId: string
  /** Se true, remove imagens atuais do destino antes de copiar. */
  replace?: boolean
}): Promise<boolean> {
  if (input.sourceProductId === input.targetProductId) return false
  const sourceImages = await adminListImages(input.sourceProductId)
  const primary =
    sourceImages.find((i) => i.isPrimary) ?? sourceImages[0] ?? null
  if (!primary) return false

  const targetImages = await adminListImages(input.targetProductId)
  if (input.replace && targetImages.length) {
    for (const img of targetImages) {
      // Só remove metadado — path pode ser compartilhado com o item fonte.
      const { error } = await getSupabase()
        .from('product_images')
        .delete()
        .eq('id', img.id)
      if (error) throw error
    }
  } else if (targetImages.length && !input.replace) {
    return false
  }

  const { error } = await getSupabase().from('product_images').insert({
    product_id: input.targetProductId,
    storage_path: primary.storagePath,
    alt: primary.alt,
    sort_order: 0,
    is_primary: true,
  })
  if (error) throw error
  await refreshIncompleteFlag(input.targetProductId)
  return true
}

/**
 * Se o kit não tem imagem, usa a principal do primeiro componente que tiver foto.
 */
export async function adminEnsureKitImageFromComponents(
  kitProductId: string,
  componentProductIds: string[],
): Promise<boolean> {
  const existing = await adminListImages(kitProductId)
  if (existing.length > 0) return false
  for (const componentId of componentProductIds) {
    const ok = await adminCopyPrimaryImageToProduct({
      sourceProductId: componentId,
      targetProductId: kitProductId,
      replace: false,
    })
    if (ok) return true
  }
  return false
}
