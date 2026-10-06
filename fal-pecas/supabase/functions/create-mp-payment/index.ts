// F9-B — create-mp-payment
// Amount = orders.total. Method = pix (server). Não aprova pedido.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import {
  buildIdempotencyKey,
  buildMpPaymentBody,
  mapMpResponseToPaymentFields,
  parseCreateMpPaymentClientBody,
  serverPaymentMethod,
} from '../_shared/mpCreatePaymentCore.ts'

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
    if (!mpToken) return json(503, { error: 'MP_ACCESS_TOKEN missing' })

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

    const admin = createClient(supabaseUrl, serviceKey)

    let rawBody: unknown
    try {
      rawBody = await req.json()
    } catch {
      return json(400, { error: 'invalid_json' })
    }

    const { orderId } = parseCreateMpPaymentClientBody(
      (rawBody ?? {}) as Record<string, unknown>,
    )
    const method = serverPaymentMethod()

    const { data: customer, error: custErr } = await admin
      .from('customers')
      .select('id')
      .eq('profile_id', user.id)
      .maybeSingle()
    if (custErr || !customer) return json(404, { error: 'customer_not_found' })

    const { data: order, error: orderErr } = await admin
      .from('orders')
      .select('id, status, total, customer_id')
      .eq('id', orderId)
      .eq('customer_id', customer.id)
      .maybeSingle()
    if (orderErr || !order) return json(404, { error: 'order_not_found' })
    if (order.status !== 'aguardando_pagamento') {
      return json(409, { error: 'order_not_awaiting_payment', status: order.status })
    }

    const amount = Number(order.total)
    if (!(amount > 0)) return json(422, { error: 'invalid_order_total' })

    let paymentId: string
    const { data: existing } = await admin
      .from('payments')
      .select('id, provider_payment_id, status, amount')
      .eq('order_id', orderId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing?.provider_payment_id) {
      const { data: full } = await admin
        .from('payments')
        .select(
          'id, provider_payment_id, status, amount, method, pix_qr_code, pix_qr_code_base64, payment_url, expires_at, provider_status',
        )
        .eq('id', existing.id)
        .maybeSingle()
      return json(200, {
        paymentId: existing.id,
        providerPaymentId: existing.provider_payment_id,
        status: 'pending',
        orderId,
        amount: full?.amount != null ? Number(full.amount) : undefined,
        method: full?.method ?? undefined,
        pixQrCode: full?.pix_qr_code ?? null,
        pixQrCodeBase64: full?.pix_qr_code_base64 ?? null,
        paymentUrl: full?.payment_url ?? null,
        expiresAt: full?.expires_at ?? null,
        providerStatus: full?.provider_status ?? undefined,
        reused: true,
        orderApproved: false,
      })
    }

    if (existing?.id) {
      paymentId = existing.id
      await admin
        .from('payments')
        .update({ provider: 'mercadopago', amount, method, currency: 'BRL' })
        .eq('id', paymentId)
    } else {
      const { data: inserted, error: insErr } = await admin
        .from('payments')
        .insert({
          order_id: orderId,
          provider: 'mercadopago',
          status: 'pending',
          amount,
          method,
          currency: 'BRL',
          external_ref: orderId,
        })
        .select('id')
        .single()
      if (insErr || !inserted) {
        return json(500, { error: 'payment_insert_failed', detail: insErr?.message })
      }
      paymentId = inserted.id
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle()

    const email = user.email ?? ''
    if (!email) return json(422, { error: 'payer_email_required' })

    const mpBody = buildMpPaymentBody({
      transactionAmount: amount,
      description: `Pedido FAL ${orderId}`,
      paymentMethodId: method,
      externalReference: orderId,
      payer: {
        email,
        firstName: profile?.full_name?.split(/\s+/)[0],
        lastName: profile?.full_name?.split(/\s+/).slice(1).join(' ') || undefined,
      },
    })

    const idempotencyKey = buildIdempotencyKey(paymentId)
    const mpRes = await fetch(MP_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mpToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(mpBody),
    })

    const mpJson = (await mpRes.json().catch(() => ({}))) as Record<string, unknown>
    if (!mpRes.ok) {
      await admin
        .from('payments')
        .update({
          metadata: { mp_error: mpJson, http_status: mpRes.status },
          provider_status: typeof mpJson.status === 'string' ? mpJson.status : 'error',
        })
        .eq('id', paymentId)
      return json(502, {
        error: 'mercadopago_create_failed',
        httpStatus: mpRes.status,
        orderApproved: false,
      })
    }

    const fields = mapMpResponseToPaymentFields(mpJson)
    const { error: updErr } = await admin
      .from('payments')
      .update({
        provider: 'mercadopago',
        provider_payment_id: fields.provider_payment_id,
        provider_status: fields.provider_status,
        method: fields.method ?? method,
        pix_qr_code: fields.pix_qr_code,
        pix_qr_code_base64: fields.pix_qr_code_base64,
        payment_url: fields.payment_url,
        expires_at: fields.expires_at,
        status: 'pending',
        external_ref: orderId,
        metadata: {
          mp_create: { id: fields.provider_payment_id, status: fields.provider_status },
        },
      })
      .eq('id', paymentId)

    if (updErr) {
      return json(500, { error: 'payment_update_failed', detail: updErr.message })
    }

    return json(201, {
      paymentId,
      providerPaymentId: fields.provider_payment_id,
      status: 'pending',
      providerStatus: fields.provider_status,
      orderId,
      amount,
      method: fields.method ?? method,
      pixQrCode: fields.pix_qr_code,
      pixQrCodeBase64: fields.pix_qr_code_base64,
      paymentUrl: fields.payment_url,
      expiresAt: fields.expires_at,
      reused: false,
      orderApproved: false,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown_error'
    return json(400, { error: message })
  }
})
