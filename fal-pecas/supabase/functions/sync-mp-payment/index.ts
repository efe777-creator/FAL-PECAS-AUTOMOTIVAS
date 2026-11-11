// Sync cobrança MP → FAL quando webhook atrasa/falha.
// Cliente autenticado dono do pedido; Edge consulta MP e aplica approve/set_terminal.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import {
  decideWebhookTransition,
  mapMpProviderStatusToInternal,
} from '../_shared/mpWebhookCore.ts'

const MP_API = 'https://api.mercadopago.com/v1/payments'

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })

  try {
    const mpToken = Deno.env.get('MP_ACCESS_TOKEN')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json(500, { error: 'supabase_env_missing' })
    }
    if (!mpToken) return json(503, { error: 'MP_ACCESS_TOKEN missing' })

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

    let paymentId: string | null = null
    try {
      const body = (await req.json()) as { paymentId?: unknown }
      if (typeof body.paymentId === 'string' && body.paymentId.trim()) {
        paymentId = body.paymentId.trim()
      }
    } catch {
      return json(400, { error: 'invalid_json' })
    }
    if (!paymentId) return json(400, { error: 'paymentId_required' })

    const admin = createClient(supabaseUrl, serviceKey)

    const { data: customer } = await admin
      .from('customers')
      .select('id')
      .eq('profile_id', user.id)
      .maybeSingle()
    if (!customer) return json(404, { error: 'customer_not_found' })

    const { data: payment } = await admin
      .from('payments')
      .select('id, order_id, status, provider, provider_payment_id, provider_status, amount')
      .eq('id', paymentId)
      .maybeSingle()
    if (!payment) return json(404, { error: 'payment_not_found' })
    if (payment.provider !== 'mercadopago') {
      return json(409, { error: 'not_mercadopago' })
    }

    const { data: order } = await admin
      .from('orders')
      .select('id, status, customer_id, total')
      .eq('id', payment.order_id)
      .eq('customer_id', customer.id)
      .maybeSingle()
    if (!order) return json(404, { error: 'order_not_found' })

    if (payment.status === 'approved') {
      return json(200, {
        ok: true,
        status: 'approved',
        orderId: order.id,
        orderStatus: order.status,
        reused: true,
      })
    }

    if (!payment.provider_payment_id) {
      return json(409, { error: 'missing_provider_payment_id' })
    }

    const mpRes = await fetch(`${MP_API}/${payment.provider_payment_id}`, {
      headers: { Authorization: `Bearer ${mpToken}` },
    })
    if (!mpRes.ok) {
      return json(502, {
        error: 'mp_fetch_failed',
        httpStatus: mpRes.status,
      })
    }
    const mpJson = (await mpRes.json().catch(() => ({}))) as {
      status?: string
      transaction_amount?: number
    }
    const providerStatus = typeof mpJson.status === 'string' ? mpJson.status : null
    const incoming = mapMpProviderStatusToInternal(providerStatus)
    const transition = decideWebhookTransition({
      currentPaymentStatus: String(payment.status),
      incomingInternal: incoming,
    })

    await admin
      .from('payments')
      .update({ provider_status: providerStatus })
      .eq('id', payment.id)

    if (transition.action === 'noop') {
      return json(200, {
        ok: true,
        status: payment.status,
        providerStatus,
        noop: true,
        reason: transition.reason,
        orderId: order.id,
      })
    }

    if (transition.action === 'set_terminal') {
      await admin
        .from('payments')
        .update({
          status: incoming,
          provider_status: providerStatus,
          ...(incoming === 'cancelled' ? { cancelled_at: new Date().toISOString() } : {}),
        })
        .eq('id', payment.id)
        .eq('status', 'pending')
      return json(200, {
        ok: true,
        status: incoming,
        providerStatus,
        orderId: order.id,
      })
    }

    if (transition.action === 'approve') {
      const { data, error } = await admin.rpc('confirm_mercadopago_payment', {
        p_payment_id: payment.id,
      })
      if (error) {
        return json(500, { error: 'approve_failed', detail: error.message })
      }
      await admin
        .from('payments')
        .update({ provider_status: providerStatus })
        .eq('id', payment.id)
      const orderStatus =
        data && typeof data === 'object' && 'order_status' in data
          ? String((data as { order_status?: string }).order_status ?? '')
          : 'em_analise'
      return json(200, {
        ok: true,
        status: 'approved',
        providerStatus,
        orderId: order.id,
        orderStatus,
        orderApproved: true,
      })
    }

    return json(200, { ok: true, status: payment.status, providerStatus })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown_error'
    return json(400, { error: message })
  }
})
