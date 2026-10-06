// F9-C — mercado-pago-webhook
// Valida x-signature; ledger payment_events; consulta MP; amount check; approve via RPC.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import {
  amountsMatch,
  extractWebhookDataId,
  extractWebhookEventType,
  mapMpProviderStatusToInternal,
  verifyMpWebhookSignature,
} from '../_shared/mpWebhookCore.ts'

const MP_API = 'https://api.mercadopago.com/v1/payments'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-signature, x-request-id',
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
    const secret = Deno.env.get('MP_WEBHOOK_SECRET')
    const mpToken = Deno.env.get('MP_ACCESS_TOKEN')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceKey) return json(500, { error: 'supabase_env_missing' })
    if (!mpToken) return json(503, { error: 'MP_ACCESS_TOKEN missing' })

    const url = new URL(req.url)
    let body: unknown = null
    try {
      body = await req.json()
    } catch {
      body = null
    }

    const dataId = extractWebhookDataId(url.searchParams, body)
    const xSignature = req.headers.get('x-signature')
    const xRequestId = req.headers.get('x-request-id')

    const sig = await verifyMpWebhookSignature({
      xSignature,
      xRequestId,
      dataId,
      secret,
    })
    if (!sig.ok) return json(401, { error: sig.reason })

    const admin = createClient(supabaseUrl, serviceKey)
    const providerEventId = xRequestId!.trim()
    const eventType = extractWebhookEventType(body)

    // Idempotência: evento já processado
    const { data: existingEvent } = await admin
      .from('payment_events')
      .select('id, processed, payment_id')
      .eq('provider', 'mercadopago')
      .eq('provider_event_id', providerEventId)
      .maybeSingle()

    if (existingEvent?.processed) {
      return json(200, { ok: true, reused: true, paymentId: existingEvent.payment_id })
    }

    const mpRes = await fetch(`${MP_API}/${dataId}`, {
      headers: { Authorization: `Bearer ${mpToken}`, 'Content-Type': 'application/json' },
    })
    const mpJson = (await mpRes.json().catch(() => ({}))) as Record<string, unknown>
    if (!mpRes.ok) {
      return json(502, { error: 'mp_fetch_failed', status: mpRes.status, detail: mpJson })
    }

    const providerPaymentId = String(mpJson.id ?? dataId)
    const providerStatus = String(mpJson.status ?? '')
    const mpAmount = Number(mpJson.transaction_amount)
    const externalRef = mpJson.external_reference != null ? String(mpJson.external_reference) : null

    const { data: payment } = await admin
      .from('payments')
      .select('id, order_id, status, amount, provider, provider_payment_id')
      .eq('provider', 'mercadopago')
      .eq('provider_payment_id', providerPaymentId)
      .maybeSingle()

    if (!payment) {
      // Grava evento órfão para auditoria; não falha com 5xx (retry infinito)
      await admin.from('payment_events').upsert(
        {
          payment_id: null,
          provider: 'mercadopago',
          provider_event_id: providerEventId,
          event_type: eventType,
          action: 'payment_not_found',
          payload: { dataId, providerStatus, externalRef },
          processed: true,
          processed_at: new Date().toISOString(),
          error: 'payment_not_found',
        },
        { onConflict: 'provider,provider_event_id' },
      ).then(() => undefined).catch(() => undefined)
      // unique index is partial — upsert onConflict may fail; insert ignore
      if (!existingEvent) {
        await admin.from('payment_events').insert({
          payment_id: null,
          provider: 'mercadopago',
          provider_event_id: providerEventId,
          event_type: eventType,
          action: 'payment_not_found',
          payload: { dataId, providerStatus, externalRef },
          processed: true,
          processed_at: new Date().toISOString(),
          error: 'payment_not_found',
        })
      }
      return json(200, { ok: true, ignored: true, reason: 'payment_not_found' })
    }

    const { data: order } = await admin
      .from('orders')
      .select('id, total, status')
      .eq('id', payment.order_id)
      .maybeSingle()

    if (!order || !amountsMatch(Number(order.total), mpAmount)) {
      await admin.from('payment_events').insert({
        payment_id: payment.id,
        provider: 'mercadopago',
        provider_event_id: providerEventId,
        event_type: eventType,
        action: 'amount_mismatch',
        payload: { mpAmount, orderTotal: order?.total, providerStatus },
        processed: true,
        processed_at: new Date().toISOString(),
        error: 'amount_mismatch',
      })
      return json(200, { ok: true, ignored: true, reason: 'amount_mismatch' })
    }

    const internal = mapMpProviderStatusToInternal(providerStatus)

    await admin
      .from('payments')
      .update({
        provider_status: providerStatus,
        ...(internal === 'pending' ? {} : { status: internal === 'approved' ? payment.status : internal }),
      })
      .eq('id', payment.id)

    // rejected/cancelled/expired: atualiza status interno sem cancelar pedido
    if (internal === 'rejected' || internal === 'cancelled' || internal === 'expired') {
      await admin
        .from('payments')
        .update({
          status: internal,
          provider_status: providerStatus,
          ...(internal === 'cancelled' ? { cancelled_at: new Date().toISOString() } : {}),
        })
        .eq('id', payment.id)
    }

    let approveResult: unknown = null
    if (internal === 'approved' && payment.status === 'pending') {
      const { data, error } = await admin.rpc('confirm_mercadopago_payment', {
        p_payment_id: payment.id,
      })
      if (error) {
        await admin.from('payment_events').insert({
          payment_id: payment.id,
          provider: 'mercadopago',
          provider_event_id: providerEventId,
          event_type: eventType,
          action: 'approve_failed',
          payload: { providerStatus, error: error.message },
          processed: false,
          error: error.message,
        })
        return json(500, { error: 'approve_failed', detail: error.message })
      }
      approveResult = data
      await admin
        .from('payments')
        .update({ provider_status: providerStatus })
        .eq('id', payment.id)
    }

    if (!existingEvent) {
      await admin.from('payment_events').insert({
        payment_id: payment.id,
        provider: 'mercadopago',
        provider_event_id: providerEventId,
        event_type: eventType,
        action: internal === 'approved' ? 'approved' : internal,
        payload: { dataId, providerStatus, mpAmount },
        processed: true,
        processed_at: new Date().toISOString(),
      })
    } else {
      await admin
        .from('payment_events')
        .update({
          payment_id: payment.id,
          processed: true,
          processed_at: new Date().toISOString(),
          action: internal === 'approved' ? 'approved' : internal,
          error: null,
        })
        .eq('id', existingEvent.id)
    }

    return json(200, {
      ok: true,
      paymentId: payment.id,
      internalStatus: internal,
      providerStatus,
      approve: approveResult,
    })
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : 'internal_error' })
  }
})
