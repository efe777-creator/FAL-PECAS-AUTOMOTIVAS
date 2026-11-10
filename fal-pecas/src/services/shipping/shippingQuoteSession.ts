/** Handoff leve carrinho/PDP → checkout (preferência de frete). Sem valor de frete como verdade. */

import { isStorePickupOption, STORE_PICKUP_OPTION_ID } from '@/services/shipping/storePickupOption'
import type { ShippingQuoteOption } from '@/types'

const KEY = 'fal.shippingQuoteHandoff.v1'

export type ShippingPreferenceKind = 'pickup' | 'own' | 'carrier'

export type ShippingQuoteHandoff = {
  /** CEP 8 dígitos; opcional quando preferredKind === 'pickup'. */
  postalCode?: string
  /** Endereço do perfil escolhido na PDP/carrinho (pré-seleciona no checkout). */
  preferredAddressId?: string
  preferredOptionId?: string
  preferredKind?: ShippingPreferenceKind
  preferredServiceCode?: string
  preferredLabel?: string
  savedAt: string
}

function normalizeLabel(label: string | undefined): string {
  return (label ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function preferenceKindFromOption(
  option: ShippingQuoteOption,
): ShippingPreferenceKind {
  if (isStorePickupOption(option)) return 'pickup'
  if (
    option.provider === 'own' ||
    option.id.startsWith('own:') ||
    option.id.startsWith('ownq:')
  ) {
    return 'own'
  }
  return 'carrier'
}

export function saveShippingQuoteHandoff(input: {
  postalCode?: string
  preferredAddressId?: string
  preferredOptionId?: string
  preferredKind?: ShippingPreferenceKind
  preferredServiceCode?: string
  preferredLabel?: string
  option?: ShippingQuoteOption
}): void {
  try {
    const option = input.option
    const preferredKind =
      input.preferredKind ?? (option ? preferenceKindFromOption(option) : undefined)
    const digits = (input.postalCode ?? '').replace(/\D/g, '')
    const postalCode = digits.length === 8 ? digits : undefined

    if (preferredKind !== 'pickup' && !postalCode) {
      return
    }

    const payload: ShippingQuoteHandoff = {
      postalCode,
      preferredAddressId: input.preferredAddressId || undefined,
      preferredOptionId: input.preferredOptionId ?? option?.id,
      preferredKind,
      preferredServiceCode: input.preferredServiceCode ?? option?.serviceCode,
      preferredLabel: input.preferredLabel ?? option?.label,
      savedAt: new Date().toISOString(),
    }
    sessionStorage.setItem(KEY, JSON.stringify(payload))
  } catch {
    /* private mode */
  }
}

export function loadShippingQuoteHandoff(): ShippingQuoteHandoff | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ShippingQuoteHandoff
    if (!parsed?.savedAt) return null
    if (parsed.preferredKind === 'pickup' || parsed.preferredOptionId === STORE_PICKUP_OPTION_ID) {
      return {
        ...parsed,
        preferredKind: 'pickup',
        preferredOptionId: parsed.preferredOptionId ?? STORE_PICKUP_OPTION_ID,
      }
    }
    if (!parsed.postalCode || parsed.postalCode.length !== 8) return null
    return parsed
  } catch {
    return null
  }
}

export function clearShippingQuoteHandoff(): void {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

/**
 * Resolve a opção preferida na lista re-cotada do checkout.
 * Ordem: id exato → pickup → serviceCode → label → null.
 */
export function matchPreferredShippingOption(
  options: ShippingQuoteOption[],
  handoff: ShippingQuoteHandoff | null | undefined,
): ShippingQuoteOption | null {
  if (!handoff || !options.length) return null

  if (handoff.preferredOptionId) {
    const byId = options.find((o) => o.id === handoff.preferredOptionId)
    if (byId) return byId
  }

  if (handoff.preferredKind === 'pickup') {
    const pickup = options.find((o) => isStorePickupOption(o))
    if (pickup) return pickup
  }

  if (handoff.preferredServiceCode) {
    const byCode = options.find((o) => o.serviceCode === handoff.preferredServiceCode)
    if (byCode) return byCode
  }

  if (handoff.preferredLabel) {
    const want = normalizeLabel(handoff.preferredLabel)
    const byLabel = options.find((o) => normalizeLabel(o.label) === want)
    if (byLabel) return byLabel
  }

  return null
}
