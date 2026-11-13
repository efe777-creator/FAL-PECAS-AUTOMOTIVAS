/**
 * Smoke Opção 1 — cotação agrupada com caixas wtbp P/M/G + POL FAL.
 * Spec: docs/planejamento/FAL_SPEC_COTACAO_CARRINHO_AGRUPADA_CAIXAS_POL_2026-11-13.md
 */
import { describe, expect, it } from 'vitest'
import { resolvePackingStrategy, type PackingBox } from './shippingPacking'
import { computePolTotal } from '@/services/shipping/own/ownPol'
import { selectOwnVehicle } from '@/services/shipping/own/ownVehicleSelect'
import { computeOwnFreightAmount } from '@/services/shipping/own/ownPricing'
import { ensureCheckoutQuoteFromMeta } from './opsShippingQuote'

/** Dimensões reais de shipping_box_templates (wtbp 2026-11-13). */
const wtbpBoxes: PackingBox[] = [
  {
    id: 'p',
    name: 'Caixa P',
    lengthCm: 20,
    widthCm: 15,
    heightCm: 10,
    emptyWeightKg: 0.15,
    maxWeightKg: 5,
    active: true,
  },
  {
    id: 'm',
    name: 'Caixa M',
    lengthCm: 40,
    widthCm: 30,
    heightCm: 20,
    emptyWeightKg: 0.35,
    maxWeightKg: 20,
    active: true,
  },
  {
    id: 'g',
    name: 'Caixa G',
    lengthCm: 60,
    widthCm: 40,
    heightCm: 40,
    emptyWeightKg: 0.6,
    maxWeightKg: 40,
    active: true,
  },
]

describe('smoke cotação carrinho agrupada (Opção 1)', () => {
  it('S1 — 1 item cabe na Caixa P', () => {
    const r = resolvePackingStrategy(wtbpBoxes, [
      { lengthCm: 6, widthCm: 8, heightCm: 12, weightKg: 0.56, qty: 1 },
    ])
    expect(r.mode).toBe('box_template')
    if (r.mode === 'box_template') expect(r.box.id).toBe('p')
  })

  it('S2 — N itens (volume-sum) sobem para Caixa M em 1 volume', () => {
    const r = resolvePackingStrategy(wtbpBoxes, [
      { lengthCm: 6, widthCm: 8, heightCm: 12, weightKg: 0.56, qty: 8 },
    ])
    expect(r.mode).toBe('box_template')
    if (r.mode === 'box_template') expect(r.box.id).toBe('m')
  })

  it('S3 — packing_failed quando nenhuma caixa comporta', () => {
    const r = resolvePackingStrategy(wtbpBoxes, [
      { lengthCm: 50, widthCm: 50, heightCm: 50, weightKg: 10, qty: 20 },
    ])
    expect(r).toEqual({ mode: 'packing_failed' })
  })

  it('S4 — POL_TOTAL ≤ 12 → moto', () => {
    const pol = computePolTotal(
      [
        { productId: 'a', quantity: 5 },
        { productId: 'b', quantity: 3 },
      ],
      {
        a: {
          productId: 'a',
          polUnit: 1,
          ownDeliveryAllowed: true,
          vehicleMinCode: null,
          compatibleVehicleCodes: [],
        },
        b: {
          productId: 'b',
          polUnit: 1,
          ownDeliveryAllowed: true,
          vehicleMinCode: null,
          compatibleVehicleCodes: [],
        },
      },
    )
    expect(pol).toEqual({ ok: true, polTotal: 8 })
    const sel = selectOwnVehicle({
      polTotal: 8,
      profiles: [
        {
          productId: 'a',
          polUnit: 1,
          ownDeliveryAllowed: true,
          vehicleMinCode: null,
          compatibleVehicleCodes: [],
        },
      ],
      categories: [
        {
          id: 'moto',
          code: 'motorcycle',
          label: 'Motocicleta',
          capacityPol: 12,
          sortOrder: 10,
          active: true,
        },
        {
          id: 'car',
          code: 'car',
          label: 'Carro',
          capacityPol: 48,
          sortOrder: 20,
          active: true,
        },
      ],
      tariffs: [
        { categoryId: 'moto', tarifaMinima: 15, valorPorKm: 2.5, active: true, version: 1 },
        { categoryId: 'car', tarifaMinima: 25, valorPorKm: 3.5, adicional: 5, active: true, version: 1 },
      ],
    })
    expect(sel.ok).toBe(true)
    if (sel.ok) expect(sel.category.code).toBe('motorcycle')
  })

  it('S5 — POL_TOTAL ≥ 13 → carro', () => {
    const sel = selectOwnVehicle({
      polTotal: 13,
      profiles: [
        {
          productId: 'a',
          polUnit: 13,
          ownDeliveryAllowed: true,
          vehicleMinCode: null,
          compatibleVehicleCodes: [],
        },
      ],
      categories: [
        {
          id: 'moto',
          code: 'motorcycle',
          label: 'Motocicleta',
          capacityPol: 12,
          sortOrder: 10,
          active: true,
        },
        {
          id: 'car',
          code: 'car',
          label: 'Carro',
          capacityPol: 48,
          sortOrder: 20,
          active: true,
        },
      ],
      tariffs: [
        { categoryId: 'moto', tarifaMinima: 15, valorPorKm: 2.5, active: true, version: 1 },
        { categoryId: 'car', tarifaMinima: 25, valorPorKm: 3.5, adicional: 5, active: true, version: 1 },
      ],
    })
    expect(sel.ok).toBe(true)
    if (sel.ok) {
      expect(sel.category.code).toBe('car')
      const amount = computeOwnFreightAmount({
        distanceKmOneWay: 10,
        valorPorKm: sel.tariff.valorPorKm,
        tarifaMinima: sel.tariff.tarifaMinima,
        adicional: sel.tariff.adicional,
      })
      expect(amount).toBe(40)
    }
  })

  it('S6 — ops_quotes não altera checkout_quote congelado', () => {
    const frozen = ensureCheckoutQuoteFromMeta({
      checkout_quote: {
        label: 'ME cotado',
        amount: 18.9,
        service_id: 3,
        volumes: [{ lengthCm: 20, widthCm: 15, heightCm: 10, weightKg: 1.2 }],
        frozen_at: '2026-11-13T12:00:00Z',
      },
      charged_shipping: 99,
      label: 'recota ops',
    })
    expect(frozen.amount).toBe(18.9)
    expect(frozen.label).toBe('ME cotado')
  })
})
