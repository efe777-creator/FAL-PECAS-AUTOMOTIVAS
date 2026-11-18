import { describe, expect, it } from 'vitest'
import {
  boughtRemainsIntact,
  eventProductLabel,
  VEHICLE_PART_EVENT_LABEL,
  type VehiclePartEvent,
} from './vehiclePartEventService'

function evt(
  partial: Partial<VehiclePartEvent> & Pick<VehiclePartEvent, 'id' | 'eventType'>,
): VehiclePartEvent {
  return {
    customerId: 'c1',
    customerVehicleId: 'v1',
    orderId: 'o1',
    orderItemId: 'oi1',
    productId: 'p1',
    payload: { name: 'Filtro', sku: 'SKU-1' },
    actorId: null,
    provenance: 'system',
    createdAt: '2026-11-18T12:00:00.000Z',
    ...partial,
  }
}

describe('vehiclePartEventService (G7)', () => {
  it('rótulos cobrem todos os event_type do contrato', () => {
    expect(VEHICLE_PART_EVENT_LABEL.bought).toBeTruthy()
    expect(VEHICLE_PART_EVENT_LABEL.installed_declared).toContain('Instalação')
    expect(eventProductLabel(evt({ id: '1', eventType: 'bought' }))).toContain('Filtro')
  })

  it('#19 bought permanece intacto após installed_declared', () => {
    const bought = evt({ id: 'bought-1', eventType: 'bought' })
    const installed = evt({
      id: 'inst-1',
      eventType: 'installed_declared',
      provenance: 'customer',
      payload: { fromEventId: bought.id, name: 'Filtro', sku: 'SKU-1' },
    })
    const timeline = [installed, bought]
    expect(boughtRemainsIntact(timeline, bought.id)).toBe(true)
    expect(timeline.find((e) => e.id === bought.id)?.eventType).toBe('bought')
  })
})
