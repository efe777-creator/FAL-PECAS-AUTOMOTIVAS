import { describe, expect, it } from 'vitest'
import {
  OFERTA_SELO_LABEL,
  formatDiscountPercentLabel,
  formatOfertaBadgeLabel,
  resolvePromoOffer,
} from '@/lib/promoPresentation'

describe('promoPresentation (HOME-05)', () => {
  it('não marca oferta quando preços iguais ou lista inválida', () => {
    expect(resolvePromoOffer(50, 50).isOffer).toBe(false)
    expect(resolvePromoOffer(null, 40).isOffer).toBe(false)
    expect(resolvePromoOffer(0, 10).isOffer).toBe(false)
  })

  it('calcula % inteiro e rótulo do selo', () => {
    const offer = resolvePromoOffer(100, 80)
    expect(offer.isOffer).toBe(true)
    expect(offer.discountPercent).toBe(20)
    expect(formatDiscountPercentLabel(20)).toBe('-20%')
    expect(formatOfertaBadgeLabel(offer)).toBe(`${OFERTA_SELO_LABEL} · -20%`)
  })

  it('oferta com desconto abaixo de 1% não exibe percentual', () => {
    const offer = resolvePromoOffer(100, 99.2)
    expect(offer.isOffer).toBe(true)
    expect(offer.discountPercent).toBeNull()
    expect(formatOfertaBadgeLabel(offer)).toBe(OFERTA_SELO_LABEL)
  })
})
