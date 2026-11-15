import { getSupabase } from '@/lib/supabase'
import type { CreateMercadoPagoPaymentResult } from '@/services/payments/mpCreatePaymentService'

function edgeErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === 'object') {
    const row = data as { error?: string; detail?: string; message?: string }
    if (row.error === 'ASAAS_API_KEY missing') {
      return 'Pagamento Asaas indisponível no momento. Tente mais tarde.'
    }
    if (row.error === 'payment_route_mismatch') {
      return 'Este pagamento deve ser processado por outro provedor.'
    }
    if (row.error === 'asaas_card_not_ready') {
      return 'Cartão via Asaas estará disponível em breve.'
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

export async function createAsaasPayment(
  orderId: string,
): Promise<CreateAsaasPaymentResult> {
  const { data, error } = await getSupabase().functions.invoke('create-asaas-payment', {
    body: { orderId },
  })
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