/**
 * PG05 — contrato interno do motor de pagamentos FAL.
 * Checkout e admin falam com este contrato; adaptadores falam com gateways.
 */
import type { FalPaymentStatus } from '@/services/payments/engine/paymentStatuses'

export type FalPaymentMethodCode = 'pix' | 'credit_card' | 'debit_card' | 'boleto' | 'other'

export type FalPaymentProviderId = 'mercadopago' | 'simulated' | 'gateway' | string

export interface FalCreatePaymentInput {
  orderId: string
  method: FalPaymentMethodCode
  /** Token Brick / dados cartão — nunca PAN/CVV na FAL. */
  card?: {
    token: string
    paymentMethodId: string
    installments: number
    issuerId?: string
    paymentTypeId?: string
  }
}

export interface FalCreatePaymentResult {
  paymentId: string
  provider: FalPaymentProviderId
  status: FalPaymentStatus
  providerStatus?: string | null
  providerPaymentId?: string | null
  amount?: number
  method?: string
  pixQrCode?: string | null
  pixQrCodeBase64?: string | null
  paymentUrl?: string | null
  expiresAt?: string | null
  reused?: boolean
  orderId?: string
  /** True quando create já promoveu o pedido (MP approved síncrono). */
  orderApproved?: boolean
  metadata?: Record<string, unknown>
}

export interface FalPaymentAdapterCapabilities {
  methods: FalPaymentMethodCode[]
  supportsRefund: boolean
  supportsWebhook: boolean
  supportsInstallments: boolean
}

/** Operações que todo adaptador de provedor deve expor (parcial OK nesta onda). */
export interface FalPaymentAdapter {
  readonly id: FalPaymentProviderId
  readonly label: string
  capabilities(): FalPaymentAdapterCapabilities
  createPayment(input: FalCreatePaymentInput): Promise<FalCreatePaymentResult>
  /** Consulta estado atualizado (opcional nesta onda). */
  getPayment?(paymentId: string): Promise<FalCreatePaymentResult | null>
  /** Estorno — geralmente via admin/RPC; stub até PG15. */
  refundPayment?(paymentId: string, amount?: number): Promise<{ ok: boolean; message?: string }>
}

export interface FalPaymentEngine {
  /** Provedor principal configurado no ambiente. */
  primaryProviderId(): FalPaymentProviderId
  getAdapter(providerId?: FalPaymentProviderId): FalPaymentAdapter | null
  listAdapters(): FalPaymentAdapter[]
  createPayment(input: FalCreatePaymentInput): Promise<FalCreatePaymentResult>
}
