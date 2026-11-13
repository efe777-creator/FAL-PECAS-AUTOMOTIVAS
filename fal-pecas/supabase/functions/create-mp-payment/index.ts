// F9-B/C/D — create-mp-payment
// Amount = orders.total. Pix ou cartão (token Brick).
// Terminal síncrono do MP → mesma decisão do webhook (RPC / set_terminal).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import {
  buildIdempotencyKey,
  buildMpPaymentBody,
  isPaymentExpired,
  mapMpResponseToPaymentFields,
  parseCreateMpPaymentClientBody,
  pixDateOfExpiration,
  resolveInternalMethod,
} from '../_shared/mpCreatePaymentCore.ts'
import {
  decideWebhookTransition,
  mapMpProviderStatusToInternal,
} from '../_shared/mpWebhookCore.ts'

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

    const { orderId, card } = parseCreateMpPaymentClientBody(
      (rawBody ?? {}) as Record<string, unknown>,
    )
    const internalMethod = resolveInternalMethod(card)
    const mpPaymentMethodId = card?.paymentMethodId ?? 'pix'

    const { data: customer, error: custErr } = await admin
      .from('customers')
      .select('id, cpf, cnpj')
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

    // PAY consolidação — disponibilidade comercial + parcelas vs store_payment_display
    {
      const { data: displayRow } = await admin
        .from('store_payment_display')
        .select(
          'enabled, max_installments, min_installment_amount, installments_enabled, card_enabled, pix_enabled, interest_free_max, allow_interest_installments',
        )
        .limit(1)
        .maybeSingle()

      const cardEnabled = displayRow?.card_enabled != null ? Boolean(displayRow.card_enabled) : true
      const pixEnabled = displayRow?.pix_enabled != null ? Boolean(displayRow.pix_enabled) : true
      if (card && !cardEnabled) {
        return json(422, { error: 'method_not_allowed', detail: 'cartão desativado comercialmente' })
      }
      if (!card && !pixEnabled) {
        return json(422, { error: 'method_not_allowed', detail: 'pix desativado comercialmente' })
      }

      if (card) {
        const installmentsOn =
          displayRow?.installments_enabled != null
            ? Boolean(displayRow.installments_enabled)
            : Boolean(displayRow?.enabled)
        const allowInterest =
          displayRow?.allow_interest_installments != null
            ? Boolean(displayRow.allow_interest_installments)
            : true
        const freeMax = Math.max(0, Math.floor(Number(displayRow?.interest_free_max) || 0))
        let maxAllowed = 1
        if (installmentsOn && amount > 0) {
          const max = Math.min(Math.max(Math.floor(Number(displayRow?.max_installments) || 1), 1), 24)
          const minParcel = Math.max(Number(displayRow?.min_installment_amount) || 0, 0)
          maxAllowed =
            minParcel <= 0 ? max : Math.max(1, Math.min(max, Math.floor(amount / minParcel)))
          // Juros comerciais off → teto efetivo = interest_free_max (alinha front).
          if (!allowInterest) {
            maxAllowed = freeMax <= 0 ? 1 : Math.min(maxAllowed, freeMax)
          }
        }
        if (!Number.isFinite(card.installments) || card.installments < 1) {
          return json(422, {
            error: 'installments_not_allowed',
            detail: 'installments inválido',
          })
        }
        if (card.installments > maxAllowed) {
          return json(422, {
            error: 'installments_not_allowed',
            detail:
              !allowInterest && freeMax > 0 && card.installments > freeMax
                ? `sem juros só até ${freeMax}x (ou habilite juros)`
                : `installments acima do permitido (máx. ${maxAllowed})`,
          })
        }
      }
    }

    const payerDoc = customer.cpf
      ? ({ type: 'CPF' as const, number: String(customer.cpf).replace(/\D/g, '') })
      : customer.cnpj
        ? ({ type: 'CNPJ' as const, number: String(customer.cnpj).replace(/\D/g, '') })
        : null
    // Pix BR: MP exige identification; sem doc → 500 cryptic "not_found"
    if (!card && !payerDoc) {
      return json(422, { error: 'payer_document_required' })
    }

    let paymentId: string
    let mpAttempt = 1
    const { data: existingRaw } = await admin
      .from('payments')
      .select(
        'id, provider_payment_id, status, amount, metadata, expires_at, method, installments, pix_qr_code, pix_qr_code_base64, payment_url, provider_status',
      )
      .eq('order_id', orderId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let existing = existingRaw

    // Pix/cobrança expirada: marca expired e cria nova — pedido permanece aguardando_pagamento (até 48h).
    if (existing && isPaymentExpired(existing.expires_at as string | null)) {
      await admin
        .from('payments')
        .update({
          status: 'expired',
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: {
            ...((existing.metadata ?? {}) as Record<string, unknown>),
            expired_reason: 'pix_ttl',
          },
        })
        .eq('id', existing.id)
        .eq('status', 'pending')
      existing = null
    }

    // Troca Pix ↔ cartão ou mudança de parcelas: cancela pending (não reutilizar cobrança MP).
    if (existing?.provider_payment_id) {
      const existingIsPix = String(existing.method ?? 'pix') === 'pix'
      const wantsPix = !card
      const prevInstallments = Math.max(1, Math.floor(Number(existing.installments) || 1))
      const nextInstallments = card
        ? Math.max(1, Math.floor(Number(card.installments) || 1))
        : null
      const installmentsChanged = Boolean(card) && prevInstallments !== nextInstallments
      if (existingIsPix !== wantsPix || installmentsChanged) {
        await admin
          .from('payments')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            metadata: {
              ...((existing.metadata ?? {}) as Record<string, unknown>),
              cancelled_reason: existingIsPix !== wantsPix ? 'method_switch' : 'installments_changed',
              from_method: existing.method ?? 'pix',
              to_method: internalMethod,
              from_installments: prevInstallments,
              to_installments: nextInstallments,
            },
          })
          .eq('id', existing.id)
          .eq('status', 'pending')
        existing = null
      }
    }

    if (existing?.provider_payment_id) {
      let full = existing

      // Reuso sem QR: tenta reidratar a partir da API MP (sandbox às vezes atrasa o POI)
      const needsPixHydrate =
        !card &&
        (!full?.pix_qr_code || !full?.pix_qr_code_base64) &&
        existing.provider_payment_id
      if (needsPixHydrate) {
        const hydrateRes = await fetch(`${MP_API}/${existing.provider_payment_id}`, {
          headers: { Authorization: `Bearer ${mpToken}` },
        })
        if (hydrateRes.ok) {
          const mpHydrate = (await hydrateRes.json().catch(() => ({}))) as Record<string, unknown>
          try {
            const fields = mapMpResponseToPaymentFields(mpHydrate)
            await admin
              .from('payments')
              .update({
                pix_qr_code: fields.pix_qr_code,
                pix_qr_code_base64: fields.pix_qr_code_base64,
                payment_url: fields.payment_url,
                expires_at: fields.expires_at ?? pixDateOfExpiration(),
                provider_status: fields.provider_status,
              })
              .eq('id', existing.id)
            full = {
              ...full,
              pix_qr_code: fields.pix_qr_code,
              pix_qr_code_base64: fields.pix_qr_code_base64,
              payment_url: fields.payment_url,
              expires_at: fields.expires_at ?? pixDateOfExpiration(),
              provider_status: fields.provider_status,
            }
          } catch {
            // mantém full como veio do banco
          }
        }
      }

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
      const meta = (existing.metadata ?? {}) as Record<string, unknown>
      const prevAttempt = Number(meta.mp_attempt)
      // Se já falhou no MP sem provider id, sobe attempt (nova idempotency key)
      if (!existing.provider_payment_id && meta.mp_error) {
        mpAttempt = (Number.isFinite(prevAttempt) && prevAttempt >= 1 ? prevAttempt : 1) + 1
      } else if (Number.isFinite(prevAttempt) && prevAttempt >= 1) {
        mpAttempt = prevAttempt
      }
      await admin
        .from('payments')
        .update({
          provider: 'mercadopago',
          amount,
          method: internalMethod,
          currency: 'BRL',
          installments: card?.installments ?? null,
          metadata: {
            ...meta,
            mp_attempt: mpAttempt,
            commercial_snapshot: {
              method: internalMethod,
              installments: card?.installments ?? 1,
              amount,
              at: new Date().toISOString(),
            },
          },
        })
        .eq('id', paymentId)
    } else {
      const { data: inserted, error: insErr } = await admin
        .from('payments')
        .insert({
          order_id: orderId,
          provider: 'mercadopago',
          status: 'pending',
          amount,
          method: internalMethod,
          currency: 'BRL',
          installments: card?.installments ?? null,
          external_ref: orderId,
          metadata: {
            commercial_snapshot: {
              method: internalMethod,
              installments: card?.installments ?? 1,
              amount,
              at: new Date().toISOString(),
            },
          },
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
      paymentMethodId: mpPaymentMethodId,
      externalReference: orderId,
      payer: {
        email,
        firstName: profile?.full_name?.split(/\s+/)[0],
        lastName: profile?.full_name?.split(/\s+/).slice(1).join(' ') || undefined,
        identificationType: payerDoc?.type,
        identificationNumber: payerDoc?.number,
      },
      token: card?.token,
      installments: card?.installments,
      issuerId: card?.issuerId,
    })

    const idempotencyKey = buildIdempotencyKey(paymentId, mpAttempt)
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
      const mpMessage =
        typeof mpJson.message === 'string'
          ? mpJson.message
          : typeof mpJson.error === 'string'
            ? mpJson.error
            : null
      const mpCause = Array.isArray(mpJson.cause)
        ? mpJson.cause
            .map((c) =>
              c && typeof c === 'object' && 'description' in c
                ? String((c as { description?: unknown }).description ?? '')
                : '',
            )
            .filter(Boolean)
            .join('; ')
        : null
      const detail = [mpMessage, mpCause].filter(Boolean).join(' — ') || undefined
      await admin
        .from('payments')
        .update({
          metadata: {
            mp_error: mpJson,
            http_status: mpRes.status,
            mp_attempt: mpAttempt,
          },
          provider_status: typeof mpJson.status === 'string' ? mpJson.status : 'error',
        })
        .eq('id', paymentId)
      return json(502, {
        error: 'mercadopago_create_failed',
        detail,
        httpStatus: mpRes.status,
        orderApproved: false,
      })
    }

    const fields = mapMpResponseToPaymentFields(mpJson)
    const expiresAt =
      fields.expires_at ??
      (internalMethod === 'pix' ? pixDateOfExpiration() : null)
    const { error: updErr } = await admin
      .from('payments')
      .update({
        provider: 'mercadopago',
        provider_payment_id: fields.provider_payment_id,
        provider_status: fields.provider_status,
        method: internalMethod,
        pix_qr_code: fields.pix_qr_code,
        pix_qr_code_base64: fields.pix_qr_code_base64,
        payment_url: fields.payment_url,
        expires_at: expiresAt,
        installments: card?.installments ?? null,
        status: 'pending',
        external_ref: orderId,
        metadata: {
          mp_create: { id: fields.provider_payment_id, status: fields.provider_status },
          mp_attempt: mpAttempt,
          pix_ttl_minutes: internalMethod === 'pix' ? 30 : undefined,
        },
      })
      .eq('id', paymentId)

    if (updErr) {
      return json(500, { error: 'payment_update_failed', detail: updErr.message })
    }

    const incoming = mapMpProviderStatusToInternal(fields.provider_status)
    const transition = decideWebhookTransition({
      currentPaymentStatus: 'pending',
      incomingInternal: incoming,
    })

    let finalStatus: string = 'pending'
    let orderApproved = false

    if (transition.action === 'approve') {
      const { error: confirmErr } = await admin.rpc('confirm_mercadopago_payment', {
        p_payment_id: paymentId,
      })
      if (confirmErr) {
        console.error('create_sync_approve_failed', {
          paymentId,
          msg: confirmErr.message,
        })
        return json(500, {
          error: 'approve_failed',
          detail: confirmErr.message,
          paymentId,
          providerPaymentId: fields.provider_payment_id,
          status: 'pending',
          providerStatus: fields.provider_status,
          orderApproved: false,
        })
      }
      await admin
        .from('payments')
        .update({ provider_status: fields.provider_status })
        .eq('id', paymentId)
      finalStatus = 'approved'
      orderApproved = true
    } else if (transition.action === 'set_terminal') {
      await admin
        .from('payments')
        .update({
          status: incoming,
          provider_status: fields.provider_status,
          ...(incoming === 'cancelled' ? { cancelled_at: new Date().toISOString() } : {}),
        })
        .eq('id', paymentId)
        .eq('status', 'pending')
      finalStatus = incoming
    }

    return json(201, {
      paymentId,
      providerPaymentId: fields.provider_payment_id,
      status: finalStatus,
      providerStatus: fields.provider_status,
      orderId,
      amount,
      method: internalMethod,
      pixQrCode: fields.pix_qr_code,
      pixQrCodeBase64: fields.pix_qr_code_base64,
      paymentUrl: fields.payment_url,
      expiresAt,
      reused: false,
      orderApproved,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown_error'
    return json(400, { error: message })
  }
})
