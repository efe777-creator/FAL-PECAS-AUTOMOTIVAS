/**
 * Cobrança crédito embutida — isolada do fluxo invoiceUrl (débito/fatura).
 */
import {
  asaasApiRequest,
  asaasDueDateDaysFromNow,
  isAsaasInconclusive,
} from './asaasApiCore.ts'
import { clientRemoteIp } from './asaasCreatePaymentCore.ts'
import {
  attachCreditCardToAsaasCreateBody,
  buildAsaasPayWithCreditCardBody,
  sanitizeAsaasCardErrorBody,
  type ParsedAsaasEmbeddedCardBody,
} from './asaasEmbeddedCardCore.ts'
import { buildAsaasPaymentCreateBody } from './asaasInstallmentsCore.ts'
import {
  asaasListPaymentsPath,
  isCreatingLockActive,
  pickReconcileCandidate,
  withChargePhase,
  type AsaasRemotePayment,
} from './asaasReconcileCore.ts'

// deno-lint-ignore no-explicit-any
type AdminClient = any

type AsaasCustomer = { id: string }
type AsaasPayment = {
  id: string
  status?: string
  value?: number
  invoiceUrl?: string
  threeDSecureChallengeUrl?: string | null
  creditCard?: { creditCardNumber?: string; creditCardBrand?: string }
}

export type AsaasPayCreditCardOutcome = {
  httpStatus: number
  body: Record<string, unknown>
}

