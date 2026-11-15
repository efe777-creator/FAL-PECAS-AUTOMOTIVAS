/**
 * PG05 — motor FAL: resolve provedor e encaminha operações ao adaptador.
 */
import { asaasAdapter } from '@/services/payments/engine/asaasAdapter'
import { mercadoPagoAdapter } from '@/services/payments/engine/mercadoPagoAdapter'
import { decidePaymentRouteForOrder } from '@/services/payments/orderPaymentRouting'
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
            'Nenhum adaptador de pagamento disponível para o provedor configurado. Use Mercado Pago (VITE_PAYMENT_PROVIDER=mercadopago).',
          )
        }
        return fallback.createPayment(input)
      }

      const route = await decidePaymentRouteForOrder(input.orderId, input.method)
      const adapter = getAdapter(route.provider)
      if (!adapter) {
        throw new Error(`Nenhum adaptador registrado para o provedor "${route.provider}".`)
      }
      return adapter.createPayment(input)
    },
  }
}

/** Instância default da loja (build). */
export const paymentEngine = createPaymentEngine()

/** Atalho checkout: cria cobrança via motor (provedor principal). */
export async function createFalPayment(
  input: FalCreatePaymentInput,
): Promise<FalCreatePaymentResult> {
  return paymentEngine.createPayment(input)
}
