/**
 * Adaptador Mercado Pago — somente Pix no FAL PAY híbrido.
 * Crédito/débito entram exclusivamente pelo Asaas (invoiceUrl).
 */
import { createMercadoPagoPayment } from '@/services/payments/mpCreatePaymentService'
import type {
  FalCreatePaymentInput,
  FalCreatePaymentResult,
  FalPaymentAdapter,
  FalPaymentAdapterCapabilities,
} from '@/services/payments/engine/paymentEngineTypes'
import { normalizeFalPaymentStatus } from '@/services/payments/engine/paymentStatuses'

export const mercadoPagoAdapter: FalPaymentAdapter = {
  id: 'mercadopago',
  label: 'Mercado Pago',

  capabilities(): FalPaymentAdapterCapabilities {
    return {
      methods: ['pix'],
      supportsRefund: false,
      supportsWebhook: true,
      supportsInstallments: false,
    }
  },

  async createPayment(input: FalCreatePaymentInput): Promise<FalCreatePaymentResult> {
    if (input.method !== 'pix') {
      throw new Error(
        'Mercado Pago neste checkout processa somente Pix. Cartão e boleto vão pelo Asaas.',
      )
    }
    const raw = await createMercadoPagoPayment(input.orderId)
    return {
      paymentId: raw.paymentId,
      provider: 'mercadopago',
      status: normalizeFalPaymentStatus(raw.status),
      providerStatus: raw.providerStatus ?? null,
      providerPaymentId: raw.providerPaymentId ?? null,
      amount: raw.amount,
      method: raw.method ?? 'pix',
      pixQrCode: raw.pixQrCode ?? null,
      pixQrCodeBase64: raw.pixQrCodeBase64 ?? null,
      paymentUrl: raw.paymentUrl ?? null,
      expiresAt: raw.expiresAt ?? null,
      reused: raw.reused,
      orderId: raw.orderId ?? input.orderId,
      orderApproved: raw.orderApproved === true,
    }
  },
}
