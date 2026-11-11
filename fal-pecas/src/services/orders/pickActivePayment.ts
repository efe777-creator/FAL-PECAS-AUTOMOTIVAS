/** Escolhe a cobrança “ativa” para UI de retomar pagamento. */

export type PaymentPickRow = {
  id: string
  status: string
  created_at?: string | null
  expires_at?: string | null
}

/**
 * Prefere pending mais recente; senão a linha mais recente (created_at / ordem do array).
 */
export function pickActivePayment<T extends PaymentPickRow>(payments: T[]): T | undefined {
  if (!payments.length) return undefined
  const byNewest = [...payments].sort((a, b) => {
    const ta = a.created_at ? Date.parse(a.created_at) : 0
    const tb = b.created_at ? Date.parse(b.created_at) : 0
    return tb - ta
  })
  const pending = byNewest.find((p) => String(p.status).toLowerCase() === 'pending')
  return pending ?? byNewest[0]
}
