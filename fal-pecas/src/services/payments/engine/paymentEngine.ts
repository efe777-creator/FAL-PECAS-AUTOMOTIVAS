/**
 * PG05 — motor FAL: resolve provedor e encaminha operações ao adaptador.
 */
import { resolvePaymentProviderKey } from '@/services/payments/paymentService'
import { mercadoPagoAdapter } from '@/services/payments/engine/mercadoPagoAdapter'
import type {
  FalCreatePaymentInput,
  FalCreatePaymentResult,
  FalPaymentAdapter,
  FalPaymentEngine,
  FalPaymentProviderId,
} from '@/services/payments/engine/paymentEngineTypes'

const adapters: FalPaymentAdapter[] = [mercadoPagoAdapter]

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
      const adapter = getAdapter()
      if (!adapter) {
        throw new Error(
          'Nenhum adaptador de pagamento disponível para o provedor configurado. Use Mercado Pago (VITE_PAYMENT_PROVIDER=mercadopago).',
        )
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
