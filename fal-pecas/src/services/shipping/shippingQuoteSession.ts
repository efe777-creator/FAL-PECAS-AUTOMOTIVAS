/** Handoff leve carrinho → checkout (CEP + opção preferida). Sem valor de frete como verdade. */

const KEY = 'fal.shippingQuoteHandoff.v1'

export type ShippingQuoteHandoff = {
  postalCode: string
  preferredOptionId?: string
  savedAt: string
}

export function saveShippingQuoteHandoff(input: {
  postalCode: string
  preferredOptionId?: string
}): void {
  try {
    const payload: ShippingQuoteHandoff = {
      postalCode: input.postalCode.replace(/\D/g, ''),
      preferredOptionId: input.preferredOptionId,
      savedAt: new Date().toISOString(),
    }
    sessionStorage.setItem(KEY, JSON.stringify(payload))
  } catch {
    /* private mode */
  }
}

export function loadShippingQuoteHandoff(): ShippingQuoteHandoff | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ShippingQuoteHandoff
    if (!parsed?.postalCode || parsed.postalCode.length !== 8) return null
    return parsed
  } catch {
    return null
  }
}

export function clearShippingQuoteHandoff(): void {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
