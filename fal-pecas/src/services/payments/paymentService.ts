import { simulatedPaymentProvider } from '@/services/payments/simulatedPaymentProvider'
import type { PaymentIntentResult, PaymentProvider, SimulatedPaymentMethod } from '@/types'

let activeProvider: PaymentProvider = simulatedPaymentProvider

export function setPaymentProvider(provider: PaymentProvider) {
  activeProvider = provider
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
