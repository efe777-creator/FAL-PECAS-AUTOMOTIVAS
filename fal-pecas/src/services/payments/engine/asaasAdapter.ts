/**
 * PG — adaptador Asaas (PIX / boleto; cartão em evolução).
 */
import { createAsaasPayment } from '@/services/payments/createAsaasPaymentService'
import type {
  FalCreatePaymentInput,
  FalCreatePaymentResult,
  FalPaymentAdapter,
  FalPaymentAdapterCapabilities,
} from '@/services/payments/engine/paymentEngineTypes'
import { normalizeFalPaymentStatus } from '@/services/payments/engine/paymentStatuses'

export const asaasAdapter: FalPaymentAdapter = {
  id: 'asaas',
  label: 'Asaas',

  capabilities(): FalPaymentAdapterCapabilities {
    return {
      methods: ['pix', 'credit_card', 'debit_card', 'boleto'],
      supportsRefund: false,
      supportsWebhook: true,
      supportsInstallments: true,
    }
  },

  async createPayment(input: FalCreatePaymentInput): Promise<FalCreatePaymentResult> {
    const installments =
      input.method === 'debit_card'
        ? 1
        : Math.max(1, Math.floor(input.installments ?? input.card?.installments ?? 1))
    const raw = await createAsaasPayment(input.orderId, {
      method: input.method === 'debit_card' || input.method === 'credit_card' ? input.method : 'pix',
      installments,
    })
    return mapAsaasResult(raw, input)
  },
}

function mapAsaasResult(
  raw: Awaited<ReturnType<typeof createAsaasPayment>>,
  input: FalCreatePaymentInput,
): FalCreatePaymentResult {
  return {
    paymentId: raw.paymentId,
    provider: 'asaas',
    status: normalizeFalPaymentStatus(raw.status),
    providerStatus: raw.providerStatus ?? null,
    providerPaymentId: raw.providerPaymentId ?? null,
    amount: raw.amount,
    method: raw.method ?? input.method,
    pixQrCode: raw.pixQrCode ?? null,
    pixQrCodeBase64: raw.pixQrCodeBase64 ?? null,
    paymentUrl: raw.paymentUrl ?? null,
    expiresAt: raw.expiresAt ?? null,
    reused: raw.reused,
    orderId: raw.orderId ?? input.orderId,
    orderApproved: raw.orderApproved === true,
  }
}