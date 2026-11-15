import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import {
  DEFAULT_PIX_MP_MAX_AMOUNT_CENTS,
  type RoutedPaymentProviderId,
} from '@/services/payments/routing/paymentRouter'

export type PaymentRoutingConfig = {
  pixMpMaxAmountCents: number
  pixBelowLimitProvider: RoutedPaymentProviderId
  pixAboveLimitProvider: RoutedPaymentProviderId
  cardProvider: RoutedPaymentProviderId
  boletoProvider: RoutedPaymentProviderId
  asaasEnabled: boolean
  mercadopagoEnabled: boolean
}

const CACHE_TTL_MS = 5 * 60_000
let cache: { at: number; data: PaymentRoutingConfig } | null = null

function parseProvider(raw: unknown, fallback: RoutedPaymentProviderId): RoutedPaymentProviderId {
  const v = String(raw ?? '').trim().toLowerCase()
  return v === 'asaas' ? 'asaas' : v === 'mercadopago' ? 'mercadopago' : fallback
}

export const DEFAULT_PAYMENT_ROUTING_CONFIG: PaymentRoutingConfig = {
  pixMpMaxAmountCents: DEFAULT_PIX_MP_MAX_AMOUNT_CENTS,
  pixBelowLimitProvider: 'mercadopago',
  pixAboveLimitProvider: 'asaas',
  cardProvider: 'mercadopago',
  boletoProvider: 'asaas',
  asaasEnabled: true,
  mercadopagoEnabled: true,
}

export function invalidatePaymentRoutingCache() {
  cache = null
}

export async function getPaymentRoutingConfig(): Promise<PaymentRoutingConfig> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data
  if (!isSupabaseConfigured || !supabase) {
    const data = { ...DEFAULT_PAYMENT_ROUTING_CONFIG }
    cache = { at: Date.now(), data }
    return data
  }
  const { data: row, error } = await supabase
    .from('payment_routing_config')
    .select(
      'pix_mp_max_amount_cents, pix_below_limit_provider, pix_above_limit_provider, card_provider, boleto_provider, asaas_enabled, mercadopago_enabled',
    )
    .eq('id', true)
    .maybeSingle()
  if (error || !row) {
    const data = { ...DEFAULT_PAYMENT_ROUTING_CONFIG }
    cache = { at: Date.now(), data }
    return data
  }
  const mapped: PaymentRoutingConfig = {
    pixMpMaxAmountCents: Math.max(
      1,
      Math.floor(Number(row.pix_mp_max_amount_cents) || DEFAULT_PIX_MP_MAX_AMOUNT_CENTS),
    ),
    pixBelowLimitProvider: parseProvider(row.pix_below_limit_provider, 'mercadopago'),
    pixAboveLimitProvider: parseProvider(row.pix_above_limit_provider, 'asaas'),
    cardProvider: parseProvider(row.card_provider, 'mercadopago'),
    boletoProvider: parseProvider(row.boleto_provider, 'asaas'),
    asaasEnabled: row.asaas_enabled !== false,
    mercadopagoEnabled: row.mercadopago_enabled !== false,
  }
  cache = { at: Date.now(), data: mapped }
  return mapped
}

export async function savePaymentRoutingConfig(
  input: PaymentRoutingConfig,
): Promise<PaymentRoutingConfig> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase não configurado.')
  }
  const pixMpMaxAmountCents = Math.max(1, Math.floor(Number(input.pixMpMaxAmountCents) || 1))
  const payload = {
    pix_mp_max_amount_cents: pixMpMaxAmountCents,
    pix_below_limit_provider: parseProvider(input.pixBelowLimitProvider, 'mercadopago'),
    pix_above_limit_provider: parseProvider(input.pixAboveLimitProvider, 'asaas'),
    card_provider: parseProvider(input.cardProvider, 'mercadopago'),
    boleto_provider: parseProvider(input.boletoProvider, 'asaas'),
    asaas_enabled: Boolean(input.asaasEnabled),
    mercadopago_enabled: Boolean(input.mercadopagoEnabled),
    updated_at: new Date().toISOString(),
  }
  const { data: row, error } = await supabase
    .from('payment_routing_config')
    .update(payload)
    .eq('id', true)
    .select(
      'pix_mp_max_amount_cents, pix_below_limit_provider, pix_above_limit_provider, card_provider, boleto_provider, asaas_enabled, mercadopago_enabled',
    )
    .single()
  if (error || !row) {
    throw new Error(error?.message || 'Falha ao salvar roteamento de pagamento.')
  }
  invalidatePaymentRoutingCache()
  const mapped: PaymentRoutingConfig = {
    pixMpMaxAmountCents: Math.max(
      1,
      Math.floor(Number(row.pix_mp_max_amount_cents) || DEFAULT_PIX_MP_MAX_AMOUNT_CENTS),
    ),
    pixBelowLimitProvider: parseProvider(row.pix_below_limit_provider, 'mercadopago'),
    pixAboveLimitProvider: parseProvider(row.pix_above_limit_provider, 'asaas'),
    cardProvider: parseProvider(row.card_provider, 'mercadopago'),
    boletoProvider: parseProvider(row.boleto_provider, 'asaas'),
    asaasEnabled: row.asaas_enabled !== false,
    mercadopagoEnabled: row.mercadopago_enabled !== false,
  }
  cache = { at: Date.now(), data: mapped }
  return mapped
}