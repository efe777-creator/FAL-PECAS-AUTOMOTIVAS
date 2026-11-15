// Sync cobrança Asaas → FAL quando webhook atrasa.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { asaasApiBase, asaasApiRequest } from '../_shared/asaasApiCore.ts'
import { asaasStatusToInternal } from '../_shared/asaasPaymentStatusCore.ts'

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

type AsaasPayRow = { id?: string; status?: string }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })

  try {
    const apiKey = Deno.env.get('ASAAS_API_KEY')
    if (!apiKey) return json(503, { error: 'ASAAS_API_KEY missing' })

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
    const asaasBase = asaasApiBase(Deno.env.get('ASAAS_ENV'))

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
    if (payment.provider !== 'asaas') {
      return json(409, { error: 'not_asaas' })
    }

    const { data: order } = await admin
      .from('orders')
      .select('id, status, customer_id')
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
        orderApproved: true,
      })
    }

    if (!payment.provider_payment_id) {
      return json(409, { error: 'missing_provider_payment_id' })
    }

    const remote = await asaasApiRequest<AsaasPayRow>(
      apiKey,
      asaasBase,
      `/payments/${payment.provider_payment_id}`,
      { method: 'GET' },
    )
    if (!remote.ok) {
      return json(502, { error: 'asaas_fetch_failed', detail: remote.body })
    }

    const providerStatus = remote.data.status ?? null
    await admin
      .from('payments')
      .update({ provider_status: providerStatus })
      .eq('id', payment.id)

    const transition = asaasStatusToInternal(providerStatus)
    if (transition === 'pending') {
      return json(200, {
        ok: true,
        status: payment.status,
        providerStatus,
        noop: true,
        orderId: order.id,
      })
    }

    if (transition === 'reject') {
      await admin
        .from('payments')
        .update({
          status: 'rejected',
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', payment.id)
        .eq('status', 'pending')
      return json(200, {
        ok: true,
        status: 'rejected',
        providerStatus,
        orderId: order.id,
      })
    }

    const { data, error } = await admin.rpc('confirm_asaas_payment', {
      p_payment_id: payment.id,
    })
    if (error) {
      return json(500, { error: 'approve_failed', detail: error.message })
    }
    const orderStatus =
      data && typeof data === 'object' && 'order_status' in data
        ? String((data as { order_status?: string }).order_status ?? '')
        : order.status
    return json(200, {
      ok: true,
      status: 'approved',
      providerStatus,
      orderId: order.id,
      orderStatus,
      orderApproved: true,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown_error'
    return json(400, { error: message })
  }
})