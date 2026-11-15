// FAL PAY — cobrança Asaas (PIX / boleto / cartão conforme roteamento).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import {
  asaasApiBase,
  asaasApiRequest,
  asaasBillingTypeForMethod,
  asaasDueDateDaysFromNow,
} from '../_shared/asaasApiCore.ts'
import {
  parseAsaasCreateClientBody,
  clientRemoteIp,
  isPaymentExpired,
  pixDateOfExpiration,
} from '../_shared/asaasCreatePaymentCore.ts'
import { assertInstallmentsAllowed } from '../_shared/asaasInstallmentsCore.ts'
import { moneyToAmountCents } from '../_shared/paymentRouterCore.ts'
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

type AsaasCustomer = { id: string; cpfCnpj?: string }
type AsaasPayment = { id: string; status?: string; bankSlipUrl?: string; invoiceUrl?: string }
type AsaasPixQr = { payload?: string; encodedImage?: string; expirationDate?: string }

function isCardMethod(method: string | null | undefined): boolean {
  return method === 'credit_card' || method === 'debit_card'
}

async function fetchAsaasPixQr(
  apiKey: string,
  base: string,
  asaasPaymentId: string,
): Promise<{ pixQrCode: string | null; pixQrCodeBase64: string | null; expiresAt: string | null }> {
  const qr = await asaasApiRequest<AsaasPixQr>(apiKey, base, `/payments/${asaasPaymentId}/pixQrCode`, {
    method: 'GET',
  })
  if (!qr.ok) {
    return {
      pixQrCode: null,
      pixQrCodeBase64: null,
      expiresAt: pixDateOfExpiration(),
    }
  }
  return {
    pixQrCode: qr.data.payload ?? null,
    pixQrCodeBase64: qr.data.encodedImage ?? null,
    expiresAt: qr.data.expirationDate ?? pixDateOfExpiration(),
  }
}

