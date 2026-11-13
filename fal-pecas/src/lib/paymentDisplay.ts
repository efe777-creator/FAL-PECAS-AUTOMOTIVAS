import { formatMoney } from '@/lib/money'

export type PaymentDisplaySettings = {
  id: string
  /** Mostrar condição de parcelas na vitrine (cards/PDP). */
  enabled: boolean
  maxInstallments: number
  minInstallmentAmount: number
  /**
   * Compat / copy: true se interestFreeMax > 0.
   * Preferir interestFreeMax + allowInterestInstallments para regras.
   */
  interestFree: boolean
  /** Até quantas parcelas a loja trata como “sem juros” na política. */
  interestFreeMax: number
  /** Se false, só opções sem juros (até interestFreeMax) entram. */
  allowInterestInstallments: boolean
  /** Se false, checkout/cartão só 1x. */
  installmentsEnabled: boolean
  cardEnabled: boolean
  pixEnabled: boolean
  showOnCards: boolean
  showOnPdp: boolean
  footnote: string | null
}

/** Opção de parcela vinda do MP (ou sintética). */
export type InstallmentOption = {
  installments: number
  installmentAmount: number
  totalAmount: number
  /** true se total ≈ amount do pedido (sem juros aparente). */
  interestFree: boolean
  label: string
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

/**
 * Teto FAL para checkout / vitrine (PAY consolidação).
 * Parcelamento desligado / settings ausentes → 1x.
 * Ligado → max + min parcela; se juros comerciais off → também capa em interestFreeMax.
 */
export function falMaxInstallmentsForCheckout(
  amount: number,
  settings: PaymentDisplaySettings | null | undefined,
): number {
  if (!settings?.installmentsEnabled) return 1
  let n = resolveInstallmentCount(amount, settings)
  // Sem juros liberados: o cliente só pode escolher até freeMax (0 → só à vista).
  if (settings.allowInterestInstallments === false) {
    const freeMax = Math.max(0, Math.floor(settings.interestFreeMax))
    if (freeMax <= 0) return 1
    n = Math.min(n, freeMax)
  }
  return n
}

function approxEqual(a: number, b: number, eps = 0.02): boolean {
  return Math.abs(a - b) <= eps
}

/** Infere se a opção MP é sem juros comparando total com o valor do pedido. */
export function isInstallmentInterestFree(
  orderAmount: number,
  option: Pick<InstallmentOption, 'totalAmount' | 'installments' | 'installmentAmount'>,
): boolean {
  if (option.installments <= 1) return true
  if (Number.isFinite(option.totalAmount) && option.totalAmount > 0) {
    return approxEqual(option.totalAmount, orderAmount)
  }
  const implied = option.installmentAmount * option.installments
  return approxEqual(implied, orderAmount)
}

function vistaOption(amount: number): InstallmentOption {
  return {
    installments: 1,
    installmentAmount: amount,
    totalAmount: amount,
    interestFree: true,
    label: `À vista no cartão — ${formatMoney(amount)}`,
  }
}

function labelInstallmentOption(
  amount: number,
  o: InstallmentOption,
  free: boolean,
): string {
  if (o.installments === 1) return `À vista no cartão — ${formatMoney(amount)}`
  const parcelLabel = formatMoney(o.installmentAmount)
  return free
    ? `${o.installments}x de ${parcelLabel} sem juros`
    : `${o.installments}x de ${parcelLabel} (com juros)`
}

/**
 * Filtra opções MP pela política comercial FAL.
 * Sempre garante à vista (1x). Nx>1 só se o gateway ofereceu e a política liberar.
 */
export function filterInstallmentOptions(
  amount: number,
  settings: PaymentDisplaySettings | null | undefined,
  options: InstallmentOption[],
): InstallmentOption[] {
  const max = falMaxInstallmentsForCheckout(amount, settings)
  const allowInterest = settings?.allowInterestInstallments !== false
  const freeMax = Math.max(0, Math.floor(settings?.interestFreeMax ?? 0))
  const minParcel = settings ? Math.max(Number(settings.minInstallmentAmount) || 0, 0) : 0

  const withVista = options.some((o) => Number(o.installments) === 1)
    ? options
    : [vistaOption(amount), ...options]

  const filtered = withVista
    .filter((o) => Number.isFinite(o.installments) && o.installments >= 1 && o.installments <= max)
    .filter((o) => (minParcel <= 0 ? true : o.installmentAmount + 1e-9 >= minParcel || o.installments === 1))
    .filter((o) => {
      if (o.installments <= 1) return true
      const free = o.interestFree || isInstallmentInterestFree(amount, o)
      if (free) {
        // Alinha Edge: juros off → só até interestFreeMax (0 = só à vista).
        if (!allowInterest && (freeMax <= 0 || o.installments > freeMax)) return false
        return true
      }
      return allowInterest
    })
    .map((o) => {
      const free = o.interestFree || isInstallmentInterestFree(amount, o)
      return { ...o, interestFree: free, label: labelInstallmentOption(amount, o, free) }
    })
    .sort((a, b) => a.installments - b.installments)

  // Dedup por N (MP às vezes repete) e garante 1x final.
  const byN = new Map<number, InstallmentOption>()
  for (const o of filtered) {
    if (!byN.has(o.installments)) byN.set(o.installments, o)
  }
  if (!byN.has(1)) byN.set(1, vistaOption(amount))
  return [...byN.values()].sort((a, b) => a.installments - b.installments)
}

/** Rejeita installments acima da política comercial FAL. */
export function assertCardInstallmentsAllowed(
  installments: number,
  amount: number,
  settings: PaymentDisplaySettings | null | undefined,
  option?: Pick<InstallmentOption, 'totalAmount' | 'installmentAmount' | 'interestFree'> | null,
): void {
  if (!Number.isFinite(installments) || installments < 1) {
    throw new Error('installments inválido')
  }
  if (settings && settings.cardEnabled === false) {
    throw new Error('cartão desativado comercialmente')
  }
  const max = falMaxInstallmentsForCheckout(amount, settings)
  if (installments > max) {
    throw new Error(`installments acima do permitido (máx. ${max})`)
  }
  if (!settings || installments <= 1) return

  const allowInterest = settings.allowInterestInstallments !== false
  const freeMax = Math.max(0, Math.floor(settings.interestFreeMax))
  const free = option
    ? Boolean(option.interestFree) ||
      isInstallmentInterestFree(amount, {
        installments,
        installmentAmount: option.installmentAmount,
        totalAmount: option.totalAmount,
      })
    : null

  if (option && !free && !allowInterest) {
    throw new Error('parcelas com juros não permitidas')
  }
  // Com ou sem option MP: juros off → nunca acima de interestFreeMax.
  if (!allowInterest && (freeMax <= 0 || installments > freeMax)) {
    throw new Error(
      freeMax <= 0
        ? 'parcelas com juros não permitidas (só 1x)'
        : `sem juros só até ${freeMax}x (ou habilite juros)`,
    )
  }
  const minParcel = Math.max(Number(settings.minInstallmentAmount) || 0, 0)
  if (minParcel > 0 && option?.installmentAmount != null && installments > 1) {
    if (option.installmentAmount + 1e-9 < minParcel) {
      throw new Error(`parcela abaixo do mínimo (R$ ${minParcel})`)
    }
  }
}

/** Linha curta para card/PDP. Null = não mostrar. */
export function formatPaymentConditionLine(
  amount: number,
  settings: PaymentDisplaySettings | null | undefined,
  surface: 'card' | 'pdp',
): string | null {
  if (!settings?.enabled) return null
  if (!settings.cardEnabled) return null
  if (surface === 'card' && !settings.showOnCards) return null
  if (surface === 'pdp' && !settings.showOnPdp) return null
  if (!(amount > 0)) return null

  const n = falMaxInstallmentsForCheckout(amount, settings)
  if (n <= 1) return null

  const parcel = amount / n
  const freeMax = Math.max(0, Math.floor(settings.interestFreeMax))
  const juros =
    settings.interestFree || (freeMax > 0 && n <= freeMax) ? ' sem juros' : ''
  return `em até ${n}x de ${formatMoney(parcel)}${juros}`
}
