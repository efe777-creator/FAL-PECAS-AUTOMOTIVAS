/**
 * Fluxo create-mp-payment testável (deps injetáveis) — F9-B/C/D.
 * Pending/Pix async: webhook. Terminal síncrono do MP (cartão approved/rejected):
 * aplica a mesma decisão do webhook (confirm RPC / set_terminal).
 */
import {
  assertCardInstallmentsAllowed,
  type PaymentDisplaySettings,
} from '@/lib/paymentDisplay'
import {
  buildIdempotencyKey,
  buildMpPaymentBody,
  mapMpResponseToPaymentFields,
  parseCreateMpPaymentClientBody,
  resolveInternalMethod,
} from '@/services/payments/mpCreatePaymentCore'
import {
  decideWebhookTransition,
  mapMpProviderStatusToInternal,
} from '@/services/payments/mpWebhookCore'

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
  ) => Promise<{
    id: string
    provider_payment_id: string | null
    method?: string | null
    installments?: number | null
  } | null>
  updatePayment: (id: string, patch: Record<string, unknown>) => Promise<void>
  insertPayment: (row: Record<string, unknown>) => Promise<string>
  findProfileName: (userId: string) => Promise<string | null>
  /** RPC confirm_mercadopago_payment — só quando MP já devolve approved. */
  confirmPayment: (paymentId: string) => Promise<void>
  fetchMp: (url: string, init: RequestInit) => Promise<{
    ok: boolean
    status: number
    json: () => Promise<unknown>
  }>
  /** HOME-06b P0 — política de parcelas da loja (null = display off / ausente). */
  getPaymentDisplay?: () => Promise<PaymentDisplaySettings | null>
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
  let card: ReturnType<typeof parseCreateMpPaymentClientBody>['card']
  try {
    ;({ orderId, card } = parseCreateMpPaymentClientBody(
      (rawBody ?? {}) as Record<string, unknown>,
    ))
  } catch (e) {
    return {
      httpStatus: 400,
      body: { error: e instanceof Error ? e.message : 'invalid_body' },
    }
  }

  const internalMethod = resolveInternalMethod(card)
  const mpPaymentMethodId = card?.paymentMethodId ?? 'pix'

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

  {
    const display = deps.getPaymentDisplay ? await deps.getPaymentDisplay() : null
    if (card && display?.cardEnabled === false) {
      return {
        httpStatus: 422,
        body: { error: 'method_not_allowed', detail: 'cartão desativado comercialmente' },
      }
    }
    if (!card && display?.pixEnabled === false) {
      return {
        httpStatus: 422,
        body: { error: 'method_not_allowed', detail: 'pix desativado comercialmente' },
      }
    }
    if (card) {
      try {
        assertCardInstallmentsAllowed(card.installments, amount, display)
      } catch (e) {
        return {
          httpStatus: 422,
          body: {
            error: 'installments_not_allowed',
            detail: e instanceof Error ? e.message : 'installments inválido',
          },
        }
      }
    }
  }

  let existing = await deps.findPendingPayment(orderId)
  if (existing?.provider_payment_id) {
    const existingIsPix = (existing.method ?? 'pix') === 'pix'
    const wantsPix = !card
    const prevInstallments = Math.max(1, Math.floor(Number(existing.installments) || 1))
    const installmentsChanged =
      Boolean(card) && prevInstallments !== Math.max(1, Math.floor(Number(card?.installments) || 1))
    // Troca Pix ↔ cartão ou mudança de parcelas: não reutilizar cobrança MP antiga.
    if (existingIsPix !== wantsPix || installmentsChanged) {
      await deps.updatePayment(existing.id, {
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        metadata: {
          cancelled_reason: existingIsPix !== wantsPix ? 'method_switch' : 'installments_changed',
          from_method: existing.method ?? 'pix',
          to_method: internalMethod,
          from_installments: prevInstallments,
          to_installments: card?.installments ?? null,
        },
      })
      existing = null
    } else {
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
  }

  let paymentId: string
  if (existing?.id) {
    paymentId = existing.id
    await deps.updatePayment(paymentId, {
      provider: 'mercadopago',
      amount,
      method: internalMethod,
      currency: 'BRL',
      installments: card?.installments ?? null,
    })
  } else {
    paymentId = await deps.insertPayment({
      order_id: orderId,
      provider: 'mercadopago',
      status: 'pending',
      amount,
      method: internalMethod,
      currency: 'BRL',
      installments: card?.installments ?? null,
      external_ref: orderId,
    })
  }

  const email = deps.authUser.email ?? ''
  if (!email) return { httpStatus: 422, body: { error: 'payer_email_required' } }

  const fullName = await deps.findProfileName(deps.authUser.id)
  const mpBody = buildMpPaymentBody({
    transactionAmount: amount,
    description: `Pedido FAL ${orderId}`,
    paymentMethodId: mpPaymentMethodId,
    externalReference: orderId,
    payer: {
      email,
      firstName: fullName?.split(/\s+/)[0],
      lastName: fullName?.split(/\s+/).slice(1).join(' ') || undefined,
    },
    token: card?.token,
    installments: card?.installments,
    issuerId: card?.issuerId,
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
    method: internalMethod,
    pix_qr_code: fields.pix_qr_code,
    pix_qr_code_base64: fields.pix_qr_code_base64,
    payment_url: fields.payment_url,
    expires_at: fields.expires_at,
    installments: card?.installments ?? null,
    status: 'pending',
    external_ref: orderId,
    metadata: {
      mp_create: { id: fields.provider_payment_id, status: fields.provider_status },
    },
  })

  const incoming = mapMpProviderStatusToInternal(fields.provider_status)
  const transition = decideWebhookTransition({
    currentPaymentStatus: 'pending',
    incomingInternal: incoming,
  })

  let finalStatus: string = 'pending'
  let orderApproved = false

  if (transition.action === 'approve') {
    await deps.confirmPayment(paymentId)
    finalStatus = 'approved'
    orderApproved = true
  } else if (transition.action === 'set_terminal') {
    await deps.updatePayment(paymentId, {
      status: incoming,
      provider_status: fields.provider_status,
      ...(incoming === 'cancelled' ? { cancelled_at: new Date().toISOString() } : {}),
    })
    finalStatus = incoming
  }

  return {
    httpStatus: 201,
    body: {
      paymentId,
      providerPaymentId: fields.provider_payment_id,
      status: finalStatus,
      providerStatus: fields.provider_status,
      orderId,
      amount,
      method: internalMethod,
      pixQrCode: fields.pix_qr_code,
      reused: false,
      orderApproved,
      idempotencyKey,
    },
  }
}
