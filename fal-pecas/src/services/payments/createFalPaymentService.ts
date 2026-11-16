import { getSupabase } from '@/lib/supabase'
import type {
  FalCreatePaymentInput,
  FalCreatePaymentResult,
} from '@/services/payments/engine/paymentEngineTypes'
import { normalizeFalPaymentStatus } from '@/services/payments/engine/paymentStatuses'
import { falEdgeErrorMessage } from '@/services/payments/falEdgeErrorMessage'

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
  let bodyRow = data as (FalCreatePaymentResult & { error?: string; detail?: unknown }) | null
  if (error && !bodyRow) {
    try {
      const ctx = (error as { context?: Response }).context
      if (ctx && typeof ctx.json === 'function') {
        bodyRow = (await ctx.json()) as FalCreatePaymentResult & {
          error?: string
          detail?: unknown
        }
      }
    } catch {
      // ignore
    }
  }
  if (error) {
    throw new Error(falEdgeErrorMessage(bodyRow, error.message || 'Falha ao criar pagamento'))
  }
  if (bodyRow?.error) throw new Error(falEdgeErrorMessage(bodyRow, bodyRow.error))
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
