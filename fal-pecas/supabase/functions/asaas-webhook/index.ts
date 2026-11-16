// FAL PAY — webhook Asaas endurecido (token obrigatório, re-fetch, amount).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { asaasApiBase, asaasApiRequest } from '../_shared/asaasApiCore.ts'
import { asaasStatusToInternal } from '../_shared/asaasPaymentStatusCore.ts'

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

type AsaasPaymentPayload = {
  id?: string
  status?: string
  externalReference?: string
  value?: number
  creditCard?: unknown
}

/** Remove dados sensíveis antes de persistir em payment_events. */
function sanitizeWebhookPayload(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...body }
  const payment = body.payment
  if (payment && typeof payment === 'object') {
    const p = { ...(payment as Record<string, unknown>) }
    delete p.creditCard
    delete p.creditCardHolderInfo
    delete p.creditCardToken
    out.payment = p
  }
  return out
}

function amountsMatch(local: number, remote: number, eps = 0.02): boolean {
  return Math.abs(local - remote) <= eps
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })

  const configuredToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN')?.trim()
  if (!configuredToken) {
    console.error('asaas_webhook_token_missing')
    return json(503, { error: 'webhook_token_not_configured' })
  }
  const incoming =
    req.headers.get('asaas-access-token') ?? req.headers.get('ASAAS-ACCESS-TOKEN') ?? ''
  if (incoming !== configuredToken) {
    return json(401, { error: 'invalid_webhook_token' })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const apiKey = Deno.env.get('ASAAS_API_KEY')
  if (!supabaseUrl || !serviceKey) return json(500, { error: 'supabase_env_missing' })
  if (!apiKey) return json(503, { error: 'ASAAS_API_KEY missing' })

  let body: Record<string, unknown> = {}
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return json(400, { error: 'invalid_json' })
  }

  const event = String(body.event ?? '')
  const payment = body.payment as AsaasPaymentPayload | undefined
  const providerPaymentId = payment?.id ? String(payment.id) : null
  if (!providerPaymentId) {
    return json(200, { ok: true, ignored: true, reason: 'no_payment_id' })
  }

  const asaasEventId = typeof body.id === 'string' ? body.id.trim() : ''
  const providerEventId =
    asaasEventId || `${event}:${providerPaymentId}:${String(body.dateCreated ?? '')}`

  const admin = createClient(supabaseUrl, serviceKey)
  const asaasBase = asaasApiBase(Deno.env.get('ASAAS_ENV'))
  const safePayload = sanitizeWebhookPayload(body)

  const { data: existingEvent } = await admin
    .from('payment_events')
    .select('id, processed')
    .eq('provider', 'asaas')
    .eq('provider_event_id', providerEventId)
    .maybeSingle()
  if (existingEvent?.processed) {
    return json(200, { ok: true, reused: true })
  }

  let paymentRow: {
    id: string
    status: string
    order_id: string
    amount: number | null
    provider_payment_id?: string | null
  } | null = null

  const { data: byProviderId } = await admin
    .from('payments')
    .select('id, status, order_id, amount, provider_payment_id')
    .eq('provider', 'asaas')
    .eq('provider_payment_id', providerPaymentId)
    .maybeSingle()
  paymentRow = byProviderId

  const orderRef = payment?.externalReference ? String(payment.externalReference).trim() : ''
  if (!paymentRow?.id && orderRef) {
    const { data: byOrder } = await admin
      .from('payments')
      .select('id, status, order_id, amount, provider_payment_id')
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
      payload: safePayload,
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
  const expireEvents = new Set(['PAYMENT_OVERDUE'])

  if (paymentRow?.id && confirmEvents.has(event) && paymentRow.status === 'pending') {
    const remote = await asaasApiRequest<{
      id?: string
      status?: string
      value?: number
      externalReference?: string
    }>(apiKey, asaasBase, `/payments/${providerPaymentId}`, { method: 'GET' })

    if (!remote.ok) {
      console.error('asaas_webhook_refetch_failed', remote.status, remote.body)
      return json(502, { error: 'asaas_refetch_failed', detail: remote.body })
    }

    const remoteStatus = String(remote.data.status ?? '').toUpperCase()
    const transition = asaasStatusToInternal(remoteStatus)
    if (transition !== 'approve') {
      await admin
        .from('payments')
        .update({ provider_status: remote.data.status ?? null })
        .eq('id', paymentRow.id)
      await admin
        .from('payment_events')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq('provider', 'asaas')
        .eq('provider_event_id', providerEventId)
      return json(200, {
        ok: true,
        ignored: true,
        reason: 'remote_not_approved',
        providerStatus: remote.data.status,
      })
    }

    const remoteValue = Number(remote.data.value ?? payment?.value ?? NaN)
    const localAmount = Number(paymentRow.amount ?? NaN)
    if (Number.isFinite(localAmount) && Number.isFinite(remoteValue)) {
      if (!amountsMatch(localAmount, remoteValue)) {
        console.error('asaas_webhook_amount_mismatch', {
          paymentId: paymentRow.id,
          localAmount,
          remoteValue,
        })
        return json(409, {
          error: 'amount_mismatch',
          localAmount,
          remoteValue,
        })
      }
    }

    if (orderRef && remote.data.externalReference && String(remote.data.externalReference) !== orderRef) {
      return json(409, {
        error: 'external_reference_mismatch',
        expected: orderRef,
        remote: remote.data.externalReference,
      })
    }

    const { error: confirmErr } = await admin.rpc('confirm_asaas_payment', {
      p_payment_id: paymentRow.id,
    })
    if (confirmErr) {
      console.error('asaas_webhook_confirm_failed', confirmErr.message)
      return json(500, { error: 'confirm_failed', detail: confirmErr.message })
    }
    await admin
      .from('payments')
      .update({ provider_status: remote.data.status ?? payment?.status ?? null })
      .eq('id', paymentRow.id)
    await admin
      .from('payment_events')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('provider', 'asaas')
      .eq('provider_event_id', providerEventId)
    return json(200, { ok: true, approved: true, paymentId: paymentRow.id })
  }

  if (
    paymentRow?.id &&
    paymentRow.status === 'pending' &&
    (rejectEvents.has(event) || expireEvents.has(event))
  ) {
    const nextStatus = expireEvents.has(event) && !rejectEvents.has(event) ? 'expired' : 'rejected'
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
