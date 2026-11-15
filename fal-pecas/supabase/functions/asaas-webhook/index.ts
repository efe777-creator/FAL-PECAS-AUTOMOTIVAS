// FAL PAY — webhook Asaas (ledger + approve pending).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, asaas-access-token',
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

  const configuredToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN')
  if (configuredToken) {
    const incoming =
      req.headers.get('asaas-access-token') ??
      req.headers.get('ASAAS-ACCESS-TOKEN') ??
      ''
    if (incoming !== configuredToken) {
      return json(401, { error: 'invalid_webhook_token' })
    }
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) return json(500, { error: 'supabase_env_missing' })

  let body: Record<string, unknown> = {}
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return json(400, { error: 'invalid_json' })
  }

  const event = String(body.event ?? '')
  const payment = body.payment as { id?: string; status?: string; externalReference?: string } | undefined
  const providerPaymentId = payment?.id ? String(payment.id) : null
  if (!providerPaymentId) {
    return json(200, { ok: true, ignored: true, reason: 'no_payment_id' })
  }

  const asaasEventId = typeof body.id === 'string' ? body.id.trim() : ''
  const providerEventId = asaasEventId || `${event}:${providerPaymentId}:${String(body.dateCreated ?? '')}`

  const admin = createClient(supabaseUrl, serviceKey)

  const { data: existingEvent } = await admin
    .from('payment_events')
    .select('id, processed')
    .eq('provider', 'asaas')
    .eq('provider_event_id', providerEventId)
    .maybeSingle()
  if (existingEvent?.processed) {
    return json(200, { ok: true, reused: true })
  }

  let paymentRow: { id: string; status: string; order_id: string; provider_payment_id?: string | null } | null =
    null
  const { data: byProviderId } = await admin
    .from('payments')
    .select('id, status, order_id, provider_payment_id')
    .eq('provider', 'asaas')
    .eq('provider_payment_id', providerPaymentId)
    .maybeSingle()
  paymentRow = byProviderId

  const orderRef = payment?.externalReference ? String(payment.externalReference).trim() : ''
  if (!paymentRow?.id && orderRef) {
    const { data: byOrder } = await admin
      .from('payments')
      .select('id, status, order_id, provider_payment_id')
      .eq('provider', 'asaas')
      .eq('order_id', orderRef)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (byOrder?.id) {
      paymentRow = byOrder
      if (!byOrder.provider_payment_id) {
        await admin
          .from('payments')
          .update({ provider_payment_id: providerPaymentId })
          .eq('id', byOrder.id)
      }
    }
  }

  if (!existingEvent) {
    const { error: insEvErr } = await admin.from('payment_events').insert({
      payment_id: paymentRow?.id ?? null,
      provider: 'asaas',
      provider_event_id: providerEventId,
      event_type: event,
      action: 'received',
      payload: body,
      processed: false,
    })
    if (insEvErr && insEvErr.code !== '23505') {
      console.error('asaas_webhook_event_insert', insEvErr.message)
    }
  }

  const confirmEvents = new Set(['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'])
  const rejectEvents = new Set([
    'PAYMENT_REFUNDED',
    'PAYMENT_DELETED',
    'PAYMENT_CHARGEBACK_REQUESTED',
    'PAYMENT_CHARGEBACK_DISPUTE',
  ])
  const expireEvents = new Set(['PAYMENT_OVERDUE', 'PAYMENT_DELETED'])

  if (paymentRow?.id && confirmEvents.has(event) && paymentRow.status === 'pending') {
    const { error: confirmErr } = await admin.rpc('confirm_asaas_payment', {
      p_payment_id: paymentRow.id,
    })
    if (confirmErr) {
      console.error('asaas_webhook_confirm_failed', confirmErr.message)
      return json(500, { error: 'confirm_failed', detail: confirmErr.message })
    }
    await admin
      .from('payment_events')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('provider', 'asaas')
      .eq('provider_event_id', providerEventId)
    return json(200, { ok: true, approved: true, paymentId: paymentRow.id })
  }

  if (paymentRow?.id && paymentRow.status === 'pending' && (rejectEvents.has(event) || expireEvents.has(event))) {
    const nextStatus = expireEvents.has(event) && !rejectEvents.has(event) ? 'expired' : 'rejected'
    // PAYMENT_DELETED: treat as rejected/cancelled attempt
    await admin
      .from('payments')
      .update({
        status: event === 'PAYMENT_OVERDUE' ? 'expired' : nextStatus,
        cancelled_at: new Date().toISOString(),
        provider_status: payment?.status ?? null,
      })
      .eq('id', paymentRow.id)
      .eq('status', 'pending')
  }

  await admin
    .from('payment_events')
    .update({ processed: true, processed_at: new Date().toISOString() })
    .eq('provider', 'asaas')
    .eq('provider_event_id', providerEventId)

  return json(200, { ok: true, event, noop: true })
})