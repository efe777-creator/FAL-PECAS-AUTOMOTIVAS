/**
 * Fluxo create cobrança Asaas in-process (create-fal-payment / create-asaas-payment).
 * Timeout → inconclusive + reconcile por externalReference antes de novo POST.
 */
import {
  asaasApiRequest,
  asaasBillingTypeForMethod,
  asaasDueDateDaysFromNow,
  isAsaasInconclusive,
} from './asaasApiCore.ts'
import {
  clientRemoteIp,
  isPaymentExpired,
  pixDateOfExpiration,
  type AsaasRoutableMethod,
} from './asaasCreatePaymentCore.ts'
import {
  assertInstallmentsAllowed,
  buildAsaasPaymentCreateBody,
} from './asaasInstallmentsCore.ts'
import { moneyToAmountCents } from './paymentRouterCore.ts'
import {
  decidePaymentRouteForStore,
  loadPaymentRoutingConfig,
  paymentRouteBlocked,
} from './paymentRoutingConfigCore.ts'
import {
  asaasListPaymentsPath,
  isCreatingLockActive,
  pickReconcileCandidate,
  withChargePhase,
  type AsaasRemotePayment,
} from './asaasReconcileCore.ts'

/** Cliente service-role Supabase (Edge). */
// deno-lint-ignore no-explicit-any
type AdminClient = any

type AsaasCustomer = { id: string; cpfCnpj?: string }
type AsaasPayment = {
  id: string
  status?: string
  bankSlipUrl?: string
  invoiceUrl?: string
  value?: number
  billingType?: string
  installmentCount?: number | null
}

type PaymentRow = {
  id: string
  provider_payment_id?: string | null
  status?: string
  amount?: number | null
  expires_at?: string | null
  method?: string | null
  pix_qr_code?: string | null
  pix_qr_code_base64?: string | null
  payment_url?: string | null
  provider_status?: string | null
  provider?: string | null
  metadata?: Record<string, unknown> | null
  installments?: number | null
}

export type AsaasCreateChargeInput = {
  admin: AdminClient
  apiKey: string
  asaasBase: string
  user: { id: string; email?: string | null }
  orderId: string
  method: AsaasRoutableMethod
  installments: number
  headers: Headers
}

export type AsaasCreateChargeOutcome = {
  httpStatus: number
  body: Record<string, unknown>
}

const PAYMENT_SELECT =
  'id, provider_payment_id, status, amount, expires_at, method, pix_qr_code, pix_qr_code_base64, payment_url, provider_status, provider, metadata, installments'

function isCardMethod(method: string | null | undefined): boolean {
  return method === 'credit_card' || method === 'debit_card'
}

async function fetchAsaasPixQr(
  apiKey: string,
  base: string,
  asaasPaymentId: string,
): Promise<{ pixQrCode: string | null; pixQrCodeBase64: string | null; expiresAt: string | null }> {
  const qr = await asaasApiRequest<{
    payload?: string
    encodedImage?: string
    expirationDate?: string
  }>(apiKey, base, `/payments/${asaasPaymentId}/pixQrCode`, { method: 'GET' })
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
  if (isAsaasInconclusive(found)) {
    throw new Error('asaas_customer_lookup_timeout')
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
    if (isAsaasInconclusive(created)) throw new Error('asaas_customer_create_timeout')
    throw new Error('asaas_customer_create_failed')
  }
  return created.data.id
}

async function reconcileByExternalReference(
  apiKey: string,
  base: string,
  orderId: string,
  amount: number,
  billingType: string,
  installments: number,
): Promise<AsaasRemotePayment | null> {
  const listed = await asaasApiRequest<{ data?: AsaasRemotePayment[] }>(
    apiKey,
    base,
    asaasListPaymentsPath(orderId),
    { method: 'GET' },
  )
  if (!listed.ok) return null
  return pickReconcileCandidate(listed.data.data, {
    amount,
    billingType,
    installments: billingType === 'CREDIT_CARD' ? installments : 1,
  })
}

function paymentUrlForBilling(
  billingType: string,
  pay: { invoiceUrl?: string | null; bankSlipUrl?: string | null },
): string | null {
  if (billingType === 'CREDIT_CARD') return pay.invoiceUrl ?? null
  if (billingType === 'BOLETO') return pay.bankSlipUrl ?? pay.invoiceUrl ?? null
  return pay.invoiceUrl ?? null
}

