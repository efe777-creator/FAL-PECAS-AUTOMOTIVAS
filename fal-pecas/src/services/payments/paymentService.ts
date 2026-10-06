import { gatewaySandboxPaymentProvider } from '@/services/payments/gatewaySandboxPaymentProvider'
import { simulatedPaymentProvider } from '@/services/payments/simulatedPaymentProvider'
import type { PaymentIntentResult, PaymentProvider, SimulatedPaymentMethod } from '@/types'

export type PaymentProviderKey = 'simulated' | 'gateway' | 'mercadopago'

/**
 * F9-C: VITE_PAYMENT_PROVIDER=
 *   mercadopago → Pix real (create-mp-payment + webhook)
 *   gateway|sandbox → adapter gateway sandbox
 *   default → simulated (F6)
 */
export function resolvePaymentProviderKey(
  raw: string | undefined = import.meta.env.VITE_PAYMENT_PROVIDER as string | undefined,
): PaymentProviderKey {
  const key = raw?.toLowerCase()
  if (key === 'mercadopago' || key === 'mp') return 'mercadopago'
  if (key === 'gateway' || key === 'sandbox') return 'gateway'
  return 'simulated'
}

export function isMercadoPagoCheckoutEnabled(
  raw: string | undefined = import.meta.env.VITE_PAYMENT_PROVIDER as string | undefined,
): boolean {
  return resolvePaymentProviderKey(raw) === 'mercadopago'
}

function resolveDefaultProvider(): PaymentProvider {
  return resolvePaymentProviderKey() === 'gateway'
    ? gatewaySandboxPaymentProvider
    : simulatedPaymentProvider
}

let activeProvider: PaymentProvider = resolveDefaultProvider()

export function setPaymentProvider(provider: PaymentProvider) {
  activeProvider = provider
}

export function getPaymentProvider(): PaymentProvider {
  return activeProvider
}

export async function getSimulatedPaymentIntent(
  orderId: string,
  method: SimulatedPaymentMethod,
): Promise<PaymentIntentResult> {
  return activeProvider.createIntent({ orderId, amount: 0, method })
}

export async function confirmSimulatedPayment(
  paymentId: string,
  outcome: 'approve' | 'fail',
): Promise<PaymentIntentResult> {
  return activeProvider.confirmSimulated(paymentId, outcome)
}

/** Aliases F9 — mesmo contrato; checkout pode continuar nos nomes F6. */
export const createPaymentIntent = getSimulatedPaymentIntent
export const confirmPayment = confirmSimulatedPayment
