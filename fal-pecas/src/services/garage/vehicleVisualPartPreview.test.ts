import { describe, expect, it } from 'vitest'
import type { VehiclePartEvent } from './vehiclePartEventService'
import {
  groupPartEventsForPreview,
  previewIsReadOnly,
} from './vehicleVisualPartPreview'

function ev(
  partial: Partial<VehiclePartEvent> & Pick<VehiclePartEvent, 'id' | 'eventType'>,
): VehiclePartEvent {
  return {
    customerId: 'c1',
    customerVehicleId: 'm1',
    orderId: 'o1',
    orderItemId: 'oi1',
    productId: 'p1',
    payload: { name: 'Filtro', sku: 'F-1' },
    actorId: null,
    provenance: 'customer',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  }
}

describe('vehicleVisualPartPreview', () => {
  it('é somente leitura', () => {
    expect(previewIsReadOnly()).toBe(true)
  })

  it('compra ≠ instalação no preview; install sobe o estado', () => {
    const items = groupPartEventsForPreview([
      ev({ id: '1', eventType: 'bought', createdAt: '2026-01-01T00:00:00.000Z' }),
      ev({
        id: '2',
        eventType: 'installed_declared',
        createdAt: '2026-01-02T00:00:00.000Z',
      }),
    ])
    expect(items).toHaveLength(1)
    expect(items[0].state).toBe('instalada')
  })

  it('devolução remove do preview', () => {
    const items = groupPartEventsForPreview([
      ev({ id: '1', eventType: 'bought', createdAt: '2026-01-01T00:00:00.000Z' }),
      ev({ id: '2', eventType: 'returned', createdAt: '2026-01-03T00:00:00.000Z' }),
    ])
    expect(items).toHaveLength(0)
  })
})
