/**
 * Fingerprint do conjunto cotado (carrinho / checkout / buy-now).
 * Garante re-cotação quando mudam produtos ou quantidades — não só subtotal/contagem.
 */
export function cartItemsQuoteFingerprint(
  items: Array<{ productId: string; quantity: number }>,
  subtotal: number,
): string {
  const lines = items
    .map((i) => `${i.productId}:${Math.max(0, Math.floor(Number(i.quantity) || 0))}`)
    .sort()
    .join('|')
  return `${lines}::${Number(subtotal).toFixed(2)}`
}
