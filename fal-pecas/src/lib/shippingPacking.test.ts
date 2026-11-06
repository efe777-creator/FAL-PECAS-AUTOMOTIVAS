import { describe, expect, it } from 'vitest'
import {
  pickSmallestFittingBox,
  resolvePackingStrategy,
  type PackingBox,
} from './shippingPacking'

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

describe('resolvePackingStrategy', () => {
  const item = { lengthCm: 10, widthCm: 10, heightCm: 5, weightKg: 1, qty: 1 }

  it('usa caixa quando templates ativos comportam', () => {
    const r = resolvePackingStrategy(boxes, [item])
    expect(r.mode).toBe('box_template')
    if (r.mode === 'box_template') expect(r.box.id).toBe('s')
  })

  it('falha quando há caixas mas nenhuma cabe (não usa max eixos)', () => {
    const r = resolvePackingStrategy(boxes, [
      { lengthCm: 100, widthCm: 100, heightCm: 100, weightKg: 50, qty: 1 },
    ])
    expect(r).toEqual({ mode: 'packing_failed' })
  })

  it('cai em per_item só sem templates ativos', () => {
    const r = resolvePackingStrategy([], [item])
    expect(r).toEqual({ mode: 'per_item' })
  })
})
