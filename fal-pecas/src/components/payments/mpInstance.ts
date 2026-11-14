import { initMercadoPago } from '@mercadopago/sdk-react'
// Instância singleton usada por createCardToken / getPaymentMethods do sdk-react.
import { MercadoPagoInstance } from '@mercadopago/sdk-react/esm/mercadoPago/initMercadoPago'

export type MpField = {
  mount: (containerId: string) => void
  unmount: () => void
  on: (event: string, callback: (arg?: { bin?: string | null }) => void) => void
}

type MpFieldsApi = {
  create: (
    type: 'cardNumber' | 'expirationDate' | 'securityCode',
    options: {
      placeholder?: string
      style?: Record<string, string>
    },
  ) => MpField
}

export type MercadoPagoClient = {
  fields: MpFieldsApi
}

/** Garante init + devolve a mesma instância que o sdk-react usa na tokenização. */
export async function getMercadoPagoClient(publicKey: string): Promise<MercadoPagoClient> {
  initMercadoPago(publicKey, { locale: 'pt-BR' })
  const mp = await MercadoPagoInstance.getInstance()
  if (!mp?.fields?.create) {
    throw new Error('Mercado Pago SDK não inicializou os Secure Fields.')
  }
  return mp as unknown as MercadoPagoClient
}
