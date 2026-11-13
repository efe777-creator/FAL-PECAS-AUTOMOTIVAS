import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { PaymentDisplaySettings } from '@/lib/paymentDisplay'

const CACHE_TTL_MS = 5 * 60_000
let cache: { at: number; data: PaymentDisplaySettings | null } | null = null

const SELECT_COLS =
  'id, enabled, max_installments, min_installment_amount, interest_free, interest_free_max, allow_interest_installments, installments_enabled, card_enabled, pix_enabled, show_on_cards, show_on_pdp, footnote'

type Row = {
  id: string
  enabled: boolean
  max_installments: number
  min_installment_amount: number | string
  interest_free: boolean
  interest_free_max?: number | null
  allow_interest_installments?: boolean | null
  installments_enabled?: boolean | null
  card_enabled?: boolean | null
  pix_enabled?: boolean | null
  show_on_cards: boolean
  show_on_pdp: boolean
  footnote: string | null
}

function mapRow(row: Row): PaymentDisplaySettings {
  const maxInstallments = Number(row.max_installments) || 1
  const interestFree = Boolean(row.interest_free)
  const interestFreeMax =
    row.interest_free_max != null
      ? Math.max(0, Math.min(24, Math.floor(Number(row.interest_free_max))))
      : interestFree
        ? maxInstallments
        : 0
  const installmentsEnabled =
    row.installments_enabled != null ? Boolean(row.installments_enabled) : Boolean(row.enabled)
  return {
    id: row.id,
    enabled: Boolean(row.enabled),
    maxInstallments,
    minInstallmentAmount: Number(row.min_installment_amount) || 0,
    interestFree: interestFree || interestFreeMax > 0,
    interestFreeMax,
    allowInterestInstallments:
      row.allow_interest_installments != null
        ? Boolean(row.allow_interest_installments)
        : !interestFree,
    installmentsEnabled,
    cardEnabled: row.card_enabled != null ? Boolean(row.card_enabled) : true,
    pixEnabled: row.pix_enabled != null ? Boolean(row.pix_enabled) : true,
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
      .select(SELECT_COLS)
      .limit(1)
      .maybeSingle()
    if (error) throw error
    const mapped = data ? mapRow(data as Row) : null
    cache = { at: Date.now(), data: mapped }
    return mapped
  } catch {
    // Colunas novas ainda não aplicadas: fallback select legado
    try {
      const { data, error } = await supabase!
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
}

export async function adminGetPaymentDisplaySettings(): Promise<PaymentDisplaySettings | null> {
  invalidatePaymentDisplayCache()
  return getPaymentDisplaySettings()
}

export async function adminUpsertPaymentDisplaySettings(
  input: Omit<PaymentDisplaySettings, 'id'> & { id?: string },
): Promise<PaymentDisplaySettings> {
  if (!supabase) throw new Error('Supabase não configurado')
  const maxInstallments = Math.min(Math.max(Math.floor(input.maxInstallments), 1), 24)
  const interestFreeMax = Math.min(
    Math.max(Math.floor(input.interestFreeMax ?? (input.interestFree ? maxInstallments : 0)), 0),
    24,
  )
  const payload = {
    enabled: input.enabled,
    max_installments: maxInstallments,
    min_installment_amount: Math.max(Number(input.minInstallmentAmount) || 0, 0),
    interest_free: interestFreeMax > 0 || Boolean(input.interestFree),
    interest_free_max: interestFreeMax,
    allow_interest_installments: Boolean(input.allowInterestInstallments),
    installments_enabled: Boolean(input.installmentsEnabled),
    card_enabled: Boolean(input.cardEnabled),
    pix_enabled: Boolean(input.pixEnabled),
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
      .select(SELECT_COLS)
      .single()
    if (error) throw error
    invalidatePaymentDisplayCache()
    return mapRow(data as Row)
  }

  const { data, error } = await supabase
    .from('store_payment_display')
    .insert(payload)
    .select(SELECT_COLS)
    .single()
  if (error) throw error
  invalidatePaymentDisplayCache()
  return mapRow(data as Row)
}