async function attachRemotePayment(
  admin: AdminClient,
  paymentId: string,
  remote: AsaasRemotePayment,
  opts: {
    apiKey: string
    asaasBase: string
    routableMethod: AsaasRoutableMethod
    billingType: string
    route: unknown
    installments: number
    amount: number
    orderId: string
    reused: boolean
    reconciled: boolean
  },
): Promise<AsaasCreateChargeOutcome> {
  let pixQrCode: string | null = null
  let pixQrCodeBase64: string | null = null
  let expiresAt: string | null = null
  const paymentUrl = paymentUrlForBilling(opts.billingType, remote)

  if (opts.billingType === 'PIX' && remote.id) {
    const hydrated = await fetchAsaasPixQr(opts.apiKey, opts.asaasBase, remote.id)
    pixQrCode = hydrated.pixQrCode
    pixQrCodeBase64 = hydrated.pixQrCodeBase64
    expiresAt = hydrated.expiresAt
  }

  const meta = withChargePhase(
    {
      routing: opts.route,
      asaas_payment: { id: remote.id, status: remote.status },
      installments: opts.routableMethod === 'pix' ? undefined : opts.installments,
      reconciled: opts.reconciled,
    },
    'gateway',
  )

  const { error: attachErr } = await admin
    .from('payments')
    .update({
      provider_payment_id: remote.id,
      provider_status: remote.status ?? 'PENDING',
      pix_qr_code: pixQrCode,
      pix_qr_code_base64: pixQrCodeBase64,
      payment_url: paymentUrl,
      expires_at: expiresAt,
      method: opts.routableMethod,
      metadata: meta,
      updated_at: new Date().toISOString(),
    })
    .eq('id', paymentId)
    .eq('status', 'pending')

  if (attachErr) {
    return {
      httpStatus: 409,
      body: {
        error: 'payment_attach_failed',
        detail: attachErr.message,
        paymentId,
        providerPaymentId: remote.id,
      },
    }
  }

  const providerStatus = String(remote.status ?? 'PENDING').toLowerCase()
  return {
    httpStatus: opts.reused ? 200 : 201,
    body: {
      paymentId,
      provider: 'asaas',
      providerPaymentId: remote.id,
      status:
        providerStatus === 'received' || providerStatus === 'confirmed' ? 'approved' : 'pending',
      providerStatus: remote.status ?? 'PENDING',
      orderId: opts.orderId,
      amount: opts.amount,
      method: opts.routableMethod,
      pixQrCode,
      pixQrCodeBase64,
      paymentUrl,
      expiresAt,
      reused: opts.reused,
      reconciled: opts.reconciled,
      orderApproved: false,
      routedProvider: 'asaas',
    },
  }
}

