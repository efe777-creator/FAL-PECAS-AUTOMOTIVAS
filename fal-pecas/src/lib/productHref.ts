import type { Product } from '@/types'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function looksLikeProductUuid(value: string): boolean {
  return UUID_RE.test(value.trim())
}

/** URL canônica da PDP: preferir slug; fallback id. */
export function productHref(
  product: Pick<Product, 'id' | 'slug'> | { productId: string; slug?: string | null },
): string {
  if ('productId' in product) {
    const slug = product.slug?.trim()
    return slug ? `/produto/${encodeURIComponent(slug)}` : `/produto/${product.productId}`
  }
  const slug = product.slug?.trim()
  return slug ? `/produto/${encodeURIComponent(slug)}` : `/produto/${product.id}`
}

/** Path interno seguro para Voltar (evita open redirect). */
export function safeInternalReturnTo(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const path = value.trim()
  if (!path.startsWith('/') || path.startsWith('//')) return null
  if (path.startsWith('/produto/')) return null
  return path
}
