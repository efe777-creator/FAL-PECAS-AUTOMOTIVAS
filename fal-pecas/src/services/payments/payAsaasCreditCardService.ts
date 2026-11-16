import { getSupabase } from '@/lib/supabase'
import { falEdgeErrorMessage } from '@/services/payments/falEdgeErrorMessage'

export type PayAsaasCreditCardInput = {
  orderId: string
  installments?: number
  creditCard: {
    holderName: string
    number: string
    expiryMonth: string
    expiryYear: string
    ccv: string
  }
  creditCardHolderInfo: {
    name: string
    email: string
    cpfCnpj: string
    postalCode: string
    addressNumber: string
    phone: string
    mobilePhone?: string
    address?: string
    province?: string
  }
  deviceInfo?: {
    colorDepth?: number
    screenHeight?: number
    screenWidth?: number
    timeZoneOffset?: number
    language?: string
    userAgent?: string
  }
  callbackUrl?: string
}

export type PayAsaasCreditCardResult = {
  paymentId: string
  provider?: string
  providerPaymentId?: string
  status?: string
  providerStatus?: string
  orderId?: string
  amount?: number
  method?: string
  threeDSecureChallengeUrl?: string | null
  paymentUrl?: string | null
  orderApproved?: boolean
  chargeMode?: string
  confirmPending?: boolean
  detail?: string
}

export function collectBrowserDeviceInfo(): PayAsaasCreditCardInput['deviceInfo'] {
  if (typeof window === 'undefined') return undefined
  return {
    colorDepth: window.screen?.colorDepth,
    screenHeight: window.screen?.height,
    screenWidth: window.screen?.width,
    timeZoneOffset: new Date().getTimezoneOffset(),
    language: typeof navigator !== 'undefined' ? navigator.language : undefined,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  }
}

export async function payAsaasCreditCard(
  input: PayAsaasCreditCardInput,
): Promise<PayAsaasCreditCardResult> {
  const body: Record<string, unknown> = {
    orderId: input.orderId,
    creditCard: input.creditCard,
    creditCardHolderInfo: input.creditCardHolderInfo,
  }
  if (input.installments != null) body.installments = input.installments
  if (input.deviceInfo) body.deviceInfo = input.deviceInfo
  if (input.callbackUrl) body.callbackUrl = input.callbackUrl

  const { data, error } = await getSupabase().functions.invoke('pay-asaas-credit-card', { body })
  let bodyRow = data as (PayAsaasCreditCardResult & { error?: string; detail?: unknown }) | null
  if (error && !bodyRow) {
    try {
      const ctx = (error as { context?: Response }).context
      if (ctx && typeof ctx.json === 'function') {
        bodyRow = (await ctx.json()) as PayAsaasCreditCardResult & {
          error?: string
          detail?: unknown
        }
      }
    } catch {
      // ignore
    }
  }
  if (error) {
    throw new Error(
      falEdgeErrorMessage(bodyRow, error.message || 'Falha ao processar cartão de crédito.'),
    )
  }
  if (bodyRow?.error) throw new Error(falEdgeErrorMessage(bodyRow, String(bodyRow.error)))
  if (!bodyRow?.paymentId) throw new Error('Resposta pay-asaas-credit-card inválida')
  return bodyRow
}
