/** Janela comercial FAL para abrir pós-venda (D4). T0 = entrega FAL, não confirm receipt. */

export const POST_SALE_WINDOW_DAYS = 7

export function postSaleWindowOpen(
  deliveredAt: string | Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!deliveredAt) return false
  const t0 = typeof deliveredAt === 'string' ? new Date(deliveredAt) : deliveredAt
  if (Number.isNaN(t0.getTime())) return false
  const end = new Date(t0.getTime())
  end.setUTCDate(end.getUTCDate() + POST_SALE_WINDOW_DAYS)
  return now.getTime() <= end.getTime()
}

/** Dias corridos restantes (0 se fechada). */
export function postSaleWindowDaysLeft(
  deliveredAt: string | Date | null | undefined,
  now: Date = new Date(),
): number {
  if (!deliveredAt) return 0
  const t0 = typeof deliveredAt === 'string' ? new Date(deliveredAt) : deliveredAt
  if (Number.isNaN(t0.getTime())) return 0
  const end = new Date(t0.getTime())
  end.setUTCDate(end.getUTCDate() + POST_SALE_WINDOW_DAYS)
  const ms = end.getTime() - now.getTime()
  if (ms <= 0) return 0
  return Math.ceil(ms / (24 * 60 * 60 * 1000))
}
