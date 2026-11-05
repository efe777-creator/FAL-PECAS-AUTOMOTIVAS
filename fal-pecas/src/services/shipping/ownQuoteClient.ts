import { getSupabase } from '@/lib/supabase'
import type { ShippingQuoteOption } from '@/types'

export type OwnQuoteEdgeResponse = {
  status: string
  message?: string
  polTotal?: number
  distanceKm?: number
  vehicleCode?: string
  expiresAt?: string
  options?: ShippingQuoteOption[]
  error?: string
}

export async function invokeOwnDeliveryQuote(input: {
  postalCode: string
  number: string
  street: string
  district?: string
  city: string
  state: string
  items: { productId: string; quantity: number }[]
}): Promise<OwnQuoteEdgeResponse> {
  const { data, error } = await getSupabase().functions.invoke('quote-own-delivery', {
    body: input,
  })
  if (error) throw new Error(error.message || 'Falha na cotação frete próprio')
  return (data ?? { status: 'routing_error', options: [] }) as OwnQuoteEdgeResponse
}
