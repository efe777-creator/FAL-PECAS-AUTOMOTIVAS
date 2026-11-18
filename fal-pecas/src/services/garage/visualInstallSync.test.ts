import { describe, expect, it } from 'vitest'
import type { VehicleEventRow } from './vehicleEventService'
import type { VehiclePartEvent } from './vehiclePartEventService'
import type { VisualPartPreview } from './vehicleVisualPartPreview'
import {
  collectInstallFactsFromEvents,
  collectInstallFactsFromG7,
  isEligibleInstallValidation,
  mergeInstallFacts,
  orphanInstallFacts,
  partsForModelReflection,
  visualSyncNeverWrites2A,
} from './visualInstallSync'

function g7(
  partial: Partial<VehiclePartEvent> & Pick<VehiclePartEvent, 'id' | 'eventType'>,
): VehiclePartEvent {
  return {
    customerId: 'c1',
    customerVehicleId: 'm1',
    orderId: 'o1',
    orderItemId: 'oi1',
    productId: 'p1',
    payload: { name: 'Filtro' },
    actorId: null,
    provenance: 'customer',
    createdAt: '2026-01-02T00:00:00.000Z',
    ...partial,
  }
}

function ve(
  partial: Partial<VehicleEventRow> & Pick<VehicleEventRow, 'id' | 'category' | 'validationState'>,
): VehicleEventRow {
  return {
    vehicleIdentityId: 'vid',
    ownershipPeriodId: 'op',
    title: 'Instalação farol',
    description: null,
    occurredAt: '2026-01-03T00:00:00.000Z',
    recordedAt: '2026-01-03T00:00:00.000Z',
    odometerKm: null,
    provenance: 'customer',
    originRef: { product_id: 'p2' },
    ...partial,
  }
}

const part = (p: Partial<VisualPartPreview> & Pick<VisualPartPreview, 'key' | 'state'>): VisualPartPreview => ({
  productId: 'p1',
  name: 'Filtro',
  sku: null,
  imageUrl: null,
  orderId: 'o1',
  sourceEventType: 'installed_declared',
  ...p,
})

describe('visualInstallSync', () => {
  it('nunca escreve 2A a partir do visual', () => {
    expect(visualSyncNeverWrites2A()).toBe(true)
  })

  it('bloqueia rejeitado/contestado', () => {
    expect(isEligibleInstallValidation('confirmado')).toBe(true)
    expect(isEligibleInstallValidation('declarado')).toBe(true)
    expect(isEligibleInstallValidation('rejeitado')).toBe(false)
    expect(isEligibleInstallValidation('contestado')).toBe(false)
  })

  it('coleta G7 installed_declared e events instalacao elegíveis', () => {
    const fromG7 = collectInstallFactsFromG7([
      g7({ id: '1', eventType: 'bought' }),
      g7({ id: '2', eventType: 'installed_declared' }),
    ])
    expect(fromG7).toHaveLength(1)
    expect(fromG7[0].source).toBe('g7')

    const fromEv = collectInstallFactsFromEvents([
      ve({ id: 'a', category: 'instalacao', validationState: 'confirmado' }),
      ve({ id: 'b', category: 'instalacao', validationState: 'rejeitado' }),
      ve({ id: 'c', category: 'manutencao', validationState: 'confirmado' }),
    ])
    expect(fromEv).toHaveLength(1)
    expect(fromEv[0].id).toBe('ve:a')
  })

  it('sync OFF não reflete no modelo; ON só instaladas com fato', () => {
    const facts = mergeInstallFacts(
      collectInstallFactsFromG7([g7({ id: '2', eventType: 'installed_declared' })]),
      [],
    )
    const parts = [
      part({ key: 'oi1', state: 'instalada', productId: 'p1' }),
      part({ key: 'oi2', state: 'comprada', productId: 'p9', sourceEventType: 'bought' }),
    ]
    expect(partsForModelReflection(parts, facts, false)).toHaveLength(0)
    expect(partsForModelReflection(parts, facts, true)).toHaveLength(1)
    expect(partsForModelReflection(parts, facts, true)[0].key).toBe('oi1')
  })

  it('órfãos vehicle_event sem peça G7', () => {
    const facts = collectInstallFactsFromEvents([
      ve({ id: 'a', category: 'instalacao', validationState: 'documentado', originRef: { product_id: 'px' } }),
    ])
    const orphans = orphanInstallFacts(facts, [part({ key: 'k', state: 'instalada', productId: 'p1' })])
    expect(orphans).toHaveLength(1)
  })
})