export async function runAsaasCreateChargeFlow(
  input: AsaasCreateChargeInput,
): Promise<AsaasCreateChargeOutcome> {
  const { admin, apiKey, asaasBase, user, orderId, method: routableMethod, installments, headers } =
    input

  const { data: customer, error: custErr } = await admin
    .from('customers')
    .select('id, cpf, cnpj')
    .eq('profile_id', user.id)
    .maybeSingle()
  if (custErr || !customer) {
    return { httpStatus: 404, body: { error: 'customer_not_found' } }
  }

  const { data: order, error: orderErr } = await admin
    .from('orders')
    .select('id, status, total, customer_id')
    .eq('id', orderId)
    .eq('customer_id', customer.id)
    .maybeSingle()
  if (orderErr || !order) {
    return { httpStatus: 404, body: { error: 'order_not_found' } }
  }
  if (order.status !== 'aguardando_pagamento') {
    return {
      httpStatus: 409,
      body: { error: 'order_not_awaiting_payment', status: order.status },
    }
  }

  const amount = Number(order.total)
  if (!(amount > 0)) {
    return { httpStatus: 422, body: { error: 'invalid_order_total' } }
  }

  const amountCents = moneyToAmountCents(amount)
  const routing = await loadPaymentRoutingConfig(admin)
  const route = decidePaymentRouteForStore(routableMethod, amountCents, routing)
  const blocked = paymentRouteBlocked(route.provider, routing)
  if (blocked) {
    return {
      httpStatus: 503,
      body: { error: blocked, detail: 'Provedor desativado em payment_routing_config.' },
    }
  }
  if (route.provider !== 'asaas') {
    return {
      httpStatus: 409,
      body: {
        error: 'payment_route_mismatch',
        routedProvider: 'mercadopago',
        detail: 'Esta cobrança deve ser criada via Mercado Pago.',
      },
    }
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
      return {
        httpStatus: 422,
        body: { error: 'method_not_allowed', detail: 'pix desativado comercialmente' },
      }
    }
  } else if (routableMethod === 'boleto') {
    // Boleto: sem assert de parcelas; disponibilidade comercial futura.
  } else {
    const installmentErr = assertInstallmentsAllowed(
      routableMethod,
      installments,
      amount,
      displayRow,
    )
    if (installmentErr) {
      return {
        httpStatus: 422,
        body: { error: 'installments_not_allowed', detail: installmentErr },
      }
    }
  }

  const doc = customer.cpf
    ? String(customer.cpf).replace(/\D/g, '')
    : customer.cnpj
      ? String(customer.cnpj).replace(/\D/g, '')
      : ''
  if (!doc) {
    return { httpStatus: 422, body: { error: 'payer_document_required' } }
  }
  const email = user.email ?? ''
  if (!email) {
    return { httpStatus: 422, body: { error: 'payer_email_required' } }
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()

  let asaasCustomerId: string
  try {
    asaasCustomerId = await ensureAsaasCustomer(apiKey, asaasBase, {
      customerId: customer.id,
      email,
      name: profile?.full_name ?? 'Cliente FAL',
      cpfCnpj: doc,
      existingAsaasId: null,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'asaas_customer_failed'
    if (msg.includes('timeout')) {
      return {
        httpStatus: 504,
        body: {
          error: 'payment_inconclusive',
          detail: 'Timeout ao preparar cliente no provedor. Não tente criar de novo agora.',
          stage: 'customer',
        },
      }
    }
    return { httpStatus: 502, body: { error: msg } }
  }

  const billingType = asaasBillingTypeForMethod(routableMethod)
  const cardInstallments = routableMethod === 'debit_card' ? 1 : installments
  const nextInstallments = routableMethod === 'debit_card' ? 1 : installments

  const { data: existingAsaas } = await admin
    .from('payments')
    .select(PAYMENT_SELECT)
    .eq('order_id', orderId)
    .eq('provider', 'asaas')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let existing: PaymentRow | null = existingAsaas as PaymentRow | null
  if (!existing) {
    const { data: stub } = await admin
      .from('payments')
      .select(PAYMENT_SELECT)
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
          metadata: withChargePhase(
            {
              routing: route,
              asaas_billing_type: billingType,
              claimed_from: stub.provider,
            },
            'stub',
          ),
        })
        .eq('id', stub.id)
        .eq('status', 'pending')
      existing = { ...stub, provider: 'asaas', method: routableMethod } as PaymentRow
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
    const sameMethod = existingMethod === routableMethod
    const sameAmount = Number(existing.amount ?? 0) === amount
    const metaInst = (existing.metadata as { installments?: unknown } | null)?.installments
    const prevInstallments = Math.max(
      1,
      Math.floor(Number(metaInst ?? existing.installments) || 1),
    )
    const installmentsChanged =
      isCardMethod(routableMethod) && prevInstallments !== nextInstallments
    if (!sameMethod || !sameAmount || installmentsChanged) {
      // Libera UNIQUE (provider, provider_payment_id) para o próximo pending
      // poder reattach/reconcile a mesma cobrança Asaas após method_switch.
      const prevProviderPaymentId = existing.provider_payment_id
      const prevPaymentUrl = existing.payment_url ?? null
      await admin
        .from('payments')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          provider_payment_id: null,
          payment_url: null,
          metadata: {
            ...(existing.metadata && typeof existing.metadata === 'object'
              ? existing.metadata
              : {}),
            cancelled_reason: !sameMethod
              ? 'method_switch'
              : !sameAmount
                ? 'amount_changed'
                : 'installments_changed',
            from_method: existingMethod,
            to_method: routableMethod,
            from_amount: existing.amount,
            to_amount: amount,
            from_installments: prevInstallments,
            to_installments: nextInstallments,
            previous_provider_payment_id: prevProviderPaymentId,
            previous_payment_url: prevPaymentUrl,
          },
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
      const hydrated = await fetchAsaasPixQr(
        apiKey,
        asaasBase,
        String(existing.provider_payment_id),
      )
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
    return {
      httpStatus: 200,
      body: {
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
      },
    }
  }

  // Sem provider_payment_id: reconcile obrigatório se inconclusive OU antes de qualquer POST.
  if (existing?.id) {
    if (isCreatingLockActive(existing.metadata)) {
      return {
        httpStatus: 409,
        body: {
          error: 'payment_creating_in_progress',
          detail: 'Pagamento em andamento no provedor. Aguarde alguns segundos.',
          paymentId: existing.id,
        },
      }
    }

    const remote = await reconcileByExternalReference(
      apiKey,
      asaasBase,
      orderId,
      amount,
      billingType,
      cardInstallments,
    )
    if (remote?.id) {
      return attachRemotePayment(admin, existing.id, remote, {
        apiKey,
        asaasBase,
        routableMethod,
        billingType,
        route,
        installments: nextInstallments,
        amount,
        orderId,
        reused: true,
        reconciled: true,
      })
    }
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
        metadata: withChargePhase(
          {
            routing: route,
            asaas_billing_type: billingType,
            installments: routableMethod === 'pix' ? undefined : installments,
          },
          'stub',
        ),
      })
      .select('id')
      .single()
    if (insErr || !inserted) {
      return {
        httpStatus: 500,
        body: { error: 'payment_insert_failed', detail: insErr?.message },
      }
    }
    paymentId = inserted.id

    // Race: outro worker pode ter criado no Asaas — reconcile antes do POST.
    const remoteRace = await reconcileByExternalReference(
      apiKey,
      asaasBase,
      orderId,
      amount,
      billingType,
      cardInstallments,
    )
    if (remoteRace?.id) {
      return attachRemotePayment(admin, paymentId, remoteRace, {
        apiKey,
        asaasBase,
        routableMethod,
        billingType,
        route,
        installments: nextInstallments,
        amount,
        orderId,
        reused: true,
        reconciled: true,
      })
    }
  }

  const dueDays = billingType === 'BOLETO' ? 7 : billingType === 'CREDIT_CARD' ? 5 : 3
  const asaasPayload = buildAsaasPaymentCreateBody({
    customer: asaasCustomerId,
    billingType,
    amount,
    dueDate: asaasDueDateDaysFromNow(dueDays),
    description: `Pedido FAL ${orderId}`,
    externalReference: orderId,
    remoteIp: clientRemoteIp(headers),
    installments: billingType === 'CREDIT_CARD' ? cardInstallments : 1,
  })

  await admin
    .from('payments')
    .update({
      metadata: withChargePhase(
        {
          routing: route,
          asaas_billing_type: billingType,
          installments: routableMethod === 'pix' ? undefined : installments,
        },
        'creating',
      ),
      updated_at: new Date().toISOString(),
    })
    .eq('id', paymentId)
    .eq('status', 'pending')

  const createPay = await asaasApiRequest<AsaasPayment>(apiKey, asaasBase, '/payments', {
    method: 'POST',
    body: JSON.stringify(asaasPayload),
  })

  if (!createPay.ok) {
    if (isAsaasInconclusive(createPay)) {
      await admin
        .from('payments')
        .update({
          metadata: withChargePhase(
            {
              routing: route,
              asaas_error: createPay.body,
              asaas_billing_type: billingType,
              installments: routableMethod === 'pix' ? undefined : installments,
            },
            'inconclusive',
          ),
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentId)

      const recovered = await reconcileByExternalReference(
        apiKey,
        asaasBase,
        orderId,
        amount,
        billingType,
        cardInstallments,
      )
      if (recovered?.id) {
        return attachRemotePayment(admin, paymentId, recovered, {
          apiKey,
          asaasBase,
          routableMethod,
          billingType,
          route,
          installments: nextInstallments,
          amount,
          orderId,
          reused: false,
          reconciled: true,
        })
      }

      return {
        httpStatus: 504,
        body: {
          error: 'payment_inconclusive',
          detail:
            'Pagamento em verificação no provedor. Não tente criar de novo — use “Já paguei” ou aguarde.',
          paymentId,
          stage: 'create',
        },
      }
    }

    await admin
      .from('payments')
      .update({
        status: 'rejected',
        provider_status: 'error',
        metadata: withChargePhase(
          {
            asaas_error: createPay.body,
            routing: route,
          },
          'stub',
        ),
      })
      .eq('id', paymentId)
    return {
      httpStatus: 502,
      body: { error: 'asaas_create_failed', detail: createPay.body },
    }
  }

  return attachRemotePayment(admin, paymentId, createPay.data, {
    apiKey,
    asaasBase,
    routableMethod,
    billingType,
    route,
    installments: nextInstallments,
    amount,
    orderId,
    reused: false,
    reconciled: false,
  })
}
