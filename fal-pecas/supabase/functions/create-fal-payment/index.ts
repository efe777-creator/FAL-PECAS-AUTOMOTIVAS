/**
 * FAL PAY — gateway único do checkout.
 * Cliente envia { orderId, method, installments? }. Servidor roteia e encaminha.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { moneyToAmountCents, type RoutablePaymentMethod } from '../_shared/paymentRouterCore.ts'
import {
  decidePaymentRouteForStore,
  loadPaymentRoutingConfig,
  paymentRouteBlocked,
} from '../_shared/paymentRoutingConfigCore.ts'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function parseMethod(raw: unknown): RoutablePaymentMethod | null {
  const m = String(raw ?? '')
    .trim()
    .toLowerCase()
  if (m === 'pix' || m === 'credit_card' || m === 'debit_card' || m === 'boleto') return m
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json(500, { error: 'supabase_env_missing' })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json(401, { error: 'missing_authorization' })

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser()
    if (userErr || !user) return json(401, { error: 'unauthorized' })

    let rawBody: Record<string, unknown> = {}
    try {
      rawBody = (await req.json()) as Record<string, unknown>
    } catch {
      return json(400, { error: 'invalid_json' })
    }

    const orderId = typeof rawBody.orderId === 'string' ? rawBody.orderId.trim() : ''
    if (!orderId) return json(400, { error: 'orderId_required' })
    const method = parseMethod(rawBody.method)
    if (!method) return json(400, { error: 'method_invalid' })
    const installments =
      rawBody.installments != null ? Math.max(1, Math.floor(Number(rawBody.installments) || 1)) : 1

    const admin = createClient(supabaseUrl, serviceKey)
    const { data: customer } = await admin
      .from('customers')
      .select('id')
      .eq('profile_id', user.id)
      .maybeSingle()
    if (!customer) return json(404, { error: 'customer_not_found' })

    const { data: order } = await admin
      .from('orders')
      .select('id, status, total, customer_id')
      .eq('id', orderId)
      .eq('customer_id', customer.id)
      .maybeSingle()
    if (!order) return json(404, { error: 'order_not_found' })
    if (order.status !== 'aguardando_pagamento') {
      return json(409, { error: 'order_not_awaiting_payment', status: order.status })
    }

    const amount = Number(order.total)
    if (!(amount > 0)) return json(422, { error: 'invalid_order_total' })

    const routing = await loadPaymentRoutingConfig(admin)
    const route = decidePaymentRouteForStore(method, moneyToAmountCents(amount), routing)
    const blocked = paymentRouteBlocked(route.provider, routing)
    if (blocked) {
      return json(503, { error: blocked, detail: 'Provedor desativado em payment_routing_config.' })
    }

    // Cartão nunca vai ao Mercado Pago.
    if ((method === 'credit_card' || method === 'debit_card') && route.provider !== 'asaas') {
      return json(409, {
        error: 'payment_route_mismatch',
        routedProvider: 'asaas',
        detail: 'Crédito e débito devem ser criados via Asaas.',
        routing: route,
      })
    }

    const targetFn =
      route.provider === 'mercadopago' ? 'create-mp-payment' : 'create-asaas-payment'

    if (targetFn === 'create-mp-payment' && method !== 'pix') {
      return json(409, {
        error: 'payment_route_mismatch',
        routedProvider: 'asaas',
        detail: 'Mercado Pago neste fluxo aceita somente Pix.',
        routing: route,
      })
    }

    const forwardBody: Record<string, unknown> =
      targetFn === 'create-mp-payment'
        ? { orderId }
        : {
            orderId,
            method,
            installments: method === 'debit_card' ? 1 : installments,
          }

    const forward = await fetch(`${supabaseUrl}/functions/v1/${targetFn}`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        apikey: anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(forwardBody),
    })
    const payload = (await forward.json().catch(() => ({}))) as Record<string, unknown>
    return json(forward.status, {
      ...payload,
      routedProvider: route.provider,
      ruleVersion: route.ruleVersion,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown_error'
    return json(400, { error: message })
  }
})
