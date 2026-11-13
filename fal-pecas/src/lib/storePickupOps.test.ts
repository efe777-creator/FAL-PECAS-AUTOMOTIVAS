import { describe, expect, it } from 'vitest'
import { isStorePickupAuthorized, parseStorePickupMeta } from './storePickupOps'
import { volumesFromContractedMeta } from './orderPacking'
import { customerFacingOrderStatusLabel } from './orderLifecycle'

describe('storePickupOps', () => {
  it('parse e authorized', () => {
    expect(isStorePickupAuthorized(null)).toBe(false)
    expect(
      isStorePickupAuthorized({
        pickup: { authorized_at: '2026-11-12T12:00:00Z', authorized_by: 'u1' },
      }),
    ).toBe(true)
    expect(
      parseStorePickupMeta({
        pickup: { authorized_at: 'a', authorized_by: 'b', picked_up_at: 'c' },
      }),
    ).toEqual({ authorizedAt: 'a', authorizedBy: 'b', pickedUpAt: 'c' })
  })
})

describe('volumesFromContractedMeta', () => {
  it('pré-preenche a partir de quote.volumes', () => {
    const vols = volumesFromContractedMeta({
      quote: {
        volumes: [{ length_cm: 30, width_cm: 20, height_cm: 10, weight_kg: 1.5 }],
      },
    })
    expect(vols).toHaveLength(1)
    expect(vols[0]?.lengthCm).toBe(30)
    expect(vols[0]?.weightKg).toBe(1.5)
  })

  it('aceita volumes ME como objeto único', () => {
    const vols = volumesFromContractedMeta({
      me: { volumes: { lengthCm: 16, widthCm: 11, heightCm: 2, weightKg: 0.3 } },
    })
    expect(vols).toHaveLength(1)
    expect(vols[0]?.lengthCm).toBe(16)
    expect(vols[0]?.weightKg).toBe(0.3)
  })
})

describe('customerFacingOrderStatusLabel pickup', () => {
  it('mostra Pronto para retirar quando autorizado', () => {
    expect(
      customerFacingOrderStatusLabel({
        status: 'pronto_para_envio',
        pickup: true,
        pickupAuthorized: true,
      }),
    ).toBe('Pronto para retirar')
    expect(
      customerFacingOrderStatusLabel({
        status: 'pronto_para_envio',
        pickup: true,
        pickupAuthorized: false,
      }),
    ).toMatch(/aguardando liberação/i)
  })
})
