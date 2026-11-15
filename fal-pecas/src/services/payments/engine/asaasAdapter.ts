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
    if (input.method === 'credit_card' || input.method === 'debit_card') {
      if (!input.card?.token) {
        throw new Error('Token do cartão é obrigatório para este método (Asaas).')
      }
      throw new Error('Cartão Asaas em implementação. O roteador já direciona cartão para Asaas.')
    }
    const raw = await createAsaasPayment(input.orderId)
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