import { describe, expect, it } from 'vitest'
import { carouselPageStep } from './carouselPageStep'

describe('carouselPageStep', () => {
  it('uma página de 4 cards com gap 16', () => {
    expect(carouselPageStep(200, 16, 4)).toBe(4 * 200 + 3 * 16)
  })

  it('um card (seta) com gap', () => {
    expect(carouselPageStep(180, 10, 1)).toBe(180)
  })

  it('protege contra n inválido', () => {
    expect(carouselPageStep(100, 8, 0)).toBe(100)
  })
})
