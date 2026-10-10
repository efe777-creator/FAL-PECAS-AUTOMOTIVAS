import { getSupabase } from '@/lib/supabase'

/**
 * Cliente da Edge `quote-shipping` (camada B → C live).
 * Não acopla UI a Correios/Frenet: só envia request + lê envelope JSON.
 * Enquanto a function não estiver deployada / secrets ausentes, falha de forma honesta.
 */

export type EdgeQuoteShippingBody = {
  postalCode: string
  state: string
  city: string
  subtotal: number
  itemCount: number
  originPostalCode?: string
  provider?: string
  items?: Array<{
    productId: string
    quantity: number
    weightKg?: number | null
    heightCm?: number | null
    widthCm?: number | null
    lengthCm?: number | null
  }>
  totalWeightKg?: number
}

export async function invokeQuoteShippingEdge(body: EdgeQuoteShippingBody): Promise<unknown> {
  const { data, error } = await getSupabase().functions.invoke('quote-shipping', { body })
  if (error) {
    throw new Error(error.message || 'Falha ao chamar quote-shipping')
  }
  return data
}
