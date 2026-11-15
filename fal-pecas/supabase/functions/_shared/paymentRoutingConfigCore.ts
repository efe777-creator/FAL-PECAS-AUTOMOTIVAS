/**
 * Config operacional FAL PAY (singleton payment_routing_config).
 */
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import {
  decidePaymentRoute,
  DEFAULT_PIX_MP_MAX_AMOUNT_CENTS,
  type RoutablePaymentMethod,
  type StorePaymentRoutingOverrides,
} from './paymentRouterCore.ts'

export type LoadedPaymentRoutingConfig = {
  pixMpMaxAmountCents: number
  pixBelowLimitProvider: 'mercadopago' | 'asaas'
  pixAboveLimitProvider: 'mercadopago' | 'asaas'
  cardProvider: 'mercadopago' | 'asaas'
  boletoProvider: 'mercadopago' | 'asaas'
  asaasEnabled: boolean
  mercadopagoEnabled: boolean
}

function parseProvider(raw: unknown, fallback: 'mercadopago' | 'asaas'): 'mercadopago' | 'asaas' {
  const v = String(raw ?? '').trim().toLowerCase()
  if (v === 'asaas') return 'asaas'
  if (v === 'mercadopago') return 'mercadopago'
  return fallback
}

export async function loadPaymentRoutingConfig(
  admin: SupabaseClient,
): Promise<LoadedPaymentRoutingConfig> {
  const { data } = await admin
    .from('payment_routing_config')
    .select(
      'pix_mp_max_amount_cents, pix_below_limit_provider, pix_above_limit_provider, card_provider, boleto_provider, asaas_enabled, mercadopago_enabled',
    )
    .eq('id', true)
    .maybeSingle()
  return {
    pixMpMaxAmountCents: Math.max(
      1,
      Math.floor(Number(data?.pix_mp_max_amount_cents) || DEFAULT_PIX_MP_MAX_AMOUNT_CENTS),
    ),
    pixBelowLimitProvider: parseProvider(data?.pix_below_limit_provider, 'mercadopago'),
    pixAboveLimitProvider: parseProvider(data?.pix_above_limit_provider, 'asaas'),
    cardProvider: parseProvider(data?.card_provider, 'asaas'),
    boletoProvider: parseProvider(data?.boleto_provider, 'asaas'),
    asaasEnabled: data?.asaas_enabled !== false,
    mercadopagoEnabled: data?.mercadopago_enabled !== false,
  }
}

export function storeRoutingOverrides(config: LoadedPaymentRoutingConfig): StorePaymentRoutingOverrides {
  return {
    pixMpMaxAmountCents: config.pixMpMaxAmountCents,
    pixBelowLimitProvider: config.pixBelowLimitProvider,
    pixAboveLimitProvider: config.pixAboveLimitProvider,
    cardProvider: config.cardProvider,
    boletoProvider: config.boletoProvider,
  }
}

export function decidePaymentRouteForStore(
  method: RoutablePaymentMethod,
  amountCents: number,
  config: LoadedPaymentRoutingConfig,
) {
  return decidePaymentRoute(
    {
      method,
      amountCents,
      pixMpMaxAmountCents: config.pixMpMaxAmountCents,
    },
    storeRoutingOverrides(config),
  )
}

export type PaymentRouteBlockReason = 'asaas_disabled' | 'mercadopago_disabled'

/** Bloqueio operacional quando o provedor roteado está desligado no admin. */
export function paymentRouteBlocked(
  routeProvider: 'mercadopago' | 'asaas',
  config: LoadedPaymentRoutingConfig,
): PaymentRouteBlockReason | null {
  if (routeProvider === 'asaas' && !config.asaasEnabled) return 'asaas_disabled'
  if (routeProvider === 'mercadopago' && !config.mercadopagoEnabled) return 'mercadopago_disabled'
  return null
}