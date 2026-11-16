import { getSupabase } from '@/lib/supabase'
import type { CreateMercadoPagoPaymentResult } from '@/services/payments/mpCreatePaymentService'
import { falEdgeErrorMessage } from '@/services/payments/falEdgeErrorMessage'

export type CreateAsaasPaymentResult = CreateMercadoPagoPaymentResult & {
  provider?: string
  routedProvider?: string
}

export type CreateAsaasPaymentOptions = {
  method?: 'pix' | 'credit_card' | 'debit_card'
  installments?: number
}

export async function createAsaasPayment(
  orderId: string,
  opts?: CreateAsaasPaymentOptions,
): Promise<CreateAsaasPaymentResult> {
  const body: Record<string, unknown> = {
    orderId,
    method: opts?.method ?? 'pix',
  }
  if (opts?.installments != null) body.installments = opts.installments

  const { data, error } = await getSupabase().functions.invoke('create-asaas-payment', { body })
  let bodyRow = data as (CreateAsaasPaymentResult & { error?: string; detail?: string }) | null
  if (error && !bodyRow) {
    try {
      const ctx = (error as { context?: Response }).context
      if (ctx && typeof ctx.json === 'function') {
        bodyRow = (await ctx.json()) as CreateAsaasPaymentResult & {
          error?: string
          detail?: string
        }
      }
    } catch {
      // ignore
    }
  }
  if (error) {
    throw new Error(
      falEdgeErrorMessage(bodyRow, error.message || 'Falha ao chamar create-asaas-payment'),
    )
  }
  if (bodyRow?.error) throw new Error(falEdgeErrorMessage(bodyRow, bodyRow.error))
  if (!bodyRow?.paymentId) throw new Error('Resposta create-asaas-payment inválida')
  return { ...bodyRow, provider: 'asaas' }
}