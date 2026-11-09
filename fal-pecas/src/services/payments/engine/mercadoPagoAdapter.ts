/**
 * PG06 — adaptador Mercado Pago sobre o contrato do motor.
 * Delega à Edge create-mp-payment (sem secrets no browser).
 */
import {
  createMercadoPagoPayment,
  type CreateMercadoPagoCardInput,
} from '@/services/payments/mpCreatePaymentService'
import type {
  FalCreatePaymentInput,
  FalCreatePaymentResult,
  FalPaymentAdapter,
  FalPaymentAdapterCapabilities,
} from '@/services/payments/engine/paymentEngineTypes'
import { normalizeFalPaymentStatus } from '@/services/payments/engine/paymentStatuses'

function toCardInput(input: FalCreatePaymentInput): CreateMercadoPagoCardInput | undefined {
  if (!input.card) return undefined
  return {
    token: input.card.token,
    paymentMethodId: input.card.paymentMethodId,
    installments: input.card.installments,
    issuerId: input.card.issuerId,
    paymentTypeId: input.card.paymentTypeId,
  }
}

export const mercadoPagoAdapter: FalPaymentAdapter = {
  id: 'mercadopago',
  label: 'Mercado Pago',

  capabilities(): FalPaymentAdapterCapabilities {
    return {
      methods: ['pix', 'credit_card', 'debit_card'],
      supportsRefund: false,
      supportsWebhook: true,
      supportsInstallments: true,
    }
  },

  async createPayment(input: FalCreatePaymentInput): Promise<FalCreatePaymentResult> {
    if (input.method === 'boleto') {
      throw new Error('Boleto ainda não está habilitado neste provedor.')
    }
    const needsCard = input.method === 'credit_card' || input.method === 'debit_card'
    if (needsCard && !input.card?.token) {
      throw new Error('Token do cartão é obrigatório para este método.')
    }
    const card = needsCard ? toCardInput(input) : input.method === 'pix' ? undefined : toCardInput(input)
    const raw = await createMercadoPagoPayment(input.orderId, card)
    return {
      paymentId: raw.paymentId,
      provider: 'mercadopago',
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
    }
  },
}
