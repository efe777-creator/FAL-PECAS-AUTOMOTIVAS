import { describe, expect, it } from 'vitest'
import { buildOrderOpsWizard } from './orderOpsWizard'
import type { AdminOrderDetail } from '@/services/admin/adminOrderService'

function base(partial: Partial<AdminOrderDetail>): AdminOrderDetail {
  return {
    id: 'o1',
    status: 'em_separacao',
    subtotal: 10,
    shippingAmount: 5,
    total: 15,
    createdAt: '2026-11-11T00:00:00Z',
    addressSnapshot: null,
    paymentRef: null,
    customerId: 'c1',
    customerName: 'A',
    customerEmail: null,
    customerDoc: null,
    customerDecision: null,
    cancellationRequest: null,
    cancellationReason: null,
    cancellationResolveNote: null,
    items: [
      {
        id: 'i1',
        productId: null,
        sku: 'X',
        nameSnapshot: 'X',
        unitPrice: 10,
        quantity: 1,
        availability: null,
        leadDays: null,
        staffNote: null,
        separated: false,
      },
    ],
    events: [],
    payment: null,
    shipment: { id: 's1', provider: 'own', status: 'pending', trackingCode: null, amount: 5, metadata: null },
    ...partial,
  }
}

describe('buildOrderOpsWizard (Fase 2)', () => {
  it('own: etiqueta skipped; conferência current sem separated', () => {
    const steps = buildOrderOpsWizard(base({}))
    expect(steps.find((s) => s.id === 'etiqueta')?.state).toBe('skipped')
    expect(steps.find((s) => s.id === 'conferencia')?.state).toBe('current')
  })

  it('ME em pronto_para_envio: frete/etiqueta/despacho ativos', () => {
    const steps = buildOrderOpsWizard(
      base({
        status: 'pronto_para_envio',
        items: [
          {
            id: 'i1',
            productId: null,
            sku: 'X',
            nameSnapshot: 'X',
            unitPrice: 10,
            quantity: 1,
            availability: null,
            leadDays: null,
            staffNote: null,
            separated: true,
          },
        ],
        shipment: {
          id: 's1',
          provider: 'melhorenvio',
          status: 'pending',
          trackingCode: null,
          amount: 5,
          metadata: { packing: { volumes: [{ id: 'v1', lengthCm: 1, widthCm: 1, heightCm: 1, weightKg: 0.1 }] } },
        },
      }),
    )
    expect(steps.find((s) => s.id === 'conferencia')?.state).toBe('done')
    expect(steps.find((s) => s.id === 'volumes')?.state).toBe('done')
    expect(steps.find((s) => s.id === 'etiqueta')?.state).not.toBe('skipped')
  })
})
