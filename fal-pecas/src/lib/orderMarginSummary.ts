import { effectiveMarginFraction, toPercent } from '@/services/pricing/pricingFormulas'

/** Entrada mínima de item para rentabilidade do pedido (AJUSTE-033). */
export type OrderMarginItemInput = {
  id: string
  productId: string | null
  unitPrice: number
  quantity: number
}

export type OrderMarginLine = {
  itemId: string
  unitCost: number | null
  lineRevenue: number
  lineCost: number | null
  lineProfit: number | null
  marginPercent: number | null
  missingCost: boolean
}

export type OrderMarginSummary = {
  lines: OrderMarginLine[]
  revenueItems: number
  /** Soma de custos das linhas com custo; null se nenhuma linha tiver custo. */
  costItems: number | null
  profitItems: number | null
  marginPercent: number | null
  itemsWithCost: number
  itemsMissingCost: number
}

function readBaseCost(
  productId: string | null,
  costByProduct: Map<string, { baseCost: number } | number>,
): number | null {
  if (!productId) return null
  const raw = costByProduct.get(productId)
  if (raw == null) return null
  const n = typeof raw === 'number' ? raw : raw.baseCost
  return Number.isFinite(n) ? n : null
}

/**
 * Margem bruta estimada sobre itens (custo atual do cadastro — não snapshot da venda).
 * Frete/taxas fora do CMV.
 */
export function summarizeOrderMargin(
  items: OrderMarginItemInput[],
  costByProduct: Map<string, { baseCost: number } | number>,
): OrderMarginSummary {
  const lines: OrderMarginLine[] = []
  let revenueItems = 0
  let costSum = 0
  let itemsWithCost = 0
  let itemsMissingCost = 0

  for (const it of items) {
    const qty = Number(it.quantity) || 0
    const unitPrice = Number(it.unitPrice) || 0
    const lineRevenue = Math.round(unitPrice * qty * 100) / 100
    revenueItems += lineRevenue

    const unitCost = readBaseCost(it.productId, costByProduct)
    if (unitCost == null) {
      itemsMissingCost += 1
      lines.push({
        itemId: it.id,
        unitCost: null,
        lineRevenue,
        lineCost: null,
        lineProfit: null,
        marginPercent: null,
        missingCost: true,
      })
      continue
    }

    itemsWithCost += 1
    const lineCost = Math.round(unitCost * qty * 100) / 100
    costSum += lineCost
    const lineProfit = Math.round((lineRevenue - lineCost) * 100) / 100
    lines.push({
      itemId: it.id,
      unitCost,
      lineRevenue,
      lineCost,
      lineProfit,
      marginPercent: toPercent(effectiveMarginFraction(unitPrice, unitCost)),
      missingCost: false,
    })
  }

  const costItems = itemsWithCost > 0 ? Math.round(costSum * 100) / 100 : null
  const profitItems =
    costItems == null ? null : Math.round((revenueItems - costItems) * 100) / 100
  const marginPercent =
    costItems == null || !(revenueItems > 0)
      ? null
      : toPercent(effectiveMarginFraction(revenueItems, costItems))

  return {
    lines,
    revenueItems: Math.round(revenueItems * 100) / 100,
    costItems,
    profitItems,
    marginPercent,
    itemsWithCost,
    itemsMissingCost,
  }
}
