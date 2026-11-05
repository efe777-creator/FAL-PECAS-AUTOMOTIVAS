import { describe, expect, it } from 'vitest'
import { pickSmallestFittingBox, type PackingBox } from './shippingPacking'

const boxes: PackingBox[] = [
  {
    id: 's',
    name: 'Pequena',
    lengthCm: 20,
    widthCm: 15,
    heightCm: 10,
    emptyWeightKg: 0.1,
    maxWeightKg: 5,
    active: true,
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
  },
]

describe('pickSmallestFittingBox', () => {
  it('escolhe a menor caixa que comporta volume e peso', () => {
    const pick = pickSmallestFittingBox(boxes, [
      { lengthCm: 10, widthCm: 10, heightCm: 5, weightKg: 1, qty: 1 },
    ])
    expect(pick?.id).toBe('s')
  })

  it('sobe de tamanho quando a pequena não cabe', () => {
    const pick = pickSmallestFittingBox(boxes, [
      { lengthCm: 25, widthCm: 20, heightCm: 15, weightKg: 2, qty: 2 },
    ])
    expect(pick?.id).toBe('m')
  })

  it('retorna null se nenhuma caixa serve', () => {
    const pick = pickSmallestFittingBox(boxes, [
      { lengthCm: 100, widthCm: 100, heightCm: 100, weightKg: 50, qty: 1 },
    ])
    expect(pick).toBeNull()
  })
})
