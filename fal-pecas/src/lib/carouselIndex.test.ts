import { describe, expect, it } from 'vitest'
import { clampCarouselIndex, nextCarouselIndex, prevCarouselIndex } from './carouselIndex'

describe('carouselIndex', () => {
  it('avança e volta em ciclo', () => {
    expect(nextCarouselIndex(2, 3)).toBe(0)
    expect(prevCarouselIndex(0, 3)).toBe(2)
  })

  it('trata lista vazia', () => {
    expect(nextCarouselIndex(0, 0)).toBe(0)
    expect(clampCarouselIndex(5, 0)).toBe(0)
  })
})
