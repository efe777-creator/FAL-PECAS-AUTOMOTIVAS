import { describe, expect, it } from 'vitest'
import {
  collapsePurchaseEventsForHistory,
  hasSystemAssociatedForOrderItem,
  type VehiclePartEvent,
} from './vehiclePartEventService'

function ev(
  partial: Partial<VehiclePartEvent> & Pick<VehiclePartEvent, 'id' | 'eventType'>,
): VehiclePartEvent {
  return {
    customerId: 'c1',
    customerVehicleId: 'v1',
    orderId: 'o1',
    orderItemId: 'oi1',
    productId: 'p1',
    payload: { name: 'Filtro', sku: 'F1' },
    actorId: null,
    provenance: 'system',
    createdAt: '2026-11-20T12:00:00.000Z',
    ...partial,
  }
}

describe('collapsePurchaseEventsForHistory', () => {
  it('colapsa bought + associated no mesmo order_item', () => {
    const rows = collapsePurchaseEventsForHistory([
      ev({ id: 'a', eventType: 'associated', createdAt: '2026-11-20T12:01:00.000Z' }),
      ev({ id: 'b', eventType: 'bought', createdAt: '2026-11-20T12:00:00.000Z' }),
      ev({
        id: 'i',
        eventType: 'installed_declared',
        provenance: 'customer',
        createdAt: '2026-11-21T10:00:00.000Z',
      }),
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0]!.id).toBe('b')
    expect(rows[0]!.hasBought).toBe(true)
    expect(rows[0]!.hasAssociated).toBe(true)
    expect(rows[0]!.productLabel).toContain('Filtro')
  })

  it('hasSystemAssociatedForOrderItem', () => {
    const list = [
      ev({ id: 'a', eventType: 'associated', provenance: 'system' }),
      ev({ id: 'c', eventType: 'associated', orderItemId: 'oi2', provenance: 'customer' }),
    ]
    expect(hasSystemAssociatedForOrderItem(list, 'oi1')).toBe(true)
    expect(hasSystemAssociatedForOrderItem(list, 'oi2')).toBe(false)
  })
})
