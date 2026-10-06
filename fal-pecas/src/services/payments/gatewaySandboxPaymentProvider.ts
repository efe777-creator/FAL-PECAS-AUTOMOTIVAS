import { simulatedPaymentProvider } from '@/services/payments/simulatedPaymentProvider'
import type { PaymentIntentInput, PaymentIntentResult, PaymentProvider } from '@/types'

/** Metadados F9-C — gateway sandbox sem HTTP/token no frontend. */
export function enrichGatewaySandboxResult(
  result: PaymentIntentResult,
  extra?: Record<string, unknown>,
): PaymentIntentResult {
  return {
    ...result,
    provider: 'simulated',
    metadata: {
      ...result.metadata,
      mode: 'gateway_sandbox',
      gateway: 'fal_sandbox',
      ...extra,
    },
  }
}

/**
 * F9-C — Gateway de pagamento em modo sandbox.
 * Mantém o ciclo F7 via `confirm_simulated_payment` (provider DB = simulated).
 * Troca só o adapter; checkout continua no contrato PaymentProvider.
 * HTTP/token de gateway real → Edge Function (fora desta fatia).
 */
export const gatewaySandboxPaymentProvider: PaymentProvider = {
  async createIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    const base = await simulatedPaymentProvider.createIntent(input)
    return enrichGatewaySandboxResult(base, { method: input.method })
  },

  async confirmSimulated(paymentId, outcome): Promise<PaymentIntentResult> {
    const base = await simulatedPaymentProvider.confirmSimulated(paymentId, outcome)
    return enrichGatewaySandboxResult(base, { outcome })
  },
}
