/**
 * PG05 — motor FAL: create-fal-payment é a única entrada do checkout híbrido.
 */
import { asaasAdapter } from '@/services/payments/engine/asaasAdapter'
import { mercadoPagoAdapter } from '@/services/payments/engine/mercadoPagoAdapter'
import { invokeCreateFalPayment } from '@/services/payments/createFalPaymentService'
import { resolvePaymentProviderKey, isMercadoPagoCheckoutEnabled } from '@/services/payments/paymentService'
import type {
  FalCreatePaymentInput,
  FalCreatePaymentResult,
  FalPaymentAdapter,
  FalPaymentEngine,
  FalPaymentProviderId,
} from '@/services/payments/engine/paymentEngineTypes'

const adapters: FalPaymentAdapter[] = [mercadoPagoAdapter, asaasAdapter]

export function createPaymentEngine(
  resolveKey: () => ReturnType<typeof resolvePaymentProviderKey> = resolvePaymentProviderKey,
): FalPaymentEngine {
  function primaryProviderId(): FalPaymentProviderId {
    const key = resolveKey()
    if (key === 'mercadopago') return 'mercadopago'
    return key
  }

  function getAdapter(providerId?: FalPaymentProviderId): FalPaymentAdapter | null {
    const id = (providerId ?? primaryProviderId()).toLowerCase()
    return adapters.find((a) => a.id === id) ?? null
  }

  return {
    primaryProviderId,
    getAdapter,
    listAdapters: () => [...adapters],
    async createPayment(input: FalCreatePaymentInput): Promise<FalCreatePaymentResult> {
      if (!isMercadoPagoCheckoutEnabled()) {
        const fallback = getAdapter()
        if (!fallback) {
          throw new Error(
            'Nenhum adaptador de pagamento disponível. Configure VITE_PAYMENT_PROVIDER=mercadopago.',
          )
        }
        return fallback.createPayment(input)
      }
      // Híbrido: gateway decide MP vs Asaas no servidor.
      return invokeCreateFalPayment(input)
    },
  }
}

/** Instância default da loja (build). */
export const paymentEngine = createPaymentEngine()

/** Atalho checkout: cria cobrança via motor (gateway híbrido). */
export async function createFalPayment(
  input: FalCreatePaymentInput,
): Promise<FalCreatePaymentResult> {
  return paymentEngine.createPayment(input)
}
