/** HOME-05 — apresentação comercial unificada de oferta (card / PDP / admin). */

export const OFERTA_SELO_LABEL = 'Oferta'

export type PromoOfferPresentation = {
  isOffer: boolean
  listPrice: number
  resolvedPrice: number
  /** Percentual inteiro 1–99; null se oferta inválida ou &lt; 1%. */
  discountPercent: number | null
}

/**
 * Oferta válida só quando há preço de lista comparável e o resolvido é menor.
 * % arredondado para inteiro; abaixo de 1% não exibe percentual.
 */
export function resolvePromoOffer(
  listPrice: number | null | undefined,
  resolvedPrice: number | null | undefined,
): PromoOfferPresentation {
  const list = Number(listPrice)
  const resolved = Number(resolvedPrice)
  if (!Number.isFinite(list) || !Number.isFinite(resolved) || list <= 0) {
    return {
      isOffer: false,
      listPrice: Number.isFinite(list) ? list : 0,
      resolvedPrice: Number.isFinite(resolved) ? resolved : 0,
      discountPercent: null,
    }
  }
  const isOffer = list > resolved + 0.001
  if (!isOffer) {
    return { isOffer: false, listPrice: list, resolvedPrice: resolved, discountPercent: null }
  }
  const raw = ((list - resolved) / list) * 100
  const pct = Math.round(raw)
  return {
    isOffer: true,
    listPrice: list,
    resolvedPrice: resolved,
    discountPercent: raw >= 1 && pct >= 1 && pct <= 99 ? pct : null,
  }
}

export function formatDiscountPercentLabel(discountPercent: number): string {
  return `-${Math.floor(discountPercent)}%`
}

/** Texto do selo: "Oferta" ou "Oferta · -12%" (HOME-07 pode ocultar %). */
export function formatOfertaBadgeLabel(
  offer: PromoOfferPresentation,
  opts?: { showDiscountPercent?: boolean },
): string {
  if (!offer.isOffer) return OFERTA_SELO_LABEL
  if (opts?.showDiscountPercent === false) return OFERTA_SELO_LABEL
  if (offer.discountPercent == null) return OFERTA_SELO_LABEL
  return `${OFERTA_SELO_LABEL} · ${formatDiscountPercentLabel(offer.discountPercent)}`
}
