import { getSupabase } from '@/lib/supabase'
import type { CreateMercadoPagoPaymentResult } from '@/services/payments/mpCreatePaymentService'

function edgeErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === 'object') {
    const row = data as { error?: string; detail?: string; message?: string }
    if (row.error === 'ASAAS_API_KEY missing') {
      return 'Pagamento indisponível no momento. Tente mais tarde.'
    }
    if (row.error === 'payment_route_mismatch') {
      return 'Este pagamento deve ser processado por outro provedor.'
    }
    if (row.error === 'installments_not_allowed') {
      return row.detail ? String(row.detail) : 'Parcelamento não permitido para este pedido.'
    }
    if (row.error === 'payer_document_required') {
      return 'Informe CPF ou CNPJ na conta para continuar.'
    }
    if (row.error) {
      return row.detail ? `${row.error}: ${row.detail}` : row.error
    }
  }
  return fallback
}

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
    throw new Error(edgeErrorMessage(bodyRow, error.message || 'Falha ao chamar create-asaas-payment'))
  }
  if (bodyRow?.error) throw new Error(edgeErrorMessage(bodyRow, bodyRow.error))
  if (!bodyRow?.paymentId) throw new Error('Resposta create-asaas-payment inválida')
  return { ...bodyRow, provider: 'asaas' }
}