async function ensureAsaasCustomer(
  apiKey: string,
  base: string,
  input: { customerId: string; email: string; name: string; cpfCnpj: string },
): Promise<string> {
  const cpfCnpj = input.cpfCnpj.replace(/\D/g, '')
  const found = await asaasApiRequest<{ data?: AsaasCustomer[] }>(
    apiKey,
    base,
    `/customers?cpfCnpj=${encodeURIComponent(cpfCnpj)}&limit=1`,
    { method: 'GET' },
  )
  if (found.ok && found.data.data?.[0]?.id) return found.data.data[0].id
  if (isAsaasInconclusive(found)) throw new Error('asaas_customer_lookup_timeout')
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

export async function runAsaasPayCreditCardFlow(input: {
  admin: AdminClient
  apiKey: string
  asaasBase: string
  user: { id: string; email?: string | null }
  parsed: ParsedAsaasEmbeddedCardBody
  headers: Headers
}): Promise<AsaasPayCreditCardOutcome> {
  const { admin, apiKey, asaasBase, user, parsed, headers } = input
  const { orderId, installments, creditCard, creditCardHolderInfo, deviceInfo, callbackUrl } =
    parsed

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
  if (!(amount >= 5)) {
    return {
      httpStatus: 422,
      body: {
        error: 'asaas_create_failed',
        detail: {
          errors: [
            {
              code: 'invalid_value',
              description: 'O valor mínimo para cobranças via Cartão de Crédito é R$ 5,00.',
            },
          ],
        },
      },
    }
  }

  const email = user.email ?? creditCardHolderInfo.email
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
      name: profile?.full_name ?? creditCardHolderInfo.name,
      cpfCnpj: creditCardHolderInfo.cpfCnpj,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'asaas_customer_failed'
    return { httpStatus: 502, body: { error: msg } }
  }

  const remoteIp = clientRemoteIp(headers)

  const { data: existing } = await admin
    .from('payments')
    .select(
      'id, provider_payment_id, status, amount, method, metadata, provider, provider_status, payment_url',
    )
    .eq('order_id', orderId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing && isCreatingLockActive(existing.metadata as Record<string, unknown>)) {
    return {
      httpStatus: 409,
      body: {
        error: 'payment_creating_in_progress',
        detail: 'Pagamento em andamento. Aguarde alguns segundos.',
        paymentId: existing.id,
      },
    }
  }

  // Não misturar Pix/boleto/débito invoice já criados com cobrança de crédito embutida.
  const existingMethod = String(existing?.method ?? '')
  if (
    existing?.provider_payment_id &&
    existingMethod &&
    existingMethod !== 'credit_card'
  ) {
    return {
      httpStatus: 409,
      body: {
        error: 'payment_method_conflict',
        detail:
          'Já existe cobrança pendente com outro meio neste pedido. Cancele a compra ou conclua o pagamento atual.',
        paymentId: existing.id,
        currentMethod: existingMethod,
      },
    }
  }

  let providerPaymentId: string | null =
    typeof existing?.provider_payment_id === 'string' && existing.provider_payment_id
      ? existing.provider_payment_id
      : null

  if (!providerPaymentId) {
    const listed = await asaasApiRequest<{ data?: AsaasRemotePayment[] }>(
      apiKey,
      asaasBase,
      asaasListPaymentsPath(orderId),
      { method: 'GET' },
    )
    if (listed.ok) {
      const remote = pickReconcileCandidate(listed.data.data, {
        amount,
        billingType: 'CREDIT_CARD',
        installments,
      })
      if (remote?.id) providerPaymentId = remote.id
    }
  }

  let paymentId: string
  if (existing?.id) {
    paymentId = existing.id
    await admin
      .from('payments')
      .update({
        provider: 'asaas',
        method: 'credit_card',
        provider_payment_id: providerPaymentId ?? existing.provider_payment_id ?? null,
        metadata: withChargePhase(
          {
            ...(typeof existing.metadata === 'object' && existing.metadata
              ? (existing.metadata as Record<string, unknown>)
              : {}),
            installments,
            charge_mode: 'embedded_credit',
            asaas_billing_type: 'CREDIT_CARD',
          },
          'creating',
        ),
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentId)
      .eq('status', 'pending')
  } else {
    const { data: inserted, error: insErr } = await admin
      .from('payments')
      .insert({
        order_id: orderId,
        provider: 'asaas',
        status: 'pending',
        amount,
        method: 'credit_card',
        currency: 'BRL',
        external_ref: orderId,
        provider_payment_id: providerPaymentId,
        metadata: withChargePhase(
          { installments, charge_mode: 'embedded_credit', asaas_billing_type: 'CREDIT_CARD' },
          'creating',
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
  }

  const cardOpts = {
    creditCard,
    creditCardHolderInfo,
    remoteIp,
    deviceInfo,
    callbackUrl,
  }

  let asaasPay: AsaasPayment | null = null
  let usedExistingCharge = false

  if (providerPaymentId) {
    usedExistingCharge = true
    const payBody = buildAsaasPayWithCreditCardBody(cardOpts)
    const paid = await asaasApiRequest<AsaasPayment>(
      apiKey,
      asaasBase,
      `/payments/${providerPaymentId}/payWithCreditCard`,
      { method: 'POST', body: JSON.stringify(payBody) },
    )
    if (!paid.ok) {
      const sanitized = sanitizeAsaasCardErrorBody(paid.body)
      const typedError =
        sanitized &&
        typeof sanitized === 'object' &&
        typeof (sanitized as { error?: unknown }).error === 'string'
          ? String((sanitized as { error: string }).error)
          : 'asaas_create_failed'
      // Cobrança/fatura já existe: mantém gateway + provider_payment_id; só registra o erro.
      await admin
        .from('payments')
        .update({
          metadata: withChargePhase(
            {
              charge_mode: 'embedded_credit',
              asaas_error: sanitized,
              installments,
            },
            'gateway',
          ),
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentId)
      if (isAsaasInconclusive(paid)) {
        return {
          httpStatus: 504,
          body: {
            error: 'payment_inconclusive',
            detail: 'Pagamento em verificação. Não tente de novo imediatamente.',
            paymentId,
          },
        }
      }
      return {
        httpStatus: 502,
        body: {
          error: typedError,
          detail: sanitized,
          paymentId,
          providerPaymentId,
        },
      }
    }
    asaasPay = paid.data
  } else {
    const baseBody = buildAsaasPaymentCreateBody({
      customer: asaasCustomerId,
      billingType: 'CREDIT_CARD',
      amount,
      dueDate: asaasDueDateDaysFromNow(5),
      description: `Pedido FAL ${orderId}`,
      externalReference: orderId,
      remoteIp,
      installments,
    })
    const createBody = attachCreditCardToAsaasCreateBody(baseBody, cardOpts)
    const created = await asaasApiRequest<AsaasPayment>(apiKey, asaasBase, '/payments', {
      method: 'POST',
      body: JSON.stringify(createBody),
    })
    if (!created.ok) {
      await admin
        .from('payments')
        .update({
          status: 'rejected',
          provider_status: 'error',
          metadata: withChargePhase(
            {
              charge_mode: 'embedded_credit',
              asaas_error: sanitizeAsaasCardErrorBody(created.body),
              installments,
            },
            'stub',
          ),
        })
        .eq('id', paymentId)
      if (isAsaasInconclusive(created)) {
        await admin
          .from('payments')
          .update({
            status: 'pending',
            metadata: withChargePhase(
              {
                charge_mode: 'embedded_credit',
                asaas_error: sanitizeAsaasCardErrorBody(created.body),
                installments,
              },
              'inconclusive',
            ),
          })
          .eq('id', paymentId)
        return {
          httpStatus: 504,
          body: {
            error: 'payment_inconclusive',
            detail: 'Pagamento em verificação. Não tente de novo imediatamente.',
            paymentId,
          },
        }
      }
      return {
        httpStatus: 502,
        body: {
          error: 'asaas_create_failed',
          detail: sanitizeAsaasCardErrorBody(created.body),
        },
      }
    }
    asaasPay = created.data
  }

  if (!asaasPay?.id) {
    return { httpStatus: 502, body: { error: 'asaas_empty_response' } }
  }

  const providerStatus = String(asaasPay.status ?? 'PENDING')
  const statusLower = providerStatus.toLowerCase()
  const approved = statusLower === 'confirmed' || statusLower === 'received'
  const challengeUrl =
    typeof asaasPay.threeDSecureChallengeUrl === 'string' && asaasPay.threeDSecureChallengeUrl
      ? asaasPay.threeDSecureChallengeUrl
      : null

  await admin
    .from('payments')
    .update({
      provider_payment_id: asaasPay.id,
      provider_status: providerStatus,
      payment_url: challengeUrl ?? asaasPay.invoiceUrl ?? null,
      method: 'credit_card',
      metadata: withChargePhase(
        {
          charge_mode: 'embedded_credit',
          installments,
          asaas_payment: {
            id: asaasPay.id,
            status: asaasPay.status,
            brand: asaasPay.creditCard?.creditCardBrand ?? null,
            last4: asaasPay.creditCard?.creditCardNumber ?? null,
          },
          used_existing_charge: usedExistingCharge,
          has_3ds_challenge: Boolean(challengeUrl),
        },
        challengeUrl ? 'gateway' : approved ? 'gateway' : 'gateway',
      ),
      updated_at: new Date().toISOString(),
    })
    .eq('id', paymentId)

  if (approved) {
    const { error: confirmErr } = await admin.rpc('confirm_asaas_payment', {
      p_payment_id: paymentId,
    })
    if (confirmErr) {
      console.error('asaas_embedded_confirm_failed', confirmErr.message)
      return {
        httpStatus: 200,
        body: {
          paymentId,
          provider: 'asaas',
          providerPaymentId: asaasPay.id,
          status: 'pending',
          providerStatus,
          orderId,
          amount,
          method: 'credit_card',
          threeDSecureChallengeUrl: null,
          orderApproved: false,
          confirmPending: true,
          detail: 'Pagamento autorizado; confirmação do pedido em processamento.',
        },
      }
    }
  }

  return {
    httpStatus: approved ? 200 : 201,
    body: {
      paymentId,
      provider: 'asaas',
      providerPaymentId: asaasPay.id,
      status: approved ? 'approved' : 'pending',
      providerStatus,
      orderId,
      amount,
      method: 'credit_card',
      threeDSecureChallengeUrl: challengeUrl,
      paymentUrl: challengeUrl,
      orderApproved: approved,
      chargeMode: 'embedded_credit',
    },
  }
}
