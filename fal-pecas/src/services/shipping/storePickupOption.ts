import { isOwnConfirmCheckoutOption } from '@/services/shipping/ownConfirmCheckoutOption'
import type { ShippingQuoteOption } from '@/types'

/** ID estável aceito por `resolve_mock_shipping_option` / place_order. */
export const STORE_PICKUP_OPTION_ID = 'mock:pickup'

export function isStorePickupOption(
  option: Pick<ShippingQuoteOption, 'id' | 'serviceCode' | 'metadata'> | null | undefined,
): boolean {
  if (!option) return false
  if (option.id === STORE_PICKUP_OPTION_ID) return true
  if (option.serviceCode === 'pickup') return true
  if (option.metadata?.kind === 'pickup') return true
  return false
}

/** Opção fixa: retirada na loja R$ 0,00. Prazos via Logística (Marcha 1b). */
export function createStorePickupOption(eta?: {
  min?: number
  max?: number
}): ShippingQuoteOption {
  const min = eta?.min ?? 0
  const max = Math.max(min, eta?.max ?? 1)
  return {
    id: STORE_PICKUP_OPTION_ID,
    provider: 'mock',
    serviceCode: 'pickup',
    label: 'Retirada na loja',
    amount: 0,
    etaDaysMin: min,
    etaDaysMax: max,
    metadata: { kind: 'pickup' },
  }
}

/** Garante retirada na lista sem duplicar. */
export function withStorePickupOption(
  options: ShippingQuoteOption[],
): ShippingQuoteOption[] {
  if (options.some((o) => isStorePickupOption(o))) return options
  return [...options, createStorePickupOption()]
}

/**
 * Ordem única loja/checkout: fretes por preço crescente;
 * provisional own (confirmar no checkout) antes da retirada; retirada por último.
 */
export function sortShippingOptionsForCustomer(
  options: ShippingQuoteOption[],
): ShippingQuoteOption[] {
  return [...options].sort((a, b) => {
    const aPick = isStorePickupOption(a)
    const bPick = isStorePickupOption(b)
    if (aPick && !bPick) return 1
    if (!aPick && bPick) return -1
    const aProv = isOwnConfirmCheckoutOption(a)
    const bProv = isOwnConfirmCheckoutOption(b)
    if (aProv && !bProv) return 1
    if (!aProv && bProv) return -1
    return a.amount - b.amount
  })
}

/** Inject + ordenação canônica. */
export function ensureCustomerShippingOptions(
  options: ShippingQuoteOption[],
): ShippingQuoteOption[] {
  return sortShippingOptionsForCustomer(withStorePickupOption(options))
}

export function formatStoreOriginAddress(origin: {
  street: string
  number: string
  complement?: string | null
  district?: string | null
  city: string
  state: string
  postalCode: string
}): string {
  const cep = origin.postalCode.replace(/\D/g, '')
  const cepFmt = cep.length === 8 ? `${cep.slice(0, 5)}-${cep.slice(5)}` : origin.postalCode
  const parts = [
    `${origin.street}, ${origin.number}`,
    origin.complement?.trim() || null,
    origin.district?.trim() || null,
    `${origin.city}/${origin.state}`,
    `CEP ${cepFmt}`,
  ].filter(Boolean)
  return parts.join(' — ')
}

export const STORE_PICKUP_READY_NOTICE =
  'Retire neste endereço. A loja libera a retirada e avisa assim que a separação for concluída.'

/** Horário de atendimento para retirada (copy vitrine/checkout; origem sem campo de horário). */
export const STORE_PICKUP_HOURS_LABEL = 'Seg–Sex 08h–18h · Sáb 08h–12h'

export const STORE_PICKUP_NOTIFY_NOTICE =
  'Avisamos assim que a separação for concluída. A retirada só fica liberada quando o status em Meus pedidos estiver “Pronto para retirar”.'

export const STORE_PICKUP_SWITCH_NOTICE =
  'Prefere receber em casa? Informe o CEP e escolha outra modalidade.'
