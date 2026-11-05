import { formatMoney } from '@/lib/money'

export type PaymentDisplaySettings = {
  id: string
  enabled: boolean
  maxInstallments: number
  minInstallmentAmount: number
  interestFree: boolean
  showOnCards: boolean
  showOnPdp: boolean
  footnote: string | null
}

/** Quantidade de parcelas exibível para o preço (respeita teto e parcela mínima). */
export function resolveInstallmentCount(
  amount: number,
  settings: Pick<PaymentDisplaySettings, 'maxInstallments' | 'minInstallmentAmount'>,
): number {
  if (!(amount > 0)) return 1
  const max = Math.min(Math.max(Math.floor(settings.maxInstallments), 1), 24)
  const minParcel = Math.max(Number(settings.minInstallmentAmount) || 0, 0)
  if (minParcel <= 0) return max
  const byMin = Math.floor(amount / minParcel)
  return Math.max(1, Math.min(max, byMin))
}

/** Linha curta para card/PDP. Null = não mostrar. */
export function formatPaymentConditionLine(
  amount: number,
  settings: PaymentDisplaySettings | null | undefined,
  surface: 'card' | 'pdp',
): string | null {
  if (!settings?.enabled) return null
  if (surface === 'card' && !settings.showOnCards) return null
  if (surface === 'pdp' && !settings.showOnPdp) return null
  if (!(amount > 0)) return null

  const n = resolveInstallmentCount(amount, settings)
  if (n <= 1) return null

  const parcel = amount / n
  const juros = settings.interestFree ? ' sem juros' : ''
  return `em até ${n}x de ${formatMoney(parcel)}${juros}`
}
