// F9-C/E — mercado-pago-webhook
// Assinatura + freshness; ledger idempotente; fora de ordem; sanitize; approve via RPC.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import {
  amountsMatch,
  decideWebhookTransition,
  extractWebhookDataId,
  extractWebhookEventType,
  mapMpProviderStatusToInternal,
  sanitizeWebhookPayload,
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
    const safeBody = sanitizeWebhookPayload(body)

    // Claim idempotente do evento (concurrency: unique provider+event)
    const { data: existingEvent } = await admin
      .from('payment_events')
      .select('id, processed, payment_id')
      .eq('provider', 'mercadopago')
      .eq('provider_event_id', providerEventId)
      .maybeSingle()

    if (existingEvent?.processed) {
      return json(200, { ok: true, reused: true, paymentId: existingEvent.payment_id })
    }

    if (!existingEvent) {
      const { error: insEvErr } = await admin.from('payment_events').insert({
        payment_id: null,
        provider: 'mercadopago',
        provider_event_id: providerEventId,
        event_type: eventType,
        action: 'received',
        payload: safeBody,
        processed: false,
      })
      // Unique race: outro worker já inseriu → re-lê e no-op se processed
      if (insEvErr) {
        const { data: raced } = await admin
          .from('payment_events')
          .select('id, processed, payment_id')
          .eq('provider', 'mercadopago')
          .eq('provider_event_id', providerEventId)
          .maybeSingle()
        if (raced?.processed) {
          return json(200, { ok: true, reused: true, paymentId: raced.payment_id })
        }
      }
    }

    const mpRes = await fetch(`${MP_API}/${dataId}`, {
      headers: { Authorization: `Bearer ${mpToken}`, 'Content-Type': 'application/json' },
    })
    const mpJson = (await mpRes.json().catch(() => ({}))) as Record<string, unknown>
    if (!mpRes.ok) {
      console.error('mp_fetch_failed', { status: mpRes.status, dataId })
      return json(502, { error: 'mp_fetch_failed', status: mpRes.status })
    }

    const providerPaymentId = String(mpJson.id ?? dataId)
    const providerStatus = String(mpJson.status ?? '')
    const mpAmount = Number(mpJson.transaction_amount)
    const externalRef = mpJson.external_reference != null ? String(mpJson.external_reference) : null
    const safeMp = sanitizeWebhookPayload({
      id: providerPaymentId,
      status: providerStatus,
      transaction_amount: mpAmount,
      external_reference: externalRef,
    })

    let { data: payment } = await admin
      .from('payments')
      .select('id, order_id, status, amount, provider, provider_payment_id')
      .eq('provider', 'mercadopago')
      .eq('provider_payment_id', providerPaymentId)
      .maybeSingle()

    // Fallback: payment ainda sem provider_payment_id (race create vs webhook)
    if (!payment && externalRef) {
      const { data: byOrder } = await admin
        .from('payments')
        .select('id, order_id, status, amount, provider, provider_payment_id')
        .eq('provider', 'mercadopago')
        .eq('order_id', externalRef)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (byOrder) {
        payment = byOrder
        await admin
          .from('payments')
          .update({ provider_payment_id: providerPaymentId, provider_status: providerStatus })
          .eq('id', byOrder.id)
          .is('provider_payment_id', null)
      }
    }

    if (!payment) {
      await admin
        .from('payment_events')
        .update({
          action: 'payment_not_found',
          payload: safeMp,
          processed: true,
          processed_at: new Date().toISOString(),
          error: 'payment_not_found',
        })
        .eq('provider', 'mercadopago')
        .eq('provider_event_id', providerEventId)
      return json(200, { ok: true, ignored: true, reason: 'payment_not_found' })
    }

    const { data: order } = await admin
      .from('orders')
      .select('id, total, status')
      .eq('id', payment.order_id)
      .maybeSingle()

    if (!order || !amountsMatch(Number(order.total), mpAmount)) {
      await admin
        .from('payment_events')
        .update({
          payment_id: payment.id,
          action: 'amount_mismatch',
          payload: { mpAmount, orderTotal: order?.total, providerStatus },
          processed: true,
          processed_at: new Date().toISOString(),
          error: 'amount_mismatch',
        })
        .eq('provider', 'mercadopago')
        .eq('provider_event_id', providerEventId)
      return json(200, { ok: true, ignored: true, reason: 'amount_mismatch' })
    }

    // Re-lê status (concurrency)
    const { data: fresh } = await admin
      .from('payments')
      .select('id, status')
      .eq('id', payment.id)
      .maybeSingle()
    const currentStatus = fresh?.status ?? payment.status
    const incoming = mapMpProviderStatusToInternal(providerStatus)
    const transition = decideWebhookTransition({
      currentPaymentStatus: currentStatus,
      incomingInternal: incoming,
    })

    let approveResult: unknown = null

    if (transition.action === 'noop') {
      await admin
        .from('payments')
        .update({ provider_status: providerStatus })
        .eq('id', payment.id)
      await admin
        .from('payment_events')
        .update({
          payment_id: payment.id,
          action: transition.reason,
          payload: safeMp,
          processed: true,
          processed_at: new Date().toISOString(),
        })
        .eq('provider', 'mercadopago')
        .eq('provider_event_id', providerEventId)
      return json(200, {
        ok: true,
        noop: true,
        reason: transition.reason,
        paymentId: payment.id,
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
    }

    if (transition.action === 'approve') {
      const { data, error } = await admin.rpc('confirm_mercadopago_payment', {
        p_payment_id: payment.id,
      })
      if (error) {
        console.error('approve_failed', { paymentId: payment.id, msg: error.message })
        await admin
          .from('payment_events')
          .update({
            payment_id: payment.id,
            action: 'approve_failed',
            payload: { providerStatus, error: error.message },
            processed: false,
            error: error.message,
          })
          .eq('provider', 'mercadopago')
          .eq('provider_event_id', providerEventId)
        return json(500, { error: 'approve_failed' })
      }
      approveResult = data
      await admin
        .from('payments')
        .update({ provider_status: providerStatus })
        .eq('id', payment.id)

      // D12: prepare logístico ME (snapshot only) — NÃO compra/gera/imprime etiqueta
      try {
        const orderId =
          data && typeof data === 'object' && 'order_id' in (data as object)
            ? String((data as { order_id?: string }).order_id ?? payment.order_id)
            : String(payment.order_id)
        const { data: shipRows } = await admin
          .from('shipments')
          .select('id, provider, amount, metadata')
          .eq('order_id', orderId)
          .limit(1)
        const ship = Array.isArray(shipRows) ? shipRows[0] : null
        if (ship && (ship.provider === 'melhorenvio' || String(ship.provider).includes('melhor'))) {
          const meta = (ship.metadata ?? {}) as Record<string, unknown>
          const prevMe =
            meta.me && typeof meta.me === 'object' ? (meta.me as Record<string, unknown>) : {}
          const labelState = String(prevMe.label_state ?? '')
          if (!['purchased', 'generated', 'printed', 'cart'].includes(labelState)) {
            const nextMe = {
              ...prevMe,
              label_state: 'prepared',
              quoted_amount: prevMe.quoted_amount ?? ship.amount,
              label_amount: prevMe.label_amount ?? ship.amount,
              last_error: null,
            }
            await admin
              .from('shipments')
              .update({
                metadata: { ...meta, me: nextMe },
                provider: 'melhorenvio',
              })
              .eq('id', ship.id)
          }
        }
      } catch (prepErr) {
        console.error(
          'me_prepare_on_approve_failed',
          prepErr instanceof Error ? prepErr.message : 'unknown',
        )
      }
    }

    await admin
      .from('payment_events')
      .update({
        payment_id: payment.id,
        action: transition.action === 'approve' ? 'approved' : incoming,
        payload: safeMp,
        processed: true,
        processed_at: new Date().toISOString(),
        error: null,
      })
      .eq('provider', 'mercadopago')
      .eq('provider_event_id', providerEventId)

    return json(200, {
      ok: true,
      paymentId: payment.id,
      internalStatus: incoming,
      providerStatus,
      transition: transition.action,
      approve: approveResult,
    })
  } catch (e) {
    console.error('webhook_internal_error', e instanceof Error ? e.message : 'unknown')
    return json(500, { error: 'internal_error' })
  }
})
