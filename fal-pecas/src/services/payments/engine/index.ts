export type {
  FalCreatePaymentInput,
  FalCreatePaymentResult,
  FalPaymentAdapter,
  FalPaymentAdapterCapabilities,
  FalPaymentEngine,
  FalPaymentMethodCode,
  FalPaymentProviderId,
} from '@/services/payments/engine/paymentEngineTypes'
export {
  isTerminalFalStatus,
  mapProviderStatusToFal,
  normalizeFalPaymentStatus,
  toPersistedPaymentStatus,
  type FalPaymentStatus,
  type PersistedPaymentStatus,
} from '@/services/payments/engine/paymentStatuses'
export { mercadoPagoAdapter } from '@/services/payments/engine/mercadoPagoAdapter'
export { createFalPayment, createPaymentEngine, paymentEngine } from '@/services/payments/engine/paymentEngine'
