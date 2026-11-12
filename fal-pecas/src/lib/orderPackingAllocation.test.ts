import { describe, expect, it } from 'vitest'
import {
  buildItemsFingerprint,
  emptyPackingVolume,
  isOrderPackingComplete,
  isOrderPackingStructurallyComplete,
  packingCompleteFromMeta,
  validatePackingAllocation,
  type OrderPacking,
} from './orderPacking'

const items = [
  { id: 'i1', quantity: 2 },
  { id: 'i2', quantity: 1 },
]

function baseVol(id: string, lines: { orderItemId: string; quantity: number }[] = []) {
  return {
    ...emptyPackingVolume(),
    id,
    lengthCm: 10,
    widthCm: 10,
    heightCm: 10,
    weightKg: 1,
    lines,
  }
}

describe('orderPacking allocation (Marcha 3)', () => {
  it('estrutural sozinho NÃO é completo', () => {
    const packing: OrderPacking = {
      volumes: [baseVol('v1')],
      itemsFingerprint: buildItemsFingerprint(items),
      allocationStatus: 'incomplete',
    }
    expect(isOrderPackingStructurallyComplete(packing)).toBe(true)
    expect(isOrderPackingComplete(packing, items)).toBe(false)
  })

  it('alocação exata de todas as unidades → completo', () => {
    const packing: OrderPacking = {
      volumes: [
        baseVol('v1', [
          { orderItemId: 'i1', quantity: 2 },
          { orderItemId: 'i2', quantity: 1 },
        ]),
      ],
      itemsFingerprint: buildItemsFingerprint(items),
      allocationStatus: 'complete',
    }
    expect(validatePackingAllocation(packing, items).ok).toBe(true)
    expect(isOrderPackingComplete(packing, items)).toBe(true)
  })

  it('split entre volumes ok; soma por item = pedido', () => {
    const packing: OrderPacking = {
      volumes: [
        baseVol('v1', [{ orderItemId: 'i1', quantity: 1 }]),
        baseVol('v2', [
          { orderItemId: 'i1', quantity: 1 },
          { orderItemId: 'i2', quantity: 1 },
        ]),
      ],
      itemsFingerprint: buildItemsFingerprint(items),
      allocationStatus: 'complete',
    }
    expect(isOrderPackingComplete(packing, items)).toBe(true)
  })

  it('dupla alocação (soma > qty) → rejeita', () => {
    const packing: OrderPacking = {
      volumes: [
        baseVol('v1', [{ orderItemId: 'i1', quantity: 2 }]),
        baseVol('v2', [{ orderItemId: 'i1', quantity: 1 }]),
      ],
    }
    expect(validatePackingAllocation(packing, items).ok).toBe(false)
    expect(isOrderPackingComplete(packing, items)).toBe(false)
  })

  it('item sem alocação → incompleto', () => {
    const packing: OrderPacking = {
      volumes: [baseVol('v1', [{ orderItemId: 'i1', quantity: 2 }])],
    }
    expect(validatePackingAllocation(packing, items).ok).toBe(false)
  })

  it('fingerprint divergente (itens mudaram) → inválido', () => {
    const packing: OrderPacking = {
      volumes: [
        baseVol('v1', [
          { orderItemId: 'i1', quantity: 2 },
          { orderItemId: 'i2', quantity: 1 },
        ]),
      ],
      itemsFingerprint: 'stale',
      allocationStatus: 'complete',
    }
    expect(isOrderPackingComplete(packing, items)).toBe(false)
  })

  it('exceção com justificativa libera sem alocação', () => {
    const packing: OrderPacking = {
      volumes: [baseVol('v1')],
      itemsFingerprint: buildItemsFingerprint(items),
      allocationStatus: 'exception',
      allocationException: {
        active: true,
        reason: 'Peça grande já embalada pelo fornecedor — sem split SKU',
      },
    }
    expect(isOrderPackingComplete(packing, items)).toBe(true)
  })

  it('exceção sem justificativa → não completo', () => {
    const packing: OrderPacking = {
      volumes: [baseVol('v1')],
      allocationException: { active: true, reason: '  ' },
    }
    expect(isOrderPackingComplete(packing, items)).toBe(false)
  })

  it('meta: sem alocação completa não libera fila ME/Own', () => {
    expect(
      packingCompleteFromMeta({
        packing: {
          volumes: [{ id: 'v1', lengthCm: 10, widthCm: 10, heightCm: 10, weightKg: 1 }],
        },
      }),
    ).toBe(false)
    expect(
      packingCompleteFromMeta({
        packing: {
          volumes: [
            {
              id: 'v1',
              lengthCm: 10,
              widthCm: 10,
              heightCm: 10,
              weightKg: 1,
              lines: [{ orderItemId: 'i1', quantity: 1 }],
            },
          ],
          itemsFingerprint: 'i1:1',
          allocationStatus: 'complete',
        },
      }),
    ).toBe(true)
  })
})
