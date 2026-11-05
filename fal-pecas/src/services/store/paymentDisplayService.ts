import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { PaymentDisplaySettings } from '@/lib/paymentDisplay'

const CACHE_TTL_MS = 5 * 60_000
let cache: { at: number; data: PaymentDisplaySettings | null } | null = null

type Row = {
  id: string
  enabled: boolean
  max_installments: number
  min_installment_amount: number | string
  interest_free: boolean
  show_on_cards: boolean
  show_on_pdp: boolean
  footnote: string | null
}

function mapRow(row: Row): PaymentDisplaySettings {
  return {
    id: row.id,
    enabled: Boolean(row.enabled),
    maxInstallments: Number(row.max_installments) || 1,
    minInstallmentAmount: Number(row.min_installment_amount) || 0,
    interestFree: Boolean(row.interest_free),
    showOnCards: Boolean(row.show_on_cards),
    showOnPdp: Boolean(row.show_on_pdp),
    footnote: row.footnote?.trim() || null,
  }
}

export function invalidatePaymentDisplayCache() {
  cache = null
}

export async function getPaymentDisplaySettings(): Promise<PaymentDisplaySettings | null> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data
  if (!isSupabaseConfigured || !supabase) {
    cache = { at: Date.now(), data: null }
    return null
  }
  try {
    const { data, error } = await supabase
      .from('store_payment_display')
      .select(
        'id, enabled, max_installments, min_installment_amount, interest_free, show_on_cards, show_on_pdp, footnote',
      )
      .limit(1)
      .maybeSingle()
    if (error) throw error
    const mapped = data ? mapRow(data as Row) : null
    cache = { at: Date.now(), data: mapped }
    return mapped
  } catch {
    cache = { at: Date.now(), data: null }
    return null
  }
}

export async function adminGetPaymentDisplaySettings(): Promise<PaymentDisplaySettings | null> {
  invalidatePaymentDisplayCache()
  return getPaymentDisplaySettings()
}

export async function adminUpsertPaymentDisplaySettings(
  input: Omit<PaymentDisplaySettings, 'id'> & { id?: string },
): Promise<PaymentDisplaySettings> {
  if (!supabase) throw new Error('Supabase não configurado')
  const payload = {
    enabled: input.enabled,
    max_installments: Math.min(Math.max(Math.floor(input.maxInstallments), 1), 24),
    min_installment_amount: Math.max(Number(input.minInstallmentAmount) || 0, 0),
    interest_free: input.interestFree,
    show_on_cards: input.showOnCards,
    show_on_pdp: input.showOnPdp,
    footnote: input.footnote?.trim() || null,
    updated_at: new Date().toISOString(),
  }

  if (input.id) {
    const { data, error } = await supabase
      .from('store_payment_display')
      .update(payload)
      .eq('id', input.id)
      .select(
        'id, enabled, max_installments, min_installment_amount, interest_free, show_on_cards, show_on_pdp, footnote',
      )
      .single()
    if (error) throw error
    invalidatePaymentDisplayCache()
    return mapRow(data as Row)
  }

  const { data, error } = await supabase
    .from('store_payment_display')
    .insert(payload)
    .select(
      'id, enabled, max_installments, min_installment_amount, interest_free, show_on_cards, show_on_pdp, footnote',
    )
    .single()
  if (error) throw error
  invalidatePaymentDisplayCache()
  return mapRow(data as Row)
}
