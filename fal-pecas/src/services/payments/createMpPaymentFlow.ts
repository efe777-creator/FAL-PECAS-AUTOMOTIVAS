/**
 * Fluxo F9-B testável (deps injetáveis) — casos A–I do Prompt Mestre.
 * Não aprova pedido; não chama transition_order_status.
 */
import {
  buildIdempotencyKey,
  buildMpPaymentBody,
  mapMpResponseToPaymentFields,
  parseCreateMpPaymentClientBody,
  serverPaymentMethod,
} from '@/services/payments/mpCreatePaymentCore'

const MP_API = 'https://api.mercadopago.com/v1/payments'

export interface CreateMpFlowDeps {
  mpAccessToken: string | undefined
  authUser: { id: string; email?: string | null } | null
  findCustomerId: (profileId: string) => Promise<string | null>
  findOrder: (
    orderId: string,
    customerId: string,
  ) => Promise<{ id: string; status: string; total: number } | null>
  findPendingPayment: (
    orderId: string,
  ) => Promise<{ id: string; provider_payment_id: string | null } | null>
  updatePayment: (id: string, patch: Record<string, unknown>) => Promise<void>
  insertPayment: (row: Record<string, unknown>) => Promise<string>
  findProfileName: (userId: string) => Promise<string | null>
  fetchMp: (url: string, init: RequestInit) => Promise<{
    ok: boolean
    status: number
    json: () => Promise<unknown>
  }>
}

export async function executeCreateMpPayment(
  rawBody: unknown,
  deps: CreateMpFlowDeps,
): Promise<{ httpStatus: number; body: Record<string, unknown> }> {
  if (!deps.mpAccessToken) {
    return { httpStatus: 503, body: { error: 'MP_ACCESS_TOKEN missing' } }
  }
  if (!deps.authUser) {
    return { httpStatus: 401, body: { error: 'unauthorized' } }
  }

  let orderId: string
  try {
    ;({ orderId } = parseCreateMpPaymentClientBody(
      (rawBody ?? {}) as Record<string, unknown>,
    ))
  } catch (e) {
    return {
      httpStatus: 400,
      body: { error: e instanceof Error ? e.message : 'invalid_body' },
    }
  }

  const method = serverPaymentMethod()
  const customerId = await deps.findCustomerId(deps.authUser.id)
  if (!customerId) return { httpStatus: 404, body: { error: 'customer_not_found' } }

  const order = await deps.findOrder(orderId, customerId)
  if (!order) return { httpStatus: 404, body: { error: 'order_not_found' } }
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

  const existing = await deps.findPendingPayment(orderId)
  if (existing?.provider_payment_id) {
    return {
      httpStatus: 200,
      body: {
        paymentId: existing.id,
        providerPaymentId: existing.provider_payment_id,
        status: 'pending',
        reused: true,
        orderApproved: false,
      },
    }
  }

  let paymentId: string
  if (existing?.id) {
    paymentId = existing.id
    await deps.updatePayment(paymentId, {
      provider: 'mercadopago',
      amount,
      method,
      currency: 'BRL',
    })
  } else {
    paymentId = await deps.insertPayment({
      order_id: orderId,
      provider: 'mercadopago',
      status: 'pending',
      amount,
      method,
      currency: 'BRL',
      external_ref: orderId,
    })
  }

  const email = deps.authUser.email ?? ''
  if (!email) return { httpStatus: 422, body: { error: 'payer_email_required' } }

  const fullName = await deps.findProfileName(deps.authUser.id)
  const mpBody = buildMpPaymentBody({
    transactionAmount: amount,
    description: `Pedido FAL ${orderId}`,
    paymentMethodId: method,
    externalReference: orderId,
    payer: {
      email,
      firstName: fullName?.split(/\s+/)[0],
      lastName: fullName?.split(/\s+/).slice(1).join(' ') || undefined,
    },
  })

  const idempotencyKey = buildIdempotencyKey(paymentId)
  const mpRes = await deps.fetchMp(MP_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${deps.mpAccessToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(mpBody),
  })

  const mpJson = (await mpRes.json().catch(() => ({}))) as Record<string, unknown>
  if (!mpRes.ok) {
    await deps.updatePayment(paymentId, {
      metadata: { mp_error: mpJson, http_status: mpRes.status },
      provider_status: typeof mpJson.status === 'string' ? mpJson.status : 'error',
    })
    return {
      httpStatus: 502,
      body: {
        error: 'mercadopago_create_failed',
        httpStatus: mpRes.status,
        orderApproved: false,
      },
    }
  }

  const fields = mapMpResponseToPaymentFields(mpJson)
  await deps.updatePayment(paymentId, {
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

  return {
    httpStatus: 201,
    body: {
      paymentId,
      providerPaymentId: fields.provider_payment_id,
      status: 'pending',
      providerStatus: fields.provider_status,
      orderId,
      amount,
      method: fields.method ?? method,
      pixQrCode: fields.pix_qr_code,
      reused: false,
      orderApproved: false,
      idempotencyKey,
    },
  }
}