async function ensureAsaasCustomer(
  apiKey: string,
  base: string,
  input: {
    customerId: string
    email: string
    name: string
    cpfCnpj: string
    existingAsaasId?: string | null
  },
): Promise<string> {
  if (input.existingAsaasId) return input.existingAsaasId
  const cpfCnpj = input.cpfCnpj.replace(/\D/g, '')
  const found = await asaasApiRequest<{ data?: AsaasCustomer[] }>(
    apiKey,
    base,
    `/customers?cpfCnpj=${encodeURIComponent(cpfCnpj)}&limit=1`,
    { method: 'GET' },
  )
  if (found.ok && found.data.data?.[0]?.id) {
    return found.data.data[0].id
  }
  const created = await asaasApiRequest<AsaasCustomer>(apiKey, base, '/customers', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name || 'Cliente FAL',
      email: input.email,
      cpfCnpj,
      externalReference: input.customerId,
    }),
  })
  if (!created.ok) {
    throw new Error('asaas_customer_create_failed')
  }
  return created.data.id
}

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

    const admin = createClient(supabaseUrl, serviceKey)
    const asaasBase = asaasApiBase(Deno.env.get('ASAAS_ENV'))

    let rawBody: unknown
    try {
      rawBody = await req.json()
    } catch {
      return json(400, { error: 'invalid_json' })
    }

    const { orderId, method: routableMethod, installments } = parseAsaasCreateClientBody(
      (rawBody ?? {}) as Record<string, unknown>,
    )

    const { data: customer, error: custErr } = await admin
      .from('customers')
      .select('id, cpf, cnpj, metadata')
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

    const amountCents = moneyToAmountCents(amount)
    const routing = await loadPaymentRoutingConfig(admin)
    const route = decidePaymentRouteForStore(routableMethod, amountCents, routing)
    const blocked = paymentRouteBlocked(route.provider, routing)
    if (blocked) {
      return json(503, { error: blocked, detail: 'Provedor desativado em payment_routing_config.' })
    }
    if (route.provider !== 'asaas') {
      return json(409, {
        error: 'payment_route_mismatch',
        routedProvider: 'mercadopago',
        detail: 'Esta cobrança deve ser criada via Mercado Pago.',
      })
    }

    const { data: displayRow } = await admin
      .from('store_payment_display')
      .select(
        'enabled, max_installments, min_installment_amount, installments_enabled, card_enabled, credit_enabled, debit_enabled, pix_enabled, interest_free_max, allow_interest_installments',
      )
      .limit(1)
      .maybeSingle()

    if (routableMethod === 'pix') {
      const pixEnabled = displayRow?.pix_enabled != null ? Boolean(displayRow.pix_enabled) : true
      if (!pixEnabled) {
        return json(422, { error: 'method_not_allowed', detail: 'pix desativado comercialmente' })
      }
    } else {
      const installmentErr = assertInstallmentsAllowed(
        routableMethod,
        installments,
        amount,
        displayRow,
      )
      if (installmentErr) {
        return json(422, { error: 'installments_not_allowed', detail: installmentErr })
      }
    }

    const meta = (customer.metadata ?? {}) as Record<string, unknown>
    const existingAsaasId =
      typeof meta.asaas_customer_id === 'string' ? meta.asaas_customer_id : null
    const doc = customer.cpf
      ? String(customer.cpf).replace(/\D/g, '')
      : customer.cnpj
        ? String(customer.cnpj).replace(/\D/g, '')
        : ''
    if (!doc) return json(422, { error: 'payer_document_required' })
    const email = user.email ?? ''
    if (!email) return json(422, { error: 'payer_email_required' })

    const { data: profile } = await admin
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle()

    const asaasCustomerId = await ensureAsaasCustomer(apiKey, asaasBase, {
      customerId: customer.id,
      email,
      name: profile?.full_name ?? 'Cliente FAL',
      cpfCnpj: doc,
      existingAsaasId,
    })

    if (!existingAsaasId) {
      await admin
        .from('customers')
        .update({
          metadata: { ...meta, asaas_customer_id: asaasCustomerId },
        })
        .eq('id', customer.id)
    }

    const { data: existingAsaas } = await admin
      .from('payments')
      .select(
        'id, provider_payment_id, status, amount, expires_at, method, pix_qr_code, pix_qr_code_base64, payment_url, provider_status, provider',
      )
      .eq('order_id', orderId)
      .eq('provider', 'asaas')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let existing = existingAsaas
    if (!existing) {
      const { data: stub } = await admin
        .from('payments')
        .select(
          'id, provider_payment_id, status, amount, expires_at, method, pix_qr_code, pix_qr_code_base64, payment_url, provider_status, provider',
        )
        .eq('order_id', orderId)
        .eq('status', 'pending')
        .is('provider_payment_id', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (stub?.id) {
        await admin
          .from('payments')
          .update({
            provider: 'asaas',
            method: routableMethod,
            metadata: {
              routing: route,
              asaas_billing_type: asaasBillingTypeForMethod(routableMethod),
              claimed_from: stub.provider,
            },
          })
          .eq('id', stub.id)
          .eq('status', 'pending')
        existing = { ...stub, provider: 'asaas', method: routableMethod }
      }
    }
    if (existing && isPaymentExpired(existing.expires_at as string | null)) {
      await admin
        .from('payments')
        .update({
          status: 'expired',
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .eq('status', 'pending')
      existing = null
    }

    if (existing?.provider_payment_id) {
      const existingMethod = String(existing.method ?? '')
      const sameMethod =
        existingMethod === routableMethod ||
        (isCardMethod(existingMethod) && isCardMethod(routableMethod))
      if (!sameMethod) {
        await admin
          .from('payments')
          .update({
            status: 'expired',
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .eq('status', 'pending')
        existing = null
      }
    }

    if (existing?.provider_payment_id) {
      let pixQrCode = existing.pix_qr_code ?? null
      let pixQrCodeBase64 = existing.pix_qr_code_base64 ?? null
      let expiresAt = (existing.expires_at as string | null) ?? null
      if (routableMethod === 'pix' && (!pixQrCode || !pixQrCodeBase64)) {
        const hydrated = await fetchAsaasPixQr(apiKey, asaasBase, String(existing.provider_payment_id))
        pixQrCode = hydrated.pixQrCode ?? pixQrCode
        pixQrCodeBase64 = hydrated.pixQrCodeBase64 ?? pixQrCodeBase64
        expiresAt = hydrated.expiresAt ?? expiresAt
        await admin
          .from('payments')
          .update({
            pix_qr_code: pixQrCode,
            pix_qr_code_base64: pixQrCodeBase64,
            expires_at: expiresAt,
          })
          .eq('id', existing.id)
      }
      return json(200, {
        paymentId: existing.id,
        provider: 'asaas',
        providerPaymentId: existing.provider_payment_id,
        status: 'pending',
        providerStatus: existing.provider_status ?? 'PENDING',
        orderId,
        amount: Number(existing.amount ?? amount),
        method: existing.method ?? routableMethod,
        pixQrCode,
        pixQrCodeBase64,
        paymentUrl: existing.payment_url ?? null,
        expiresAt,
        reused: true,
        orderApproved: false,
        routedProvider: 'asaas',
      })
    }

    let paymentId: string
    if (existing?.id) {
      paymentId = existing.id
    } else {
    const { data: inserted, error: insErr } = await admin
      .from('payments')
      .insert({
        order_id: orderId,
        provider: 'asaas',
        status: 'pending',
        amount,
        method: routableMethod,
        currency: 'BRL',
        external_ref: orderId,
        metadata: {
          routing: route,
          asaas_billing_type: asaasBillingTypeForMethod(routableMethod),
          installments: routableMethod === 'pix' ? undefined : installments,
        },
      })
      .select('id')
      .single()
    if (insErr || !inserted) {
      return json(500, { error: 'payment_insert_failed', detail: insErr?.message })
    }
    paymentId = inserted.id
    }

    const billingType = asaasBillingTypeForMethod(routableMethod)
    const dueDays = billingType === 'BOLETO' ? 7 : billingType === 'CREDIT_CARD' ? 5 : 3
    const asaasPayload: Record<string, unknown> = {
      customer: asaasCustomerId,
      billingType,
      value: amount,
      dueDate: asaasDueDateDaysFromNow(dueDays),
      description: `Pedido FAL ${orderId}`,
      externalReference: orderId,
      remoteIp: clientRemoteIp(req.headers),
    }
    if (billingType === 'CREDIT_CARD') {
      const count = routableMethod === 'debit_card' ? 1 : installments
      if (count > 1) asaasPayload.installmentCount = count
    }
    const createPay = await asaasApiRequest<AsaasPayment>(apiKey, asaasBase, '/payments', {
      method: 'POST',
      body: JSON.stringify(asaasPayload),
    })
    if (!createPay.ok) {
      await admin
        .from('payments')
        .update({
          status: 'rejected',
          provider_status: 'error',
          metadata: {
            asaas_error: createPay.body,
            routing: route,
          },
        })
        .eq('id', paymentId)
      return json(502, { error: 'asaas_create_failed', detail: createPay.body })
    }

    const asaasPay = createPay.data
    let pixQrCode: string | null = null
    let pixQrCodeBase64: string | null = null
    let expiresAt: string | null = null
    let paymentUrl: string | null = asaasPay.bankSlipUrl ?? asaasPay.invoiceUrl ?? null

    if (billingType === 'PIX') {
      const hydrated = await fetchAsaasPixQr(apiKey, asaasBase, asaasPay.id)
      pixQrCode = hydrated.pixQrCode
      pixQrCodeBase64 = hydrated.pixQrCodeBase64
      expiresAt = hydrated.expiresAt
    }

    const providerStatus = (asaasPay.status ?? 'PENDING').toLowerCase()
    await admin
      .from('payments')
      .update({
        provider_payment_id: asaasPay.id,
        provider_status: asaasPay.status ?? 'PENDING',
        pix_qr_code: pixQrCode,
        pix_qr_code_base64: pixQrCodeBase64,
        payment_url: paymentUrl,
        expires_at: expiresAt,
        metadata: {
          routing: route,
          asaas_payment: { id: asaasPay.id, status: asaasPay.status },
          installments: routableMethod === 'pix' ? undefined : installments,
        },
      })
      .eq('id', paymentId)

    return json(201, {
      paymentId,
      provider: 'asaas',
      providerPaymentId: asaasPay.id,
      status: providerStatus === 'received' || providerStatus === 'confirmed' ? 'approved' : 'pending',
      providerStatus: asaasPay.status ?? 'PENDING',
      orderId,
      amount,
      method: routableMethod,
      pixQrCode,
      pixQrCodeBase64,
      paymentUrl,
      expiresAt,
      reused: false,
      orderApproved: false,
      routedProvider: 'asaas',
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown_error'
    return json(400, { error: message })
  }
})