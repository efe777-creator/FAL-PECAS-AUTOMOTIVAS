import { describe, expect, it } from 'vitest'
import { pickSmallestFittingBoxFromTemplates, type ShippingBoxTemplate } from './adminShippingBoxService'

const boxes: ShippingBoxTemplate[] = [
  {
    id: 's',
    name: 'Pequena',
    lengthCm: 20,
    widthCm: 15,
    heightCm: 10,
    emptyWeightKg: 0.1,
    maxWeightKg: 5,
    active: true,
    sortOrder: 1,
  },
  {
    id: 'm',
    name: 'Média',
    lengthCm: 40,
    widthCm: 30,
    heightCm: 20,
    emptyWeightKg: 0.3,
    maxWeightKg: 20,
    active: true,
    sortOrder: 2,
  },
]

describe('pickSmallestFittingBoxFromTemplates', () => {
  it('escolhe a menor caixa que comporta volume e peso', () => {
    const pick = pickSmallestFittingBoxFromTemplates(boxes, [
      { lengthCm: 10, widthCm: 10, heightCm: 5, weightKg: 1, qty: 1 },
    ])
    expect(pick?.id).toBe('s')
  })
})
