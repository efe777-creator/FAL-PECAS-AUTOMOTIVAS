import { getProductById } from '@/services/products/productService'
import type { OrderItemSnapshot, Product } from '@/types'

export type BuyAgainSkipped = {
  sku: string
  name: string
  reason: string
}

export type BuyAgainResult = {
  products: { product: Product; quantity: number }[]
  skipped: BuyAgainSkipped[]
}

/**
 * Monta itens para o carrinho a partir de um pedido antigo.
 * Usa produto/preço/disponibilidade atuais — nunca copia preço do pedido.
 */
export async function buildBuyAgainCart(
  items: OrderItemSnapshot[],
): Promise<BuyAgainResult> {
  const products: { product: Product; quantity: number }[] = []
  const skipped: BuyAgainSkipped[] = []

  for (const item of items) {
    if (!item.productId) {
      skipped.push({
        sku: item.sku,
        name: item.nameSnapshot,
        reason: 'Produto não vinculado ao pedido.',
      })
      continue
    }

    try {
      const product = await getProductById(item.productId)
      if (!product) {
        skipped.push({
          sku: item.sku,
          name: item.nameSnapshot,
          reason: 'Produto indisponível ou fora do catálogo.',
        })
        continue
      }
      if (product.status && product.status !== 'published') {
        skipped.push({
          sku: item.sku,
          name: item.nameSnapshot,
          reason: 'Produto não está publicado.',
        })
        continue
      }
      if (product.available === false) {
        skipped.push({
          sku: item.sku,
          name: item.nameSnapshot,
          reason: 'Sem estoque disponível no momento.',
        })
        continue
      }
      products.push({ product, quantity: item.quantity })
    } catch {
      skipped.push({
        sku: item.sku,
        name: item.nameSnapshot,
        reason: 'Não foi possível consultar o produto.',
      })
    }
  }

  return { products, skipped }
}
