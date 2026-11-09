import { getSupabase } from '@/lib/supabase'

export interface CreateMercadoPagoPaymentResult {
  paymentId: string
  providerPaymentId?: string
  status: 'pending'
  orderId?: string
  amount?: number
  method?: string
  pixQrCode?: string | null
  pixQrCodeBase64?: string | null
  paymentUrl?: string | null
  expiresAt?: string | null
  reused?: boolean
  orderApproved?: false
  providerStatus?: string
}

export interface CreateMercadoPagoCardInput {
  token: string
  paymentMethodId: string
  installments: number
  issuerId?: string
  paymentTypeId?: string
}

/**
 * F9-B/D — invoca Edge create-mp-payment.
 * Pix: só orderId. Cartão: + token Brick (nunca amount).
 */
function edgeErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === 'object') {
    const row = data as { error?: string; detail?: string; message?: string }
    const code = row.error ?? row.message
    if (code === 'MP_ACCESS_TOKEN missing') {
      console.error('[mp] create-mp-payment: access token ausente no Edge')
      return 'Pagamento indisponível no momento. Tente novamente mais tarde.'
    }
    if (code === 'payer_document_required') {
      return 'Informe CPF ou CNPJ na conta para pagar com Pix.'
    }
    if (code === 'order_not_awaiting_payment') {
      return 'Este pedido não está aguardando pagamento.'
    }
    if (code === 'payer_email_required') {
      return 'E-mail da conta é necessário para concluir o pagamento.'
    }
    if (code === 'invalid_order_total') {
      return 'Total do pedido inválido para pagamento.'
    }
    if (code) {
      return row.detail ? `${code}: ${row.detail}` : code
    }
  }
  return fallback
}

export async function createMercadoPagoPayment(
  orderId: string,
  card?: CreateMercadoPagoCardInput,
): Promise<CreateMercadoPagoPaymentResult> {
  const body: Record<string, unknown> = { orderId }
  if (card) {
    body.token = card.token
    body.paymentMethodId = card.paymentMethodId
    body.installments = card.installments
    if (card.issuerId) body.issuerId = card.issuerId
    if (card.paymentTypeId) body.paymentTypeId = card.paymentTypeId
  }
  const { data, error } = await getSupabase().functions.invoke('create-mp-payment', {
    body,
  })
  // Non-2xx: data costuma trazer { error, detail }; message do client é genérica
  let bodyRow = data as (CreateMercadoPagoPaymentResult & { error?: string; detail?: string }) | null
  if (error && !bodyRow) {
    try {
      const ctx = (error as { context?: Response }).context
      if (ctx && typeof ctx.json === 'function') {
        bodyRow = (await ctx.json()) as CreateMercadoPagoPaymentResult & {
          error?: string
          detail?: string
        }
      }
    } catch {
      // ignore parse
    }
  }
  if (error) {
    throw new Error(
      edgeErrorMessage(bodyRow, error.message || 'Falha ao chamar create-mp-payment'),
    )
  }
  if (bodyRow?.error) throw new Error(edgeErrorMessage(bodyRow, bodyRow.error))
  if (!bodyRow?.paymentId) throw new Error('Resposta create-mp-payment inválida')
  return bodyRow
}
