import { getSupabase } from '@/lib/supabase'
import type {
  FalCreatePaymentInput,
  FalCreatePaymentResult,
} from '@/services/payments/engine/paymentEngineTypes'
import { normalizeFalPaymentStatus } from '@/services/payments/engine/paymentStatuses'

function edgeErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === 'object') {
    const row = data as { error?: string; detail?: string; message?: string }
    if (row.error === 'ASAAS_API_KEY missing' || row.error === 'MP_ACCESS_TOKEN missing') {
      return 'Pagamento indisponível no momento. Tente mais tarde.'
    }
    if (row.error === 'payment_route_mismatch') {
      return row.detail
        ? String(row.detail)
        : 'Este pagamento deve ser processado por outro provedor.'
    }
    if (row.error === 'installments_not_allowed') {
      return row.detail ? String(row.detail) : 'Parcelamento não permitido para este pedido.'
    }
    if (row.error === 'payer_document_required') {
      return 'Informe CPF ou CNPJ na conta para continuar.'
    }
    if (row.error === 'method_not_allowed') {
      return row.detail ? String(row.detail) : 'Meio de pagamento indisponível.'
    }
    if (row.error) {
      return row.detail ? `${row.error}: ${row.detail}` : row.error
    }
  }
  return fallback
}

/** Única entrada do checkout FAL PAY → Edge create-fal-payment. */
export async function invokeCreateFalPayment(
  input: FalCreatePaymentInput,
): Promise<FalCreatePaymentResult> {
  const body: Record<string, unknown> = {
    orderId: input.orderId,
    method: input.method,
  }
  if (input.installments != null) body.installments = input.installments
  // Cartão Asaas não envia token/PAN — só method + parcelas.

  const { data, error } = await getSupabase().functions.invoke('create-fal-payment', { body })
  let bodyRow = data as (FalCreatePaymentResult & { error?: string; detail?: string }) | null
  if (error && !bodyRow) {
    try {
      const ctx = (error as { context?: Response }).context
      if (ctx && typeof ctx.json === 'function') {
        bodyRow = (await ctx.json()) as FalCreatePaymentResult & {
          error?: string
          detail?: string
        }
      }
    } catch {
      // ignore
    }
  }
  if (error) {
    throw new Error(edgeErrorMessage(bodyRow, error.message || 'Falha ao criar pagamento'))
  }
  if (bodyRow?.error) throw new Error(edgeErrorMessage(bodyRow, bodyRow.error))
  if (!bodyRow?.paymentId) throw new Error('Resposta create-fal-payment inválida')

  return {
    paymentId: bodyRow.paymentId,
    provider: bodyRow.provider ?? 'unknown',
    status: normalizeFalPaymentStatus(String(bodyRow.status ?? 'pending')),
    providerStatus: bodyRow.providerStatus ?? null,
    providerPaymentId: bodyRow.providerPaymentId ?? null,
    amount: bodyRow.amount,
    method: bodyRow.method ?? input.method,
    pixQrCode: bodyRow.pixQrCode ?? null,
    pixQrCodeBase64: bodyRow.pixQrCodeBase64 ?? null,
    paymentUrl: bodyRow.paymentUrl ?? null,
    expiresAt: bodyRow.expiresAt ?? null,
    reused: bodyRow.reused,
    orderId: bodyRow.orderId ?? input.orderId,
    orderApproved: bodyRow.orderApproved === true,
    metadata: bodyRow.metadata,
  }
}
